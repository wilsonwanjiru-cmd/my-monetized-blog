// frontend/public/adsense-config.js
(function() {
  // Only run this script once
  if (window._adsenseConfigLoaded) return;
  window._adsenseConfigLoaded = true;
  
  // Check if AdSense should be loaded
  function shouldLoadAdSense() {
    // Check if we're in test mode (localhost, test, or staging)
    const isTestMode = window.location.hostname === 'localhost' || 
                       window.location.hostname.includes('test') ||
                       window.location.hostname.includes('staging');
    
    // Get consent status
    const hasConsent = window.hasAdConsent ? window.hasAdConsent() : true;
    
    // Get AdSense enabled status from config if available
    const isEnabled = window.getConfig ? window.getConfig('ADSENSE_ENABLED') : true;
    
    return isEnabled && hasConsent && !isTestMode;
  }
  
  // Function to load AdSense script
  function loadAdSenseScript() {
    if (document.querySelector('script[src*="adsbygoogle.js"]')) {
      console.log('✅ AdSense script already loaded');
      return;
    }
    
    const script = document.createElement('script');
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${window._adsenseConfig.clientId}`;
    script.async = true;
    script.crossOrigin = 'anonymous';
    
    script.onload = function() {
      console.log('✅ AdSense script loaded successfully');
      initializeAutoAds();
    };
    
    script.onerror = function() {
      console.warn('❌ Failed to load AdSense script');
    };
    
    document.head.appendChild(script);
  }
  
  // Function to initialize auto ads (only once per page)
  function initializeAutoAds() {
    // Check if auto ads have already been configured
    if (window._adsenseConfig.autoAdsConfigured) {
      console.log('⏩ Auto ads already configured, skipping');
      return;
    }
    
    if (!window.adsbygoogle) {
      window.adsbygoogle = [];
    }
    
    // Configure auto ads
    try {
      window.adsbygoogle.push({
        google_ad_client: window._adsenseConfig.clientId,
        enable_page_level_ads: true,
        overlays: false
      });
      
      window._adsenseConfig.autoAdsConfigured = true;
      window._adsenseConfig.pageLevelAdsConfigured = true;
      console.log('✅ Auto ads configured successfully');
    } catch (error) {
      console.error('❌ Error configuring auto ads:', error);
    }
  }
  
  // Wait for DOM to be ready
  function domReady(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback);
    } else {
      callback();
    }
  }
  
  // Initialize when DOM is ready
  domReady(function() {
    // Check if we should load AdSense
    if (!shouldLoadAdSense()) {
      console.log('⏩ AdSense disabled or not consented');
      return;
    }
    
    // Load AdSense script
    loadAdSenseScript();
    
    // Also initialize on window load
    window.addEventListener('load', function() {
      // If AdSense script hasn't loaded yet, try to initialize
      if (window.adsbygoogle && !window._adsenseConfig.autoAdsConfigured) {
        setTimeout(initializeAutoAds, 1000);
      }
    });
  });
  
  // Export for debugging
  window.debugAdSense = function() {
    return {
      config: window._adsenseConfig,
      adsbygoogle: window.adsbygoogle ? 'Loaded' : 'Not loaded',
      slots: window._adSenseSlots ? Array.from(window._adSenseSlots) : [],
      consent: window.hasAdConsent ? window.hasAdConsent() : 'N/A'
    };
  };
  
  console.log('✅ AdSense configuration loaded');
})();