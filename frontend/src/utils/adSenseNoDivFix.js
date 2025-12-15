// frontend/src/utils/adSenseNoDivFix.js
export const fixNoDivError = () => {
  if (typeof window === 'undefined') return;

  console.log('🔧 Applying AdSense no_div error fix...');

  // Track all ad containers
  window._adSenseContainers = window._adSenseContainers || new Map();
  window._adSenseObserver = window._adSenseObserver || null;

  // Fix 1: Override the problematic AdSense error
  const originalPush = window.adsbygoogle ? window.adsbygoogle.push : null;
  
  if (window.adsbygoogle && originalPush) {
    window.adsbygoogle.push = function(config) {
      try {
        // Check if this is a push for an ad
        if (config && config.data) {
          const slot = config.data.adSlot;
          const containerSelector = `ins[data-ad-slot="${slot}"]`;
          const adContainer = document.querySelector(containerSelector);
          
          // Wait for container to be in DOM if not found
          if (!adContainer) {
            console.warn(`⚠️ AdSense: Container for slot ${slot} not found, delaying push...`);
            
            // Try again after a delay
            setTimeout(() => {
              const retryContainer = document.querySelector(containerSelector);
              if (retryContainer) {
                console.log(`✅ AdSense: Found container for slot ${slot} on retry`);
                originalPush.call(this, config);
              } else {
                console.error(`❌ AdSense: Container for slot ${slot} still not found after retry`);
              }
            }, 500);
            return;
          }
          
          // Check if container is visible and has dimensions
          if (adContainer.offsetParent === null || 
              adContainer.offsetHeight === 0 || 
              adContainer.offsetWidth === 0) {
            console.warn(`⚠️ AdSense: Container for slot ${slot} is not visible`);
            
            // Try to make it visible
            adContainer.style.display = 'block';
            adContainer.style.visibility = 'visible';
            
            // Wait a bit and retry
            setTimeout(() => {
              originalPush.call(this, config);
            }, 300);
            return;
          }
          
          // Track this container
          window._adSenseContainers.set(slot, {
            element: adContainer,
            lastPush: Date.now(),
            pushCount: (window._adSenseContainers.get(slot)?.pushCount || 0) + 1
          });
        }
        
        // Call original push
        return originalPush.call(this, config);
      } catch (error) {
        console.error('❌ AdSense push error (intercepted):', error);
        
        // Don't rethrow the error to prevent breaking the page
        return null;
      }
    };
    
    console.log('✅ AdSense push override applied');
  }

  // Fix 2: Ensure ad containers stay in DOM
  const ensureAdContainersStayInDOM = () => {
    const adContainers = document.querySelectorAll('.adsbygoogle, .ad-container');
    
    adContainers.forEach(container => {
      // Mark containers to prevent React from removing them
      container.setAttribute('data-adsense-protected', 'true');
      container.style.contain = 'layout style paint';
      container.style.contentVisibility = 'auto';
      
      // Store reference
      if (container.dataset.adSlot) {
        window._adSenseContainers.set(container.dataset.adSlot, {
          element: container,
          lastChecked: Date.now()
        });
      }
    });
  };

  // Fix 3: Monitor DOM changes to protect ad containers
  const setupDOMMonitoring = () => {
    if (!window._adSenseObserver) {
      window._adSenseObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          // Check if ad containers are being removed
          if (mutation.removedNodes.length > 0) {
            mutation.removedNodes.forEach((node) => {
              if (node.classList && 
                  (node.classList.contains('adsbygoogle') || 
                   node.classList.contains('ad-container'))) {
                
                console.warn('⚠️ AdSense container being removed!', node);
                
                // Try to restore it
                if (node.parentNode !== document.body) {
                  document.body.appendChild(node);
                  console.log('✅ AdSense container restored');
                }
              }
            });
          }
        });
      });
      
      // Start observing
      window._adSenseObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      console.log('✅ DOM monitoring for AdSense containers enabled');
    }
  };

  // Fix 4: Preload AdSense containers before script loads
  const preloadAdContainers = () => {
    const adSlots = [
      '1529123561', // HEADER
      '8087712926', // IN_ARTICLE
      '5976732519', // SIDEBAR
      '2835386242', // FOOTER
      '6583059564', // BETWEEN_POSTS
      '9876543210', // IN_CONTENT_1
      '1234567890'  // IN_CONTENT_2
    ];
    
    // Create placeholders for each slot
    adSlots.forEach(slot => {
      const placeholderId = `adsense-placeholder-${slot}`;
      if (!document.getElementById(placeholderId)) {
        const placeholder = document.createElement('div');
        placeholder.id = placeholderId;
        placeholder.dataset.adSlot = slot;
        placeholder.style.display = 'none';
        placeholder.style.position = 'absolute';
        placeholder.style.left = '-9999px';
        placeholder.style.top = '-9999px';
        placeholder.style.width = '1px';
        placeholder.style.height = '1px';
        placeholder.style.overflow = 'hidden';
        document.body.appendChild(placeholder);
      }
    });
  };

  // Fix 5: Handle 400 errors gracefully
  const handleAdErrors = () => {
    // Intercept fetch errors for AdSense
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      const url = args[0];
      
      // Check if it's an AdSense request
      if (typeof url === 'string' && 
          (url.includes('googleads.g.doubleclick.net') || 
           url.includes('pagead2.googlesyndication.com'))) {
        
        console.log('🔍 AdSense request intercepted:', url);
        
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        args[1] = {
          ...args[1],
          signal: controller.signal,
          mode: 'no-cors',
          credentials: 'omit'
        };
        
        return originalFetch.apply(this, args)
          .then(response => {
            clearTimeout(timeoutId);
            
            if (!response.ok && response.status === 400) {
              console.warn('⚠️ AdSense 400 error (handled gracefully)');
              // Return a mock response to prevent throwing
              return {
                ok: false,
                status: 400,
                statusText: 'Bad Request',
                json: () => Promise.resolve({ error: 'AdSense 400 error' })
              };
            }
            return response;
          })
          .catch(error => {
            clearTimeout(timeoutId);
            console.warn('⚠️ AdSense fetch error (handled):', error.message);
            // Return mock response to prevent breaking the page
            return {
              ok: false,
              status: 0,
              statusText: 'Network Error',
              json: () => Promise.resolve({ error: 'Network error' })
            };
          });
      }
      
      return originalFetch.apply(this, args);
    };
    
    console.log('✅ AdSense error handling enabled');
  };

  // Apply all fixes
  ensureAdContainersStayInDOM();
  setupDOMMonitoring();
  preloadAdContainers();
  handleAdErrors();

  console.log('✅ All AdSense no_div error fixes applied');
  
  return {
    containers: Array.from(window._adSenseContainers.keys()),
    observerActive: !!window._adSenseObserver,
    pushOverride: !!window.adsbygoogle
  };
};

// Auto-apply fix on page load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(() => {
      fixNoDivError();
    }, 2000);
  });
}

export default fixNoDivError;