// frontend/src/components/AdSense.js
import React, { useEffect, useState, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { useLocation } from 'react-router-dom';
import './AdSense.css';

// Global tracking for ad slot initialization
if (typeof window !== 'undefined') {
  window._adSenseInitializedSlots = window._adSenseInitializedSlots || new Set();
}

const AdSense = ({ 
  client = 'ca-pub-4047817727348673',
  slot,
  format = 'auto',
  layout = '',
  layoutKey = '',
  responsive = 'true',
  className = '',
  style = {},
  testMode = false,
  debug = false,
  fallbackContent = null
}) => {
  const location = useLocation();
  const adRef = useRef(null);
  const executed = useRef(false);
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState(false);
  const [shouldRenderAd, setShouldRenderAd] = useState(false);
  
  // CRITICAL: Exclude privacy and compliance pages
  const excludedPaths = [
    '/privacy-policy', 
    '/privacy', 
    '/disclaimer', 
    '/about', 
    '/contact',
    '/terms'
  ];
  
  const isExcluded = excludedPaths.some(path => 
    location.pathname === path || location.pathname.startsWith(`${path}/`)
  );
  
  // Use global test mode if available
  const globalTestMode = window._adsenseConfig ? window._adsenseConfig.testMode : false;
  const isTest = testMode || globalTestMode;
  
  const log = useCallback((message, type = 'info') => {
    if (!debug && type === 'debug') return;
    
    const prefix = type === 'error' ? '❌' : type === 'warn' ? '⚠️' : '✅';
    console.log(`${prefix} AdSense [${slot}]: ${message}`);
  }, [debug, slot]);

  // Initialize ad WITHOUT auto ads config
  const initializeAd = useCallback(() => {
    if (typeof window === 'undefined' || !slot || !adRef.current) return;

    if (isExcluded || isTest) {
      return;
    }

    if (window._adSenseInitializedSlots.has(slot)) {
      log(`Slot ${slot} already initialized globally, skipping`, 'debug');
      return;
    }

    try {
      const adElement = adRef.current.querySelector('.adsbygoogle');
      if (!adElement) {
        log('Ad element not found', 'warn');
        return;
      }

      window._adSenseInitializedSlots.add(slot);

      // CRITICAL: Only push empty object, NO auto ads config
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        setAdLoaded(true);
        
        if (debug) {
          log(`AdSense ad initialized - Slot: ${slot}, Format: ${format}`);
        }
      } catch (pushError) {
        log('AdSense push error: ' + pushError.message, 'error');
        setAdError(true);
      }
    } catch (error) {
      log('AdSense initialization error: ' + error.message, 'error');
      setAdError(true);
    }
  }, [slot, format, isExcluded, isTest, debug, log]);

  useEffect(() => {
    if (executed.current || !slot || isExcluded) return;
    executed.current = true;

    let mounted = true;
    let initTimeout = null;

    const initAdSense = () => {
      if (!mounted) return;

      try {
        if (isTest) {
          log('Test mode enabled, showing test ad');
          setShouldRenderAd(true);
          return;
        }

        // Check if AdSense script is loaded
        if (!window.adsbygoogle) {
          log('AdSense script not loaded yet, waiting...');
          // Script will be loaded by adsense-config.js, wait for it
          const checkInterval = setInterval(() => {
            if (window.adsbygoogle && mounted) {
              clearInterval(checkInterval);
              setShouldRenderAd(true);
              setTimeout(initializeAd, 500);
            }
          }, 100);
          return;
        }

        setShouldRenderAd(true);
        setTimeout(initializeAd, 500);
      } catch (error) {
        if (mounted) {
          log('Failed to initialize AdSense: ' + error.message, 'error');
          setAdError(true);
        }
      }
    };

    // Wait a bit for page to stabilize
    initTimeout = setTimeout(initAdSense, 1000);

    return () => {
      mounted = false;
      clearTimeout(initTimeout);
    };
  }, [slot, isExcluded, isTest, initializeAd, log]);

  if (isExcluded) return null;
  
  if (!slot) {
    log('No slot provided', 'warn');
    return null;
  }
  
  if (isTest) {
    return (
      <div className={`ad-test-container ${className}`} style={style}>
        <div className="ad-test-content">
          <div className="ad-test-label">TEST AD</div>
          <div className="ad-test-slot">Slot: {slot}</div>
          <div className="ad-test-format">Format: {format}</div>
          <div className="ad-test-message">This would be an actual ad in production</div>
        </div>
      </div>
    );
  }
  
  if (adError && fallbackContent) {
    return <div className={`ad-fallback-container ${className}`}>{fallbackContent}</div>;
  }

  return (
    <div 
      className={`ad-container ${className}`}
      style={style}
      data-ad-slot={slot}
      data-ad-format={format}
      data-ad-loaded={adLoaded}
      data-ad-error={adError}
      ref={adRef}
    >
      {!adLoaded && !adError && (
        <div className="ad-loading">
          <div className="ad-loading-spinner"></div>
          <div className="ad-loading-text">Loading advertisement...</div>
        </div>
      )}
      
      {adError && !fallbackContent && (
        <div className="ad-fallback">
          <div className="ad-fallback-content">
            <span>Advertisement</span>
            <small>Ad could not be loaded</small>
          </div>
        </div>
      )}

      {shouldRenderAd && !adError && (
        <ins
          className="adsbygoogle"
          style={{
            display: 'block',
            textAlign: 'center',
            minHeight: '90px',
            overflow: 'hidden',
            borderRadius: '8px'
          }}
          data-ad-client={client}
          data-ad-slot={slot}
          data-ad-format={format}
          data-ad-layout={layout}
          data-ad-layout-key={layoutKey}
          data-full-width-responsive={responsive}
          key={`ad-${slot}`}
        />
      )}
    </div>
  );
};

AdSense.propTypes = {
  client: PropTypes.string,
  slot: PropTypes.string.isRequired,
  format: PropTypes.string,
  layout: PropTypes.string,
  layoutKey: PropTypes.string,
  responsive: PropTypes.string,
  className: PropTypes.string,
  style: PropTypes.object,
  testMode: PropTypes.bool,
  debug: PropTypes.bool,
  fallbackContent: PropTypes.node
};

export const AdSlots = {
  HEADER: '1529123561',
  IN_ARTICLE: '8087712926',
  SIDEBAR: '5976732519',
  FOOTER: '2835386242',
  BETWEEN_POSTS: '6583059564',
  IN_CONTENT_1: '9876543210',
  IN_CONTENT_2: '1234567890'
};

export const AdUnits = AdSlots;

export const getAdFormat = (position) => {
  const formats = {
    'header': 'auto',
    'sidebar': 'vertical',
    'footer': 'auto',
    'in-article': 'fluid',
    'between-posts': 'rectangle',
    'in-content-1': 'fluid',
    'in-content-2': 'fluid'
  };
  return formats[position] || 'auto';
};

export const areAdsLoaded = () => {
  if (typeof window === 'undefined') return false;
  
  const ads = document.querySelectorAll('.adsbygoogle');
  return Array.from(ads).some(ad => ad.offsetHeight > 0);
};

// CONSENT HELPER - Simplified and made more reliable
export const consentHelper = {
  setConsent: (granted) => {
    try {
      localStorage.setItem('cookieConsent', granted ? 'true' : 'false');
      
      if (window._adSenseInitializedSlots) {
        window._adSenseInitializedSlots.clear();
      }
      
      const consentEvent = new CustomEvent('consentChanged', {
        detail: { granted }
      });
      window.dispatchEvent(consentEvent);
      
      console.log(`🔄 AdSense: Consent ${granted ? 'granted' : 'denied'}`);
      
      // No automatic reload - let the user decide or handle at app level
      return true;
    } catch (error) {
      console.error('❌ AdSense: Error setting consent:', error);
      return false;
    }
  },
  
  clearConsent: () => {
    try {
      localStorage.removeItem('cookieConsent');
      
      if (window._adSenseInitializedSlots) {
        window._adSenseInitializedSlots.clear();
      }
      
      window.dispatchEvent(new Event('consentChanged'));
      console.log('🔄 AdSense: Consent cleared');
      return true;
    } catch (error) {
      console.error('❌ AdSense: Error clearing consent:', error);
      return false;
    }
  },
  
  getConsent: () => {
    try {
      return localStorage.getItem('cookieConsent') === 'true';
    } catch {
      return false;
    }
  },
  
  isEEAUser: () => {
    try {
      // Simple check - can be enhanced with IP geolocation API if needed
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const eeaTimezones = ['Europe/', 'GB', 'UK', 'London'];
      return eeaTimezones.some(tz => timezone.includes(tz));
    } catch (error) {
      return false;
    }
  },
  
  initialize: () => {
    try {
      const consent = localStorage.getItem('cookieConsent');
      const isEEA = consentHelper.isEEAUser();
      
      return {
        isEEA,
        hasConsent: consent === 'true',
        needsConsent: isEEA && !consent
      };
    } catch {
      return {
        isEEA: false,
        hasConsent: false,
        needsConsent: false
      };
    }
  }
};

export default AdSense;