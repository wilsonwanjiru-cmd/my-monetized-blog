// frontend/src/utils/utmTracker.js
import { blogAPI } from './api';

/**
 * Comprehensive UTM Tracking Utility
 * Handles affiliate links, campaign tracking, and automatic parameter injection
 * Updated for Wilson Muita blog with enhanced features
 */

// ✅ UPDATED: UTM Configuration with new domain
const UTM_CONFIG = {
  defaultSource: 'wilsonmuita',
  defaultMedium: 'content',
  defaultCampaign: 'blog_post',
  affiliateMedium: 'affiliate',
  referralMedium: 'referral',
  socialMedium: 'social',
  emailMedium: 'email',
  siteUrl: 'https://wilsonmuita.com',
  siteName: 'Wilson Muita'
};

// Global session management
let currentSessionId = null;
let isInitialized = false;

/**
 * Initialize UTM tracking and session management
 */
export const initUTMTracking = () => {
  if (typeof document === 'undefined' || isInitialized) return;

  currentSessionId = getSessionId();
  isInitialized = true;
  
  // Track page view with UTM parameters
  trackPageView();
  
  // Auto-enhance external links
  enhanceExternalLinks();
  
  // Auto-enhance affiliate links
  enhanceAffiliateLinks();
  
  // Track social share buttons
  enhanceSocialShares();
  
  // Track email links
  enhanceEmailLinks();
  
  console.log('🔗 UTM Tracking initialized for Wilson Muita with session:', currentSessionId);
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
    // Handle relative URLs - check if window is available
    const isBrowser = typeof window !== 'undefined';
    const fullUrl = url.startsWith('http') ? url : 
      `${isBrowser ? window.location.origin : UTM_CONFIG.siteUrl}${url.startsWith('/') ? '' : '/'}${url}`;
    
    const urlObj = new URL(fullUrl);
    
    const utmParams = {
      utm_source: source,
      utm_medium: medium,
      utm_campaign: campaign || UTM_CONFIG.defaultCampaign,
      utm_content: content || getDefaultContent(),
      utm_term: term || getDefaultTerm(),
      utm_id: currentSessionId
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
  // Check if we're in a browser environment
  if (typeof window === 'undefined') return;

  const utmParams = getCurrentUTMParams();
  
  // ✅ FIXED: Use window.screen instead of global screen object
  const screenResolution = typeof window !== 'undefined' && window.screen ? 
    `${window.screen.width}x${window.screen.height}` : 'unknown';
  
  const pageData = {
    eventType: 'pageview',
    url: window.location.href,
    sessionId: currentSessionId,
    ...utmParams,
    metadata: {
      referrer: document.referrer,
      title: document.title,
      path: window.location.pathname,
      hostname: window.location.hostname,
      userAgent: navigator.userAgent,
      language: navigator.language,
      screenResolution: screenResolution // ✅ Fixed ESLint error
    }
  };

  try {
    await sendToAnalyticsAPI(pageData);
    
    // Store UTM parameters for future events
    if (Object.values(utmParams).some(value => value !== null)) {
      sessionStorage.setItem('wilsonmuita_utm_params', JSON.stringify(utmParams));
    }
  } catch (error) {
    console.warn('Page view tracking failed:', error);
  }
};

/**
 * Track affiliate link clicks with enhanced product tracking
 */
export const trackAffiliateClick = async (data) => {
  const eventData = {
    eventType: 'affiliate_click',
    url: data.url,
    sessionId: currentSessionId,
    utmSource: UTM_CONFIG.defaultSource,
    utmMedium: UTM_CONFIG.affiliateMedium,
    utmCampaign: data.product?.replace(/\s+/g, '_').toLowerCase() || 'affiliate_product',
    utmContent: data.position || 'content',
    utmTerm: data.product,
    metadata: {
      product: data.product,
      position: data.position,
      linkText: data.text,
      elementId: data.elementId,
      category: data.category,
      price: data.price,
      vendor: data.vendor,
      commissionRate: data.commissionRate
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
 * Track outbound link clicks with enhanced analytics
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
      isAffiliate: data.isAffiliate || false,
      linkType: data.linkType || 'general',
      destination: new URL(data.originalUrl).hostname
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
 * Track social media shares with platform-specific campaigns
 */
export const trackSocialShare = async (platform, url, campaign = 'social_share', content = '') => {
  const eventData = {
    eventType: 'social_share',
    url: url,
    sessionId: currentSessionId,
    utmSource: UTM_CONFIG.defaultSource,
    utmMedium: UTM_CONFIG.socialMedium,
    utmCampaign: campaign,
    utmContent: content || platform,
    metadata: {
      platform: platform,
      sharedUrl: url,
      shareMethod: 'manual',
      timestamp: new Date().toISOString()
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
 * Track email link clicks
 */
export const trackEmailClick = async (data) => {
  const eventData = {
    eventType: 'email_click',
    url: data.url,
    sessionId: currentSessionId,
    utmSource: UTM_CONFIG.defaultSource,
    utmMedium: UTM_CONFIG.emailMedium,
    utmCampaign: data.campaign || 'newsletter',
    utmContent: data.content,
    utmTerm: data.term,
    metadata: {
      emailType: data.emailType,
      subject: data.subject,
      linkPosition: data.position
    }
  };

  try {
    await sendToAnalyticsAPI(eventData);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('📧 Email Click:', eventData);
    }
  } catch (error) {
    console.warn('Email click tracking failed:', error);
  }
};

/**
 * Track custom events with UTM parameters
 */
export const trackCustomEvent = async (eventName, data = {}) => {
  const eventData = {
    eventType: eventName,
    sessionId: currentSessionId,
    utmSource: UTM_CONFIG.defaultSource,
    utmMedium: data.medium || UTM_CONFIG.defaultMedium,
    utmCampaign: data.campaign || 'custom_event',
    utmContent: data.content,
    utmTerm: data.term,
    metadata: {
      ...data.metadata,
      customData: data.customData,
      timestamp: new Date().toISOString()
    }
  };

  try {
    await sendToAnalyticsAPI(eventData);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('🎯 Custom Event:', eventData);
    }
  } catch (error) {
    console.warn('Custom event tracking failed:', error);
  }
};

/**
 * Auto-enhance external links with UTM parameters
 */
const enhanceExternalLinks = () => {
  // Only run in browser environment
  if (typeof document === 'undefined') return;

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="http"]');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href) return;

    try {
      const url = new URL(href);
      const isInternal = url.hostname === window.location.hostname || 
                        url.hostname === 'wilsonmuita.com' ||
                        url.hostname === 'api.wilsonmuita.com';
      
      // Skip if already has UTM params or is internal
      if (isInternal || url.searchParams.has('utm_source')) {
        return;
      }

      const isAffiliate = link.classList.contains('affiliate-link') || 
                         link.getAttribute('rel')?.includes('sponsored') ||
                         href.includes('amazon') ||
                         href.includes('partner');
      
      let medium = UTM_CONFIG.referralMedium;
      let campaign = 'outbound';
      let content = 'auto_enhanced';
      let linkType = 'general';

      if (isAffiliate) {
        medium = UTM_CONFIG.affiliateMedium;
        campaign = link.getAttribute('data-affiliate-product') || 
                  extractProductFromUrl(href) || 
                  'affiliate';
        content = link.getAttribute('data-affiliate-position') || 'content';
        linkType = 'affiliate';
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
        isAffiliate,
        linkType
      });
    } catch (error) {
      console.warn('UTM Tracking: Error processing link', href, error);
    }
  });
};

/**
 * Auto-enhance affiliate links with comprehensive tracking
 */
const enhanceAffiliateLinks = () => {
  // Only run in browser environment
  if (typeof document === 'undefined') return;

  // Enhance existing affiliate links
  const affiliateSelectors = [
    'a[href*="amazon"]',
    'a[href*="partner"]',
    'a[data-affiliate]',
    'a.affiliate-link',
    'a[rel*="sponsored"]',
    'a[href*="click.linksynergy"]',
    'a[href*="shareasale"]',
    'a[href*="commissionjunction"]'
  ];

  const affiliateLinks = document.querySelectorAll(affiliateSelectors.join(', '));
  
  affiliateLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;

    const product = link.getAttribute('data-affiliate-product') || 
                   link.getAttribute('data-product') ||
                   extractProductFromUrl(href);
    const position = link.getAttribute('data-affiliate-position') || 
                    link.getAttribute('data-position') || 
                    'content';
    const category = link.getAttribute('data-category') || 'technology';
    const price = link.getAttribute('data-price');
    const vendor = link.getAttribute('data-vendor') || extractVendorFromUrl(href);

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
        elementId: link.id,
        category,
        price,
        vendor,
        commissionRate: link.getAttribute('data-commission')
      });
    });
  });
};

/**
 * Enhance social share buttons with tracking
 */
const enhanceSocialShares = () => {
  // Only run in browser environment
  if (typeof document === 'undefined') return;

  const socialButtons = document.querySelectorAll('[data-social-share], .social-share, .share-button');
  
  socialButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      const platform = button.getAttribute('data-platform') || 
                      button.getAttribute('data-social-share') ||
                      extractPlatformFromClass(button.className);
      const url = button.getAttribute('data-url') || window.location.href;
      const campaign = button.getAttribute('data-campaign') || 'social_share';
      
      if (platform) {
        trackSocialShare(platform, url, campaign, 'social_button');
      }
    });
  });
};

/**
 * Enhance email links with tracking
 */
const enhanceEmailLinks = () => {
  // Only run in browser environment
  if (typeof document === 'undefined') return;

  const emailLinks = document.querySelectorAll('a[href^="mailto:"]');
  
  emailLinks.forEach(link => {
    const href = link.getAttribute('href');
    const email = href.replace('mailto:', '').split('?')[0];
    
    link.addEventListener('click', (e) => {
      trackEmailClick({
        url: href,
        campaign: 'email_contact',
        content: 'email_link',
        emailType: 'contact',
        subject: link.getAttribute('data-subject') || 'Inquiry from Wilson Muita Blog'
      });
    });
  });
};

/**
 * Send analytics data to backend API using blogAPI
 */
const sendToAnalyticsAPI = async (data) => {
  // Don't send analytics in development unless explicitly enabled
  if (process.env.NODE_ENV !== 'production' && !window.getConfig?.('REACT_APP_ANALYTICS_DEV')) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('📊 Analytics Event (Development):', data);
    }
    return { success: true, development: true };
  }

  try {
    // Use the blogAPI from our api.js for consistent error handling
    const result = await blogAPI.analytics.track(data);
    return result;
  } catch (error) {
    console.warn('Analytics API request failed:', error);
    
    // Fallback to localStorage for offline tracking
    if (typeof window !== 'undefined') {
      try {
        const pendingEvents = JSON.parse(localStorage.getItem('wilsonmuita_pending_analytics') || '[]');
        pendingEvents.push({
          ...data,
          timestamp: new Date().toISOString(),
          retryCount: 0
        });
        localStorage.setItem('wilsonmuita_pending_analytics', JSON.stringify(pendingEvents));
        console.log('📦 Analytics event stored offline for retry');
      } catch (storageError) {
        console.warn('Failed to store analytics event offline:', storageError);
      }
    }
    
    throw error;
  }
};

/**
 * Retry pending analytics events
 */
export const retryPendingEvents = async () => {
  if (typeof window === 'undefined') return;
  
  try {
    const pendingEvents = JSON.parse(localStorage.getItem('wilsonmuita_pending_analytics') || '[]');
    const successfulEvents = [];
    const failedEvents = [];
    
    for (const event of pendingEvents) {
      try {
        await sendToAnalyticsAPI(event);
        successfulEvents.push(event);
      } catch (error) {
        if (event.retryCount < 3) {
          event.retryCount = (event.retryCount || 0) + 1;
          failedEvents.push(event);
        } else {
          console.warn('Analytics event failed after 3 retries:', event);
        }
      }
    }
    
    localStorage.setItem('wilsonmuita_pending_analytics', JSON.stringify(failedEvents));
    
    if (successfulEvents.length > 0) {
      console.log(`✅ Retried ${successfulEvents.length} analytics events successfully`);
    }
    
    return { successful: successfulEvents.length, failed: failedEvents.length };
  } catch (error) {
    console.warn('Error retrying pending analytics events:', error);
    return { successful: 0, failed: 0 };
  }
};

/**
 * Generate or retrieve session ID
 */
const getSessionId = () => {
  if (typeof window === 'undefined') return 'server-side';
  
  let sessionId = sessionStorage.getItem('wilsonmuita_session_id');
  if (!sessionId) {
    sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem('wilsonmuita_session_id', sessionId);
    
    // Also store in localStorage for cross-tab session sharing
    localStorage.setItem('wilsonmuita_session_id', sessionId);
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
    
    // Amazon affiliate links
    if (url.includes('amazon')) {
      const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);
      const productIndex = pathParts.findIndex(part => part === 'dp' || part === 'gp');
      if (productIndex !== -1 && pathParts[productIndex + 1]) {
        return `amazon_${pathParts[productIndex + 1]}`;
      }
      return 'amazon_product';
    }
    
    // General product extraction
    const domain = urlObj.hostname.replace('www.', '');
    return `${domain}_product`;
  } catch {
    return 'affiliate_product';
  }
};

/**
 * Extract vendor from URL
 */
const extractVendorFromUrl = (url) => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '').split('.')[0];
  } catch {
    return 'unknown_vendor';
  }
};

/**
 * Extract platform from class name
 */
const extractPlatformFromClass = (className) => {
  const platforms = ['twitter', 'facebook', 'linkedin', 'pinterest', 'reddit', 'whatsapp'];
  return platforms.find(platform => className.includes(platform)) || 'social';
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
    utm_term: params.get('utm_term'),
    utm_id: params.get('utm_id')
  };

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
    const stored = sessionStorage.getItem('wilsonmuita_utm_params');
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
    const paramsToRemove = [
      'utm_source', 'utm_medium', 'utm_campaign', 
      'utm_content', 'utm_term', 'utm_id',
      'gclid', 'fbclid', 'msclkid' // Common tracking parameters
    ];
    
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

/**
 * Check if UTM tracking is initialized
 */
export const isUTMTrackingInitialized = () => isInitialized;

/**
 * Reset UTM tracking (for testing)
 */
export const resetUTMTracking = () => {
  isInitialized = false;
  currentSessionId = null;
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('wilsonmuita_session_id');
    sessionStorage.removeItem('wilsonmuita_utm_params');
  }
};

export default {
  initUTMTracking,
  addUTMParams,
  trackPageView,
  trackAffiliateClick,
  trackOutboundClick,
  trackSocialShare,
  trackEmailClick,
  trackCustomEvent,
  getCurrentUTMParams,
  getStoredUTMParams,
  hasUTMParams,
  removeUTMParams,
  getCurrentSessionId,
  isUTMTrackingInitialized,
  retryPendingEvents,
  resetUTMTracking
};