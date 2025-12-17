// frontend/src/components/AdSenseWrapper.js
import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

// Global tracking for script and ad initialization
if (typeof window !== 'undefined') {
  window._adSenseScriptLoaded = window._adSenseScriptLoaded || false;
  window._adSenseScriptLoading = window._adSenseScriptLoading || false;
  window._adSenseInitializedSlots = window._adSenseInitializedSlots || new Set();
}

// Ad Unit Configuration
export const AdUnits = {
  HEADER: '1529123561',
  IN_ARTICLE: '8087712926',
  SIDEBAR: '5976732519',
  FOOTER: '2835386242',
  BETWEEN_POSTS: '6583059564',
  IN_CONTENT_1: '9876543210',
  IN_CONTENT_2: '1234567890'
};

const AdSenseWrapper = ({ 
  position, 
  format = 'auto', 
  responsive = true, 
  className = '', 
  fallbackContent = null,
  layout = '',
  layoutKey = '',
  debug = false,
  testMode = false,
  ...props 
}) => {
  const location = useLocation();
  const containerRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [adBlockDetected, setAdBlockDetected] = useState(false);
  const [consentStatus, setConsentStatus] = useState(null);
  
  const componentId = useMemo(() => 
    `ad-wrapper-${position}-${Math.random().toString(36).substr(2, 9)}`,
    [position]
  );
  
  const excludedPaths = useMemo(() => [
    '/privacy', 
    '/privacy-policy', 
    '/disclaimer', 
    '/about', 
    '/contact'
  ], []);
  
  const isExcluded = useMemo(() => 
    excludedPaths.some(path => 
      location.pathname === path || location.pathname.startsWith(`${path}/`)
    ),
    [location.pathname, excludedPaths]
  );

  const positionToSlot = useMemo(() => ({
    'header': AdUnits.HEADER,
    'sidebar': AdUnits.SIDEBAR,
    'footer': AdUnits.FOOTER,
    'in-article': AdUnits.IN_ARTICLE,
    'between-posts': AdUnits.BETWEEN_POSTS,
    'in-content-1': AdUnits.IN_CONTENT_1,
    'in-content-2': AdUnits.IN_CONTENT_2
  }), []);

  const getAutoFormat = useMemo(() => (pos) => {
    const formatMap = {
      'header': 'auto',
      'sidebar': 'vertical',
      'footer': 'auto',
      'in-article': 'fluid',
      'between-posts': 'rectangle',
      'in-content-1': 'fluid',
      'in-content-2': 'fluid'
    };
    return formatMap[pos] || 'auto';
  }, []);

  const slot = useMemo(() => positionToSlot[position], [position, positionToSlot]);

  const checkConsentStatus = useCallback(() => {
    try {
      const consent = localStorage.getItem('cookieConsent');
      const adsenseConsent = localStorage.getItem('adsense_consent');
      
      if (consent === 'false' || adsenseConsent === 'denied') {
        setConsentStatus('denied');
        return 'denied';
      }
      
      if (consent === 'true' || adsenseConsent === 'granted') {
        setConsentStatus('granted');
        return 'granted';
      }
      
      const isEEA = () => {
        try {
          const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          return timezone.includes('Europe') || timezone.includes('London');
        } catch {
          return false;
        }
      };
      
      if (!isEEA()) {
        setConsentStatus('granted');
        return 'granted';
      }
      
      setConsentStatus('pending');
      return 'pending';
    } catch (error) {
      console.error('Error checking consent:', error);
      setConsentStatus('error');
      return 'error';
    }
  }, []);

  const checkAdBlock = useCallback(() => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') {
        resolve(false);
        return;
      }

      const testAd = document.createElement('div');
      testAd.className = 'adsbygoogle';
      testAd.style.cssText = 'height: 1px; width: 1px; position: absolute; left: -1000px; top: -1000px;';
      document.body.appendChild(testAd);
      
      setTimeout(() => {
        const detected = testAd.offsetHeight === 0 || 
                        testAd.offsetWidth === 0 || 
                        window.getComputedStyle(testAd).display === 'none';
        setAdBlockDetected(detected);
        document.body.removeChild(testAd);
        
        if (detected && debug) {
          console.warn('Ad blocker detected');
        }
        
        resolve(detected);
      }, 100);
    });
  }, [debug]);

  // CRITICAL FIX: Load script without auto ads config
  const loadAdSenseScript = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('Window not available'));
        return;
      }
      
      // Check if global AdSense is already loaded by adsense-config.js
      if (window._adsenseConfig && window._adsenseConfig.autoAdsConfigured) {
        resolve(true);
        return;
      }
      
      if (window._adSenseScriptLoaded) {
        resolve(true);
        return;
      }
      
      const existingScript = document.querySelector('script[src*="pagead2.googlesyndication.com"]');
      if (existingScript) {
        window._adSenseScriptLoaded = true;
        resolve(true);
        return;
      }
      
      const script = document.createElement('script');
      script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4047817727348673';
      script.async = true;
      script.crossOrigin = 'anonymous';
      
      script.onload = () => {
        window._adSenseScriptLoaded = true;
        window.adsbygoogle = window.adsbygoogle || [];
        console.log('✅ AdSense script loaded (component)');
        resolve(true);
      };
      
      script.onerror = (error) => {
        console.error('❌ Failed to load AdSense script:', error);
        reject(error);
      };
      
      document.head.appendChild(script);
    });
  }, []);

  const initializeAd = useCallback(async () => {
    if (!slot || !containerRef.current) return;

    try {
      const consent = checkConsentStatus();
      if (consent === 'denied') {
        if (debug) console.log('Ad blocked: Consent denied');
        setHasError(true);
        return;
      }
      
      if (consent === 'pending') return;

      const adBlocked = await checkAdBlock();
      if (adBlocked) {
        if (debug) console.log('Ad blocked: Ad blocker detected');
        setHasError(true);
        return;
      }

      if (testMode) {
        if (containerRef.current) {
          containerRef.current.innerHTML = `
            <div class="ad-test-placeholder">
              <div style="background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); border: 2px dashed #2196f3; border-radius: 8px; padding: 20px; text-align: center; min-height: 90px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #1565c0;">
                <div style="font-size: 12px; font-weight: 600; margin-bottom: 8px;">TEST AD</div>
                <div style="font-size: 11px; margin-bottom: 4px;">Slot: ${slot}</div>
                <div style="font-size: 11px; margin-bottom: 8px;">Position: ${position}</div>
                <div style="font-size: 10px; font-style: italic;">This would be an actual ad in production</div>
              </div>
            </div>
          `;
        }
        setIsLoaded(true);
        return;
      }

      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }

      const adElement = document.createElement('ins');
      adElement.className = 'adsbygoogle';
      adElement.style.display = 'block';
      adElement.dataset.adClient = 'ca-pub-4047817727348673';
      adElement.dataset.adSlot = slot;
      
      const finalFormat = format === 'auto' ? getAutoFormat(position) : format;
      if (finalFormat !== 'auto') adElement.dataset.adFormat = finalFormat;
      if (layout) adElement.dataset.adLayout = layout;
      if (layoutKey) adElement.dataset.adLayoutKey = layoutKey;
      adElement.dataset.fullWidthResponsive = responsive ? 'true' : 'false';
      
      if (containerRef.current) {
        containerRef.current.appendChild(adElement);
      }

      // CRITICAL FIX: Only load script if global adsense-config.js hasn't already
      if (!window._adsenseConfig || !window._adsenseConfig.autoAdsConfigured) {
        await loadAdSenseScript();
      }

      if (window._adSenseInitializedSlots.has(slot)) {
        if (debug) console.log(`AdSenseWrapper: Slot ${slot} already initialized globally, skipping`);
        return;
      }

      // CRITICAL FIX: Only push empty object, NO enable_page_level_ads config
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        window._adSenseInitializedSlots.add(slot);
        setIsLoaded(true);
        
        if (debug) {
          console.log(`✅ AdSenseWrapper: Ad loaded for position ${position}, slot ${slot}`);
        }
      } catch (pushError) {
        console.error(`❌ AdSenseWrapper: Error pushing ad for slot ${slot}:`, pushError);
        setHasError(true);
        
        if (containerRef.current) {
          containerRef.current.innerHTML = `
            <div class="ad-fallback">
              <div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; text-align: center; min-height: 90px; display: flex; align-items: center; justify-content: center; color: #6c757d;">
                <div>
                  <div style="font-size: 12px; font-weight: 600; margin-bottom: 4px;">Advertisement</div>
                  <div style="font-size: 11px; opacity: 0.7;">Ad could not be loaded</div>
                </div>
              </div>
            </div>
          `;
        }
      }

    } catch (error) {
      console.error('❌ AdSenseWrapper: Error initializing ad:', error);
      setHasError(true);
    }
  }, [slot, position, format, responsive, layout, layoutKey, getAutoFormat, debug, testMode, checkConsentStatus, checkAdBlock, loadAdSenseScript]);

  useEffect(() => {
    if (isExcluded || !slot) return;

    const timer = setTimeout(() => {
      initializeAd();
    }, 1000);

    if (document.readyState === 'complete') {
      initializeAd();
    } else {
      window.addEventListener('load', initializeAd);
    }

    const handleConsentChange = () => {
      setConsentStatus(null);
      setTimeout(initializeAd, 500);
    };

    window.addEventListener('consentChanged', handleConsentChange);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('load', initializeAd);
      window.removeEventListener('consentChanged', handleConsentChange);
      
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [slot, isExcluded, initializeAd]);

  if (isExcluded || !slot) {
    if (debug) console.warn(`AdSenseWrapper: No slot for position ${position} or path is excluded`);
    return null;
  }

  if (consentStatus === 'denied') {
    return (
      <div className={`ad-wrapper consent-denied ${className}`} id={componentId}>
        <div style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', border: '1px solid #dee2e6', borderRadius: '8px', padding: '20px', textAlign: 'center', color: '#6c757d', minHeight: '90px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '10px', opacity: 0.6 }}>🔒</div>
          <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Ads Disabled</div>
          <div style={{ fontSize: '11px', opacity: 0.7 }}>You have disabled personalized ads</div>
        </div>
      </div>
    );
  }

  if (consentStatus === 'pending') {
    return (
      <div className={`ad-wrapper consent-required ${className}`} id={componentId}>
        <div style={{ background: 'linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)', border: '2px solid #ffc107', borderRadius: '8px', padding: '20px', textAlign: 'center', color: '#856404', minHeight: '90px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '10px', opacity: 0.8 }}>🍪</div>
          <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Consent Required</div>
          <div style={{ fontSize: '11px', opacity: 0.7 }}>We need your consent to show personalized ads</div>
        </div>
      </div>
    );
  }

  if (adBlockDetected && !testMode) {
    return (
      <div className={`ad-wrapper ad-block-detected ${className}`} id={componentId}>
        <div style={{ background: 'linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)', border: '1px solid #ffeaa7', borderRadius: '8px', padding: '20px', textAlign: 'center', color: '#856404', minHeight: '90px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '10px', opacity: 0.8 }}>🛡️</div>
          <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Ad Blocker Detected</div>
          <div style={{ fontSize: '11px', opacity: 0.7 }}>Please consider disabling your ad blocker</div>
        </div>
      </div>
    );
  }

  if (hasError && fallbackContent) {
    return <div className={`ad-wrapper error-fallback ${className}`} id={componentId}>{fallbackContent}</div>;
  }

  if (hasError) {
    return (
      <div className={`ad-wrapper ad-error ${className}`} id={componentId} ref={containerRef}>
        <div style={{ background: 'linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%)', border: '1px solid #dc3545', borderRadius: '8px', padding: '20px', textAlign: 'center', color: '#721c24', minHeight: '90px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>❌</div>
          <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Ad Failed to Load</div>
          <div style={{ fontSize: '11px', opacity: 0.7 }}>Slot: {slot}</div>
        </div>
      </div>
    );
  }

  const containerProps = {
    className: `ad-wrapper ad-wrapper-${position} ${isLoaded ? 'ad-loaded' : 'ad-loading'} ${className}`,
    'data-ad-position': position,
    'data-ad-slot': slot,
    'data-ad-format': format === 'auto' ? getAutoFormat(position) : format,
    'data-ad-responsive': responsive,
    'data-ad-loaded': isLoaded,
    id: componentId,
    ref: containerRef,
    ...props
  };

  return (
    <div {...containerProps}>
      {!isLoaded && !hasError && (
        <div style={{ minHeight: '90px', background: '#f5f5f5', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: '14px' }}>
          <div style={{ marginBottom: '8px' }}>
            <div style={{ width: '30px', height: '30px', border: '3px solid #e9ecef', borderTopColor: '#007bff', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div>
          </div>
          <div>Loading advertisement...</div>
          {debug && <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.6 }}>Position: {position}, Slot: {slot}</div>}
        </div>
      )}
      
      <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

// CRITICAL FIX: Remove global auto ads initialization from all helper functions
export const loadAdSenseScript = () => {
  if (typeof window === 'undefined') return false;
  
  if (document.querySelector('script[src*="pagead2.googlesyndication.com"]')) {
    return true;
  }
  
  // Check if global AdSense is already loaded by adsense-config.js
  if (window._adsenseConfig && window._adsenseConfig.autoAdsConfigured) {
    return true;
  }
  
  if (window._adSenseScriptLoaded) return true;
  
  try {
    const script = document.createElement('script');
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4047817727348673';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.setAttribute('data-ad-client', 'ca-pub-4047817727348673');
    
    script.onload = () => {
      window._adSenseScriptLoaded = true;
      console.log('✅ AdSense script loaded (helper)');
    };
    
    script.onerror = (error) => {
      console.error('❌ Failed to load AdSense script:', error);
    };
    
    document.head.appendChild(script);
    return true;
  } catch (error) {
    console.error('❌ Error loading AdSense script:', error);
    return false;
  }
};

// CRITICAL FIX: Remove auto ads configuration from global init
export const initAdSense = () => {
  if (typeof window === 'undefined') return;
  
  // Only load script, NO auto ads configuration
  loadAdSenseScript();
  
  // Initialize array only
  window.adsbygoogle = window.adsbygoogle || [];
  
  console.log('🔧 AdSense initialized globally (no auto ads)');
};

export default AdSenseWrapper;