// frontend/src/utils/loadAdSense.js

// This file is now DEPRECATED - AdSense is loaded via adsense-config.js in public folder
// Keeping this file for backward compatibility only

export const loadAdSenseScript = (options = {}) => {
  console.log('⚠️ loadAdSenseScript() is deprecated - AdSense is now loaded via adsense-config.js');
  
  // Return a resolved promise for backward compatibility
  return new Promise((resolve) => {
    // If in test mode or development, create mock adsbygoogle
    const isTestMode = options.testMode || 
                       window.location.hostname === 'localhost' ||
                       window.location.hostname.includes('test') ||
                       window.location.hostname.includes('staging');
    
    if (isTestMode && !window.adsbygoogle) {
      window.adsbygoogle = [];
      window.adsbygoogle.push = function() {
        console.log('✅ Mock AdSense: Ad request would be made in production');
        return [];
      };
      window.adsbygoogle.loaded = true;
    }
    
    resolve(true);
  });
};

export const preloadAdSenseScript = () => {
  console.log('⚠️ preloadAdSenseScript() is deprecated - AdSense is now loaded via adsense-config.js');
  // No-op for backward compatibility
};

export const initAdSense = async (options = {}) => {
  console.log('⚠️ initAdSense() is deprecated - AdSense is now loaded via adsense-config.js');
  
  // For backward compatibility, return success
  return { 
    success: true, 
    message: 'AdSense managed by adsense-config.js in public folder' 
  };
};

// Show fallback content when AdSense fails
export const showAdSenseFallback = () => {
  const adContainers = document.querySelectorAll('.ad-container, .adsbygoogle');
  
  adContainers.forEach(container => {
    // Check if the container already has an ad
    const hasAd = container.querySelector('.adsbygoogle');
    const isUnfilled = container.querySelector('.adsbygoogle[data-ad-status="unfilled"]');
    
    if (hasAd && isUnfilled) {
      // Only replace unfilled ads
      const fallbackHTML = `
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
      
      // Replace the unfilled ad with fallback
      const adElement = container.querySelector('.adsbygoogle');
      if (adElement) {
        adElement.style.display = 'none';
        container.insertAdjacentHTML('beforeend', fallbackHTML);
      }
    }
  });
  
  return adContainers.length > 0;
};

// New function to check if AdSense is available
export const isAdSenseAvailable = () => {
  if (typeof window === 'undefined') return false;
  
  // Check if AdSense is loaded
  if (!window.adsbygoogle) {
    return false;
  }
  
  // Check if we're in a development/test environment
  const isTestMode = window.location.hostname === 'localhost' ||
                     window.location.hostname.includes('test') ||
                     window.location.hostname.includes('staging');
  
  return !isTestMode;
};

// New function to get AdSense status
export const getAdSenseStatus = () => {
  if (typeof window === 'undefined') {
    return {
      available: false,
      reason: 'Window not available',
      testMode: false
    };
  }
  
  const isTestMode = window.location.hostname === 'localhost' ||
                     window.location.hostname.includes('test') ||
                     window.location.hostname.includes('staging');
  
  if (isTestMode) {
    return {
      available: false,
      reason: 'Test mode enabled',
      testMode: true
    };
  }
  
  if (!window.adsbygoogle) {
    return {
      available: false,
      reason: 'AdSense not loaded',
      testMode: false
    };
  }
  
  // Check if ads are being blocked
  const adElements = document.querySelectorAll('.adsbygoogle');
  const filledAds = document.querySelectorAll('.adsbygoogle[data-ad-status="filled"]');
  const unfilledAds = document.querySelectorAll('.adsbygoogle[data-ad-status="unfilled"]');
  
  return {
    available: true,
    reason: 'AdSense is available',
    testMode: false,
    stats: {
      totalAds: adElements.length,
      filledAds: filledAds.length,
      unfilledAds: unfilledAds.length
    }
  };
};

// New function to safely refresh ads
export const refreshAdSenseAds = () => {
  if (typeof window === 'undefined') return false;
  
  if (!window.adsbygoogle || !window.adsbygoogle.request) {
    console.log('⚠️ AdSense not available for refresh');
    return false;
  }
  
  try {
    const adElements = document.querySelectorAll('ins.adsbygoogle[data-ad-status="filled"]');
    let refreshedCount = 0;
    
    adElements.forEach((ad) => {
      try {
        window.adsbygoogle.request(ad);
        refreshedCount++;
      } catch (e) {
        // Silent fail for individual ads
      }
    });
    
    console.log(`🔄 Refreshed ${refreshedCount} ads`);
    return refreshedCount > 0;
  } catch (error) {
    console.log('⚠️ Failed to refresh ads:', error);
    return false;
  }
};

// New function to handle page visibility changes
export const setupAdSenseVisibilityHandler = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  
  let visibilityTimeout = null;
  
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      // Clear any existing timeout
      if (visibilityTimeout) {
        clearTimeout(visibilityTimeout);
      }
      
      // Refresh ads after 10 seconds of becoming visible
      visibilityTimeout = setTimeout(() => {
        refreshAdSenseAds();
      }, 10000);
    }
  };
  
  // Set up the event listener
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // Return a cleanup function
  return () => {
    if (visibilityTimeout) {
      clearTimeout(visibilityTimeout);
    }
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
};

// Export all functions for backward compatibility and new functionality
export default { 
  loadAdSenseScript, 
  preloadAdSenseScript, 
  initAdSense,
  showAdSenseFallback,
  isAdSenseAvailable,
  getAdSenseStatus,
  refreshAdSenseAds,
  setupAdSenseVisibilityHandler
};