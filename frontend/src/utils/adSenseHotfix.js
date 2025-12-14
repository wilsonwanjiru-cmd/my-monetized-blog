// frontend/src/utils/adSenseHotfix.js
// adSenseHotfix.js - Fixes for common AdSense issues

export const applyAdSenseHotfixes = () => {
  // Fix 1: Prevent duplicate ads
  if (window.adsbygoogle) {
    const originalPush = window.adsbygoogle.push;
    const processed = new Set();
    
    window.adsbygoogle.push = function(config) {
      const adElement = config && config.data && config.data.adSlot;
      if (adElement && processed.has(adElement)) {
        console.log('Skipping duplicate ad:', adElement);
        return;
      }
      
      if (adElement) {
        processed.add(adElement);
      }
      
      try {
        return originalPush.call(this, config);
      } catch (error) {
        console.warn('AdSense push error (non-fatal):', error);
        return null;
      }
    };
  }

  // Fix 2: Handle ad loading errors
  window.addEventListener('error', (event) => {
    if (event.target && event.target.className === 'adsbygoogle') {
      console.warn('AdSense ad failed to load, showing fallback');
      const adElement = event.target;
      
      if (adElement.parentNode) {
        adElement.parentNode.innerHTML = `
          <div class="ad-fallback-hotfix">
            <div style="
              background: #f8f9fa;
              border: 1px solid #dee2e6;
              border-radius: 8px;
              padding: 20px;
              text-align: center;
              min-height: 90px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #6c757d;
            ">
              <div>
                <div style="font-size: 12px; font-weight: 600; margin-bottom: 4px;">
                  Advertisement
                </div>
                <div style="font-size: 11px; opacity: 0.7;">
                  Ad could not be loaded
                </div>
              </div>
            </div>
          </div>
        `;
      }
    }
  });

  // Fix 3: Refresh ads on visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      setTimeout(() => {
        if (window.adsbygoogle) {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          console.log('Ads refreshed on tab focus');
        }
      }, 1000);
    }
  });

  // Fix 4: Ensure AdSense script is loaded
  const ensureAdSenseScript = () => {
    if (document.querySelector('script[src*="pagead2.googlesyndication.com"]')) {
      return true;
    }

    const script = document.createElement('script');
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4047817727348673';
    script.async = true;
    script.crossOrigin = 'anonymous';
    
    script.onload = () => {
      console.log('AdSense script loaded via hotfix');
      window.adsbygoogle = window.adsbygoogle || [];
    };
    
    script.onerror = () => {
      console.warn('Failed to load AdSense script via hotfix');
    };
    
    document.head.appendChild(script);
    return false;
  };

  // Apply fixes
  setTimeout(() => {
    ensureAdSenseScript();
  }, 2000);

  console.log('✅ AdSense hotfixes applied');
};

// Initialize on page load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(applyAdSenseHotfixes, 1000);
  });
}

export default {
  applyAdSenseHotfixes
};