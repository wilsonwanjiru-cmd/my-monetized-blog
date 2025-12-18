// frontend/src/components/AdSense.js
import React, { useEffect, useState, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { useLocation } from 'react-router-dom';
import './AdSense.css';

// Global tracking for script and ad initialization
if (typeof window !== 'undefined') {
  window._adSenseScriptLoaded = window._adSenseScriptLoaded || false;
  window._adSenseScriptLoading = window._adSenseScriptLoading || false;
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
  const [adBlockDetected, setAdBlockDetected] = useState(false);
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
  
  const log = useCallback((message, type = 'info') => {
    if (!debug && type === 'debug') return;
    
    const prefix = type === 'error' ? '❌' : type === 'warn' ? '⚠️' : '✅';
    console.log(`${prefix} AdSense [${slot}]: ${message}`);
  }, [debug, slot]);

  useEffect(() => {
    const testAdBlock = () => {
      if (typeof window === 'undefined') return;
      
      const testAd = document.createElement('div');
      testAd.className = 'adsbygoogle';
      testAd.style.cssText = 'height: 1px; width: 1px; position: absolute; left: -1000px; top: -1000px;';
      document.body.appendChild(testAd);
      
      setTimeout(() => {
        const detected = testAd.offsetHeight === 0 || 
                        testAd.offsetWidth === 0 || 
                        window.getComputedStyle(testAd).display === 'none';
        setAdBlockDetected(detected);
        if (testAd.parentNode) {
          document.body.removeChild(testAd);
        }
        
        if (detected && debug) {
          console.warn('Ad blocker detected');
        }
      }, 100);
    };
    
    testAdBlock();
  }, [debug]);

  // CRITICAL FIX: Load script WITHOUT auto ads config
  const loadAdSenseScript = useCallback((maxRetries = 3, retryDelay = 1000) => {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('Window not available'));
        return;
      }
      
      // Don't load script on excluded pages
      if (isExcluded) {
        reject(new Error('Excluded page'));
        return;
      }
      
      if (window._adSenseScriptLoaded) {
        resolve(true);
        return;
      }
      
      if (window._adSenseScriptLoading) {
        const checkInterval = setInterval(() => {
          if (window._adSenseScriptLoaded) {
            clearInterval(checkInterval);
            resolve(true);
          }
        }, 100);
        return;
      }
      
      window._adSenseScriptLoading = true;
      
      const loadScript = (retryCount = 0) => {
        const existingScript = document.querySelector('script[src*="pagead2.googlesyndication.com"]');
        if (existingScript) {
          window._adSenseScriptLoaded = true;
          window._adSenseScriptLoading = false;
          resolve(true);
          return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + client;
        script.async = true;
        script.crossOrigin = 'anonymous';
        script.defer = true;
        
        script.onload = () => {
          window._adSenseScriptLoaded = true;
          window._adSenseScriptLoading = false;
          
          // Initialize array ONLY, no auto ads config
          window.adsbygoogle = window.adsbygoogle || [];
          
          log('AdSense script loaded successfully (component)');
          resolve(true);
        };
        
        script.onerror = () => {
          console.error('❌ AdSense script failed to load');
          
          if (retryCount < maxRetries) {
            console.log(`Retrying AdSense script load (${retryCount + 1}/${maxRetries})...`);
            setTimeout(() => loadScript(retryCount + 1), retryDelay * (retryCount + 1));
          } else {
            window._adSenseScriptLoading = false;
            reject(new Error(`Failed to load AdSense script after ${maxRetries} retries`));
          }
        };
        
        document.head.appendChild(script);
      };
      
      loadScript();
    });
  }, [client, log, isExcluded]);

  // Initialize ad WITHOUT auto ads config
  const initializeAd = useCallback(() => {
    if (typeof window === 'undefined' || !slot || !adRef.current) return;

    if (isExcluded || adBlockDetected || testMode) {
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
  }, [slot, format, isExcluded, adBlockDetected, testMode, debug, log]);

  useEffect(() => {
    let mounted = true;
    let scriptLoadTimeout = null;
    let adInitTimeout = null;

    if (isExcluded || !slot) {
      return () => { mounted = false; };
    }

    const initAdSense = async () => {
      if (!mounted) return;

      try {
        if (adBlockDetected && !testMode) {
          return;
        }

        await new Promise(resolve => {
          adInitTimeout = setTimeout(resolve, 500);
        });

        if (!mounted) return;

        // Load script if needed
        if (!window.adsbygoogle || !window._adSenseScriptLoaded) {
          await loadAdSenseScript();
        }

        if (!mounted) return;

        setShouldRenderAd(true);

        await new Promise(resolve => {
          scriptLoadTimeout = setTimeout(resolve, 100);
        });

        if (!mounted) return;

        initializeAd();

      } catch (error) {
        if (mounted) {
          log('Failed to initialize AdSense: ' + error.message, 'error');
          setAdError(true);
        }
      }
    };

    const initTimeout = setTimeout(() => {
      initAdSense();
    }, 1000);

    return () => {
      mounted = false;
      clearTimeout(initTimeout);
      clearTimeout(scriptLoadTimeout);
      clearTimeout(adInitTimeout);
      
      if (slot) {
        window._adSenseInitializedSlots.delete(slot);
      }
    };
  }, [slot, isExcluded, adBlockDetected, loadAdSenseScript, initializeAd, testMode, log]);

  if (isExcluded) return null;
  
  if (!slot) {
    log('No slot provided', 'warn');
    return null;
  }
  
  if (adBlockDetected && !testMode) {
    return (
      <div className={`ad-block-message ${className}`} style={style}>
        <div className="ad-block-content">
          <p>Please consider disabling your ad blocker to support this site.</p>
          <small>Advertisement helps keep this content free for everyone.</small>
        </div>
      </div>
    );
  }
  
  if (testMode) {
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

      {shouldRenderAd && !adError && !adBlockDetected && (
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
          data-adtest={testMode ? 'on' : undefined}
          key={`ad-${slot}-${Date.now()}`}
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

export const consentHelper = {
  setConsent: (granted) => {
    try {
      localStorage.setItem('cookieConsent', granted ? 'true' : 'false');
      localStorage.setItem('adsense_consent', granted ? 'granted' : 'denied');
      
      if (window._adSenseInitializedSlots) {
        window._adSenseInitializedSlots.clear();
      }
      
      const consentEvent = new CustomEvent('consentChanged', {
        detail: { granted }
      });
      window.dispatchEvent(consentEvent);
      
      console.log(`🔄 AdSense: Consent ${granted ? 'granted' : 'denied'}`);
      
      if (granted) {
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      console.error('❌ AdSense: Error setting consent:', error);
    }
  },
  
  clearConsent: () => {
    try {
      localStorage.removeItem('cookieConsent');
      localStorage.removeItem('adsense_consent');
      
      if (window._adSenseInitializedSlots) {
        window._adSenseInitializedSlots.clear();
      }
      
      window.dispatchEvent(new Event('consentChanged'));
      console.log('🔄 AdSense: Consent cleared');
    } catch (error) {
      console.error('❌ AdSense: Error clearing consent:', error);
    }
  },
  
  getConsent: () => {
    try {
      return localStorage.getItem('cookieConsent');
    } catch {
      return null;
    }
  },
  
  isEEAUser: () => {
    try {
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
      
      console.log(`🔍 AdSense: Initialized - EEA: ${isEEA}, Consent: ${consent}`);
      
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