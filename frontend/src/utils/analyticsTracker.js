// frontend/src/utils/analyticsTracker.js
// ✅ UPDATED: Enhanced analytics tracker with robust error handling
// ✅ FIXED: 400 Bad Request issues with proper payload validation

const API_BASE_URL = 'https://api.wilsonmuita.com';

// Session management
let currentSessionId = null;
let isInitialized = false;
let pendingEvents = [];
let retryQueue = [];

// ✅ NEW: Request queue for managing concurrent requests
const requestQueue = {
  queue: [],
  processing: false,
  
  async add(requestFn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ requestFn, resolve, reject });
      if (!this.processing) {
        this.processQueue();
      }
    });
  },
  
  async processQueue() {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }
    
    this.processing = true;
    const { requestFn, resolve, reject } = this.queue.shift();
    
    try {
      const result = await requestFn();
      resolve(result);
    } catch (error) {
      reject(error);
    }
    
    // Process next item after a small delay to prevent rate limiting
    setTimeout(() => this.processQueue(), 100);
  }
};

// ✅ NEW: Enhanced language code normalization
export const normalizeLanguageCode = (lang) => {
  if (!lang || typeof lang !== 'string') return 'en';
  
  // Convert to lowercase and split
  const code = lang.toLowerCase().split('-')[0];
  
  // Map common language codes
  const languageMap = {
    'en': 'en',
    'es': 'es',
    'fr': 'fr',
    'de': 'de',
    'it': 'it',
    'pt': 'pt',
    'ru': 'ru',
    'ja': 'ja',
    'ko': 'ko',
    'zh': 'zh',
    'ar': 'ar',
    'hi': 'hi',
    'sw': 'sw'
  };
  
  return languageMap[code] || 'en';
};

// ✅ NEW: Validate payload structure before sending
const validateAnalyticsPayload = (endpoint, data) => {
  const errors = [];
  
  // Common required fields for all endpoints
  if (!data.sessionId) {
    errors.push('sessionId is required');
  }
  
  // Endpoint-specific validation
  switch (endpoint) {
    case '/api/analytics/pageview':
      if (!data.page) errors.push('page is required for pageview');
      if (!data.eventName) errors.push('eventName is required for pageview');
      break;
      
    case '/api/analytics/event':
    case '/api/analytics/track':
      if (!data.eventName) errors.push('eventName is required for event tracking');
      if (!data.eventType) errors.push('eventType is required for event tracking');
      break;
  }
  
  // Validate data types
  if (data.timestamp && typeof data.timestamp !== 'string') {
    errors.push('timestamp must be a string');
  }
  
  if (data.language && typeof data.language !== 'string') {
    errors.push('language must be a string');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
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

    // Initialize session first
    currentSessionId = getSessionId();
    
    // Set up page visibility tracking
    setupVisibilityTracking();
    
    // Set up performance tracking
    setupPerformanceTracking();
    
    // Initialize UTM tracking
    initUTMTracking();
    
    // Process any pending events
    processPendingEvents();

    // ✅ NEW: Set up automatic retry for failed events
    setupAutomaticRetry();

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

// ✅ ENHANCED: Improved session management
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
      
      console.log('🆕 New analytics session created:', sessionId.substring(0, 20) + '...');
      
      // Track session start
      trackEvent({
        eventName: 'session_start',
        eventType: 'session',
        eventData: { sessionId: sessionId.substring(0, 20) + '...' }
      });
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

// ✅ CRITICAL FIX: Enhanced page view tracking with payload validation
export const trackPageView = async (page) => {
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

    const payload = {
      type: 'pageview',
      eventType: 'pageview',
      eventName: 'page_view',
      sessionId: sessionId,
      page: pagePath,
      title: document.title || 'Unknown Page',
      url: window.location.href,
      referrer: document.referrer || 'direct',
      userAgent: navigator.userAgent.substring(0, 200), // Limit length
      timestamp: new Date().toISOString(),
      screenResolution: window.screen ? `${window.screen.width}x${window.screen.height}` : 'unknown',
      language: normalizeLanguageCode(navigator.language || 'en'),
      utm_source: utmParams.utm_source || null,
      utm_medium: utmParams.utm_medium || null,
      utm_campaign: utmParams.utm_campaign || null,
      utm_content: utmParams.utm_content || null,
      utm_term: utmParams.utm_term || null,
      // ✅ NEW: Additional context for debugging
      _debug: {
        hostname: window.location.hostname,
        protocol: window.location.protocol,
        localTime: new Date().toString(),
        timezoneOffset: new Date().getTimezoneOffset()
      }
    };

    console.log('📊 Tracking page view:', {
      sessionId: sessionId.substring(0, 20) + '...',
      page: pagePath,
      language: payload.language,
      eventType: payload.eventType
    });

    // Validate payload before sending
    const validation = validateAnalyticsPayload('/api/analytics/pageview', payload);
    if (!validation.isValid) {
      console.error('❌ Page view payload validation failed:', validation.errors);
      return {
        success: false,
        message: 'Payload validation failed',
        errors: validation.errors
      };
    }

    // Use request queue to prevent concurrent requests
    const result = await requestQueue.add(() => 
      sendAnalyticsData('/api/analytics/pageview', payload)
    );
    
    return result;
    
  } catch (error) {
    console.error('❌ Page view tracking failed:', error.message);
    
    // Store for retry later
    storeOfflineEvent({
      endpoint: '/api/analytics/pageview',
      data: {
        sessionId: currentSessionId || getSessionId(),
        page: page || window.location.pathname,
        timestamp: new Date().toISOString()
      }
    });
    
    return {
      success: false,
      message: 'Page view tracking failed',
      error: error.message
    };
  }
};

// ✅ ENHANCED: Robust sendAnalyticsData with comprehensive error handling
const sendAnalyticsData = async (endpoint, data) => {
  const startTime = Date.now();
  
  try {
    // ✅ CRITICAL: Remove any undefined or null values that might cause 400 errors
    const cleanData = cleanPayload(data);
    
    // Validate payload
    const validation = validateAnalyticsPayload(endpoint, cleanData);
    if (!validation.isValid) {
      throw new Error(`Payload validation failed: ${validation.errors.join(', ')}`);
    }

    console.log(`📊 Sending analytics to ${endpoint}:`, {
      eventName: cleanData.eventName,
      eventType: cleanData.eventType,
      sessionId: cleanData.sessionId?.substring(0, 10) + '...',
      page: cleanData.page,
      timestamp: cleanData.timestamp
    });

    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        // ✅ NEW: Add request ID for debugging
        'X-Request-ID': `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        'X-Analytics-Version': '2.0.0'
      },
      body: JSON.stringify(cleanData),
      signal: controller.signal,
      mode: 'cors',
      credentials: 'omit' // Don't send cookies to prevent CORS issues
    });

    clearTimeout(timeoutId);
    
    const responseTime = Date.now() - startTime;
    
    // Handle response as text first to avoid JSON parsing errors
    const responseText = await response.text();
    
    console.log(`📊 Analytics response (${responseTime}ms):`, {
      status: response.status,
      statusText: response.statusText,
      endpoint: endpoint,
      responseLength: responseText.length
    });
    
    // Handle non-200 responses
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      let errorData = null;
      
      try {
        if (responseText) {
          errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorMessage;
        }
      } catch {
        errorData = { raw: responseText.substring(0, 200) };
      }
      
      const error = new Error(errorMessage);
      error.status = response.status;
      error.responseData = errorData;
      
      // Handle specific status codes
      switch (response.status) {
        case 400:
          console.error('❌ Bad Request (400):', {
            endpoint,
            payload: cleanData,
            response: errorData
          });
          // Don't retry 400 errors (client error)
          break;
          
        case 401:
        case 403:
          console.error('❌ Authentication error:', response.status);
          break;
          
        case 429:
          console.warn('⚠️ Rate limited, will retry later');
          storeOfflineEvent({ endpoint, data: cleanData });
          break;
          
        case 500:
        case 502:
        case 503:
        case 504:
          console.warn('⚠️ Server error, will retry later');
          storeOfflineEvent({ endpoint, data: cleanData });
          break;
          
        default:
          if (response.status >= 500) {
            storeOfflineEvent({ endpoint, data: cleanData });
          }
      }
      
      throw error;
    }

    // Handle empty response
    if (!responseText.trim()) {
      return {
        success: true,
        message: 'Event tracked successfully (empty response)',
        responseTime
      };
    }

    // Parse JSON response
    try {
      const responseData = JSON.parse(responseText);
      
      if (responseData.success === false) {
        throw new Error(responseData.message || 'Analytics API returned error');
      }
      
      return {
        success: true,
        ...responseData,
        responseTime
      };
    } catch (parseError) {
      // Non-JSON but successful response
      return {
        success: true,
        message: 'Event tracked (non-JSON response)',
        responseText: responseText.substring(0, 100),
        responseTime
      };
    }

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    // Classify error type
    const errorInfo = {
      error: error.message,
      errorType: error.name,
      endpoint,
      responseTime,
      isTimeout: error.name === 'AbortError',
      isNetworkError: error.message.includes('Failed to fetch') || error.message.includes('NetworkError'),
      isValidationError: error.message.includes('validation')
    };
    
    if (error.name === 'AbortError') {
      console.warn('⏱️ Request timeout:', endpoint);
    } else if (error.isNetworkError) {
      console.warn('🌐 Network error, storing for retry:', endpoint);
      storeOfflineEvent({ endpoint, data });
    } else {
      console.error('❌ Analytics request failed:', errorInfo);
    }
    
    // Store for retry if it's a network issue
    if (error.isNetworkError || error.name === 'AbortError') {
      storeOfflineEvent({ endpoint, data });
    }
    
    return {
      success: false,
      message: error.message,
      errorType: error.name,
      responseTime,
      ...errorInfo
    };
  }
};

// ✅ NEW: Clean payload by removing undefined/null values and trimming strings
const cleanPayload = (data) => {
  const cleaned = { ...data };
  
  // Remove undefined and null values
  Object.keys(cleaned).forEach(key => {
    if (cleaned[key] === undefined || cleaned[key] === null) {
      delete cleaned[key];
    }
  });
  
  // Trim string values to prevent whitespace issues
  Object.keys(cleaned).forEach(key => {
    if (typeof cleaned[key] === 'string') {
      cleaned[key] = cleaned[key].trim();
      
      // Limit string lengths for specific fields
      if (key === 'userAgent' && cleaned[key].length > 500) {
        cleaned[key] = cleaned[key].substring(0, 500);
      }
      if (key === 'referrer' && cleaned[key].length > 1000) {
        cleaned[key] = cleaned[key].substring(0, 1000);
      }
      if (key === 'url' && cleaned[key].length > 2000) {
        cleaned[key] = cleaned[key].substring(0, 2000);
      }
    }
  });
  
  return cleaned;
};

// ✅ ENHANCED: Event tracking with better payload construction
export const trackEvent = async (eventData) => {
  try {
    if (!getConsentStatus()) {
      console.log('🔕 Event tracking disabled: No user consent');
      return { success: true, message: 'Event tracking disabled: No consent' };
    }

    if (!eventData || !eventData.eventName) {
      console.warn('⚠️ Event tracking skipped: Missing event name');
      return { success: false, message: 'Missing event name' };
    }

    const utmParams = getUTMParams();
    const sessionId = currentSessionId || getSessionId();
    
    // Validate session ID
    if (!sessionId) {
      console.warn('⚠️ Event tracking skipped: No session ID');
      return { success: false, message: 'No session ID' };
    }

    const enhancedEventData = cleanPayload({
      type: 'event',
      eventType: eventData.eventType || eventData.type || 'custom',
      eventName: eventData.eventName,
      sessionId: sessionId,
      page: window.location.pathname || '/',
      url: window.location.href,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent?.substring(0, 200) || 'unknown',
      language: normalizeLanguageCode(navigator.language || 'en'),
      utm_source: utmParams.utm_source || null,
      utm_medium: utmParams.utm_medium || null,
      utm_campaign: utmParams.utm_campaign || null,
      // Include any additional event data
      ...eventData.eventData,
      // Keep original eventData for backward compatibility
      ...eventData
    });

    // Remove duplicate fields
    delete enhancedEventData.eventData;

    console.log('📈 Tracking event:', {
      eventName: enhancedEventData.eventName,
      eventType: enhancedEventData.eventType,
      sessionId: enhancedEventData.sessionId?.substring(0, 10) + '...'
    });

    // Use request queue to prevent concurrent requests
    const result = await requestQueue.add(async () => {
      try {
        return await sendAnalyticsData('/api/analytics/track', enhancedEventData);
      } catch (error) {
        // Fallback to event endpoint
        console.warn('⚠️ Track endpoint failed, trying event endpoint:', error.message);
        return await sendAnalyticsData('/api/analytics/event', enhancedEventData);
      }
    });
    
    return result;

  } catch (error) {
    console.error('❌ Event tracking failed:', error.message);
    
    // Store for retry
    if (eventData) {
      storeOfflineEvent({
        endpoint: '/api/analytics/track',
        data: {
          sessionId: currentSessionId || getSessionId(),
          eventName: eventData.eventName,
          timestamp: new Date().toISOString(),
          ...eventData
        }
      });
    }
    
    return {
      success: false,
      message: 'Event tracking failed',
      error: error.message
    };
  }
};

// ✅ NEW: Direct track function for API compatibility
export const track = async (eventData) => {
  return trackEvent(eventData);
};

// ✅ ENHANCED: Store offline events with size limits
const storeOfflineEvent = (eventData) => {
  try {
    const storageKey = 'analytics_offline_events';
    const maxEvents = 100; // Maximum events to store
    
    let offlineEvents = [];
    try {
      const stored = localStorage.getItem(storageKey);
      offlineEvents = stored ? JSON.parse(stored) : [];
    } catch {
      offlineEvents = [];
    }
    
    // Add timestamp and retry count
    const eventWithMetadata = {
      ...eventData,
      storedAt: new Date().toISOString(),
      retryCount: 0,
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    offlineEvents.push(eventWithMetadata);
    
    // Keep only the last maxEvents
    if (offlineEvents.length > maxEvents) {
      offlineEvents = offlineEvents.slice(-maxEvents);
    }
    
    localStorage.setItem(storageKey, JSON.stringify(offlineEvents));
    console.log('💾 Event stored offline. Total:', offlineEvents.length);
    
    return eventWithMetadata.id;
    
  } catch (error) {
    console.warn('⚠️ Could not store event offline:', error);
    return null;
  }
};

// ✅ NEW: Setup automatic retry mechanism
const setupAutomaticRetry = () => {
  // Check for offline events on initialization
  setTimeout(() => {
    if (navigator.onLine) {
      retryOfflineEvents();
    }
  }, 5000);
  
  // Retry when coming back online
  window.addEventListener('online', () => {
    console.log('🌐 Back online, retrying offline events');
    setTimeout(retryOfflineEvents, 2000);
  });
  
  // Periodic retry every 5 minutes if online
  setInterval(() => {
    if (navigator.onLine && isInitialized) {
      retryOfflineEvents();
    }
  }, 5 * 60 * 1000);
};

// ✅ ENHANCED: Retry offline events with exponential backoff
export const retryOfflineEvents = async () => {
  try {
    const storageKey = 'analytics_offline_events';
    let offlineEvents = [];
    
    try {
      const stored = localStorage.getItem(storageKey);
      offlineEvents = stored ? JSON.parse(stored) : [];
    } catch {
      return { success: true, message: 'No offline events found' };
    }
    
    if (offlineEvents.length === 0) {
      return { success: true, message: 'No offline events to retry' };
    }

    console.log(`🔄 Retrying ${offlineEvents.length} offline events`);
    
    const successfulRetries = [];
    const failedRetries = [];
    const maxRetries = 3;

    for (const event of offlineEvents) {
      // Skip if retry count exceeded
      if (event.retryCount >= maxRetries) {
        console.log(`⏩ Skipping event ${event.id}, max retries exceeded`);
        continue;
      }
      
      try {
        // Add delay between retries based on retry count
        if (event.retryCount > 0) {
          const delay = Math.min(1000 * Math.pow(2, event.retryCount), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        const result = await sendAnalyticsData(event.endpoint, event.data);
        
        if (result.success) {
          successfulRetries.push(event.id);
        } else {
          // Increment retry count
          event.retryCount = (event.retryCount || 0) + 1;
          if (event.retryCount < maxRetries) {
            failedRetries.push(event);
          }
        }
      } catch (error) {
        event.retryCount = (event.retryCount || 0) + 1;
        if (event.retryCount < maxRetries) {
          failedRetries.push(event);
        }
      }
    }

    // Update localStorage with remaining failed events
    localStorage.setItem(storageKey, JSON.stringify(failedRetries));
    
    console.log(`✅ Offline events retry: ${successfulRetries.length} successful, ${failedRetries.length} remaining`);
    
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
  
  pendingEvents.forEach(async (event) => {
    try {
      await sendAnalyticsData(event.endpoint, event.data);
    } catch (error) {
      console.warn('⚠️ Failed to process pending event:', error);
    }
  });
  
  pendingEvents = [];
};

// ✅ UPDATED: UTM tracking initialization
export const initUTMTracking = () => {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const utmParams = {};
    
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    
    utmKeys.forEach(param => {
      const value = urlParams.get(param);
      if (value && value.trim()) {
        utmParams[param] = value.trim();
      }
    });

    if (Object.keys(utmParams).length > 0) {
      // Store UTM parameters in sessionStorage
      sessionStorage.setItem('utm_params', JSON.stringify(utmParams));
      console.log('🔗 UTM parameters detected:', utmParams);
      
      // Track UTM acquisition
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
    return {};
  }
};

// Page visibility tracking
const setupVisibilityTracking = () => {
  let visibilityStartTime = Date.now();
  let visible = true;

  const handleVisibilityChange = () => {
    const now = Date.now();
    
    if (document.hidden) {
      const visibleTime = now - visibilityStartTime;
      if (visibleTime > 1000) {
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
  
  if (document.hidden) {
    visible = false;
  }
};

// Performance tracking
const setupPerformanceTracking = () => {
  if (!window.performance || !window.performance.timing) return;

  window.addEventListener('load', () => {
    setTimeout(() => {
      try {
        const timing = window.performance.timing;
        
        if (!timing.loadEventEnd) {
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
            largestContentfulPaint: getLargestContentfulPaint()
          }
        };

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

// Error tracking
export const trackError = (error, context = {}) => {
  if (!isInitialized || !getConsentStatus()) {
    return;
  }

  try {
    trackEvent({
      eventName: 'javascript_error',
      eventType: 'error',
      eventData: {
        errorMessage: error.message?.substring(0, 500),
        errorType: error.name,
        page: window.location.pathname,
        ...context
      }
    });
  } catch (trackingError) {
    console.warn('⚠️ Failed to track error:', trackingError.message);
  }
};

// E-commerce tracking
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
      content: content?.substring(0, 200),
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

// Reset analytics
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
      sessionId: currentSessionId ? currentSessionId.substring(0, 20) + '...' : null,
      pendingEvents: pendingEvents.length,
      offlineEvents: offlineEvents.length,
      backend: API_BASE_URL,
      domain: window.location.hostname,
      currentLanguage: normalizeLanguageCode(navigator.language || 'en'),
      userOnline: navigator.onLine,
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
      sessionId: currentSessionId ? currentSessionId.substring(0, 20) + '...' : null,
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

// Auto-initialize when imported
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(initializeWithRetry, 1500);
    });
  } else {
    setTimeout(initializeWithRetry, 1500);
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
  normalizeLanguageCode,
  // ✅ NEW: Debug utility
  debug: () => {
    console.log('🔍 Analytics Debug Info:', getAnalyticsStatus());
  }
};

export default analyticsTracker;