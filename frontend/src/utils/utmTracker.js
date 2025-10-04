// frontend/src/utils/utmTracker.js

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

/**
 * Add UTM parameters to any URL with comprehensive tracking
 * @param {string} url - The original URL
 * @param {string} source - UTM source (default: 'yourblog')
 * @param {string} medium - UTM medium (default: 'content')
 * @param {string} campaign - UTM campaign name
 * @param {string} content - UTM content for A/B testing
 * @param {string} term - UTM term for keyword tracking
 * @returns {string} URL with UTM parameters
 */
export const addUTMParams = (
  url, 
  source = UTM_CONFIG.defaultSource, 
  medium = UTM_CONFIG.defaultMedium, 
  campaign = UTM_CONFIG.defaultCampaign,
  content = '',
  term = ''
) => {
  // Validate URL
  if (!url || typeof url !== 'string') {
    console.warn('UTM Tracking: Invalid URL provided', url);
    return url;
  }

  try {
    const urlObj = new URL(url);
    const utmParams = new URLSearchParams({
      utm_source: source,
      utm_medium: medium,
      utm_campaign: campaign || UTM_CONFIG.defaultCampaign,
      utm_content: content || getDefaultContent(),
      utm_term: term || getDefaultTerm()
    });

    // Merge with existing parameters
    utmParams.forEach((value, key) => {
      if (!urlObj.searchParams.has(key)) {
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
 * Affiliate Link Component with automatic tracking and disclosure
 * @param {Object} props - Component props
 * @param {string} props.url - The affiliate URL
 * @param {string} props.product - Product name for tracking
 * @param {string} props.position - Position on page (e.g., 'sidebar', 'content')
 * @param {ReactNode} props.children - Link content
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.showDisclosure - Whether to show affiliate disclosure
 * @param {Object} props.rest - Other anchor tag attributes
 */
export const AffiliateLink = ({ 
  url, 
  children, 
  product, 
  position = 'inline',
  className = '',
  showDisclosure = true,
  ...props 
}) => {
  const trackedUrl = addUTMParams(
    url, 
    UTM_CONFIG.defaultSource, 
    UTM_CONFIG.affiliateMedium, 
    product?.replace(/\s+/g, '_').toLowerCase() || 'affiliate_product',
    position,
    product
  );
  
  const handleClick = (e) => {
    // Track affiliate click event
    trackAffiliateClick({
      url: trackedUrl,
      product,
      position,
      text: typeof children === 'string' ? children : 'Affiliate Link'
    });
    
    // Optional: Open in new tab for affiliate links
    if (props.target !== '_self') {
      e.preventDefault();
      window.open(trackedUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <a 
      href={trackedUrl}
      onClick={handleClick}
      {...props}
      rel="sponsored noopener noreferrer"
      className={`affiliate-link ${className}`}
      data-affiliate-product={product}
      data-affiliate-position={position}
      target="_blank"
    >
      {children}
      {showDisclosure && (
        <span className="affiliate-disclosure" style={{ fontSize: '0.8em', opacity: 0.7 }}>
          {' '}(Affiliate Link)
        </span>
      )}
    </a>
  );
};

/**
 * Social Share Link Component with UTM tracking
 * @param {Object} props - Component props
 * @param {string} props.platform - Social platform (twitter, facebook, linkedin, etc.)
 * @param {string} props.url - URL to share
 * @param {string} props.text - Share text
 * @param {string} props.campaign - Campaign name
 */
export const SocialShareLink = ({ 
  platform, 
  url = typeof window !== 'undefined' ? window.location.href : '', 
  text = '', 
  campaign = 'social_share',
  children,
  ...props 
}) => {
  const shareUrls = {
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    pinterest: `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&description=${encodeURIComponent(text)}`,
    reddit: `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`
  };

  const shareUrl = shareUrls[platform.toLowerCase()];
  
  if (!shareUrl) {
    console.warn(`SocialShareLink: Unknown platform ${platform}`);
    return children || null;
  }

  const trackedUrl = addUTMParams(
    shareUrl,
    UTM_CONFIG.defaultSource,
    UTM_CONFIG.socialMedium,
    `${campaign}_${platform}`,
    'share_button'
  );

  return (
    <a 
      href={trackedUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`social-share-link share-${platform}`}
      onClick={() => trackSocialShare(platform, url)}
      {...props}
    >
      {children || `Share on ${platform.charAt(0).toUpperCase() + platform.slice(1)}`}
    </a>
  );
};

/**
 * Initialize automatic UTM tracking for all external links
 */
export const initUTMTracking = () => {
  if (typeof document === 'undefined') return;

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="http"]');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href) return;

    try {
      const url = new URL(href);
      const isInternal = url.hostname === window.location.hostname;
      
      if (!isInternal && !url.searchParams.has('utm_source')) {
        const isAffiliate = link.classList.contains('affiliate-link');
        const isSocial = link.classList.contains('social-share-link');
        
        let medium = UTM_CONFIG.referralMedium;
        let campaign = 'outbound';
        let content = '';

        if (isAffiliate) {
          medium = UTM_CONFIG.affiliateMedium;
          campaign = link.getAttribute('data-affiliate-product') || 'affiliate';
          content = link.getAttribute('data-affiliate-position') || 'unknown';
        } else if (isSocial) {
          medium = UTM_CONFIG.socialMedium;
          campaign = 'social_share';
          content = link.className.match(/share-(\w+)/)?.[1] || 'unknown';
        }

        const trackedUrl = addUTMParams(
          href,
          UTM_CONFIG.defaultSource,
          medium,
          campaign,
          content
        );

        link.setAttribute('href', trackedUrl);
        
        // Track the outbound click
        trackOutboundClick({
          originalUrl: href,
          trackedUrl,
          medium,
          campaign,
          content,
          element: link.tagName,
          text: link.textContent?.substring(0, 100)
        });
      }
    } catch (error) {
      console.warn('UTM Tracking: Error processing link', href, error);
    }
  });

  console.log('🔗 UTM Tracking initialized');
};

/**
 * Track affiliate link clicks for analytics
 */
const trackAffiliateClick = (data) => {
  if (typeof window === 'undefined') return;

  // Send to your analytics backend
  if (typeof trackEvent === 'function') {
    trackEvent('affiliate_click', data);
  }

  // Also log to console in development
  if (process.env.NODE_ENV !== 'production') {
    console.log('📊 Affiliate Click:', data);
  }

  // Optional: Send to analytics API
  sendToAnalytics('affiliate_click', data);
};

/**
 * Track social shares
 */
const trackSocialShare = (platform, url) => {
  const data = {
    platform,
    url,
    timestamp: new Date().toISOString()
  };

  if (typeof trackEvent === 'function') {
    trackEvent('social_share', data);
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('📤 Social Share:', data);
  }

  sendToAnalytics('social_share', data);
};

/**
 * Track outbound link clicks
 */
const trackOutboundClick = (data) => {
  if (typeof trackEvent === 'function') {
    trackEvent('outbound_click', data);
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('🔗 Outbound Click:', data);
  }

  sendToAnalytics('outbound_click', data);
};

/**
 * Send analytics data to backend
 */
const sendToAnalytics = (eventType, data) => {
  if (process.env.NODE_ENV !== 'production') return;

  const analyticsData = {
    eventType,
    ...data,
    sessionId: getSessionId(),
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    url: window.location.href
  };

  // Use fetch or your preferred analytics service
  fetch('/api/analytics/track', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(analyticsData)
  }).catch(error => {
    console.warn('Analytics tracking failed:', error);
  });
};

/**
 * Generate or retrieve session ID
 */
const getSessionId = () => {
  if (typeof window === 'undefined') return 'server-side';
  
  let sessionId = localStorage.getItem('blog_session_id');
  if (!sessionId) {
    sessionId = 'session_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('blog_session_id', sessionId);
  }
  return sessionId;
};

/**
 * Get default UTM content based on current page and date
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
  
  // Try to get relevant keywords from page
  const title = document.title || '';
  const h1 = document.querySelector('h1')?.textContent || '';
  return `${title} ${h1}`.trim().substring(0, 50);
};

/**
 * Manual UTM parameter extraction for analytics
 * @returns {Object} UTM parameters from current URL
 */
export const getCurrentUTMParams = () => {
  if (typeof window === 'undefined') return {};
  
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    utm_content: params.get('utm_content'),
    utm_term: params.get('utm_term')
  };
};

/**
 * Check if current visit came from a UTM campaign
 * @returns {boolean}
 */
export const hasUTMParams = () => {
  const params = getCurrentUTMParams();
  return Object.values(params).some(value => value !== null);
};

/**
 * Clean URL by removing UTM parameters (useful for sharing)
 * @param {string} url - URL to clean
 * @returns {string} Clean URL without UTM parameters
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

// Export trackEvent for external use (will be implemented in App.js)
export let trackEvent = (eventType, data) => {
  console.log('Track Event (placeholder):', eventType, data);
};

// Allow setting trackEvent from App.js
export const setTrackEvent = (trackingFunction) => {
  trackEvent = trackingFunction;
};

export default {
  addUTMParams,
  AffiliateLink,
  SocialShareLink,
  initUTMTracking,
  getCurrentUTMParams,
  hasUTMParams,
  removeUTMParams,
  setTrackEvent
};