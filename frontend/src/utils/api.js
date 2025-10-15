// frontend/src/utils/api.js

// ✅ Get API base URL from configuration with fallbacks
const getApiBaseUrl = () => {
  // Priority 1: Runtime configuration from config.js
  if (window.getConfig) {
    return window.getConfig('API_BASE_URL') || window.getConfig('REACT_APP_API_URL');
  }
  
  // Priority 2: Window environment variable
  if (window._env_ && window._env_.API_BASE_URL) {
    return window._env_.API_BASE_URL;
  }
  
  // Priority 3: Process environment (for build time)
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Priority 4: Default based on environment
  return process.env.NODE_ENV === "production" 
    ? "https://api.wilsonmuita.com" 
    : "http://localhost:5000";
};

const API_BASE_URL = getApiBaseUrl();

// ✅ API Configuration
const API_CONFIG = {
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
};

// ✅ Request interceptor to add auth headers and handle errors
const requestInterceptor = (config) => {
  // Add timestamp to avoid caching
  config.params = {
    ...config.params,
    _t: Date.now(),
  };

  // Add content type if not set
  if (!config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'application/json';
  }

  // Add authentication token if available
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  console.log(`🚀 API Call: ${config.method?.toUpperCase()} ${config.url}`);
  return config;
};

// ✅ Response interceptor to handle common errors
const responseInterceptor = (response) => {
  console.log(`✅ API Success: ${response.status} ${response.config.url}`);
  return response.data;
};

const errorInterceptor = async (error) => {
  console.error(`❌ API Error:`, error);

  // Network error or server unavailable
  if (!error.response) {
    throw {
      message: 'Network error. Please check your connection.',
      code: 'NETWORK_ERROR',
      status: 0,
    };
  }

  const { status, data } = error.response;

  // Handle specific HTTP status codes
  switch (status) {
    case 401:
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('auth_token');
      window.dispatchEvent(new Event('unauthorized'));
      break;
    
    case 403:
      throw {
        message: 'You do not have permission to perform this action.',
        code: 'FORBIDDEN',
        status,
        ...data,
      };
    
    case 404:
      throw {
        message: 'The requested resource was not found.',
        code: 'NOT_FOUND',
        status,
        ...data,
      };
    
    case 429:
      throw {
        message: 'Too many requests. Please try again later.',
        code: 'RATE_LIMITED',
        status,
        ...data,
      };
    
    case 500:
      throw {
        message: 'Internal server error. Please try again later.',
        code: 'SERVER_ERROR',
        status,
        ...data,
      };
    
    default:
      throw {
        message: data?.message || 'An unexpected error occurred.',
        code: 'UNKNOWN_ERROR',
        status,
        ...data,
      };
  }

  throw data;
};

// ✅ Retry mechanism for failed requests
const retryRequest = async (fn, retries = API_CONFIG.retryAttempts, delay = API_CONFIG.retryDelay) => {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0 && error.code !== 401 && error.code !== 403) {
      console.log(`🔄 Retrying request... ${retries} attempts left`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryRequest(fn, retries - 1, delay * 2); // Exponential backoff
    }
    throw error;
  }
};

// ✅ Core API request function
const apiRequest = async (endpoint, options = {}) => {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  const config = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // Apply request interceptor
  const interceptedConfig = requestInterceptor(config);

  const requestFn = async () => {
    const response = await fetch(url, interceptedConfig);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        response: {
          status: response.status,
          statusText: response.statusText,
          data: errorData,
          config: interceptedConfig,
        },
      };
    }

    const data = await response.json().catch(() => null);
    return { data, status: response.status, headers: response.headers };
  };

  try {
    const result = await retryRequest(requestFn);
    return responseInterceptor(result);
  } catch (error) {
    throw await errorInterceptor(error);
  }
};

// ✅ HTTP Method Shortcuts
const api = {
  // GET request
  get: (endpoint, params = {}, options = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return apiRequest(url, { ...options, method: 'GET' });
  },

  // POST request
  post: (endpoint, data = {}, options = {}) => {
    return apiRequest(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // PUT request
  put: (endpoint, data = {}, options = {}) => {
    return apiRequest(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // PATCH request
  patch: (endpoint, data = {}, options = {}) => {
    return apiRequest(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // DELETE request
  delete: (endpoint, options = {}) => {
    return apiRequest(endpoint, { ...options, method: 'DELETE' });
  },

  // Upload file
  upload: (endpoint, formData, options = {}) => {
    return apiRequest(endpoint, {
      ...options,
      method: 'POST',
      body: formData,
      headers: {
        // Let browser set Content-Type with boundary for FormData
        ...(options.headers || {}),
      },
    });
  },
};

// ✅ Specific API endpoints for your blog
export const blogAPI = {
  // Posts
  posts: {
    getAll: (params = {}) => api.get('/api/posts', params),
    getBySlug: (slug) => api.get(`/api/posts/slug/${slug}`),
    getById: (id) => api.get(`/api/posts/id/${id}`),
    getByCategory: (category, params = {}) => api.get(`/api/posts/category/${category}`, params),
    getByTag: (tag, params = {}) => api.get(`/api/posts/tag/${tag}`, params),
    getPopular: (limit = 5, range = 'all') => api.get('/api/posts/popular/posts', { limit, range }),
    getRelated: (postId) => api.get(`/api/posts/related/${postId}`),
    getRelatedBySlug: (slug) => api.get(`/api/posts/related/slug/${slug}`),
    search: (query, params = {}) => api.get(`/api/posts/search/${encodeURIComponent(query)}`, params),
    create: (postData) => api.post('/api/posts', postData),
    update: (id, postData) => api.put(`/api/posts/${id}`, postData),
    delete: (id) => api.delete(`/api/posts/${id}`),
    trackView: (id) => api.post(`/api/posts/${id}/view`),
  },

  // Analytics
  analytics: {
    track: (eventData) => api.post('/api/analytics/track', eventData),
    trackPerformance: (performanceData) => api.post('/api/analytics/performance', performanceData),
    trackError: (errorData) => api.post('/api/analytics/errors', errorData),
  },

  // Newsletter
  newsletter: {
    subscribe: (email, preferences = {}) => api.post('/api/newsletter/subscribe', { email, preferences }),
    unsubscribe: (email) => api.post('/api/newsletter/unsubscribe', { email }),
  },

  // Contact
  contact: {
    submit: (contactData) => api.post('/api/contact', contactData),
  },

  // Consent
  consent: {
    get: () => api.get('/api/consent'),
    update: (consentData) => api.post('/api/consent', consentData),
  },

  // Health check
  health: () => api.get('/api/health'),
};

// ✅ Utility functions
export const apiUtils = {
  // Test API connection
  testConnection: async () => {
    try {
      const health = await blogAPI.health();
      return {
        connected: true,
        status: health.status,
        message: health.message,
        environment: health.environment,
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message,
        code: error.code,
      };
    }
  },

  // Get API status
  getStatus: () => ({
    baseURL: API_BASE_URL,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  }),

  // Set auth token
  setAuthToken: (token) => {
    localStorage.setItem('auth_token', token);
  },

  // Clear auth token
  clearAuthToken: () => {
    localStorage.removeItem('auth_token');
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('auth_token');
  },
};

// ✅ Export main API instance and configuration
export { API_BASE_URL, API_CONFIG, apiRequest };
export default api;

// ✅ Initialize API connection on import
console.log('🔗 API Configuration:', {
  baseURL: API_BASE_URL,
  environment: process.env.NODE_ENV,
  configSource: window.getConfig ? 'runtime' : (window._env_ ? 'window_env' : 'process_env'),
});

// ✅ Auto-test connection in development
if (process.env.NODE_ENV === 'development') {
  apiUtils.testConnection().then(result => {
    if (result.connected) {
      console.log('✅ Backend connection successful:', result);
    } else {
      console.warn('⚠️ Backend connection failed:', result);
    }
  });
}