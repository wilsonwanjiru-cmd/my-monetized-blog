// frontend/src/utils/utmTracker.js
import API_BASE_URL from './api';

/**
 * Comprehensive UTM Tracking Utility
 * Handles affiliate links, campaign tracking, and automatic parameter injection
 */

// UTM Configuration
const UTM_CONFIG = {
  defaultSource: 'yourblog',
  defaultMedium: 'content',
  defaultCampaign: 'blog_post',
  affiliateMedium: 'affiliate',
  referralMedium: 'referral',
  socialMedium: 'social'
};

// Global session management
let currentSessionId = null;

/**
 * Initialize UTM tracking and session management
 */
export const initUTMTracking = () => {
  if (typeof document === 'undefined') return;

  currentSessionId = getSessionId();
  
  // Track page view with UTM parameters
  trackPageView();
  
  // Auto-enhance external links
  enhanceExternalLinks();
  
  // Auto-enhance affiliate links
  enhanceAffiliateLinks();
  
  console.log('🔗 UTM Tracking initialized with session:', currentSessionId);
};

/**
 * Add UTM parameters to any URL with comprehensive tracking
 */
export const addUTMParams = (
  url, 
  source = UTM_CONFIG.defaultSource, 
  medium = UTM_CONFIG.defaultMedium, 
  campaign = UTM_CONFIG.defaultCampaign,
  content = '',
  term = ''
) => {
  if (!url || typeof url !== 'string') {
    console.warn('UTM Tracking: Invalid URL provided', url);
    return url;
  }

  try {
    // Handle relative URLs
    const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
    const urlObj = new URL(fullUrl);
    
    const utmParams = {
      utm_source: source,
      utm_medium: medium,
      utm_campaign: campaign || UTM_CONFIG.defaultCampaign,
      utm_content: content || getDefaultContent(),
      utm_term: term || getDefaultTerm()
    };

    // Add only non-empty parameters
    Object.entries(utmParams).forEach(([key, value]) => {
      if (value && !urlObj.searchParams.has(key)) {
        urlObj.searchParams.set(key, value);
      }
    });

    return urlObj.toString();
  } catch (error) {
    console.warn('UTM Tracking: Error processing URL', url, error);
    return url;
  }
};

/**
 * Track page view with UTM parameters from URL
 */
export const trackPageView = async () => {
  const utmParams = getCurrentUTMParams();
  const pageData = {
    eventType: 'pageview',
    url: window.location.href,
    sessionId: currentSessionId,
    ...utmParams,
    metadata: {
      referrer: document.referrer,
      title: document.title,
      path: window.location.pathname
    }
  };

  try {
    await sendToAnalyticsAPI(pageData);
  } catch (error) {
    console.warn('Page view tracking failed:', error);
  }
};

/**
 * Track affiliate link clicks
 */
export const trackAffiliateClick = async (data) => {
  const eventData = {
    eventType: 'affiliate_click',
    url: data.url,
    sessionId: currentSessionId,
    utmSource: UTM_CONFIG.defaultSource,
    utmMedium: UTM_CONFIG.affiliateMedium,
    utmCampaign: data.product?.replace(/\s+/g, '_').toLowerCase() || 'affiliate_product',
    utmContent: data.position,
    utmTerm: data.product,
    metadata: {
      product: data.product,
      position: data.position,
      linkText: data.text,
      elementId: data.elementId
    }
  };

  try {
    await sendToAnalyticsAPI(eventData);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('📊 Affiliate Click:', eventData);
    }
  } catch (error) {
    console.warn('Affiliate click tracking failed:', error);
  }
};

/**
 * Track outbound link clicks
 */
export const trackOutboundClick = async (data) => {
  const eventData = {
    eventType: 'click',
    url: data.originalUrl,
    sessionId: currentSessionId,
    utmSource: data.utmSource || UTM_CONFIG.defaultSource,
    utmMedium: data.utmMedium || UTM_CONFIG.referralMedium,
    utmCampaign: data.campaign || 'outbound',
    utmContent: data.content,
    utmTerm: data.term,
    metadata: {
      element: data.element,
      text: data.text,
      isExternal: true,
      isAffiliate: data.isAffiliate || false
    }
  };

  try {
    await sendToAnalyticsAPI(eventData);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔗 Outbound Click:', eventData);
    }
  } catch (error) {
    console.warn('Outbound click tracking failed:', error);
  }
};

/**
 * Track social media shares
 */
export const trackSocialShare = async (platform, url, campaign = 'social_share') => {
  const eventData = {
    eventType: 'social_share',
    url: url,
    sessionId: currentSessionId,
    utmSource: UTM_CONFIG.defaultSource,
    utmMedium: UTM_CONFIG.socialMedium,
    utmCampaign: campaign,
    utmContent: platform,
    metadata: {
      platform: platform,
      sharedUrl: url
    }
  };

  try {
    await sendToAnalyticsAPI(eventData);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('📤 Social Share:', eventData);
    }
  } catch (error) {
    console.warn('Social share tracking failed:', error);
  }
};

/**
 * Auto-enhance external links with UTM parameters
 */
const enhanceExternalLinks = () => {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="http"]');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href) return;

    try {
      const url = new URL(href);
      const isInternal = url.hostname === window.location.hostname;
      
      // Skip if already has UTM params or is internal
      if (isInternal || url.searchParams.has('utm_source')) {
        return;
      }

      const isAffiliate = link.classList.contains('affiliate-link') || 
                         link.getAttribute('rel')?.includes('sponsored');
      
      let medium = UTM_CONFIG.referralMedium;
      let campaign = 'outbound';
      let content = 'auto_enhanced';

      if (isAffiliate) {
        medium = UTM_CONFIG.affiliateMedium;
        campaign = link.getAttribute('data-affiliate-product') || 'affiliate';
        content = link.getAttribute('data-affiliate-position') || 'unknown';
      }

      const trackedUrl = addUTMParams(
        href,
        UTM_CONFIG.defaultSource,
        medium,
        campaign,
        content
      );

      // Update the link href
      link.setAttribute('href', trackedUrl);
      
      // Track the click
      trackOutboundClick({
        originalUrl: href,
        trackedUrl,
        utmSource: UTM_CONFIG.defaultSource,
        utmMedium: medium,
        campaign,
        content,
        element: link.tagName,
        text: link.textContent?.substring(0, 100),
        isAffiliate
      });
    } catch (error) {
      console.warn('UTM Tracking: Error processing link', href, error);
    }
  });
};

/**
 * Auto-enhance affiliate links
 */
const enhanceAffiliateLinks = () => {
  // Enhance existing affiliate links
  const affiliateLinks = document.querySelectorAll('a[href*="amazon"], a[href*="partner"], a[data-affiliate]');
  
  affiliateLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;

    const product = link.getAttribute('data-affiliate-product') || 
                   extractProductFromUrl(href);
    const position = link.getAttribute('data-affiliate-position') || 'content';

    const trackedUrl = addUTMParams(
      href,
      UTM_CONFIG.defaultSource,
      UTM_CONFIG.affiliateMedium,
      product?.replace(/\s+/g, '_').toLowerCase() || 'affiliate_product',
      position,
      product
    );

    link.setAttribute('href', trackedUrl);
    link.setAttribute('rel', 'sponsored noopener noreferrer');
    link.setAttribute('target', '_blank');
    
    if (!link.classList.contains('affiliate-link')) {
      link.classList.add('affiliate-link');
    }

    // Add click listener for tracking
    link.addEventListener('click', (e) => {
      trackAffiliateClick({
        url: trackedUrl,
        product,
        position,
        text: link.textContent?.substring(0, 100),
        elementId: link.id
      });
    });
  });
};

/**
 * Send analytics data to backend API
 */
const sendToAnalyticsAPI = async (data) => {
  // Don't send analytics in development unless explicitly enabled
  if (process.env.NODE_ENV !== 'production' && !process.env.REACT_APP_ANALYTICS_DEV) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/analytics/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Analytics API responded with status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.warn('Analytics API request failed:', error);
    throw error;
  }
};

/**
 * Generate or retrieve session ID
 */
const getSessionId = () => {
  if (typeof window === 'undefined') return 'server-side';
  
  let sessionId = sessionStorage.getItem('blog_session_id');
  if (!sessionId) {
    sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem('blog_session_id', sessionId);
  }
  return sessionId;
};

/**
 * Get default UTM content based on current page
 */
const getDefaultContent = () => {
  if (typeof window === 'undefined') return 'server_side';
  
  const path = window.location.pathname;
  const date = new Date().toISOString().split('T')[0];
  return `${path.replace(/\//g, '_')}_${date}`;
};

/**
 * Get default UTM term based on page content
 */
const getDefaultTerm = () => {
  if (typeof window === 'undefined') return '';
  
  const title = document.title || '';
  const h1 = document.querySelector('h1')?.textContent || '';
  return `${title} ${h1}`.trim().substring(0, 50);
};

/**
 * Extract product name from affiliate URL
 */
const extractProductFromUrl = (url) => {
  try {
    const urlObj = new URL(url);
    // Common affiliate URL patterns
    if (url.includes('amazon')) {
      return urlObj.pathname.split('/').find(part => part.length > 10) || 'amazon_product';
    }
    return 'affiliate_product';
  } catch {
    return 'affiliate_product';
  }
};

/**
 * Manual UTM parameter extraction for analytics
 */
export const getCurrentUTMParams = () => {
  if (typeof window === 'undefined') return {};
  
  const params = new URLSearchParams(window.location.search);
  const utmParams = {
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    utm_content: params.get('utm_content'),
    utm_term: params.get('utm_term')
  };

  // Store UTM parameters in session storage for future events
  if (Object.values(utmParams).some(value => value !== null)) {
    sessionStorage.setItem('utm_params', JSON.stringify(utmParams));
  }

  return utmParams;
};

/**
 * Check if current visit came from a UTM campaign
 */
export const hasUTMParams = () => {
  const params = getCurrentUTMParams();
  return Object.values(params).some(value => value !== null);
};

/**
 * Get stored UTM parameters from session
 */
export const getStoredUTMParams = () => {
  if (typeof window === 'undefined') return {};
  
  try {
    const stored = sessionStorage.getItem('utm_params');
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

/**
 * Clean URL by removing UTM parameters
 */
export const removeUTMParams = (url) => {
  try {
    const urlObj = new URL(url);
    const paramsToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
    
    paramsToRemove.forEach(param => {
      urlObj.searchParams.delete(param);
    });
    
    return urlObj.toString();
  } catch (error) {
    console.warn('UTM Cleaning: Error processing URL', url, error);
    return url;
  }
};

/**
 * Get current session ID
 */
export const getCurrentSessionId = () => currentSessionId;

export default {
  initUTMTracking,
  addUTMParams,
  trackPageView,
  trackAffiliateClick,
  trackOutboundClick,
  trackSocialShare,
  getCurrentUTMParams,
  getStoredUTMParams,
  hasUTMParams,
  removeUTMParams,
  getCurrentSessionId
};