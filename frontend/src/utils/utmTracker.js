// frontend/src/utils/utmTracker.js
import { blogAPI } from './api';

/**
 * Comprehensive UTM Tracking Utility
 * Handles affiliate links, campaign tracking, and automatic parameter injection
 * COMPLETELY FIXED VERSION - Matches your working Postman endpoints
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

// ✅ FIXED: Proper analytics availability check with your actual API methods
const isAnalyticsAvailable = () => {
  return blogAPI && 
         blogAPI.analytics && 
         typeof blogAPI.analytics.trackEvent === 'function' &&
         typeof blogAPI.analytics.trackPageView === 'function' &&
         blogAPI.analytics.trackEvent !== undefined &&
         blogAPI.analytics.trackPageView !== undefined;
};

/**
 * ✅ FIXED: Add the missing getUTMParams method that's causing the error
 * This fixes: "Uncaught (in promise) TypeError: yr.getUTMParams is not a function"
 */
export const getUTMParams = () => {
  return getCurrentUTMParams();
};

/**
 * Initialize UTM tracking and session management with safe analytics
 */
export const initUTMTracking = () => {
  if (typeof document === 'undefined' || isInitialized) return;

  // ✅ FIXED: Check analytics availability first
  const analyticsAvailable = isAnalyticsAvailable();
  
  if (!analyticsAvailable) {
    console.warn('⚠️ Analytics system not available. UTM tracking will work in offline mode.');
  }

  currentSessionId = getSessionId();
  isInitialized = true;
  
  // Track page view with UTM parameters (only if analytics available)
  if (analyticsAvailable) {
    trackPageView();
  }
  
  // These can still work without analytics
  enhanceExternalLinks();
  enhanceAffiliateLinks();
  enhanceSocialShares();
  enhanceEmailLinks();
  
  console.log('🔗 UTM Tracking initialized for Wilson Muita with session:', currentSessionId);
  console.log('📊 Analytics available:', analyticsAvailable);
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
 * ✅ FIXED: Track page view with UTM parameters from URL
 * Now matches your working Postman endpoint structure
 */
export const trackPageView = async () => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') return;

  const utmParams = getCurrentUTMParams();
  
  try {
    // ✅ FIXED: Use the exact structure from your working Postman example
    const pageData = {
      type: 'pageview',
      eventName: 'page_view',
      sessionId: currentSessionId,
      page: window.location.pathname,
      url: window.location.href,
      title: document.title,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      language: navigator.language,
      utm_source: utmParams.utm_source,
      utm_medium: utmParams.utm_medium,
      utm_campaign: utmParams.utm_campaign,
      utm_content: utmParams.utm_content,
      utm_term: utmParams.utm_term
    };

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
 * ✅ FIXED: Track affiliate link clicks with enhanced product tracking
 * Now uses correct event structure
 */
export const trackAffiliateClick = async (data) => {
  try {
    // ✅ FIXED: Use the exact structure from your working Postman example
    const eventData = {
      sessionId: currentSessionId,
      eventName: 'affiliate_click',
      type: 'click',
      page: window.location.pathname,
      url: data.url,
      title: document.title,
      eventData: {
        product: data.product,
        position: data.position,
        linkText: data.text,
        elementId: data.elementId,
        category: data.category,
        price: data.price,
        vendor: data.vendor,
        commissionRate: data.commissionRate,
        isAffiliate: true,
        linkType: 'affiliate'
      },
      userAgent: navigator.userAgent,
      referrer: document.referrer,
      language: navigator.language,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      utmSource: UTM_CONFIG.defaultSource,
      utmMedium: UTM_CONFIG.affiliateMedium,
      utmCampaign: data.product?.replace(/\s+/g, '_').toLowerCase() || 'affiliate_product',
      utmContent: data.position || 'content',
      utmTerm: data.product,
      timestamp: new Date().toISOString()
    };

    await sendToAnalyticsAPI(eventData);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('📊 Affiliate Click:', eventData);
    }
  } catch (error) {
    console.warn('Affiliate click tracking failed:', error);
  }
};

/**
 * ✅ FIXED: Track outbound link clicks with enhanced analytics
 * Now uses correct event structure
 */
export const trackOutboundClick = async (data) => {
  try {
    const eventData = {
      sessionId: currentSessionId,
      eventName: 'outbound_click',
      type: 'click',
      page: window.location.pathname,
      url: data.originalUrl,
      title: document.title,
      eventData: {
        element: data.element,
        text: data.text,
        isExternal: true,
        isAffiliate: data.isAffiliate || false,
        linkType: data.linkType || 'general',
        destination: new URL(data.originalUrl).hostname,
        trackedUrl: data.trackedUrl
      },
      userAgent: navigator.userAgent,
      referrer: document.referrer,
      language: navigator.language,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      utmSource: data.utmSource || UTM_CONFIG.defaultSource,
      utmMedium: data.utmMedium || UTM_CONFIG.referralMedium,
      utmCampaign: data.campaign || 'outbound',
      utmContent: data.content,
      utmTerm: data.term,
      timestamp: new Date().toISOString()
    };

    await sendToAnalyticsAPI(eventData);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔗 Outbound Click:', eventData);
    }
  } catch (error) {
    console.warn('Outbound click tracking failed:', error);
  }
};

/**
 * ✅ FIXED: Track social media shares with platform-specific campaigns
 * Now uses correct event structure
 */
export const trackSocialShare = async (platform, url, campaign = 'social_share', content = '') => {
  try {
    const eventData = {
      sessionId: currentSessionId,
      eventName: 'social_share',
      type: 'click',
      page: window.location.pathname,
      url: url,
      title: document.title,
      eventData: {
        platform: platform,
        sharedUrl: url,
        shareMethod: 'manual',
        timestamp: new Date().toISOString()
      },
      userAgent: navigator.userAgent,
      referrer: document.referrer,
      language: navigator.language,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      utmSource: UTM_CONFIG.defaultSource,
      utmMedium: UTM_CONFIG.socialMedium,
      utmCampaign: campaign,
      utmContent: content || platform,
      timestamp: new Date().toISOString()
    };

    await sendToAnalyticsAPI(eventData);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('📤 Social Share:', eventData);
    }
  } catch (error) {
    console.warn('Social share tracking failed:', error);
  }
};

/**
 * ✅ FIXED: Track email link clicks
 * Now uses correct event structure
 */
export const trackEmailClick = async (data) => {
  try {
    const eventData = {
      sessionId: currentSessionId,
      eventName: 'email_click',
      type: 'click',
      page: window.location.pathname,
      url: data.url,
      title: document.title,
      eventData: {
        emailType: data.emailType,
        subject: data.subject,
        linkPosition: data.position
      },
      userAgent: navigator.userAgent,
      referrer: document.referrer,
      language: navigator.language,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      utmSource: UTM_CONFIG.defaultSource,
      utmMedium: UTM_CONFIG.emailMedium,
      utmCampaign: data.campaign || 'newsletter',
      utmContent: data.content,
      utmTerm: data.term,
      timestamp: new Date().toISOString()
    };

    await sendToAnalyticsAPI(eventData);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('📧 Email Click:', eventData);
    }
  } catch (error) {
    console.warn('Email click tracking failed:', error);
  }
};

/**
 * ✅ FIXED: Track custom events with UTM parameters
 * Now uses correct event structure
 */
export const trackCustomEvent = async (eventName, data = {}) => {
  try {
    const eventData = {
      sessionId: currentSessionId,
      eventName: eventName,
      type: mapEventTypeToAPI(eventName),
      page: window.location.pathname,
      url: window.location.href,
      title: document.title,
      eventData: {
        ...data.metadata,
        customData: data.customData,
        timestamp: new Date().toISOString()
      },
      userAgent: navigator.userAgent,
      referrer: document.referrer,
      language: navigator.language,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      utmSource: UTM_CONFIG.defaultSource,
      utmMedium: data.medium || UTM_CONFIG.defaultMedium,
      utmCampaign: data.campaign || 'custom_event',
      utmContent: data.content,
      utmTerm: data.term,
      timestamp: new Date().toISOString()
    };

    await sendToAnalyticsAPI(eventData);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('🎯 Custom Event:', eventData);
    }
  } catch (error) {
    console.warn('Custom event tracking failed:', error);
  }
};

/**
 * ✅ FIXED: Send analytics data to backend API with correct function names
 * COMPLETELY REWRITTEN to match your working Postman endpoints
 */
const sendToAnalyticsAPI = async (data) => {
  // Don't send analytics in development unless explicitly enabled
  if (process.env.NODE_ENV !== 'production' && !window.getConfig?.('REACT_APP_ANALYTICS_DEV')) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('📊 Analytics Event (Development):', data);
    }
    return { success: true, development: true };
  }

  // ✅ FIXED: Check if analytics functions are available
  if (!isAnalyticsAvailable()) {
    console.warn('Analytics functions not available. Storing event offline:', data.eventName);
    storeEventOffline(data);
    return { success: false, reason: 'analytics_not_available' };
  }

  try {
    let result;
    
    // ✅ FIXED: Use the correct endpoints based on event type
    if (data.type === 'pageview') {
      // Use trackPageView for pageview events with the exact structure from Postman
      const pageviewData = {
        type: 'pageview',
        eventName: data.eventName || 'page_view',
        sessionId: data.sessionId,
        page: data.page,
        url: data.url,
        title: data.title,
        referrer: data.referrer,
        userAgent: data.userAgent,
        timestamp: data.timestamp,
        screenResolution: data.screenResolution,
        language: data.language,
        utm_source: data.utm_source,
        utm_medium: data.utm_medium,
        utm_campaign: data.utm_campaign,
        utm_content: data.utm_content,
        utm_term: data.utm_term
      };
      
      console.log('📊 Sending Pageview:', pageviewData);
      result = await blogAPI.analytics.trackPageView(pageviewData);
    } else {
      // Use trackEvent for all other events with the exact structure from Postman
      const eventData = {
        sessionId: data.sessionId,
        eventName: data.eventName,
        type: data.type,
        page: data.page,
        url: data.url,
        title: data.title,
        eventData: data.eventData,
        userAgent: data.userAgent,
        referrer: data.referrer,
        language: data.language,
        screenResolution: data.screenResolution,
        utmSource: data.utmSource,
        utmMedium: data.utmMedium,
        utmCampaign: data.utmCampaign,
        utmContent: data.utmContent,
        utmTerm: data.utmTerm,
        timestamp: data.timestamp
      };
      
      console.log('📊 Sending Event:', eventData);
      result = await blogAPI.analytics.trackEvent(eventData);
    }
    
    return result;
  } catch (error) {
    console.warn('Analytics API request failed:', error);
    storeEventOffline(data);
    throw error;
  }
};

/**
 * ✅ NEW: Map custom event types to valid API types
 */
const mapEventTypeToAPI = (eventType) => {
  const eventTypeMap = {
    'click': 'click',
    'affiliate_click': 'click',
    'outbound_click': 'click',
    'social_share': 'click',
    'email_click': 'click',
    'pageview': 'pageview',
    'view': 'view',
    'scroll': 'view',
    'form_submit': 'form_submission',
    'custom_event': 'click'
  };
  
  return eventTypeMap[eventType] || 'click';
};

/**
 * Store events offline when analytics is unavailable
 */
const storeEventOffline = (data) => {
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
};

/**
 * Retry pending analytics events
 */
export const retryPendingEvents = async () => {
  if (typeof window === 'undefined' || !isAnalyticsAvailable()) return;
  
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
 * Check if analytics is available
 */
export const isAnalyticsAvailableForTracking = () => isAnalyticsAvailable();

/**
 * Reset UTM tracking (for testing)
 */
export const resetUTMTracking = () => {
  isInitialized = false;
  currentSessionId = null;
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('wilsonmuita_session_id');
    sessionStorage.removeItem('wilsonmuita_utm_params');
    localStorage.removeItem('wilsonmuita_pending_analytics');
  }
};

// ============================================================================
// ✅ FIXED: Link enhancement functions (unchanged but kept for completeness)
// ============================================================================

/**
 * Auto-enhance external links with UTM parameters
 */
const enhanceExternalLinks = () => {
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

      link.setAttribute('href', trackedUrl);
      
      if (isAnalyticsAvailable()) {
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
      }
    } catch (error) {
      console.warn('UTM Tracking: Error processing link', href, error);
    }
  });
};

/**
 * Auto-enhance affiliate links with comprehensive tracking
 */
const enhanceAffiliateLinks = () => {
  if (typeof document === 'undefined') return;

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

    if (isAnalyticsAvailable()) {
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
    }
  });
};

/**
 * Enhance social share buttons with tracking
 */
const enhanceSocialShares = () => {
  if (typeof document === 'undefined') return;

  const socialButtons = document.querySelectorAll('[data-social-share], .social-share, .share-button');
  
  socialButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      const platform = button.getAttribute('data-platform') || 
                      button.getAttribute('data-social-share') ||
                      extractPlatformFromClass(button.className);
      const url = button.getAttribute('data-url') || window.location.href;
      const campaign = button.getAttribute('data-campaign') || 'social_share';
      
      if (platform && isAnalyticsAvailable()) {
        trackSocialShare(platform, url, campaign, 'social_button');
      }
    });
  });
};

/**
 * Enhance email links with tracking
 */
const enhanceEmailLinks = () => {
  if (typeof document === 'undefined') return;

  const emailLinks = document.querySelectorAll('a[href^="mailto:"]');
  
  emailLinks.forEach(link => {
    const href = link.getAttribute('href');
    const email = href.replace('mailto:', '').split('?')[0];
    
    if (isAnalyticsAvailable()) {
      link.addEventListener('click', (e) => {
        trackEmailClick({
          url: href,
          campaign: 'email_contact',
          content: 'email_link',
          emailType: 'contact',
          subject: link.getAttribute('data-subject') || 'Inquiry from Wilson Muita Blog'
        });
      });
    }
  });
};

// ============================================================================
// ✅ FIXED: Default export with ALL required methods
// ============================================================================

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
  getUTMParams, // ✅ CRITICAL: This fixes the "yr.getUTMParams is not a function" error
  hasUTMParams,
  removeUTMParams,
  getCurrentSessionId,
  isUTMTrackingInitialized,
  isAnalyticsAvailableForTracking,
  retryPendingEvents,
  resetUTMTracking
};