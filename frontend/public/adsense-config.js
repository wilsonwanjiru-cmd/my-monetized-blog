// frontend/public/adsense-config.js
(function() {
  // Use the global config set in index.html
  const config = window._adsenseConfig || {};
  
  // Check if we're in test mode
  const isTestMode = config.testMode || 
                     window.location.hostname === 'localhost' ||
                     window.location.hostname.includes('test') ||
                     window.location.hostname.includes('staging');

  // Only load AdSense on production, live domains
  if (isTestMode) {
    console.log('🛑 AdSense skipped (test mode)');
    // In test mode, create a mock adsbygoogle to prevent errors
    if (!window.adsbygoogle) {
      window.adsbygoogle = [];
      window.adsbygoogle.push = function() {
        console.log('✅ Mock AdSense: Ad request would be made in production');
        return [];
      };
      window.adsbygoogle.loaded = true;
      window.adsbygoogle.request = function() {
        console.log('✅ Mock AdSense: Ad refresh would be made in production');
        return [];
      };
    }
    return;
  }

  // Prevent duplicate loading
  if (window._adSenseScriptLoaded) {
    console.log('⏭️ AdSense script already loaded, skipping');
    return;
  }
  
  // Check if script is already in DOM (loaded by another component)
  if (document.querySelector('script[src*="adsbygoogle.js"]')) {
    console.log('✅ AdSense script already in DOM');
    window._adSenseScriptLoaded = true;
    
    // Initialize wrapper even if script already exists
    initializeAdSenseWrapper();
    return;
  }

  // Set loading flag
  window._adSenseScriptLoaded = true;
  window._adSenseScriptLoading = true;

  // Create the script element
  const script = document.createElement('script');
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${config.clientId || 'ca-pub-4047817727348673'}`;
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.defer = true;
  script.setAttribute('data-ad-client', config.clientId || 'ca-pub-4047817727348673');

  // Silent error handling - suppress all errors
  script.onerror = function() {
    console.log('⏭️ AdSense script failed to load (silent fail)');
    window._adSenseScriptLoading = false;
    window._adSenseFailed = true;
    
    // Even if script fails, create mock to prevent errors
    if (!window.adsbygoogle) {
      window.adsbygoogle = [];
      window.adsbygoogle.push = function() {
        return [];
      };
      window.adsbygoogle.loaded = false;
      window.adsbygoogle.request = function() {
        return [];
      };
    }
  };

  // Function to initialize the AdSense wrapper
  function initializeAdSenseWrapper() {
    // Initialize the adsbygoogle queue
    window.adsbygoogle = window.adsbygoogle || [];
    
    // Only wrap push once
    if (window.adsbygoogle._pushWrapped) {
      console.log('✅ AdSense wrapper already initialized');
      return;
    }
    
    // Save original push method
    const originalPush = window.adsbygoogle.push;
    
    // Wrap the push method to prevent duplicate slot requests
    window.adsbygoogle.push = function() {
      try {
        const args = Array.from(arguments);
        const results = [];
        
        // Track slots globally
        window._adSenseSlots = window._adSenseSlots || new Set();
        
        for (const config of args) {
          if (config && typeof config === 'object') {
            // Skip duplicate page-level ads config
            if (config.enable_page_level_ads || config.google_ad_client === 'ca-pub-4047817727348673') {
              if (window._adsenseConfig.pageLevelAdsConfigured) {
                console.log('⏭️ Skipping duplicate page-level ads configuration');
                continue;
              }
              window._adsenseConfig.pageLevelAdsConfigured = true;
            }
            
            // Skip duplicate ad slots
            const slot = config.google_ad_slot || config.dataAdSlot;
            if (slot) {
              if (window._adSenseSlots.has(slot)) {
                console.log('⏭️ Skipping duplicate ad slot:', slot);
                continue;
              }
              window._adSenseSlots.add(slot);
            }
            
            // Call original push for valid configs
            results.push(originalPush.call(this, config));
          }
        }
        
        return results;
      } catch (error) {
        // Silent fail for AdSense errors
        console.log('⏭️ AdSense push error (silent):', error.message);
        return [];
      }
    };
    
    // Mark as wrapped
    window.adsbygoogle._pushWrapped = true;
    console.log('✅ AdSense wrapper initialized successfully');
    
    // Initialize any existing ad slots
    initializeExistingAdSlots();
  }

  // Function to initialize existing ad slots
  function initializeExistingAdSlots() {
    // Wait for React to render
    setTimeout(function() {
      try {
        const adElements = document.querySelectorAll('ins.adsbygoogle');
        console.log(`📊 Found ${adElements.length} ad elements`);
        
        adElements.forEach(function(ad, index) {
          if (!ad.dataset.initialized && !ad.dataset.adStatus) {
            ad.dataset.initialized = 'true';
            ad.dataset.initializedAt = Date.now();
            
            // Stagger initialization to prevent overwhelming AdSense
            setTimeout(function() {
              try {
                if (window.adsbygoogle && window.adsbygoogle.push) {
                  window.adsbygoogle.push({});
                  console.log(`✅ Initialized ad slot ${index + 1}/${adElements.length}`);
                }
              } catch (e) {
                // Silent fail
              }
            }, index * 300); // 300ms delay between each
          }
        });
        
        // Set up periodic checks for new ad elements
        setTimeout(checkForNewAdElements, 3000);
      } catch (e) {
        // Silent fail
      }
    }, 1500); // Wait 1.5 seconds for React to render
  }

  // Function to check for new ad elements periodically
  function checkForNewAdElements() {
    try {
      const adElements = document.querySelectorAll('ins.adsbygoogle:not([data-initialized])');
      
      adElements.forEach(function(ad) {
        if (!ad.dataset.initialized && !ad.dataset.adStatus) {
          ad.dataset.initialized = 'true';
          ad.dataset.initializedAt = Date.now();
          
          if (window.adsbygoogle && window.adsbygoogle.push) {
            window.adsbygoogle.push({});
          }
        }
      });
      
      // Check again in 5 seconds
      setTimeout(checkForNewAdElements, 5000);
    } catch (e) {
      // Silent fail
    }
  }

  // When script loads successfully
  script.onload = function() {
    console.log('✅ AdSense script loaded successfully');
    window._adSenseScriptLoading = false;
    window.adsbygoogle = window.adsbygoogle || [];
    window.adsbygoogle.loaded = true;
    
    // Initialize the wrapper
    initializeAdSenseWrapper();
    
    // Set up page visibility change handler
    setupVisibilityHandler();
  };

  // Function to handle page visibility changes
  function setupVisibilityHandler() {
    if (!document.addEventListener) return;
    
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'visible') {
        // Wait 10 seconds after becoming visible, then refresh ads
        setTimeout(function() {
          try {
            const filledAds = document.querySelectorAll('ins.adsbygoogle[data-ad-status="filled"]');
            if (filledAds.length > 0 && window.adsbygoogle && window.adsbygoogle.request) {
              console.log(`🔄 Refreshing ${filledAds.length} ads after page became visible`);
              filledAds.forEach(function(ad) {
                try {
                  window.adsbygoogle.request(ad);
                } catch (e) {
                  // Silent fail
                }
              });
            }
          } catch (e) {
            // Silent fail
          }
        }, 10000);
      }
    });
  }

  // Inject the script
  console.log('🚀 Loading AdSense script...');
  document.head.appendChild(script);
  
  // Also set up a fallback in case the script takes too long
  setTimeout(function() {
    if (!window.adsbygoogle && !window._adSenseFailed) {
      console.log('⏳ AdSense script taking longer than expected...');
    }
  }, 5000);
})();