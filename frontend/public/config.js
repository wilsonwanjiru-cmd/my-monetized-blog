// frontend/public/config.js
window._env_ = {
  // ✅ UPDATED: API Configuration
  API_BASE_URL: "https://api.wilsonmuita.com",
  REACT_APP_API_URL: "https://api.wilsonmuita.com",
  
  // ✅ UPDATED: Site Configuration
  SITE_URL: "https://wilsonmuita.com",
  BLOG_URL: "https://wilsonmuita.com",
  SITE_NAME: "Wilson Muita",
  
  // ✅ UPDATED: Analytics Endpoints
  REACT_APP_ANALYTICS_ENDPOINT: "https://api.wilsonmuita.com/api/analytics",
  
  // Analytics Configuration
  REACT_APP_ANALYTICS: "true",
  REACT_APP_HEATMAP_ENABLED: "true",
  REACT_APP_UTM_TRACKING_ENABLED: "true",
  
  // Social Media
  REACT_APP_TWITTER_HANDLE: "@WilsonMuit48811",
  
  // Microsoft Clarity Analytics
  REACT_APP_CLARITY_ID: "tmnk4u8wvm",
  
  // ✅ NEW: Additional Configuration
  CONTACT_EMAIL: "wilsonmuita41@gmail.com",
  SUPPORT_EMAIL: "support@wilsonmuita.com",
  NEWSLETTER_ENDPOINT: "https://api.wilsonmuita.com/api/newsletter",
  
  // ✅ NEW: Feature Flags
  ENABLE_COMMENTS: "false",
  ENABLE_NEWSLETTER: "true",
  ENABLE_ADS: "true",
  ENABLE_AMP: "true",
  
  // ✅ NEW: SEO Configuration
  DEFAULT_OG_IMAGE: "https://wilsonmuita.com/default-og-image.jpg",
  DEFAULT_META_DESCRIPTION: "Wilson Muita - Technology, Programming, and Web Development Insights",
  DEFAULT_META_KEYWORDS: "technology, programming, web development, react, node.js, javascript, tutorials",
  
  // ✅ NEW: Performance Configuration
  LAZY_LOAD_IMAGES: "true",
  PRELOAD_CRITICAL_RESOURCES: "true",
  ENABLE_SERVICE_WORKER: "true",
  
  // ✅ NEW: Security Headers (for reference)
  CSP_HEADER: "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.ampproject.org; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.wilsonmuita.com https://www.google-analytics.com;",
  
  // ✅ NEW: External Services
  GOOGLE_ANALYTICS_ID: "G-XXXXXXXXXX", // Replace with your actual GA4 ID
  GOOGLE_ADSENSE_ID: "ca-pub-XXXXXXXXXXXX", // Replace with your actual AdSense ID
  
  // ✅ NEW: Social Media Links
  SOCIAL_GITHUB: "https://github.com/wilsonmuita",
  SOCIAL_TWITTER: "https://twitter.com/WilsonMuit48811",
  SOCIAL_LINKEDIN: "https://linkedin.com/in/wilsonmuita",
  SOCIAL_YOUTUBE: "https://youtube.com/@wilsonmuita",
  
  // ✅ NEW: Monetization
  AFFILIATE_DISCLOSURE: "This post may contain affiliate links. I may earn a commission if you make a purchase through my links.",
  AD_PLACEMENTS: "in-article,sidebar,header",
  
  // ✅ NEW: Cache Configuration
  API_CACHE_DURATION: "300", // 5 minutes
  ASSET_CACHE_DURATION: "86400", // 24 hours
  PAGE_CACHE_DURATION: "1800", // 30 minutes
  
  // ✅ NEW: Error Handling
  SENTRY_DSN: "", // Add your Sentry DSN if using error tracking
  LOG_LEVEL: "error", // error, warn, info, debug
  
  // ✅ NEW: Build Information
  BUILD_VERSION: "1.0.0",
  BUILD_DATE: "<%= new Date().toISOString() %>",
  BUILD_ENV: "production",
  
  // ✅ NEW: API Timeouts
  API_TIMEOUT: "10000", // 10 seconds
  IMAGE_LOAD_TIMEOUT: "5000", // 5 seconds
  
  // ✅ NEW: PWA Configuration
  PWA_NAME: "Wilson Muita Blog",
  PWA_SHORT_NAME: "WilsonBlog",
  PWA_THEME_COLOR: "#667eea",
  PWA_BACKGROUND_COLOR: "#ffffff",
  
  // ✅ NEW: Search Configuration
  SEARCH_ENDPOINT: "https://api.wilsonmuita.com/api/posts/search",
  ENABLE_INSTANT_SEARCH: "true",
  SEARCH_DEBOUNCE_MS: "300",
  
  // ✅ NEW: Comments Configuration
  COMMENTS_ENDPOINT: "https://api.wilsonmuita.com/api/comments",
  ENABLE_COMMENT_MODERATION: "true",
  
  // ✅ NEW: Subscription Configuration
  ENABLE_PUSH_NOTIFICATIONS: "false",
  PUSH_PUBLIC_KEY: "", // Add your VAPID public key if enabling push notifications
};

// ✅ NEW: Environment validation
(function() {
  const requiredEnvVars = [
    'API_BASE_URL',
    'SITE_URL',
    'SITE_NAME'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !window._env_[varName]);
  
  if (missingVars.length > 0) {
    console.error('Missing required environment variables:', missingVars);
  }
  
  // Set global configuration object
  window.CONFIG = window._env_;
  
  // Backward compatibility
  if (!window.ENV) {
    window.ENV = window._env_;
  }
})();

// ✅ NEW: Runtime configuration helper
window.getConfig = function(key, defaultValue = null) {
  return window._env_[key] || defaultValue;
};

// ✅ NEW: Feature flag helper
window.isFeatureEnabled = function(feature) {
  const value = window.getConfig(feature);
  return value === 'true' || value === true;
};

// ✅ NEW: Environment detection
window.isDevelopment = function() {
  return window.getConfig('BUILD_ENV') === 'development';
};

window.isProduction = function() {
  return window.getConfig('BUILD_ENV') === 'production';
};

// ✅ NEW: API URL helper
window.getApiUrl = function(endpoint = '') {
  const baseUrl = window.getConfig('API_BASE_URL');
  if (endpoint.startsWith('/')) {
    endpoint = endpoint.substring(1);
  }
  return `${baseUrl}/${endpoint}`;
};

// ✅ NEW: Asset URL helper
window.getAssetUrl = function(assetPath = '') {
  const baseUrl = window.getConfig('SITE_URL');
  if (assetPath.startsWith('/')) {
    assetPath = assetPath.substring(1);
  }
  return `${baseUrl}/${assetPath}`;
};

console.log('✅ Frontend configuration loaded for:', window.getConfig('SITE_URL'));
console.log('🚀 Environment:', window.getConfig('BUILD_ENV'));
console.log('🔗 API Base URL:', window.getConfig('API_BASE_URL'));