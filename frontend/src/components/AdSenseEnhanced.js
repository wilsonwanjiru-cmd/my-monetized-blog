// frontend/src/components/AdSenseEnhanced.js
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';

// Global tracking for script and ad initialization
if (typeof window !== 'undefined') {
  window._adSenseScriptLoaded = window._adSenseScriptLoaded || false;
  window._adSenseScriptLoading = window._adSenseScriptLoading || false;
  window._adSenseInitializedSlots = window._adSenseInitializedSlots || new Set();
}

const AdSenseEnhanced = ({ 
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
  
  // Skip ad rendering on certain pages
  const excludedPaths = ['/privacy', '/disclaimer', '/about', '/contact'];
  const isExcluded = excludedPaths.some(path => 
    location.pathname === path || location.pathname.startsWith(`${path}/`)
  );
  
  // Enhanced logging
  const log = useCallback((message, type = 'info') => {
    if (!debug && type === 'debug') return;
    
    const prefix = type === 'error' ? '❌' : type === 'warn' ? '⚠️' : '✅';
    console.log(`${prefix} AdSenseEnhanced [${slot}]: ${message}`);
  }, [debug, slot]);

  // Check if ad blocker is active
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

  // Load AdSense script (with global duplicate prevention)
  const loadAdSenseScript = useCallback((maxRetries = 3, retryDelay = 1000) => {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('Window not available'));
        return;
      }
      
      // CRITICAL FIX: Check if global AdSense is already loaded by adsense-config.js
      if (window._adsenseConfig && window._adsenseConfig.autoAdsConfigured) {
        resolve(true);
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
          
          window.adsbygoogle = window.adsbygoogle || [];
          
          log('AdSense script loaded successfully');
          resolve(true);
        };
        
        script.onerror = () => {
          console.error('❌ AdSense script failed to load');
          
          if (retryCount < maxRetries) {
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
  }, [client, log]);

  // Initialize ad safely (WITHOUT auto ads config)
  const initializeAd = useCallback(() => {
    if (typeof window === 'undefined' || !slot || !adRef.current) return;

    if (isExcluded || adBlockDetected || testMode) {
      return;
    }

    // Check if already initialized globally
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

      // Mark as initialized
      window._adSenseInitializedSlots.add(slot);

      // CRITICAL FIX: Only push empty object, NO enable_page_level_ads config
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

  // Main initialization effect
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

        // CRITICAL FIX: Only load script if global adsense-config.js hasn't already
        if (!window._adsenseConfig || !window._adsenseConfig.autoAdsConfigured) {
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

  // Don't render on excluded pages
  if (isExcluded) {
    return null;
  }
  
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

export default AdSenseEnhanced;