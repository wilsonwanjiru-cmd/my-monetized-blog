// frontend/public/config.js
window.getConfig = (key) => {
  const config = {
    API_BASE_URL: window.location.hostname === 'localhost' 
      ? 'http://localhost:5000' 
      : 'https://api.wilsonmuita.com',
    REACT_APP_API_URL: window.location.hostname === 'localhost'
      ? 'http://localhost:5000'
      : 'https://api.wilsonmuita.com'
  };
  return config[key];
};

// Add missing function that's being called
window.isFeatureEnabled = (feature) => {
  // Simple feature flag system - you can expand this later
  const features = {
    analytics: true,
    heatmaps: true,
    newsletter: true,
    comments: false
  };
  return features[feature] || false;
};

console.log('✅ Frontend configuration loaded for:', window.location.origin);
console.log('🔗 API Base URL:', window.getConfig('API_BASE_URL'));