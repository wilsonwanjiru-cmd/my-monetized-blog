// frontend/src/utils/analyticsSafeFetch.js
// Safe fetch wrapper to prevent JSON parse errors

export const safeFetch = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      ...options,
      timeout: 8000 // 8 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Check if response has content
    const contentLength = response.headers.get('content-length');
    if (contentLength === '0') {
      return { success: true, message: 'Empty response' };
    }

    // Try to parse JSON, but handle empty responses
    const text = await response.text();
    if (!text || text.trim() === '') {
      return { success: true, message: 'Empty response body' };
    }

    try {
      return JSON.parse(text);
    } catch (parseError) {
      console.warn('JSON parse error, returning safe fallback:', parseError);
      return { 
        success: true, 
        message: 'Non-JSON response handled',
        rawText: text.substring(0, 100) // First 100 chars for debugging
      };
    }
  } catch (error) {
    console.warn('Fetch error, returning safe fallback:', error);
    return {
      success: false,
      error: error.message,
      fallback: true
    };
  }
};

// Enhanced trackEvent with safe fetch
export const safeTrackEvent = async (eventData) => {
  const API_BASE = window.APP_CONFIG?.API_BASE_URL || 'https://api.wilsonmuita.com';
  
  try {
    const result = await safeFetch(`${API_BASE}/api/analytics/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData)
    });

    if (!result.success) {
      console.warn('Analytics tracking failed gracefully');
    }
    
    return result;
  } catch (error) {
    console.warn('Analytics tracking error handled gracefully');
    return { success: false, error: error.message };
  }
};