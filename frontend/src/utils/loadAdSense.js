// frontend/src/utils/loadAdSense.js
export const loadAdSenseScript = (options = {}) => {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window not available'));

  const {
    maxRetries = 3,
    retryDelay = 2000,
    debug = false,
    testMode = false
  } = options;

  return new Promise((resolve, reject) => {
    // Prevent multiple loads
    if (window._adSenseScriptLoading) {
      if (debug) console.log('⏳ AdSense script already loading...');
      const checkInterval = setInterval(() => {
        if (window._adSenseScriptLoaded) {
          clearInterval(checkInterval);
          resolve(true);
        }
      }, 100);
      return;
    }

    if (window._adSenseScriptLoaded) {
      if (debug) console.log('✅ AdSense script already loaded');
      resolve(true);
      return;
    }

    window._adSenseScriptLoading = true;

    const loadScript = (attempt = 0) => {
      // Check if script already exists
      const existingScript = document.querySelector('script[src*="pagead2.googlesyndication.com"]');
      if (existingScript) {
        window._adSenseScriptLoaded = true;
        window._adSenseScriptLoading = false;
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      const clientId = 'ca-pub-4047817727348673';
      let scriptSrc = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`;
      
      if (testMode) {
        scriptSrc += '&adtest=on';
      }

      script.src = scriptSrc;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.setAttribute('data-ad-client', clientId);
      
      // Add integrity check if needed
      // script.integrity = 'sha256-...';
      
      script.onload = () => {
        window._adSenseScriptLoaded = true;
        window._adSenseScriptLoading = false;
        window.adsbygoogle = window.adsbygoogle || [];
        
        if (debug) {
          console.log('✅ AdSense script loaded successfully');
          console.log('📊 window.adsbygoogle initialized:', window.adsbygoogle);
        }
        
        resolve(true);
      };

      script.onerror = (error) => {
        console.error(`❌ AdSense script failed to load (attempt ${attempt + 1}/${maxRetries}):`, error);
        
        // Remove failed script
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }

        if (attempt < maxRetries - 1) {
          const nextDelay = retryDelay * (attempt + 1);
          console.log(`⏳ Retrying in ${nextDelay}ms...`);
          setTimeout(() => loadScript(attempt + 1), nextDelay);
        } else {
          window._adSenseScriptLoading = false;
          reject(new Error(`Failed to load AdSense script after ${maxRetries} attempts`));
        }
      };

      // Add to document head
      document.head.appendChild(script);
      
      if (debug) {
        console.log(`🔄 Loading AdSense script (attempt ${attempt + 1}):`, script.src);
      }
    };

    loadScript();
  });
};

// Preload AdSense script
export const preloadAdSenseScript = () => {
  if (typeof window === 'undefined') return;
  
  // Create preload link
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'script';
  link.href = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4047817727348673';
  link.crossOrigin = 'anonymous';
  
  document.head.appendChild(link);
  
  console.log('🔗 AdSense script preloaded');
};

// Initialize AdSense
export const initAdSense = async (options = {}) => {
  try {
    await loadAdSenseScript(options);
    return { success: true, message: 'AdSense initialized successfully' };
  } catch (error) {
    console.error('❌ Failed to initialize AdSense:', error);
    return { success: false, error: error.message };
  }
};

// Auto-initialize on page load
if (typeof window !== 'undefined') {
  // Preload immediately
  preloadAdSenseScript();
  
  // Load after page is mostly loaded
  window.addEventListener('load', () => {
    setTimeout(() => {
      initAdSense({ debug: true }).then(result => {
        if (!result.success) {
          console.error('AdSense initialization failed, showing fallback content');
          showAdSenseFallback();
        }
      });
    }, 2000);
  });
}

// Show fallback content when AdSense fails
const showAdSenseFallback = () => {
  const adContainers = document.querySelectorAll('.ad-container, .adsbygoogle');
  
  adContainers.forEach(container => {
    if (container.innerHTML.includes('adsbygoogle')) {
      container.innerHTML = `
        <div class="ad-fallback-content">
          <div style="
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            color: white;
            min-height: 120px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          ">
            <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px;">
              Support This Site
            </div>
            <div style="font-size: 12px; opacity: 0.9; margin-bottom: 12px;">
              Ad could not be loaded. Consider disabling your ad blocker.
            </div>
            <div style="font-size: 10px; opacity: 0.7;">
              Advertisement
            </div>
          </div>
        </div>
      `;
    }
  });
};

export default { loadAdSenseScript, preloadAdSenseScript, initAdSense };