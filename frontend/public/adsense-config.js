// frontend/public/adsense-config.js
(function() {
  // Only run this script once
  if (window._adsenseConfigLoaded) return;
  window._adsenseConfigLoaded = true;
  
  // Check if we're in a React app with multiple renders
  if (window._adSenseConfigRetries > 3) {
    console.log('⏭️ AdSense: Too many retries, skipping config');
    return;
  }
  window._adSenseConfigRetries = (window._adSenseConfigRetries || 0) + 1;
  
  // Check if AdSense should be loaded
  function shouldLoadAdSense() {
    // Check if we're in test mode (localhost, test, or staging)
    const isTestMode = window.location.hostname === 'localhost' || 
                       window.location.hostname.includes('test') ||
                       window.location.hostname.includes('staging');
    
    // Check if user is on excluded pages (compliance pages)
    const excludedPaths = ['/privacy-policy', '/privacy', '/disclaimer', '/contact', '/about', '/terms'];
    const isExcludedPage = excludedPaths.some(path => 
      window.location.pathname === path || window.location.pathname.startsWith(`${path}/`)
    );
    
    // Get consent status
    const hasConsent = window.hasAdConsent ? window.hasAdConsent() : true;
    
    // Get AdSense enabled status from config if available
    const isEnabled = window.getConfig ? window.getConfig('ADSENSE_ENABLED') : true;
    
    return isEnabled && hasConsent && !isTestMode && !isExcludedPage;
  }
  
  // Function to load AdSense script
  function loadAdSenseScript() {
    // Check if script is already loaded globally
    if (window.adsbygoogle && window.adsbygoogle.loaded) {
      console.log('✅ AdSense: Script already loaded globally');
      return Promise.resolve();
    }
    
    // Check if script is already in DOM
    if (document.querySelector('script[src*="adsbygoogle.js"]')) {
      console.log('✅ AdSense: Script already in DOM');
      return Promise.resolve();
    }
    
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${window._adsenseConfig.clientId}`;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.setAttribute('data-ad-client', window._adsenseConfig.clientId);
      
      script.onload = function() {
        console.log('✅ AdSense: Script loaded successfully');
        
        // Mark script as loaded globally
        if (window.adsbygoogle) {
          window.adsbygoogle.loaded = true;
        }
        
        // Initialize adsbygoogle array
        window.adsbygoogle = window.adsbygoogle || [];
        
        // Check if we should configure auto ads
        if (shouldLoadAdSense() && !window._adsenseConfig.autoAdsConfigured) {
          initializeAutoAds();
        }
        
        resolve();
      };
      
      script.onerror = function() {
        console.warn('❌ AdSense: Failed to load script');
        reject(new Error('AdSense script failed to load'));
      };
      
      document.head.appendChild(script);
    });
  }
  
  // CRITICAL FIX: Check if auto ads have already been configured
  function initializeAutoAds() {
    // Don't configure auto ads on excluded pages
    const excludedPaths = ['/privacy-policy', '/privacy', '/disclaimer', '/contact', '/about', '/terms'];
    const isExcludedPage = excludedPaths.some(path => 
      window.location.pathname === path || window.location.pathname.startsWith(`${path}/`)
    );
    
    if (isExcludedPage) {
      console.log('⏭️ AdSense: Skipping auto ads on excluded page:', window.location.pathname);
      return;
    }
    
    // Check if auto ads have already been configured
    if (window._adsenseConfig.autoAdsConfigured) {
      console.log('⏭️ AdSense: Auto ads already configured, skipping');
      return;
    }
    
    // Check if any component has already configured auto ads
    if (window.adsbygoogle) {
      // Look for existing enable_page_level_ads config in the adsbygoogle array
      const hasExistingConfig = window.adsbygoogle.some(config => 
        config && typeof config === 'object' && config.enable_page_level_ads
      );
      
      if (hasExistingConfig) {
        console.log('⏭️ AdSense: Found existing enable_page_level_ads config');
        window._adsenseConfig.autoAdsConfigured = true;
        return;
      }
    }
    
    // Configure auto ads with error handling
    try {
      // Ensure adsbygoogle array exists
      window.adsbygoogle = window.adsbygoogle || [];
      
      // Push auto ads configuration
      window.adsbygoogle.push({
        google_ad_client: window._adsenseConfig.clientId,
        enable_page_level_ads: true,
        overlays: false
      });
      
      window._adsenseConfig.autoAdsConfigured = true;
      console.log('✅ AdSense: Auto ads configured successfully');
    } catch (error) {
      // Check if it's the duplicate enable_page_level_ads error
      if (error.message && error.message.includes('Only one \'enable_page_level_ads\'')) {
        console.warn('⚠️ AdSense: Auto ads already configured on page');
        window._adsenseConfig.autoAdsConfigured = true;
      } else {
        console.error('❌ AdSense: Error configuring auto ads:', error);
      }
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
      console.log('⏭️ AdSense: Disabled or not consented');
      return;
    }
    
    // Small delay to ensure React has rendered
    setTimeout(() => {
      loadAdSenseScript().catch(() => {
        // Silent fail - script might already be loaded by another component
      });
    }, 1000);
  });
  
  // Export for debugging
  window.debugAdSense = function() {
    return {
      config: window._adsenseConfig,
      adsbygoogle: window.adsbygoogle ? 'Loaded' : 'Not loaded',
      autoAdsConfigured: window._adsenseConfig.autoAdsConfigured,
      consent: window.hasAdConsent ? window.hasAdConsent() : 'N/A',
      pathname: window.location.pathname
    };
  };
  
  console.log('✅ AdSense: Configuration loaded');
})();