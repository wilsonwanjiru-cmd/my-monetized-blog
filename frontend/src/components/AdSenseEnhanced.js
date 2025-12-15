// frontend/src/components/AdSenseEnhanced.js
import React, { useEffect, useState, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useLocation } from 'react-router-dom';
import { loadAdSenseScript } from '../utils/loadAdSense';
import './AdSense.css';

const AdSenseEnhanced = ({
  slot,
  format = 'auto',
  responsive = 'true',
  className = '',
  layout = '',
  layoutKey = '',
  style = {},
  fallbackContent = null,
  debug = false,
  testMode = false,
  lazyLoad = true
}) => {
  const location = useLocation();
  const containerRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle, loading, loaded, error
  const [errorMessage, setErrorMessage] = useState('');
  const [scriptLoaded, setScriptLoaded] = useState(false);
  
  // Excluded paths
  const excludedPaths = ['/privacy', '/disclaimer', '/about', '/contact'];
  const isExcluded = excludedPaths.some(path => 
    location.pathname === path || location.pathname.startsWith(`${path}/`)
  );

  const log = useCallback((message, type = 'info') => {
    if (!debug && type !== 'error') return;
    
    const prefix = {
      error: '❌',
      warn: '⚠️',
      info: 'ℹ️',
      success: '✅'
    }[type] || 'ℹ️';
    
    console.log(`${prefix} AdSense [${slot}]: ${message}`);
  }, [debug, slot]);

  // Load AdSense script
  const loadScript = useCallback(async () => {
    if (typeof window === 'undefined') return false;
    
    try {
      log('Loading AdSense script...');
      await loadAdSenseScript({ debug, testMode });
      setScriptLoaded(true);
      log('AdSense script loaded', 'success');
      return true;
    } catch (error) {
      log(`Failed to load AdSense script: ${error.message}`, 'error');
      setStatus('error');
      setErrorMessage('AdSense script failed to load');
      return false;
    }
  }, [debug, testMode, log]);

  // Initialize ad
  const initializeAd = useCallback(async () => {
    if (isExcluded || !slot || status === 'loaded' || status === 'loading') {
      return;
    }

    setStatus('loading');
    log(`Initializing ad slot: ${slot}`);

    try {
      // Wait for script to load
      if (!scriptLoaded) {
        const loaded = await loadScript();
        if (!loaded) {
          throw new Error('AdSense script not loaded');
        }
      }

      // Check if adsbygoogle is available
      if (!window.adsbygoogle) {
        throw new Error('adsbygoogle not available');
      }

      // Wait for container to be ready
      await new Promise(resolve => setTimeout(resolve, 100));

      if (!containerRef.current) {
        throw new Error('Ad container not found');
      }

      // Create ad element
      const adElement = document.createElement('ins');
      adElement.className = 'adsbygoogle';
      adElement.style.display = 'block';
      adElement.dataset.adClient = 'ca-pub-4047817727348673';
      adElement.dataset.adSlot = slot;
      adElement.dataset.adFormat = format;
      adElement.dataset.fullWidthResponsive = responsive;
      
      if (layout) adElement.dataset.adLayout = layout;
      if (layoutKey) adElement.dataset.adLayoutKey = layoutKey;
      if (testMode) adElement.dataset.adtest = 'on';

      // Clear container and append ad
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(adElement);

      // Initialize the ad
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        log(`Ad pushed to adsbygoogle queue`, 'success');
        
        // Wait for ad to load
        setTimeout(() => {
          if (adElement.offsetHeight > 0 && adElement.offsetWidth > 0) {
            setStatus('loaded');
            log('Ad loaded successfully', 'success');
          } else {
            setStatus('error');
            setErrorMessage('Ad failed to render');
            log('Ad failed to render', 'error');
          }
        }, 2000);
      } catch (pushError) {
        setStatus('error');
        setErrorMessage(`Ad push failed: ${pushError.message}`);
        log(`Ad push failed: ${pushError.message}`, 'error');
      }
    } catch (error) {
      setStatus('error');
      setErrorMessage(error.message);
      log(`Ad initialization failed: ${error.message}`, 'error');
    }
  }, [isExcluded, slot, status, scriptLoaded, format, responsive, layout, layoutKey, testMode, loadScript, log]);

  // Effect to load ad
  useEffect(() => {
    if (isExcluded || !slot) return;

    let mounted = true;
    let timeoutId;

    const init = async () => {
      if (lazyLoad) {
        // Wait for component to be in viewport
        const observer = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting && mounted) {
              observer.disconnect();
              initializeAd();
            }
          },
          { threshold: 0.1 }
        );

        if (containerRef.current) {
          observer.observe(containerRef.current);
        }

        return () => {
          if (observer) observer.disconnect();
        };
      } else {
        // Non-lazy load
        timeoutId = setTimeout(() => {
          if (mounted) initializeAd();
        }, 1000);
      }
    };

    init();

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [initializeAd, isExcluded, slot, lazyLoad]);

  // Don't render if excluded or no slot
  if (isExcluded || !slot) {
    return null;
  }

  // Render based on status
  if (status === 'error') {
    if (fallbackContent) {
      return <div className={`ad-container ad-error ${className}`}>{fallbackContent}</div>;
    }
    
    return (
      <div className={`ad-container ad-error ${className}`} style={style}>
        <div className="ad-error-content">
          <div className="ad-error-icon">❌</div>
          <div className="ad-error-message">
            <p>Advertisement</p>
            <small>Ad failed to load: {errorMessage}</small>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'loaded') {
    return (
      <div 
        className={`ad-container ad-loaded ${className}`}
        style={style}
        ref={containerRef}
        data-ad-slot={slot}
        data-ad-status="loaded"
      />
    );
  }

  // Loading state
  return (
    <div 
      className={`ad-container ad-loading ${className}`}
      style={style}
      ref={containerRef}
      data-ad-slot={slot}
      data-ad-status="loading"
    >
      <div className="ad-loading-content">
        <div className="ad-loading-spinner"></div>
        <div className="ad-loading-text">Loading advertisement...</div>
        {debug && <div className="ad-loading-debug">Slot: {slot}</div>}
      </div>
    </div>
  );
};

AdSenseEnhanced.propTypes = {
  slot: PropTypes.string.isRequired,
  format: PropTypes.string,
  responsive: PropTypes.string,
  className: PropTypes.string,
  layout: PropTypes.string,
  layoutKey: PropTypes.string,
  style: PropTypes.object,
  fallbackContent: PropTypes.node,
  debug: PropTypes.bool,
  testMode: PropTypes.bool,
  lazyLoad: PropTypes.bool
};

// Ad slots configuration
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

export default AdSenseEnhanced;