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
  posts: {
    getAll: () => apiRequest('/api/posts'),
    getBySlug: (slug) => apiRequest(`/api/posts/slug/${slug}`),
    getPublished: () => apiRequest('/api/posts/published'),
    getByCategory: (category) => apiRequest(`/api/posts/category/${category}`),
    getByTag: (tag) => apiRequest(`/api/posts/tag/${tag}`),
  },
  
  // Remove analytics for now since they're causing 404 errors
  health: () => apiRequest('/api/health'),
};

// ✅ Simple API utility functions
export const apiUtils = {
  testConnection: async () => {
    try {
      const health = await blogAPI.health();
      return {
        connected: true,
        status: 'ok',
        message: 'Backend connected successfully'
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message,
        code: error.code,
      };
    }
  },
};

export default blogAPI;