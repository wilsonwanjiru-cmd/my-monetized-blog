// frontend/src/components/AdSenseFixed.js
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useLocation } from 'react-router-dom';
import './AdSense.css';

// Config helper functions
const getAdSenseClientId = () => {
  return window.getConfig ? window.getConfig('ADSENSE_CLIENT_ID') : 'ca-pub-4047817727348673';
};

const isTestMode = () => {
  if (window.getConfig) {
    return window.getConfig('ADSENSE_TEST_MODE');
  }
  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname.includes('test') || hostname.includes('staging');
};

const getAdRetryAttempts = () => {
  return window.getConfig ? window.getConfig('AD_RETRY_ATTEMPTS', 3) : 3;
};

const getAdLoadTimeout = () => {
  return window.getConfig ? window.getConfig('AD_LOAD_TIMEOUT', 10000) : 10000;
};

const isLazyLoadEnabled = () => {
  return window.getConfig ? window.getConfig('LAZY_LOAD_ADS', true) : true;
};

const isDebugEnabled = () => {
  if (window.location.search.includes('debug=true')) return true;
  if (window.getConfig) {
    const env = window.getConfig('ENVIRONMENT', 'production');
    return env === 'development';
  }
  return false;
};

const AdSenseFixed = ({
  slot,
  format = 'auto',
  responsive = 'true',
  className = '',
  layout = '',
  layoutKey = '',
  style = {},
  fallbackContent = null,
  debug: propDebug = false,
  lazyLoad: propLazyLoad = true,
  fullWidthResponsive = false,
  onAdLoaded = null,
  onAdError = null,
  adLabel = 'Advertisement'
}) => {
  const location = useLocation();
  const containerRef = useRef(null);
  const insRef = useRef(null);
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [adDimensions, setAdDimensions] = useState({ width: 0, height: 0 });
  const [adRequested, setAdRequested] = useState(false);
  
  // Use config values
  const maxRetries = useMemo(() => getAdRetryAttempts(), []);
  const adLoadTimeout = useMemo(() => getAdLoadTimeout(), []);
  const testMode = useMemo(() => isTestMode(), []);
  const debug = useMemo(() => propDebug || isDebugEnabled(), [propDebug]);
  const lazyLoad = useMemo(() => propLazyLoad && isLazyLoadEnabled(), [propLazyLoad]);
  const clientId = useMemo(() => getAdSenseClientId(), []);

  // Excluded paths where ads should not be shown
  const excludedPaths = useMemo(() => [
    '/privacy-policy', 
    '/disclaimer', 
    '/about', 
    '/contact',
    '/terms',
    '/login',
    '/register'
  ], []);

  // Check if route is excluded
  const isExcluded = useMemo(() => {
    return excludedPaths.some(path => 
      location.pathname === path || location.pathname.startsWith(`${path}/`)
    );
  }, [location.pathname, excludedPaths]);

  // Check if consent is given
  const hasConsent = useMemo(() => {
    if (window.hasAdConsent) {
      return window.hasAdConsent();
    }
    try {
      return localStorage.getItem('adsense_consent') === 'granted';
    } catch (error) {
      return false;
    }
  }, []);

  // Check if AdSense is enabled
  const isAdSenseEnabled = useMemo(() => {
    if (window.isAdSenseEnabled) {
      return window.isAdSenseEnabled();
    }
    return true;
  }, []);

  // Determine if ad should be shown
  const shouldShowAd = useMemo(() => {
    return !isExcluded && slot && isAdSenseEnabled && hasConsent;
  }, [isExcluded, slot, isAdSenseEnabled, hasConsent]);

  const log = useCallback((message, type = 'info') => {
    if (!debug && type !== 'error') return;
    
    const prefix = {
      error: '❌',
      warn: '⚠️',
      info: 'ℹ️',
      success: '✅'
    }[type] || 'ℹ️';
    
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.log(`[${timestamp}] ${prefix} AdSense [${slot}]: ${message}`);
  }, [debug, slot]);

  // Ensure container is in DOM and visible
  const ensureContainerReady = useCallback(() => {
    if (!containerRef.current) {
      log('Container ref not available', 'warn');
      return false;
    }
    
    const container = containerRef.current;
    
    // Ensure container is in DOM
    if (!document.body.contains(container)) {
      log('Container not in DOM, reattaching...', 'warn');
      document.body.appendChild(container);
    }
    
    // Ensure container is visible
    const isContainerHidden = container.offsetParent === null || 
      container.offsetHeight === 0 || 
      container.offsetWidth === 0;
    
    if (isContainerHidden) {
      // Make container visible
      container.style.display = 'block';
      container.style.visibility = 'visible';
      container.style.opacity = '1';
      container.style.position = 'relative';
      container.style.zIndex = '1';
      
      // Force reflow
      void container.offsetHeight;
      
      log('Container made visible', 'warn');
    }
    
    return true;
  }, [log]);

  // Load AdSense script if not available
  const loadAdSenseScript = useCallback(() => {
    return new Promise((resolve, reject) => {
      // Check if script is already loaded
      if (window.adsbygoogle && window.adsbygoogle.loaded) {
        log('AdSense script already loaded', 'success');
        resolve();
        return;
      }

      // Check if script is already loading
      if (window._adSenseLoading) {
        log('AdSense script already loading, waiting...', 'info');
        const checkInterval = setInterval(() => {
          if (window.adsbygoogle && window.adsbygoogle.loaded) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
        
        // Timeout after 5 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          reject(new Error('AdSense script loading timeout'));
        }, 5000);
        return;
      }

      // Mark as loading
      window._adSenseLoading = true;
      log('Loading AdSense script...', 'info');

      const script = document.createElement('script');
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}${testMode ? '&adtest=on' : ''}`;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.setAttribute('data-ad-client', clientId);
      
      script.onload = () => {
        window._adSenseLoading = false;
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.loaded = true;
        log('AdSense script loaded successfully', 'success');
        resolve();
      };
      
      script.onerror = (error) => {
        window._adSenseLoading = false;
        log(`Failed to load AdSense script: ${error}`, 'error');
        reject(new Error('AdSense script failed to load'));
      };
      
      document.head.appendChild(script);
    });
  }, [clientId, testMode, log]);

  // Check if ad element is properly initialized
  const checkAdElement = useCallback(() => {
    if (!insRef.current) {
      log('Ad element not found', 'error');
      return false;
    }

    const insElement = insRef.current;
    
    // Ensure ins element is in DOM
    if (!document.body.contains(insElement)) {
      if (containerRef.current) {
        containerRef.current.appendChild(insElement);
        log('Ad element reattached to DOM', 'warn');
      } else {
        log('Container not available for reattachment', 'error');
        return false;
      }
    }

    // Check if element is visible
    const isElementHidden = insElement.offsetParent === null || 
      insElement.offsetHeight === 0 || 
      insElement.offsetWidth === 0;
    
    if (isElementHidden) {
      // Make it visible
      insElement.style.display = 'block';
      insElement.style.visibility = 'visible';
      insElement.style.position = 'relative';
      insElement.style.minHeight = '90px';
      
      log('Ad element made visible', 'warn');
    }

    return true;
  }, [log]);

  // Initialize ad with robust error handling
  const initializeAd = useCallback(() => {
    if (!shouldShowAd || status === 'loaded' || status === 'loading' || adRequested) {
      return;
    }

    setStatus('loading');
    setAdRequested(true);
    log(`Initializing ad slot: ${slot}`);

    // Ensure container is ready
    if (!ensureContainerReady()) {
      log('Container not ready, delaying initialization', 'warn');
      setTimeout(() => {
        setAdRequested(false);
        initializeAd();
      }, 500);
      return;
    }

    // Load script if needed
    if (!window.adsbygoogle || !window.adsbygoogle.loaded) {
      loadAdSenseScript()
        .then(() => {
          setTimeout(() => initializeAd(), 100);
        })
        .catch((error) => {
          setStatus('error');
          setErrorMessage(error.message);
          setAdRequested(false);
          if (onAdError) onAdError(error);
          log(`Failed to load AdSense: ${error.message}`, 'error');
        });
      return;
    }

    // Check ad element
    if (!checkAdElement()) {
      if (retryCount < maxRetries) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => initializeAd(), 1000 * (retryCount + 1));
      } else {
        setStatus('error');
        setErrorMessage('Ad element not found after retries');
        setAdRequested(false);
        if (onAdError) onAdError(new Error('Ad element not found'));
      }
      return;
    }

    const insElement = insRef.current;

    // Push ad with error handling
    try {
      // Create config object
      const config = {
        google_ad_client: clientId,
        enable_page_level_ads: false,
        overlays: false
      };

      if (slot) {
        config.google_ad_slot = slot;
      }

      if (format && format !== 'auto') {
        config.google_ad_format = format;
      }

      if (layout) {
        config.google_ad_layout = layout;
      }

      if (layoutKey) {
        config.google_ad_layout_key = layoutKey;
      }

      // Mark element as initialized
      insElement.dataset.adInitialized = 'true';
      insElement.dataset.adSlot = slot || '';
      insElement.dataset.adFormat = format;
      
      // Push ad configuration
      (window.adsbygoogle = window.adsbygoogle || []).push(config);
      
      log(`Ad pushed for slot: ${slot}`, 'success');
      
      // Monitor ad load
      let loadCheckInterval;
      let loadTimeout;
      
      const cleanupTimers = () => {
        if (loadCheckInterval) clearInterval(loadCheckInterval);
        if (loadTimeout) clearTimeout(loadTimeout);
      };
      
      loadCheckInterval = setInterval(() => {
        if (insElement.offsetHeight > 50 && insElement.offsetWidth > 50) {
          cleanupTimers();
          setStatus('loaded');
          setAdDimensions({
            width: insElement.offsetWidth,
            height: insElement.offsetHeight
          });
          log('Ad loaded successfully', 'success');
          if (onAdLoaded) onAdLoaded({ slot, format, dimensions: adDimensions });
        }
      }, 500);
      
      // Timeout after configured time
      loadTimeout = setTimeout(() => {
        cleanupTimers();
        if (status !== 'loaded') {
          setStatus('error');
          setErrorMessage(`Ad load timeout after ${adLoadTimeout}ms`);
          setAdRequested(false);
          if (onAdError) onAdError(new Error('Ad load timeout'));
          log('Ad load timeout', 'error');
        }
      }, adLoadTimeout);
      
      // Cleanup timers on unmount
      return cleanupTimers;
      
    } catch (error) {
      log(`Ad push error: ${error.message}`, 'error');
      setStatus('error');
      setErrorMessage(`Ad push failed: ${error.message}`);
      setAdRequested(false);
      if (onAdError) onAdError(error);
    }
  }, [
    shouldShowAd, status, adRequested, slot, format, layout, layoutKey,
    clientId, retryCount, maxRetries, adLoadTimeout, onAdLoaded, onAdError,
    ensureContainerReady, loadAdSenseScript, checkAdElement, log
  ]);

  // Set up intersection observer for lazy loading
  useEffect(() => {
    if (!shouldShowAd || !lazyLoad) {
      setIsVisible(true);
      return;
    }

    let observer;
    
    try {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            setIsVisible(true);
            if (observer && observer.unobserve) {
              observer.unobserve(entries[0].target);
            }
          }
        },
        { 
          threshold: 0.1, 
          rootMargin: '50px',
          root: null
        }
      );

      if (containerRef.current) {
        observer.observe(containerRef.current);
      }
    } catch (error) {
      log(`IntersectionObserver error: ${error.message}, falling back to immediate load`, 'warn');
      setIsVisible(true);
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, [shouldShowAd, lazyLoad, log]);

  // Initialize ad when visible
  useEffect(() => {
    if (isVisible && shouldShowAd && !adRequested) {
      const timer = setTimeout(() => {
        initializeAd();
      }, lazyLoad ? 500 : 100);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, shouldShowAd, adRequested, initializeAd, lazyLoad]);

  // Handle window focus/visibility change to refresh ads
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && status === 'loaded') {
        // Refresh ad after 30 seconds of page being visible again
        setTimeout(() => {
          if (insRef.current && window.adsbygoogle && window.adsbygoogle.request) {
            try {
              window.adsbygoogle.request(insRef.current);
              log('Ad refreshed on visibility change', 'info');
            } catch (error) {
              // Silent fail
            }
          }
        }, 30000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [status, log]);

  // Handle window resize for responsive ads
  useEffect(() => {
    const handleResize = () => {
      if (insRef.current && status === 'loaded' && responsive === 'true') {
        // Check if ad dimensions have changed
        const newWidth = insRef.current.offsetWidth;
        const newHeight = insRef.current.offsetHeight;
        
        if (newWidth !== adDimensions.width || newHeight !== adDimensions.height) {
          setAdDimensions({ width: newWidth, height: newHeight });
          log(`Ad resized to ${newWidth}x${newHeight}`, 'info');
        }
      }
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [status, responsive, adDimensions, log]);

  // Don't render if ad shouldn't be shown
  if (!shouldShowAd) {
    if (debug) {
      log(`Ad not shown: excluded=${isExcluded}, slot=${!!slot}, enabled=${isAdSenseEnabled}, consent=${hasConsent}`, 'info');
    }
    return null;
  }

  // Error state
  if (status === 'error') {
    if (fallbackContent) {
      return (
        <div className={`ad-container ad-error ${className}`} style={style}>
          {fallbackContent}
        </div>
      );
    }
    
    return (
      <div className={`ad-container ad-error ${className}`} style={style}>
        <div className="ad-error-content">
          <div className="ad-error-icon">⚠️</div>
          <div className="ad-error-message">
            <p>{adLabel}</p>
            <small>Ad could not be loaded</small>
            {debug && errorMessage && (
              <div className="ad-error-debug">{errorMessage}</div>
            )}
            {retryCount > 0 && (
              <div className="ad-error-retry">
                <small>Retry attempts: {retryCount}/{maxRetries}</small>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Determine container styles
  const containerStyles = {
    ...style,
    minHeight: status === 'loading' ? '90px' : 'auto',
    position: 'relative',
    overflow: 'hidden'
  };

  if (fullWidthResponsive) {
    containerStyles.width = '100%';
    containerStyles.maxWidth = '100%';
  }

  // Determine ins styles
  const insStyles = {
    display: 'block',
    textAlign: 'center',
    minHeight: '90px',
    overflow: 'hidden',
    borderRadius: '8px',
    visibility: status === 'loaded' ? 'visible' : 'hidden',
    opacity: status === 'loaded' ? 1 : 0,
    transition: 'opacity 0.3s ease',
    width: '100%',
    maxWidth: '100%'
  };

  if (status === 'loaded' && adDimensions.width && adDimensions.height) {
    insStyles.minHeight = `${adDimensions.height}px`;
  }

  return (
    <div 
      ref={containerRef}
      className={`ad-container ${className} ${status === 'loaded' ? 'ad-loaded' : 'ad-loading'}`}
      style={containerStyles}
      data-ad-slot={slot}
      data-ad-status={status}
      data-ad-visible={isVisible}
      data-ad-format={format}
      data-ad-test={testMode}
      data-ad-retry={retryCount}
    >
      {/* Loading placeholder */}
      {status !== 'loaded' && (
        <div className="ad-loading-placeholder">
          <div className="ad-loading-spinner"></div>
          <div className="ad-loading-text">
            {status === 'loading' ? 'Loading advertisement...' : 'Advertisement'}
          </div>
          {debug && (
            <div className="ad-loading-debug">
              <div>Slot: {slot}</div>
              <div>Format: {format}</div>
              <div>Retry: {retryCount}/{maxRetries}</div>
              {testMode && <div className="ad-test-badge">TEST MODE</div>}
            </div>
          )}
        </div>
      )}
      
      {/* The actual AdSense ad element */}
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={insStyles}
        data-ad-client={clientId}
        data-ad-slot={slot}
        data-ad-format={format}
        data-ad-layout={layout}
        data-ad-layout-key={layoutKey}
        data-full-width-responsive={responsive}
        data-adtest={testMode ? 'on' : 'off'}
      />
      
      {/* Ad label for compliance */}
      {status === 'loaded' && (
        <div className="ad-label">{adLabel}</div>
      )}
    </div>
  );
};

AdSenseFixed.propTypes = {
  slot: PropTypes.string.isRequired,
  format: PropTypes.string,
  responsive: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
  className: PropTypes.string,
  layout: PropTypes.string,
  layoutKey: PropTypes.string,
  style: PropTypes.object,
  fallbackContent: PropTypes.node,
  debug: PropTypes.bool,
  lazyLoad: PropTypes.bool,
  fullWidthResponsive: PropTypes.bool,
  onAdLoaded: PropTypes.func,
  onAdError: PropTypes.func,
  adLabel: PropTypes.string
};

AdSenseFixed.defaultProps = {
  format: 'auto',
  responsive: 'true',
  className: '',
  layout: '',
  layoutKey: '',
  style: {},
  fallbackContent: null,
  debug: false,
  lazyLoad: true,
  fullWidthResponsive: false,
  onAdLoaded: null,
  onAdError: null,
  adLabel: 'Advertisement'
};

// Ad slots configuration - REPLACE THESE WITH YOUR ACTUAL AD SLOTS
export const AdSlots = {
  HEADER: '1529123561',          // Replace with your actual header ad slot
  IN_ARTICLE: '8087712926',      // Replace with your actual in-article ad slot
  SIDEBAR: '5976732519',         // Replace with your actual sidebar ad slot
  FOOTER: '2835386242',          // Replace with your actual footer ad slot
  BETWEEN_POSTS: '6583059564',   // Replace with your actual between posts ad slot
  IN_CONTENT_1: '9876543210',    // Replace with your actual in-content ad slot 1
  IN_CONTENT_2: '1234567890'     // Replace with your actual in-content ad slot 2
};

export const AdUnits = AdSlots;

export default AdSenseFixed;