// frontend/src/utils/analyticsTracker.js

// ✅ UPDATED: API base URL for deployed backend
const API_BASE_URL = 'https://api.wilsonmuita.com';

// Session management
let currentSessionId = null;
let isInitialized = false;
let pendingEvents = [];

// ✅ NEW: Language code normalization helper
export const normalizeLanguageCode = (lang) => {
  if (!lang) return 'en';
  // Convert 'en-US' to 'en', 'fr-FR' to 'fr', etc.
  return lang.split('-')[0];
};

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
    
    // Initialize UTM tracking
    initUTMTracking();
    
    // ✅ REMOVED: Don't track initial page view here - let App.js handle it
    // This prevents duplicate pageview tracking

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

// ✅ CRITICAL FIX: Enhanced page view tracking with better error handling
export const trackPageView = async (page) => {
  let payload;
  let response;

  try {
    if (!getConsentStatus()) {
      console.log('🔕 Page view tracking skipped: No consent');
      return { success: true, message: 'Page view tracking skipped: No consent' };
    }

    const sessionId = currentSessionId || getSessionId();
    const pagePath = page || window.location.pathname;

    if (!sessionId || !pagePath) {
      console.warn('⚠️ Page view tracking skipped: Missing sessionId or page');
      return { success: false, message: 'Missing sessionId or page' };
    }

    const utmParams = getUTMParams();

    payload = {
      type: 'pageview',
      eventType: 'pageview', // ✅ CRITICAL FIX: Added eventType for backend compatibility
      eventName: 'page_view',
      sessionId: sessionId,
      page: pagePath,
      title: document.title || 'Unknown Page',
      url: window.location.href,
      referrer: document.referrer || 'direct',
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      screenResolution: window.screen ? `${window.screen.width}x${window.screen.height}` : 'unknown',
      // ✅ FIXED: Normalize language code before sending
      language: normalizeLanguageCode(navigator.language || 'en'),
      utm_source: utmParams.utm_source,
      utm_medium: utmParams.utm_medium,
      utm_campaign: utmParams.utm_campaign,
      utm_content: utmParams.utm_content,
      utm_term: utmParams.utm_term
    };

    console.log('📊 Tracking page view:', {
      sessionId: sessionId.substring(0, 20) + '...',
      page: pagePath,
      language: payload.language,
      eventType: payload.eventType,
      backend: API_BASE_URL
    });
    
    // Use the enhanced sendAnalyticsData function for consistency
    const result = await sendAnalyticsData('/api/analytics/pageview', payload);
    return result;
    
  } catch (error) {
    console.error('❌ Page view tracking failed:', {
      error: error.message,
      type: error.name,
      payload: payload ? {
        sessionId: payload.sessionId?.substring(0, 20) + '...',
        page: payload.page,
        language: payload.language,
        eventType: payload.eventType
      } : 'No payload'
    });
    
    // Store for retry later
    if (payload) {
      storeOfflineEvent({ endpoint: '/api/analytics/pageview', data: payload });
    }
    
    return {
      success: false,
      message: 'Network error',
      error: error.message
    };
  }
};

// ✅ CRITICAL FIX: Enhanced sendAnalyticsData with robust JSON parsing and error handling
const sendAnalyticsData = async (endpoint, data) => {
  let response;
  
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
    if (endpoint === '/api/analytics/event' || endpoint === '/api/analytics/track') {
      if (!data.sessionId || !data.eventName) {
        console.error('❌ Analytics validation failed: Missing sessionId or eventName for event', data);
        return { 
          success: false, 
          message: 'Missing required fields: sessionId and eventName are required' 
        };
      }
      
      // ✅ CRITICAL FIX: Ensure eventType is present for track endpoint
      if (endpoint === '/api/analytics/track' && !data.eventType) {
        console.warn('⚠️ Analytics track endpoint: eventType missing, using type as fallback');
        data.eventType = data.type || 'custom';
      }
    }

    // Queue event if analytics not initialized yet
    if (!isInitialized && endpoint !== '/api/analytics/pageview') {
      pendingEvents.push({ endpoint, data });
      console.log('⏳ Event queued (analytics not initialized):', data.eventName || data.type);
      return { success: true, message: 'Event queued' };
    }

    console.log(`📊 Sending analytics to: ${API_BASE_URL}${endpoint}`, {
      eventName: data.eventName,
      eventType: data.eventType,
      sessionId: data.sessionId?.substring(0, 10) + '...',
      page: data.page
    });

    // ✅ ENHANCED: Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // ✅ CRITICAL FIX: Handle response as text first to avoid JSON parsing errors
    const responseText = await response.text();
    
    console.log(`📊 Analytics response for ${endpoint}:`, {
      status: response.status,
      statusText: response.statusText,
      body: responseText || '[EMPTY RESPONSE]'
    });
    
    // ✅ CRITICAL FIX: Handle non-200 responses first
    if (!response.ok) {
      console.error('❌ Analytics API error:', {
        status: response.status,
        statusText: response.statusText,
        endpoint: endpoint,
        response: responseText
      });
      
      // Store for retry if it's a server error
      if (response.status >= 500) {
        storeOfflineEvent({ endpoint, data });
      }
      
      // Return structured error - don't try to parse as JSON
      return {
        success: false,
        message: `HTTP error: ${response.status}`,
        status: response.status,
        response: responseText
      };
    }

    // ✅ CRITICAL FIX: Handle empty response gracefully
    if (!responseText || responseText.trim() === '') {
      console.log('✅ Analytics request successful (empty response)');
      return { 
        success: true, 
        message: 'Event tracked successfully',
        emptyResponse: true 
      };
    }

    // ✅ CRITICAL FIX: Safe JSON parsing with comprehensive error handling
    try {
      const responseData = JSON.parse(responseText);
      
      // Double check if response indicates success
      if (response.ok) {
        console.log('✅ Analytics Success:', responseData);
        return responseData;
      } else {
        console.error('❌ Analytics API error response:', {
          status: response.status,
          endpoint: endpoint,
          error: responseData
        });
        return {
          success: false,
          message: responseData.message || 'Analytics API error',
          error: responseData.error,
          status: response.status
        };
      }
    } catch (parseError) {
      // ✅ CRITICAL FIX: Handle non-JSON responses gracefully
      console.warn('⚠️ Analytics response not JSON, but request succeeded:', {
        parseError: parseError.message,
        responseText: responseText.substring(0, 100) + '...',
        endpoint: endpoint,
        status: response.status
      });
      
      // Even if not JSON, if status is 200, consider it successful
      if (response.ok) {
        return { 
          success: true, 
          message: 'Event tracked (non-JSON response)',
          responseText: responseText 
        };
      } else {
        return {
          success: false,
          message: 'Invalid JSON response',
          error: parseError.message,
          responseText: responseText
        };
      }
    }

  } catch (error) {
    // ✅ ENHANCED: Better error classification
    console.error('🌐 Network error in analytics request:', {
      error: error.message,
      errorType: error.name,
      endpoint: endpoint,
      backend: API_BASE_URL,
      isTimeout: error.name === 'AbortError',
      isNetworkError: error.message.includes('Failed to fetch')
    });
    
    // Store for retry if it's a network error
    if (error.name === 'AbortError' || error.message.includes('Failed to fetch')) {
      console.warn('🌐 Network offline, storing event for retry');
      storeOfflineEvent({ endpoint, data });
    }
    
    return {
      success: false,
      message: 'Network error',
      error: error.message,
      errorType: error.name
    };
  }
};

// ✅ CRITICAL FIX: Enhanced event tracking with better error handling
export const trackEvent = async (eventData) => {
  try {
    // Check if analytics are enabled
    if (!getConsentStatus()) {
      console.log('🔕 Event tracking disabled: No user consent');
      return { success: true, message: 'Event tracking disabled: No consent' };
    }

    // Validate event data
    if (!eventData || !eventData.eventName) {
      console.warn('⚠️ Event tracking skipped: Missing event name');
      return { success: false, message: 'Missing event name' };
    }

    // Include UTM parameters in all events
    const utmParams = getUTMParams();

    // ✅ CRITICAL FIX: Extract eventType from eventData or use type as fallback
    const eventType = eventData.eventType || eventData.type || 'custom';

    const enhancedEventData = {
      type: 'event',
      eventType: eventType,
      sessionId: currentSessionId || getSessionId(),
      page: window.location.pathname,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      // ✅ FIXED: Normalize language code for all events
      language: normalizeLanguageCode(navigator.language || 'en'),
      utm_source: utmParams.utm_source,
      utm_medium: utmParams.utm_medium,
      utm_campaign: utmParams.utm_campaign,
      ...eventData
    };

    console.log('📈 Tracking event:', {
      eventName: enhancedEventData.eventName,
      eventType: enhancedEventData.eventType,
      sessionId: enhancedEventData.sessionId?.substring(0, 10) + '...',
      language: enhancedEventData.language
    });

    // ✅ ENHANCED: Try multiple endpoints for better compatibility
    let result;
    
    try {
      // First try the main track endpoint
      result = await sendAnalyticsData('/api/analytics/track', enhancedEventData);
    } catch (error) {
      console.warn('⚠️ Track endpoint failed, trying event endpoint:', error.message);
      // Fallback to event endpoint
      result = await sendAnalyticsData('/api/analytics/event', enhancedEventData);
    }
    
    return result;

  } catch (error) {
    console.error('❌ Event tracking failed:', {
      error: error.message,
      eventName: eventData?.eventName,
      eventType: eventData?.eventType
    });
    
    return {
      success: false,
      message: 'Event tracking failed',
      error: error.message
    };
  }
};

// ✅ NEW: Direct track function for API compatibility
export const track = async (eventData) => {
  // Ensure eventType is present for the track endpoint
  const dataWithEventType = {
    eventType: eventData.eventType || eventData.type || 'custom',
    ...eventData
  };
  
  return sendAnalyticsData('/api/analytics/track', dataWithEventType);
};

// ✅ ENHANCED: Store offline events for retry
const storeOfflineEvent = (eventData) => {
  try {
    const offlineEvents = JSON.parse(localStorage.getItem('analytics_offline_events') || '[]');
    
    // Add timestamp and limit to 50 events to prevent storage issues
    offlineEvents.push({
      ...eventData,
      offlineTimestamp: new Date().toISOString(),
      retryCount: 0
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

// ✅ NEW: Retry offline events
export const retryOfflineEvents = async () => {
  try {
    const offlineEvents = JSON.parse(localStorage.getItem('analytics_offline_events') || '[]');
    
    if (offlineEvents.length === 0) {
      return { success: true, message: 'No offline events to retry' };
    }

    console.log(`🔄 Retrying ${offlineEvents.length} offline events`);
    
    const successfulRetries = [];
    const failedRetries = [];

    for (const event of offlineEvents) {
      try {
        const result = await sendAnalyticsData(event.endpoint, event.data);
        
        if (result.success) {
          successfulRetries.push(event);
        } else {
          // Increment retry count and keep if under limit
          event.retryCount = (event.retryCount || 0) + 1;
          if (event.retryCount < 5) {
            failedRetries.push(event);
          }
        }
      } catch (error) {
        event.retryCount = (event.retryCount || 0) + 1;
        if (event.retryCount < 5) {
          failedRetries.push(event);
        }
      }
    }

    // Update localStorage with remaining failed events
    localStorage.setItem('analytics_offline_events', JSON.stringify(failedRetries));
    
    console.log(`✅ Offline events retry completed: ${successfulRetries.length} successful, ${failedRetries.length} failed`);
    
    return {
      success: true,
      retried: successfulRetries.length,
      remaining: failedRetries.length
    };

  } catch (error) {
    console.error('❌ Offline events retry failed:', error);
    return {
      success: false,
      message: 'Failed to retry offline events',
      error: error.message
    };
  }
};

// Process any events that were queued before initialization
const processPendingEvents = () => {
  if (pendingEvents.length === 0) return;

  console.log(`🔄 Processing ${pendingEvents.length} pending events`);
  
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

// ✅ UPDATED: UTM tracking initialization for production
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
      
      // Track UTM acquisition with proper eventType
      trackEvent({
        eventName: 'utm_acquisition',
        eventType: 'conversion',
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
          eventType: 'engagement',
          eventData: {
            action: 'hidden',
            visibleTime: Math.round(visibleTime / 1000),
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
          eventType: 'engagement',
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
          eventType: 'performance',
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
    return Math.round(cls * 1000) / 1000;
  } catch (error) {
    return null;
  }
};

// User interaction tracking
export const trackUserInteraction = (element, action, metadata = {}) => {
  trackEvent({
    eventName: 'user_interaction',
    eventType: 'click',
    eventData: {
      element,
      action,
      page: window.location.pathname,
      ...metadata
    }
  });
};

// ✅ ENHANCED: Error tracking with better error handling
export const trackError = (error, context = {}) => {
  // Don't track errors if analytics isn't initialized or no consent
  if (!isInitialized || !getConsentStatus()) {
    return;
  }

  try {
    trackEvent({
      eventName: 'javascript_error',
      eventType: 'error',
      eventData: {
        errorMessage: error.message,
        errorStack: error.stack,
        page: window.location.pathname,
        ...context
      }
    });
  } catch (trackingError) {
    // Don't create infinite loop if tracking fails
    console.warn('⚠️ Failed to track error:', trackingError.message);
  }
};

// E-commerce tracking (if needed)
export const trackEcommerceEvent = (eventType, data) => {
  trackEvent({
    eventName: `ecommerce_${eventType}`,
    eventType: 'conversion',
    eventData: data
  });
};

// Social media sharing tracking
export const trackSocialShare = (platform, content) => {
  trackEvent({
    eventName: 'social_share',
    eventType: 'social',
    eventData: {
      platform,
      content,
      page: window.location.pathname
    }
  });
};

// Scroll depth tracking
export const trackScrollDepth = (depth) => {
  trackEvent({
    eventName: 'scroll_depth',
    eventType: 'engagement',
    eventData: {
      depth: depth,
      page: window.location.pathname,
      maxScroll: document.documentElement.scrollHeight - window.innerHeight
    }
  });
};

// Reset analytics (for testing or user opt-out)
export const resetAnalytics = () => {
  try {
    localStorage.removeItem('analytics_session_id');
    localStorage.removeItem('analytics_session_timestamp');
    localStorage.removeItem('analytics_offline_events');
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
  try {
    const offlineEvents = JSON.parse(localStorage.getItem('analytics_offline_events') || '[]');
    
    return {
      isInitialized,
      hasConsent: getConsentStatus(),
      sessionId: currentSessionId,
      pendingEvents: pendingEvents.length,
      offlineEvents: offlineEvents.length,
      backend: API_BASE_URL,
      domain: window.location.hostname,
      currentLanguage: normalizeLanguageCode(navigator.language || 'en'),
      endpoints: {
        pageview: `${API_BASE_URL}/api/analytics/pageview`,
        event: `${API_BASE_URL}/api/analytics/event`,
        track: `${API_BASE_URL}/api/analytics/track`
      }
    };
  } catch (error) {
    return {
      isInitialized,
      hasConsent: getConsentStatus(),
      sessionId: currentSessionId,
      pendingEvents: pendingEvents.length,
      offlineEvents: 0,
      backend: API_BASE_URL,
      domain: window.location.hostname,
      currentLanguage: normalizeLanguageCode(navigator.language || 'en'),
      error: error.message
    };
  }
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
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(initializeWithRetry, 1000);
    });
  } else {
    setTimeout(initializeWithRetry, 1000);
  }
}

// Analytics tracker object with all exports
const analyticsTracker = {
  initAnalyticsTracking,
  trackEvent,
  trackPageView,
  track,
  initUTMTracking,
  getUTMParams,
  trackUserInteraction,
  trackError,
  trackEcommerceEvent,
  trackSocialShare,
  trackScrollDepth,
  retryOfflineEvents,
  resetAnalytics,
  getAnalyticsStatus,
  normalizeLanguageCode
};

export default analyticsTracker;