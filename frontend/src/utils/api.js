// frontend/src/utils/api.js

const getApiBaseUrl = () => {
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:5000";
  }
  return "https://api.wilsonmuita.com";
};

const API_BASE_URL = getApiBaseUrl();

// ✅ Simplified and robust API utility
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

  console.log(`🚀 API Call: ${config.method} ${url}`);

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
      
      throw {
        message: errorData.message || `HTTP error! status: ${response.status}`,
        status: response.status,
        data: errorData
      };
    }

    const data = await response.json();
    console.log(`✅ API Success: ${url}`, data);
    return data;
    
  } catch (error) {
    console.error(`❌ API Error (${url}):`, error);
    
    // Handle network errors
    if (error.message && error.message.includes('Failed to fetch')) {
      throw {
        message: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR',
        status: 0
      };
    }
    
    // Re-throw the error with proper structure
    throw {
      message: error.message || 'An unexpected error occurred',
      code: error.code || 'UNKNOWN_ERROR',
      status: error.status,
      ...error
    };
  }
};

// ✅ Blog API endpoints
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
    
    // ✅ ADDED: Related posts endpoint
    getRelated: (postId, options = {}) => {
      const { limit = 3, category, tags } = options;
      let url = `/api/posts/related/${postId}?limit=${limit}`;
      if (category) url += `&category=${encodeURIComponent(category)}`;
      if (tags) url += `&tags=${encodeURIComponent(tags)}`;
      return apiRequest(url);
    },
    
    // ✅ ADDED: Track post view
    trackView: (postId) => apiRequest(`/api/posts/${postId}/view`, {
      method: 'POST',
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        url: window.location.href,
        referrer: document.referrer
      })
    }),
    
    // ✅ ADDED: Get post analytics
    getAnalytics: (postId) => apiRequest(`/api/posts/${postId}/analytics`),
    
    // ✅ ADDED: Like/unlike post
    like: (postId) => apiRequest(`/api/posts/${postId}/like`, {
      method: 'POST'
    }),
    unlike: (postId) => apiRequest(`/api/posts/${postId}/unlike`, {
      method: 'POST'
    })
  },
  
  // ✅ Contact API endpoints
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
  
  // ✅ UPDATED: Newsletter endpoints with full subscriber data
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
  
  // Analytics endpoints
  analytics: {
    trackEvent: (eventData) => apiRequest('/api/analytics/track', {
      method: 'POST',
      body: JSON.stringify(eventData)
    }),
    trackPageView: (pageData) => apiRequest('/api/analytics/pageview', {
      method: 'POST',
      body: JSON.stringify(pageData)
    }),
    getStats: () => apiRequest('/api/analytics/stats'),
    
    // ✅ ADDED: Post-specific analytics
    trackPostView: (postId, data = {}) => apiRequest('/api/analytics/postview', {
      method: 'POST',
      body: JSON.stringify({
        postId,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        referrer: document.referrer,
        ...data
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

// ✅ Simple API utility functions
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

// ✅ Alternative: Simple fetch-based functions for specific use cases
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

export const trackPostView = async (postId, additionalData = {}) => {
  try {
    // Try the dedicated posts track view first
    const response = await blogAPI.posts.trackView(postId);
    return response;
  } catch (error) {
    console.warn('❌ Post track view failed, falling back to analytics:', error);
    // Fallback to analytics endpoint
    try {
      const fallbackResponse = await blogAPI.analytics.trackPostView(postId, additionalData);
      return fallbackResponse;
    } catch (fallbackError) {
      console.error('❌ Analytics track view also failed:', fallbackError);
      throw fallbackError;
    }
  }
};

// ✅ Cache utilities for performance
const apiCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const cachedApiRequest = async (endpoint, options = {}) => {
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

// ✅ Retry mechanism for failed requests
export const apiRequestWithRetry = async (endpoint, options = {}, maxRetries = 3) => {
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

// ✅ Batch request utility
export const batchApiRequests = async (requests) => {
  const results = await Promise.allSettled(requests);
  
  const successful = results.filter(result => result.status === 'fulfilled').map(result => result.value);
  const failed = results.filter(result => result.status === 'rejected').map(result => result.reason);
  
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

// ✅ API configuration
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
  }
};

// ✅ Initialize API on app startup
export const initializeAPI = async () => {
  console.log('🔧 Initializing API...');
  console.log(`🌐 API Base URL: ${API_BASE_URL}`);
  console.log(`🏷️ Environment: ${environment.current}`);
  
  try {
    const health = await apiUtils.testConnection();
    
    if (health.connected) {
      console.log('✅ API initialized successfully');
      
      // Run comprehensive health check in production
      if (environment.isProduction) {
        setTimeout(async () => {
          const comprehensiveCheck = await apiUtils.comprehensiveHealthCheck();
          console.log('📊 Comprehensive API Health Check:', comprehensiveCheck);
        }, 2000);
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