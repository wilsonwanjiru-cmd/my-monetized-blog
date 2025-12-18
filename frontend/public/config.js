// frontend/public/config.js
window.APP_CONFIG = {
  // API Configuration
  API_BASE_URL: window.location.hostname === 'localhost' 
    ? 'http://localhost:5000' 
    : 'https://api.wilsonmuita.com',
  
  // AdSense Configuration
  ADSENSE_CLIENT_ID: 'ca-pub-4047817727348673',
  ADSENSE_ENABLED: true,
  ADSENSE_TEST_MODE: window.location.hostname === 'localhost' || 
                      window.location.hostname.includes('test') ||
                      window.location.hostname.includes('staging'),
  
  // Analytics Configuration
  ANALYTICS_ENABLED: true,
  CLARITY_ID: 'tmnk4u8wvm',
  
  // Feature Flags
  FEATURES: {
    analytics: true,
    heatmaps: true,
    newsletter: true,
    comments: false,
    ads: true,
    consentManager: true,
    serviceWorker: window.location.hostname !== 'localhost'
  },
  
  // Environment
  ENVIRONMENT: window.location.hostname === 'localhost' ? 'development' : 
               window.location.hostname.includes('staging') ? 'staging' : 'production',
  
  // App Info
  VERSION: '1.0.0',
  BUILD_TIMESTAMP: new Date().toISOString(),
  SITE_URL: 'https://wilsonmuita.com',
  
  // Performance Settings
  LAZY_LOAD_ADS: true,
  AD_RETRY_ATTEMPTS: 3,
  AD_LOAD_TIMEOUT: 10000, // 10 seconds
  
  // GDPR/Consent Settings
  GDPR_ENABLED: true,
  CONSENT_COOKIE_NAME: 'adsense_consent',
  CONSENT_EXPIRY_DAYS: 365,
  
  // Cache Settings
  CACHE_VERSION: 'v1',
  CACHE_TTL: {
    api: 300000, // 5 minutes
    assets: 86400000, // 24 hours
    images: 604800000 // 7 days
  }
};

// Helper function to get config values
window.getConfig = (key, defaultValue = null) => {
  if (key.includes('.')) {
    const keys = key.split('.');
    let value = window.APP_CONFIG;
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return defaultValue;
      }
    }
    return value;
  }
  
  return window.APP_CONFIG[key] !== undefined ? window.APP_CONFIG[key] : defaultValue;
};

// Feature flag helper
window.isFeatureEnabled = (feature) => {
  return window.getConfig(`FEATURES.${feature}`, false);
};

// Environment helper
window.isProduction = () => {
  return window.getConfig('ENVIRONMENT') === 'production';
};

window.isDevelopment = () => {
  return window.getConfig('ENVIRONMENT') === 'development';
};

// AdSense helper
window.isAdSenseEnabled = () => {
  return window.getConfig('ADSENSE_ENABLED') && window.getConfig('ADSENSE_CLIENT_ID');
};

// Consent helper
window.hasAdConsent = () => {
  try {
    const consent = localStorage.getItem(window.getConfig('CONSENT_COOKIE_NAME'));
    return consent === 'granted';
  } catch (error) {
    return false;
  }
};

// Performance helper
window.getCacheKey = (resource) => {
  const version = window.getConfig('CACHE_VERSION');
  return `${resource}?v=${version}`;
};

// Logging helper (only in development)
window.logDebug = (message, data = null) => {
  if (window.isDevelopment() || window.location.search.includes('debug=true')) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] DEBUG: ${message}`, data || '');
  }
};

// Error reporting helper
window.reportError = (error, context = {}) => {
  console.error('Application Error:', error, context);
  
  if (window.isProduction()) {
    // Example: Send to error tracking service
    // window.fetch('/api/errors', { method: 'POST', body: JSON.stringify({ error, context }) });
  }
};

// Initialize configuration
(function() {
  console.log('✅ Application Configuration Loaded');
  console.log('🌍 Environment:', window.getConfig('ENVIRONMENT'));
  console.log('🔗 API Base URL:', window.getConfig('API_BASE_URL'));
  console.log('📊 Analytics Enabled:', window.getConfig('ANALYTICS_ENABLED'));
  console.log('💰 AdSense Enabled:', window.isAdSenseEnabled());
  console.log('🔧 Features:', window.getConfig('FEATURES'));
  
  // Set global error handler
  if (window.getConfig('ENVIRONMENT') === 'production') {
    window.addEventListener('error', function(event) {
      window.reportError(event.error || event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        timestamp: new Date().toISOString()
      });
    });
    
    window.addEventListener('unhandledrejection', function(event) {
      window.reportError(event.reason, {
        type: 'unhandledrejection',
        timestamp: new Date().toISOString()
      });
    });
  }
  
  // Performance monitoring
  if ('performance' in window && window.getConfig('ENVIRONMENT') === 'production') {
    window.addEventListener('load', function() {
      setTimeout(function() {
        try {
          const perfData = window.performance.getEntriesByType('navigation')[0];
          if (perfData) {
            const metrics = {
              dns: perfData.domainLookupEnd - perfData.domainLookupStart,
              tcp: perfData.connectEnd - perfData.connectStart,
              request: perfData.responseEnd - perfData.requestStart,
              domLoad: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
              pageLoad: perfData.loadEventEnd - perfData.loadEventStart,
              total: perfData.loadEventEnd - perfData.startTime
            };
            
            window.logDebug('Performance Metrics:', metrics);
          }
        } catch (error) {
          window.reportError(error, { context: 'performance_metrics' });
        }
      }, 0);
    });
  }
  
  // CRITICAL: Removed all AdSense auto ads initialization from here
  // All AdSense initialization is now handled by adsense-config.js only
  console.log('🔧 AdSense: Auto ads configuration moved to adsense-config.js');
  
})();

// Export for module systems (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.APP_CONFIG;
}