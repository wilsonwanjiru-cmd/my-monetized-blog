// frontend/src/utils/api.js

const getApiBaseUrl = () => {
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:5000";
  }
  return "https://api.wilsonmuita.com";
};

const API_BASE_URL = getApiBaseUrl();

// ✅ Enhanced API utility with better analytics support
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const config = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // Remove body from config if method is GET or HEAD
  if (['GET', 'HEAD'].includes(config.method?.toUpperCase())) {
    delete config.body;
  }

  // ✅ ADDED: Enhanced logging for analytics endpoints
  if (url.includes('/analytics/')) {
    console.log(`📊 Analytics API Call: ${config.method} ${url}`);
  } else {
    console.log(`🚀 API Call: ${config.method} ${url}`);
  }

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText || 'Unknown error occurred' };
      }
      
      // ✅ IMPROVED: Better error structure for analytics
      const error = {
        message: errorData.message || `HTTP error! status: ${response.status}`,
        status: response.status,
        data: errorData,
        url: url
      };

      // ✅ ADDED: Special handling for analytics errors
      if (url.includes('/analytics/')) {
        console.warn(`📊 Analytics API Error (${response.status}):`, error);
      } else {
        console.error(`❌ API Error (${url}):`, error);
      }
      
      throw error;
    }

    const data = await response.json();
    
    // ✅ ADDED: Enhanced success logging for analytics
    if (url.includes('/analytics/')) {
      console.log(`✅ Analytics Success: ${url}`, { 
        success: data.success, 
        message: data.message,
        eventId: data.eventId 
      });
    } else {
      console.log(`✅ API Success: ${url}`, data);
    }
    
    return data;
    
  } catch (error) {
    // ✅ IMPROVED: Better error handling for analytics
    if (url.includes('/analytics/')) {
      console.warn(`📊 Analytics Request Failed: ${url}`, error.message);
    } else {
      console.error(`❌ API Request Failed (${url}):`, error);
    }
    
    // Handle network errors
    if (error.message && error.message.includes('Failed to fetch')) {
      const networkError = {
        message: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR',
        status: 0,
        url: url
      };
      throw networkError;
    }
    
    // Re-throw the error with proper structure
    throw {
      message: error.message || 'An unexpected error occurred',
      code: error.code || 'UNKNOWN_ERROR',
      status: error.status,
      url: url,
      ...error
    };
  }
};

// ✅ Enhanced Blog API endpoints with better analytics
export const blogAPI = {
  // Posts endpoints
  posts: {
    getAll: () => apiRequest('/api/posts'),
    getBySlug: (slug) => apiRequest(`/api/posts/slug/${slug}`),
    getPublished: () => apiRequest('/api/posts/published'),
    getByCategory: (category) => apiRequest(`/api/posts/category/${category}`),
    getByTag: (tag) => apiRequest(`/api/posts/tag/${tag}`),
    getFeatured: () => apiRequest('/api/posts/featured'),
    search: (query) => apiRequest(`/api/posts/search?q=${encodeURIComponent(query)}`),
    
    // Related posts endpoint
    getRelated: (postId, options = {}) => {
      const { limit = 3, category, tags } = options;
      let url = `/api/posts/related/${postId}?limit=${limit}`;
      if (category) url += `&category=${encodeURIComponent(category)}`;
      if (tags) url += `&tags=${encodeURIComponent(tags)}`;
      return apiRequest(url);
    },
    
    // Track post view
    trackView: (postId) => apiRequest(`/api/posts/${postId}/view`, {
      method: 'POST',
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        url: window.location.href,
        referrer: document.referrer
      })
    }),
    
    // Get post analytics
    getAnalytics: (postId) => apiRequest(`/api/posts/${postId}/analytics`),
    
    // Like/unlike post
    like: (postId) => apiRequest(`/api/posts/${postId}/like`, {
      method: 'POST'
    }),
    unlike: (postId) => apiRequest(`/api/posts/${postId}/unlike`, {
      method: 'POST'
    })
  },
  
  // Contact API endpoints
  contact: {
    submit: (formData) => apiRequest('/api/contact', {
      method: 'POST',
      body: JSON.stringify(formData)
    }),
    
    // Optional admin endpoints
    getAll: () => apiRequest('/api/contact'),
    getStats: () => apiRequest('/api/contact/stats'),
    updateStatus: (id, status) => apiRequest(`/api/contact/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    }),
    delete: (id) => apiRequest(`/api/contact/${id}`, {
      method: 'DELETE'
    })
  },
  
  // Newsletter endpoints with full subscriber data
  newsletter: {
    subscribe: (subscriberData) => apiRequest('/api/newsletter/subscribe', {
      method: 'POST',
      body: JSON.stringify(subscriberData)
    }),
    unsubscribe: (email) => apiRequest('/api/newsletter/unsubscribe', {
      method: 'POST',
      body: JSON.stringify({ email })
    }),
    // Optional admin endpoints
    getAll: () => apiRequest('/api/newsletter/subscribers'),
    getStats: () => apiRequest('/api/newsletter/stats')
  },
  
  // ✅ CRITICAL FIX: Enhanced Analytics endpoints with proper eventType support
  analytics: {
    // Track custom events - CRITICAL FIX: Ensure eventType is included
    trackEvent: (eventData) => apiRequest('/api/analytics/track', {
      method: 'POST',
      body: JSON.stringify({
        // ✅ FIXED: Include both eventType and type for backend compatibility
        eventType: eventData.eventType || eventData.type || 'custom',
        type: eventData.type || eventData.eventType || 'custom',
        ...eventData,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        language: navigator.language,
        url: window.location.href,
        referrer: document.referrer
      })
    }),
    
    // Track page views - CRITICAL FIX: Ensure eventType is included
    trackPageView: (pageData) => apiRequest('/api/analytics/pageview', {
      method: 'POST',
      body: JSON.stringify({
        // ✅ FIXED: Include both eventType and type for backend compatibility
        eventType: 'pageview',
        type: 'pageview',
        ...pageData,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        language: navigator.language,
        url: window.location.href,
        referrer: document.referrer
      })
    }),
    
    // Get analytics stats
    getStats: (days = 30) => apiRequest(`/api/analytics/stats?days=${days}`),
    
    // Post-specific analytics - CRITICAL FIX: Ensure eventType is included
    trackPostView: (postId, data = {}) => apiRequest('/api/analytics/postview', {
      method: 'POST',
      body: JSON.stringify({
        // ✅ FIXED: Include both eventType and type for backend compatibility
        eventType: 'post_view',
        type: 'post_view',
        postId,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        ...data
      })
    }),
    
    // ✅ ADDED: Test analytics endpoint
    test: () => apiRequest('/api/analytics/test'),
    
    // ✅ ADDED: Health check for analytics
    health: () => apiRequest('/api/analytics/health'),
    
    // ✅ ADDED: Database status check
    dbStatus: () => apiRequest('/api/analytics/db-status'),
    
    // ✅ ADDED: Analytics status endpoint
    status: () => apiRequest('/api/analytics/status'),
    
    // ✅ ADDED: Bulk events for offline sync
    trackBulk: (events) => apiRequest('/api/analytics/bulk', {
      method: 'POST',
      body: JSON.stringify({ 
        events: events.map(event => ({
          // ✅ FIXED: Ensure each event in bulk has eventType
          eventType: event.eventType || event.type || 'custom',
          type: event.type || event.eventType || 'custom',
          ...event
        }))
      })
    }),
    
    // ✅ ADDED: Get dashboard data
    getDashboard: (days = 30) => apiRequest(`/api/analytics/dashboard?days=${days}`),
    
    // ✅ ADDED: UTM report
    getUTMReport: (options = {}) => {
      const { source, medium, campaign, days = 30 } = options;
      let url = `/api/analytics/utm-report?days=${days}`;
      if (source) url += `&source=${encodeURIComponent(source)}`;
      if (medium) url += `&medium=${encodeURIComponent(medium)}`;
      if (campaign) url += `&campaign=${encodeURIComponent(campaign)}`;
      return apiRequest(url);
    },
    
    // ✅ ADDED: Alternative event endpoint for compatibility
    trackEventAlt: (eventData) => apiRequest('/api/analytics/event', {
      method: 'POST',
      body: JSON.stringify({
        eventType: eventData.eventType || eventData.type || 'custom',
        type: eventData.type || eventData.eventType || 'custom',
        ...eventData,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        language: navigator.language,
        url: window.location.href,
        referrer: document.referrer
      })
    })
  },
  
  // Consent endpoints
  consent: {
    save: (consentData) => apiRequest('/api/consent/save', {
      method: 'POST',
      body: JSON.stringify(consentData)
    }),
    get: () => apiRequest('/api/consent')
  },
  
  // Health and system endpoints
  health: () => apiRequest('/api/health'),
  system: {
    info: () => apiRequest('/api/system/info'),
    status: () => apiRequest('/api/system/status')
  }
};

// ✅ Enhanced API utility functions with analytics support
export const apiUtils = {
  // Test overall API connection
  testConnection: async () => {
    try {
      const health = await blogAPI.health();
      return {
        connected: true,
        status: 'ok',
        message: 'Backend connected successfully',
        data: health
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message,
        code: error.code,
        status: error.status
      };
    }
  },
  
  // Test analytics endpoints specifically - CRITICAL FIX: Updated test data
  testAnalyticsEndpoint: async () => {
    try {
      const testData = {
        eventType: 'test_event',
        type: 'test_event',
        eventName: 'api_test_event',
        sessionId: `test_session_${Date.now()}`,
        url: '/test',
        utm_source: 'api_test',
        utm_medium: 'test'
      };
      
      const response = await blogAPI.analytics.trackEvent(testData);
      return {
        success: true,
        message: 'Analytics endpoint is working',
        response
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.code,
        status: error.status
      };
    }
  },

  // Test contact endpoint specifically
  testContactEndpoint: async () => {
    try {
      const testData = {
        name: 'Test User',
        email: 'test@example.com',
        subject: 'Test Connection',
        message: 'This is a test message to verify the contact endpoint is working.',
        category: 'general'
      };
      
      const response = await blogAPI.contact.submit(testData);
      return {
        success: true,
        message: 'Contact endpoint is working',
        response
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.code,
        status: error.status
      };
    }
  },

  // Test newsletter endpoint
  testNewsletterEndpoint: async () => {
    try {
      const testData = {
        email: 'test@example.com',
        name: 'Test User',
        source: 'website_test',
        utm_source: 'test',
        utm_medium: 'organic',
        utm_campaign: 'test_campaign'
      };
      
      const response = await blogAPI.newsletter.subscribe(testData);
      return {
        success: true,
        message: 'Newsletter endpoint is working',
        response
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.code,
        status: error.status
      };
    }
  },

  // Test posts endpoint
  testPostsEndpoint: async () => {
    try {
      const response = await blogAPI.posts.getAll();
      return {
        success: true,
        message: 'Posts endpoint is working',
        count: response.posts?.length || 0,
        response
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.code,
        status: error.status
      };
    }
  },

  // Test related posts endpoint
  testRelatedPostsEndpoint: async () => {
    try {
      // Get a post ID first to test related posts
      const postsResponse = await blogAPI.posts.getAll();
      if (postsResponse.posts && postsResponse.posts.length > 0) {
        const postId = postsResponse.posts[0]._id;
        const response = await blogAPI.posts.getRelated(postId, { limit: 2 });
        return {
          success: true,
          message: 'Related posts endpoint is working',
          response
        };
      } else {
        return {
          success: true,
          message: 'No posts available to test related posts',
          response: { posts: [] }
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.code,
        status: error.status
      };
    }
  },

  // Comprehensive API health check
  comprehensiveHealthCheck: async () => {
    const results = {
      overall: await apiUtils.testConnection(),
      analytics: await apiUtils.testAnalyticsEndpoint(),
      contact: await apiUtils.testContactEndpoint(),
      newsletter: await apiUtils.testNewsletterEndpoint(),
      posts: await apiUtils.testPostsEndpoint(),
      relatedPosts: await apiUtils.testRelatedPostsEndpoint(),
      timestamp: new Date().toISOString()
    };

    const allServicesWorking = 
      results.overall.connected && 
      results.contact.success && 
      results.newsletter.success && 
      results.posts.success;

    return {
      ...results,
      allServicesWorking,
      summary: allServicesWorking ? 
        'All API services are functioning correctly' : 
        'Some API services are experiencing issues'
    };
  }
};

// ✅ Enhanced: Simple fetch-based functions with analytics fallbacks
export const submitContactForm = async (formData) => {
  try {
    const response = await blogAPI.contact.submit(formData);
    return response;
  } catch (error) {
    console.error('❌ Contact form submission error:', error);
    throw error;
  }
};

export const subscribeToNewsletter = async (subscriberData) => {
  try {
    const response = await blogAPI.newsletter.subscribe(subscriberData);
    return response;
  } catch (error) {
    console.error('❌ Newsletter subscription error:', error);
    throw error;
  }
};

export const fetchPosts = async () => {
  try {
    const response = await blogAPI.posts.getAll();
    return response.posts || [];
  } catch (error) {
    console.error('❌ Posts fetch error:', error);
    throw error;
  }
};

export const fetchPostBySlug = async (slug) => {
  try {
    const response = await blogAPI.posts.getBySlug(slug);
    return response.post || null;
  } catch (error) {
    console.error('❌ Post fetch error:', error);
    throw error;
  }
};

export const fetchRelatedPosts = async (postId, options = {}) => {
  try {
    const response = await blogAPI.posts.getRelated(postId, options);
    return response.posts || [];
  } catch (error) {
    console.error('❌ Related posts fetch error:', error);
    throw error;
  }
};

// ✅ CRITICAL FIX: Enhanced Track post view with proper eventType support
export const trackPostView = async (postId, additionalData = {}) => {
  const trackingData = {
    postId,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    referrer: document.referrer,
    userAgent: navigator.userAgent,
    ...additionalData
  };

  // Try multiple endpoints in sequence
  const endpoints = [
    // Primary endpoint
    () => blogAPI.posts.trackView(postId),
    // Analytics postview endpoint with proper eventType
    () => blogAPI.analytics.trackPostView(postId, {
      ...trackingData,
      eventType: 'post_view', // ✅ Ensure eventType is set
      type: 'post_view'
    }),
    // Generic analytics track endpoint as last resort with proper eventType
    () => blogAPI.analytics.trackEvent({
      eventType: 'post_view',
      type: 'post_view',
      eventName: 'post_view',
      sessionId: `post_${postId}_${Date.now()}`,
      postId,
      ...trackingData
    })
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await endpoint();
      console.log('✅ Post view tracked successfully via fallback', response);
      return response;
    } catch (error) {
      console.warn('⚠️ Post view tracking failed, trying next endpoint:', error.message);
      // Continue to next endpoint
    }
  }

  // If all endpoints fail, log but don't throw to avoid breaking the user experience
  console.error('❌ All post view tracking endpoints failed');
  return { success: false, message: 'Tracking failed but continuing' };
};

// ✅ NEW: Enhanced track function with eventType support
export const trackEvent = async (eventData) => {
  try {
    // Ensure eventType is present
    const dataWithEventType = {
      eventType: eventData.eventType || eventData.type || 'custom',
      type: eventData.type || eventData.eventType || 'custom',
      ...eventData,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      language: navigator.language,
      url: window.location.href,
      referrer: document.referrer
    };

    // Try track endpoint first, then fallback to event endpoint
    try {
      return await blogAPI.analytics.trackEvent(dataWithEventType);
    } catch (error) {
      console.warn('⚠️ Track endpoint failed, trying event endpoint:', error.message);
      return await blogAPI.analytics.trackEventAlt(dataWithEventType);
    }
  } catch (error) {
    console.error('❌ Event tracking failed:', error);
    throw error;
  }
};

// ✅ NEW: Enhanced page view tracking with eventType support
export const trackPageView = async (pageData = {}) => {
  try {
    const dataWithEventType = {
      eventType: 'pageview',
      type: 'pageview',
      eventName: 'page_view',
      ...pageData,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      language: navigator.language,
      url: window.location.href,
      referrer: document.referrer
    };

    return await blogAPI.analytics.trackPageView(dataWithEventType);
  } catch (error) {
    console.error('❌ Page view tracking failed:', error);
    throw error;
  }
};

// ✅ Cache utilities for performance
const apiCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const cachedApiRequest = async (endpoint, options = {}) => {
  // Don't cache analytics or tracking requests
  if (endpoint.includes('/analytics/') || endpoint.includes('/track')) {
    return apiRequest(endpoint, options);
  }

  const cacheKey = `${endpoint}-${JSON.stringify(options)}`;
  const cached = apiCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`📦 Using cached response for: ${endpoint}`);
    return cached.data;
  }

  const data = await apiRequest(endpoint, options);
  apiCache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });

  return data;
};

// ✅ Enhanced retry mechanism for failed requests (excluding analytics)
export const apiRequestWithRetry = async (endpoint, options = {}, maxRetries = 3) => {
  // Don't retry analytics tracking requests to avoid duplicate events
  if (endpoint.includes('/analytics/') && options.method === 'POST') {
    return apiRequest(endpoint, options);
  }

  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 API Attempt ${attempt}/${maxRetries}: ${endpoint}`);
      return await apiRequest(endpoint, options);
    } catch (error) {
      lastError = error;
      
      // Don't retry for client errors (4xx) except 429 (Too Many Requests)
      if (error.status >= 400 && error.status < 500 && error.status !== 429) {
        break;
      }
      
      // Exponential backoff
      if (attempt < maxRetries) {
        const backoffTime = Math.min(1000 * Math.pow(2, attempt), 30000);
        console.log(`⏳ Retrying in ${backoffTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }
    }
  }
  
  throw lastError;
};

// ✅ Batch request utility (excluding analytics)
export const batchApiRequests = async (requests) => {
  // Filter out analytics tracking requests from batching
  const nonTrackingRequests = requests.filter(request => 
    !request.url?.includes('/analytics/') && 
    !(request.options?.body && JSON.parse(request.options.body).eventType)
  );

  const trackingRequests = requests.filter(request => 
    request.url?.includes('/analytics/') || 
    (request.options?.body && JSON.parse(request.options.body).eventType)
  );

  // Process tracking requests separately (no batching)
  const trackingResults = await Promise.allSettled(
    trackingRequests.map(req => apiRequest(req.url, req.options))
  );

  // Process non-tracking requests in batch
  const nonTrackingResults = await Promise.allSettled(nonTrackingRequests);

  const allResults = [...trackingResults, ...nonTrackingResults];
  
  const successful = allResults.filter(result => result.status === 'fulfilled').map(result => result.value);
  const failed = allResults.filter(result => result.status === 'rejected').map(result => result.reason);
  
  return {
    successful,
    failed,
    total: requests.length,
    successCount: successful.length,
    failureCount: failed.length
  };
};

// ✅ Environment detection helpers
export const environment = {
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  current: process.env.NODE_ENV || 'development'
};

// ✅ Enhanced API configuration
export const apiConfig = {
  baseUrl: API_BASE_URL,
  timeout: 10000, // 10 seconds
  retries: 3,
  cacheDuration: CACHE_DURATION,
  endpoints: {
    contact: '/api/contact',
    newsletter: '/api/newsletter',
    posts: '/api/posts',
    analytics: '/api/analytics',
    health: '/api/health'
  },
  features: {
    analytics: true,
    caching: true,
    retry: true,
    batch: true,
    offlineStorage: typeof localStorage !== 'undefined'
  }
};

// ✅ Enhanced analytics utilities with eventType support
export const analyticsUtils = {
  // Test analytics connection
  testAnalytics: async () => {
    try {
      const response = await blogAPI.analytics.test();
      return {
        connected: true,
        message: 'Analytics API is working',
        data: response
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message,
        code: error.code
      };
    }
  },

  // Get analytics health
  getAnalyticsHealth: async () => {
    try {
      const response = await blogAPI.analytics.health();
      return {
        healthy: true,
        data: response
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  },

  // Get analytics database status
  getAnalyticsDbStatus: async () => {
    try {
      const response = await blogAPI.analytics.dbStatus();
      return {
        connected: true,
        data: response
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message
      };
    }
  },

  // Get analytics overall status
  getAnalyticsStatus: async () => {
    try {
      const response = await blogAPI.analytics.status();
      return {
        operational: true,
        data: response
      };
    } catch (error) {
      return {
        operational: false,
        error: error.message
      };
    }
  },

  // Queue events for offline processing with eventType support
  queueEvent: (eventData) => {
    if (typeof localStorage !== 'undefined') {
      try {
        const queue = JSON.parse(localStorage.getItem('analyticsQueue') || '[]');
        queue.push({
          // ✅ FIXED: Ensure eventType is included in queued events
          eventType: eventData.eventType || eventData.type || 'custom',
          type: eventData.type || eventData.eventType || 'custom',
          ...eventData,
          queuedAt: new Date().toISOString()
        });
        localStorage.setItem('analyticsQueue', JSON.stringify(queue));
        console.log('📦 Analytics event queued for offline processing');
        return true;
      } catch (error) {
        console.error('Failed to queue analytics event:', error);
        return false;
      }
    }
    return false;
  },

  // Process queued events with eventType support
  processQueuedEvents: async () => {
    if (typeof localStorage !== 'undefined') {
      try {
        const queue = JSON.parse(localStorage.getItem('analyticsQueue') || '[]');
        if (queue.length === 0) return { processed: 0, failed: 0 };

        console.log(`🔄 Processing ${queue.length} queued analytics events`);
        
        const results = await batchApiRequests(
          queue.map(event => ({
            url: '/api/analytics/track',
            options: {
              method: 'POST',
              body: JSON.stringify(event)
            }
          }))
        );

        // Remove successfully processed events
        if (results.successCount > 0) {
          const remainingQueue = queue.slice(results.successCount);
          localStorage.setItem('analyticsQueue', JSON.stringify(remainingQueue));
        }

        return {
          processed: results.successCount,
          failed: results.failureCount,
          total: queue.length
        };
      } catch (error) {
        console.error('Failed to process queued events:', error);
        return { processed: 0, failed: 0, error: error.message };
      }
    }
    return { processed: 0, failed: 0 };
  }
};

// ✅ Enhanced API initialization with analytics
export const initializeAPI = async () => {
  console.log('🔧 Initializing API...');
  console.log(`🌐 API Base URL: ${API_BASE_URL}`);
  console.log(`🏷️ Environment: ${environment.current}`);
  
  try {
    const health = await apiUtils.testConnection();
    
    if (health.connected) {
      console.log('✅ API initialized successfully');
      
      // Test analytics specifically with enhanced checks
      const analyticsHealth = await analyticsUtils.testAnalytics();
      const analyticsDbStatus = await analyticsUtils.getAnalyticsDbStatus();
      const analyticsStatus = await analyticsUtils.getAnalyticsStatus();
      
      if (analyticsHealth.connected && analyticsDbStatus.connected && analyticsStatus.operational) {
        console.log('✅ Analytics API is fully operational');
      } else {
        console.warn('⚠️ Analytics API has issues:', {
          health: analyticsHealth.connected,
          database: analyticsDbStatus.connected,
          status: analyticsStatus.operational
        });
      }

      // Process any queued analytics events
      if (environment.isProduction) {
        setTimeout(async () => {
          const queueResult = await analyticsUtils.processQueuedEvents();
          if (queueResult.processed > 0) {
            console.log(`✅ Processed ${queueResult.processed} queued analytics events`);
          }
        }, 3000);
      }
      
      // Run comprehensive health check in production
      if (environment.isProduction) {
        setTimeout(async () => {
          const comprehensiveCheck = await apiUtils.comprehensiveHealthCheck();
          console.log('📊 Comprehensive API Health Check:', comprehensiveCheck);
        }, 5000);
      }
    } else {
      console.warn('⚠️ API connection issues detected');
    }
    
    return health;
  } catch (error) {
    console.error('❌ API initialization failed:', error);
    throw error;
  }
};

export default blogAPI;