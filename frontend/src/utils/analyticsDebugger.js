// frontend/src/utils/analyticsDebugger.js
export const setupAnalyticsDebugger = () => {
  // Log all analytics events
  const originalTrackEvent = window.trackEvent;
  window.trackEvent = async function(...args) {
    console.group('🔍 Analytics Event Debug');
    console.log('Event Data:', args[0]);
    try {
      const result = await originalTrackEvent(...args);
      console.log('✅ Event Result:', result);
      console.groupEnd();
      return result;
    } catch (error) {
      console.error('❌ Event Error:', error);
      console.groupEnd();
      throw error;
    }
  };

  // Monitor fetch requests to analytics endpoint
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const [url, options] = args;
    
    if (typeof url === 'string' && url.includes('/api/analytics/')) {
      console.group('🌐 Analytics API Call');
      console.log('URL:', url);
      console.log('Method:', options?.method || 'GET');
      console.log('Body:', options?.body ? JSON.parse(options.body) : 'No body');
      
      try {
        const response = await originalFetch(...args);
        console.log('Status:', response.status, response.statusText);
        
        // Clone response to read body without consuming it
        const clone = response.clone();
        const text = await clone.text();
        console.log('Response Body:', text || '[EMPTY]');
        
        console.groupEnd();
        return response;
      } catch (error) {
        console.error('❌ Fetch Error:', error);
        console.groupEnd();
        throw error;
      }
    }
    
    return originalFetch(...args);
  };

  console.log('🔧 Analytics debugger enabled');
};

// Run debugger in development
if (process.env.NODE_ENV !== 'production') {
  setTimeout(setupAnalyticsDebugger, 1000);
}