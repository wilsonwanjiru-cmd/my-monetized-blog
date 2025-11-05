// frontend/src/utils/analyticsTracker.js

// Get API base URL from config
const API_BASE_URL = window.APP_CONFIG?.API_BASE_URL || 'https://api.wilsonmuita.com';

// Session management
let currentSessionId = null;
let isInitialized = false;
let pendingEvents = [];

// Initialize analytics with enhanced error handling
export const initAnalyticsTracking = () => {
  if (isInitialized) {
    console.log('📊 Analytics already initialized');
    return;
  }

  try {
    // Check if analytics should be enabled
    const consent = getConsentStatus();
    
    if (!consent) {
      console.log('🔕 Analytics disabled: No user consent');
      return;
    }

    // Initialize session first - CRITICAL FIX
    currentSessionId = getSessionId();
    
    // Set up page visibility tracking
    setupVisibilityTracking();
    
    // Set up performance tracking
    setupPerformanceTracking();
    
    // Track initial page view after ensuring session is set
    setTimeout(() => {
      trackPageView();
    }, 500);

    // Process any pending events
    processPendingEvents();

    isInitialized = true;
    console.log('📊 Analytics tracking initialized successfully');
    
  } catch (error) {
    console.error('❌ Analytics initialization failed:', error);
  }
};

// Enhanced consent checking
const getConsentStatus = () => {
  try {
    const consent = localStorage.getItem('cookieConsent');
    return consent === 'true';
  } catch (error) {
    console.warn('⚠️ Could not access localStorage for consent:', error);
    return false;
  }
};

// FIXED: Improved session management with proper sessionId generation
const getSessionId = () => {
  try {
    let sessionId = localStorage.getItem('analytics_session_id');
    const sessionTimestamp = localStorage.getItem('analytics_session_timestamp');
    
    // Check if session expired (30 minutes)
    const now = Date.now();
    const sessionDuration = 30 * 60 * 1000; // 30 minutes
    
    if (!sessionId || !sessionTimestamp || (now - parseInt(sessionTimestamp)) > sessionDuration) {
      sessionId = `session_${now}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('analytics_session_id', sessionId);
      localStorage.setItem('analytics_session_timestamp', now.toString());
      
      console.log('🆕 New analytics session created:', sessionId);
    } else {
      console.log('🔁 Continuing existing session:', sessionId);
    }
    
    return sessionId;
  } catch (error) {
    // Fallback to in-memory session if localStorage fails
    if (!currentSessionId) {
      currentSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    return currentSessionId;
  }
};

// FIXED: Enhanced page view tracking with proper field validation
export const trackPageView = async (page) => {
  try {
    if (!getConsentStatus()) {
      console.log('🔕 Page view tracking skipped: No consent');
      return;
    }

    // CRITICAL FIX: Ensure we have sessionId and page before sending
    const sessionId = currentSessionId || getSessionId();
    const pagePath = page || window.location.pathname;

    if (!sessionId || !pagePath) {
      console.warn('⚠️ Page view tracking skipped: Missing sessionId or page', { sessionId, page: pagePath });
      return;
    }

    // Safely get screen resolution using window.screen
    const screenResolution = window.screen ? 
      `${window.screen.width}x${window.screen.height}` : 'unknown';

    const payload = {
      type: 'pageview',
      eventName: 'page_view', // ✅ Added missing eventName
      sessionId: sessionId,
      page: pagePath,
      title: document.title,
      url: window.location.href, // ✅ Added missing url
      referrer: document.referrer || 'direct',
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      screenResolution: screenResolution,
      language: navigator.language
    };

    console.log('📊 Tracking page view:', payload.page);
    
    const response = await fetch(`${API_BASE_URL}/api/analytics/pageview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    console.log('✅ Page view tracked successfully:', responseData);
    return responseData;
    
  } catch (error) {
    console.error('❌ Page view tracking failed:', error);
    // Store for retry later
    storeOfflineEvent(payload);
  }
};

// Enhanced event tracking with comprehensive error handling
export const trackEvent = async (eventData) => {
  try {
    // Check if analytics are enabled
    if (!getConsentStatus()) {
      console.log('🔕 Event tracking disabled: No user consent');
      return;
    }

    // Validate event data
    if (!eventData || !eventData.eventName) {
      console.warn('⚠️ Event tracking skipped: Missing event name');
      return;
    }

    const enhancedEventData = {
      type: 'event',
      sessionId: currentSessionId || getSessionId(),
      page: window.location.pathname,
      url: window.location.href, // ✅ Added missing url
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      ...eventData
    };

    console.log('📈 Tracking event:', enhancedEventData.eventName, enhancedEventData);

    // Send event data
    const result = await sendAnalyticsData('/api/analytics/event', enhancedEventData);
    return result;

  } catch (error) {
    console.error('❌ Event tracking failed:', error);
    // Don't throw to avoid breaking user experience
  }
};

// FIXED: Core function to send analytics data with robust error handling
const sendAnalyticsData = async (endpoint, data) => {
  try {
    // CRITICAL FIX: Validate required fields before sending
    if (endpoint === '/api/analytics/pageview') {
      if (!data.sessionId || !data.page || !data.eventName) {
        console.error('❌ Analytics validation failed: Missing required fields for pageview', {
          sessionId: data.sessionId,
          page: data.page,
          eventName: data.eventName
        });
        return { 
          success: false, 
          message: 'Missing required fields: sessionId, page, and eventName are required' 
        };
      }
    }

    // Validate required fields for event tracking
    if (endpoint === '/api/analytics/event') {
      if (!data.sessionId || !data.eventName) {
        console.error('❌ Analytics validation failed: Missing sessionId or eventName for event', data);
        return { 
          success: false, 
          message: 'Missing required fields: sessionId and eventName are required' 
        };
      }
    }

    // Queue event if analytics not initialized yet
    if (!isInitialized && endpoint !== '/api/analytics/pageview') {
      pendingEvents.push({ endpoint, data });
      console.log('⏳ Event queued (analytics not initialized):', data.eventName || data.type);
      return { success: true, message: 'Event queued' };
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    // Handle different response types
    if (response.status === 204) {
      console.log('✅ Analytics request successful (no content)');
      return { success: true, message: 'Event tracked successfully' };
    }

    const responseText = await response.text();
    
    if (!responseText) {
      console.log('✅ Analytics request successful (empty response)');
      return { success: true, message: 'Event tracked successfully' };
    }

    try {
      const responseData = JSON.parse(responseText);
      
      if (response.ok) {
        console.log('✅ Analytics Success:', responseData);
        return responseData;
      } else {
        console.error('❌ Analytics API error:', response.status, responseData);
        return {
          success: false,
          message: responseData.message || 'Analytics API error',
          error: responseData.error,
          status: response.status
        };
      }
    } catch (parseError) {
      console.warn('⚠️ Analytics response not JSON, but request succeeded');
      return { 
        success: true, 
        message: 'Event tracked (non-JSON response)' 
      };
    }

  } catch (error) {
    console.error('🌐 Network error in analytics request:', error);
    
    // Don't retry for certain errors
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      console.warn('🌐 Network offline, analytics request failed');
    }
    
    return {
      success: false,
      message: 'Network error',
      error: error.message
    };
  }
};

// FIXED: Store offline events for retry
const storeOfflineEvent = (eventData) => {
  try {
    const offlineEvents = JSON.parse(localStorage.getItem('analytics_offline_events') || '[]');
    
    // Add timestamp and limit to 50 events to prevent storage issues
    offlineEvents.push({
      ...eventData,
      offlineTimestamp: new Date().toISOString()
    });
    
    // Keep only the last 50 events
    if (offlineEvents.length > 50) {
      offlineEvents.splice(0, offlineEvents.length - 50);
    }
    
    localStorage.setItem('analytics_offline_events', JSON.stringify(offlineEvents));
    console.log('💾 Event stored offline for retry. Total offline events:', offlineEvents.length);
    
  } catch (error) {
    console.warn('⚠️ Could not store event offline:', error);
  }
};

// Process any events that were queued before initialization
const processPendingEvents = () => {
  if (pendingEvents.length === 0) return;

  console.log(`🔄 Processing ${pendingEvents.length} pending events`);
  
  // Use a regular for loop instead of forEach with async to avoid potential issues
  const processEvents = async () => {
    for (const event of pendingEvents) {
      try {
        await sendAnalyticsData(event.endpoint, event.data);
      } catch (error) {
        console.warn('⚠️ Failed to process pending event:', error);
      }
    }
    pendingEvents = [];
  };
  
  processEvents();
};

// UTM tracking initialization
export const initUTMTracking = () => {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const utmParams = {};
    
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(param => {
      const value = urlParams.get(param);
      if (value) {
        utmParams[param] = value;
      }
    });

    if (Object.keys(utmParams).length > 0) {
      // Store UTM parameters in sessionStorage for the session
      sessionStorage.setItem('utm_params', JSON.stringify(utmParams));
      console.log('🔗 UTM parameters detected:', utmParams);
      
      // Track UTM acquisition
      trackEvent({
        eventName: 'utm_acquisition',
        eventData: utmParams
      });
    }

    return utmParams;
  } catch (error) {
    console.error('❌ UTM tracking initialization failed:', error);
    return {};
  }
};

// Get stored UTM parameters
export const getUTMParams = () => {
  try {
    const stored = sessionStorage.getItem('utm_params');
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.warn('⚠️ Could not retrieve UTM parameters:', error);
    return {};
  }
};

// Page visibility tracking for better engagement metrics
const setupVisibilityTracking = () => {
  let visibilityStartTime = Date.now();
  let visible = true;

  const handleVisibilityChange = () => {
    const now = Date.now();
    
    if (document.hidden) {
      // Page became hidden - track visible time
      const visibleTime = now - visibilityStartTime;
      if (visibleTime > 1000) { // Only track if visible for more than 1 second
        trackEvent({
          eventName: 'page_visibility',
          eventData: {
            action: 'hidden',
            visibleTime: Math.round(visibleTime / 1000), // Convert to seconds
            page: window.location.pathname
          }
        });
      }
      visible = false;
    } else {
      // Page became visible
      visibilityStartTime = now;
      if (!visible) {
        trackEvent({
          eventName: 'page_visibility',
          eventData: {
            action: 'visible',
            page: window.location.pathname
          }
        });
      }
      visible = true;
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // Track initial visibility state
  if (document.hidden) {
    visible = false;
  }
};

// Performance tracking
const setupPerformanceTracking = () => {
  if (!window.performance || !window.performance.timing) return;

  // Use window.addEventListener instead of direct window.onload
  window.addEventListener('load', () => {
    setTimeout(() => {
      try {
        const timing = window.performance.timing;
        
        // Check if timing data is available
        if (!timing.loadEventEnd) {
          console.log('⚠️ Performance timing data not fully available');
          return;
        }
        
        const performanceData = {
          eventName: 'page_performance',
          eventData: {
            dnsLookup: timing.domainLookupEnd - timing.domainLookupStart,
            tcpConnect: timing.connectEnd - timing.connectStart,
            requestResponse: timing.responseEnd - timing.requestStart,
            domProcessing: timing.domComplete - timing.domLoading,
            pageLoad: timing.loadEventEnd - timing.navigationStart,
            firstContentfulPaint: getFirstContentfulPaint(),
            largestContentfulPaint: getLargestContentfulPaint(),
            cumulativeLayoutShift: getCumulativeLayoutShift()
          }
        };

        // Only track if we have meaningful data
        if (performanceData.eventData.pageLoad > 0) {
          trackEvent(performanceData);
        }
      } catch (error) {
        console.warn('⚠️ Performance tracking failed:', error);
      }
    }, 0);
  });
};

// Performance metric helpers
const getFirstContentfulPaint = () => {
  try {
    if (!window.performance || !window.performance.getEntriesByType) {
      return null;
    }
    const paintEntries = window.performance.getEntriesByType('paint');
    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    return fcp ? Math.round(fcp.startTime) : null;
  } catch (error) {
    return null;
  }
};

const getLargestContentfulPaint = () => {
  try {
    if (!window.performance || !window.performance.getEntriesByType) {
      return null;
    }
    const lcpEntries = window.performance.getEntriesByType('largest-contentful-paint');
    return lcpEntries.length > 0 ? Math.round(lcpEntries[lcpEntries.length - 1].startTime) : null;
  } catch (error) {
    return null;
  }
};

const getCumulativeLayoutShift = () => {
  try {
    if (!window.performance || !window.performance.getEntriesByType) {
      return null;
    }
    let cls = 0;
    const layoutShiftEntries = window.performance.getEntriesByType('layout-shift');
    layoutShiftEntries.forEach(entry => {
      if (!entry.hadRecentInput) {
        cls += entry.value;
      }
    });
    return Math.round(cls * 1000) / 1000; // Round to 3 decimal places
  } catch (error) {
    return null;
  }
};

// User interaction tracking
export const trackUserInteraction = (element, action, metadata = {}) => {
  trackEvent({
    eventName: 'user_interaction',
    eventData: {
      element,
      action,
      page: window.location.pathname,
      ...metadata
    }
  });
};

// Error tracking
export const trackError = (error, context = {}) => {
  trackEvent({
    eventName: 'javascript_error',
    eventData: {
      errorMessage: error.message,
      errorStack: error.stack,
      page: window.location.pathname,
      ...context
    }
  });
};

// E-commerce tracking (if needed)
export const trackEcommerceEvent = (eventType, data) => {
  trackEvent({
    eventName: `ecommerce_${eventType}`,
    eventData: data
  });
};

// Social media sharing tracking
export const trackSocialShare = (platform, content) => {
  trackEvent({
    eventName: 'social_share',
    eventData: {
      platform,
      content,
      page: window.location.pathname
    }
  });
};

// Reset analytics (for testing or user opt-out)
export const resetAnalytics = () => {
  try {
    localStorage.removeItem('analytics_session_id');
    localStorage.removeItem('analytics_session_timestamp');
    sessionStorage.removeItem('utm_params');
    
    currentSessionId = null;
    isInitialized = false;
    pendingEvents = [];
    
    console.log('🔄 Analytics reset successfully');
  } catch (error) {
    console.error('❌ Analytics reset failed:', error);
  }
};

// Get analytics status
export const getAnalyticsStatus = () => {
  return {
    isInitialized,
    hasConsent: getConsentStatus(),
    sessionId: currentSessionId,
    pendingEvents: pendingEvents.length
  };
};

// Enhanced initialization with automatic retry
let initializationAttempts = 0;
const maxInitializationAttempts = 3;

const initializeWithRetry = () => {
  try {
    initAnalyticsTracking();
  } catch (error) {
    initializationAttempts++;
    if (initializationAttempts < maxInitializationAttempts) {
      console.log(`🔄 Retrying analytics initialization (attempt ${initializationAttempts + 1})`);
      setTimeout(initializeWithRetry, 1000 * initializationAttempts);
    } else {
      console.error('❌ Analytics initialization failed after multiple attempts');
    }
  }
};

// Auto-initialize when imported (with delay to ensure DOM is ready)
if (typeof window !== 'undefined') {
  setTimeout(() => {
    initializeWithRetry();
  }, 1000);
}

// Export default object for backward compatibility
export default {
  initAnalyticsTracking,
  trackEvent,
  trackPageView,
  initUTMTracking,
  getUTMParams,
  trackUserInteraction,
  trackError,
  trackEcommerceEvent,
  trackSocialShare,
  resetAnalytics,
  getAnalyticsStatus
};