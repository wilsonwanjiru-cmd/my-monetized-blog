// frontend/src/components/AdSense.js - COMPREHENSIVE FIXED VERSION
// Complete fix for no_div error and duplicate ad prevention

import React, { useEffect, useState, useCallback, useRef } from 'react';

// Import the enhanced hotfix
import '../utils/adSenseHotfix';

// Global tracking for script and ad initialization - SINGLE SOURCE OF TRUTH
if (typeof window !== 'undefined') {
  window._adSenseScriptLoaded = window._adSenseScriptLoaded || false;
  window._adSenseScriptLoading = window._adSenseScriptLoading || false;
  window._adSenseInitializedSlots = window._adSenseInitializedSlots || new Set();
  window._adSenseGlobalPush = window._adSenseGlobalPush || [];
  window._adSenseProcessedElements = window._adSenseProcessedElements || new WeakSet();
  window._adSenseComponentInstances = window._adSenseComponentInstances || new Map();
  window._adSenseVisibilityRetries = window._adSenseVisibilityRetries || new Map();
}

const AdSense = ({ 
  slot, 
  format = 'auto', 
  responsive = true, 
  className = '',
  layout = '',
  layoutKey = '',
  adStyle = {},
  fallbackContent = null,
  currentPath = typeof window !== 'undefined' ? window.location.pathname : '/',
  debug = false
}) => {
  const [adError, setAdError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [hasConsent, setHasConsent] = useState(null);
  const [isEEAUser, setIsEEAUser] = useState(false);
  const [adStatus, setAdStatus] = useState('idle');
  const [adLoaded, setAdLoaded] = useState(false);
  
  const maxRetries = 2;
  const adInitializedRef = useRef(false);
  const adElementRef = useRef(null);
  const timeoutRef = useRef(null);
  const visibilityRetryRef = useRef(0);
  const componentIdRef = useRef(`ad-${slot}-${Math.random().toString(36).substr(2, 9)}`);
  const mountedRef = useRef(true);

  const isProduction = process.env.NODE_ENV === 'production' || 
                      (typeof window !== 'undefined' && (
                        window.location.hostname === 'wilsonmuita.com' ||
                        window.location.hostname === 'www.wilsonmuita.com'
                      ));

  // Enhanced logging with debug control
  const log = useCallback((message, type = 'info') => {
    if (!debug && type === 'debug') return;
    
    const prefix = type === 'error' ? '❌' : type === 'warn' ? '⚠️' : '✅';
    const styles = type === 'error' ? 'color: #dc3545;' : type === 'warn' ? 'color: #ffc107;' : 'color: #28a745;';
    
    console.log(`%c${prefix} AdSense [${slot}]: ${message}`, styles);
  }, [debug, slot]);

  // Enhanced EEA user detection
  const checkIfEEAUser = useCallback(() => {
    if (typeof window === 'undefined') return false;
    
    try {
      // Check stored preference first
      const storedEEA = localStorage.getItem('is_eea_user');
      if (storedEEA !== null) return storedEEA === 'true';
      
      // Timezone detection
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const eeaTimezones = [
        'Europe/', 'GB', 'UK', 'London', 'Berlin', 'Paris', 'Rome', 'Madrid',
        'Amsterdam', 'Brussels', 'Vienna', 'Zurich', 'Stockholm', 'Oslo',
        'Copenhagen', 'Helsinki', 'Dublin', 'Lisbon', 'Warsaw', 'Prague',
        'Athens', 'Budapest', 'Bucharest', 'Sofia', 'Zagreb', 'Luxembourg',
        'Bratislava', 'Tallinn', 'Riga', 'Vilnius', 'Valletta', 'Nicosia'
      ];
      
      const isEEATimezone = eeaTimezones.some(tz => 
        timezone.includes(tz) || timezone.toLowerCase().includes(tz.toLowerCase())
      );
      
      // Browser language detection
      const browserLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
      const eeaLanguages = [
        'de', 'fr', 'it', 'es', 'nl', 'pl', 'sv', 'no', 'da', 'fi', 
        'pt', 'cs', 'hu', 'ro', 'el', 'bg', 'hr', 'sk', 'sl', 'et',
        'lv', 'lt', 'mt', 'ga', 'lv', 'lt', 'et', 'mt', 'fi', 'sv'
      ];
      const isEEALanguage = eeaLanguages.some(lang => browserLang.startsWith(lang));
      
      // IP-based detection (fallback)
      const isEEA = isEEATimezone || isEEALanguage;
      
      // Store for future use
      localStorage.setItem('is_eea_user', isEEA.toString());
      
      return isEEA;
    } catch (error) {
      log('EEA detection failed, defaulting to non-EEA', 'warn');
      return false;
    }
  }, [log]);

  // Enhanced consent status checking
  const checkConsentStatus = useCallback(() => {
    if (typeof window === 'undefined') return false;
    
    try {
      const consent = localStorage.getItem('cookieConsent');
      const adsenseConsent = localStorage.getItem('adsense_consent');
      const userIsEEA = checkIfEEAUser();
      
      setIsEEAUser(userIsEEA);
      
      // If user explicitly denied consent, don't load ads
      if (consent === 'false' || adsenseConsent === 'denied') {
        setHasConsent(false);
        log('Consent denied by user', 'warn');
        return false;
      }
      
      // If user gave consent or doesn't need consent, load ads
      if (consent === 'true' || adsenseConsent === 'granted') {
        setHasConsent(true);
        log('Consent granted by user');
        return true;
      }
      
      // Non-EEA users don't need explicit consent
      if (!userIsEEA) {
        setHasConsent(true);
        log('Auto-consent for non-EEA user');
        return true;
      }
      
      // EEA users without consent decision - wait for user decision
      setHasConsent(null);
      log('Consent required for EEA user', 'warn');
      return null;
    } catch (error) {
      log('Consent check failed: ' + error.message, 'error');
      return false;
    }
  }, [checkIfEEAUser, log]);

  // FIXED: Enhanced global AdSense script loading with duplicate prevention
  const loadAdSenseScript = useCallback(() => {
    if (typeof window === 'undefined') return false;

    // Check if script is already loaded globally
    if (window._adSenseScriptLoaded) {
      log('Script already loaded (global check)');
      return true;
    }

    // Check if script is already in DOM
    const existingScript = document.querySelector('script[src*="pagead2.googlesyndication.com"]');
    if (existingScript) {
      window._adSenseScriptLoaded = true;
      log('Script tag already exists in DOM');
      return true;
    }

    // Prevent multiple simultaneous loading attempts
    if (window._adSenseScriptLoading) {
      log('Script loading in progress, waiting...', 'debug');
      return false;
    }

    window._adSenseScriptLoading = true;
    log('Starting script load...');

    try {
      const script = document.createElement('script');
      script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4047817727348673';
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.setAttribute('data-ad-client', 'ca-pub-4047817727348673');
      
      script.onload = () => {
        if (!mountedRef.current) return;
        
        window._adSenseScriptLoaded = true;
        window._adSenseScriptLoading = false;
        
        // Update hotfix script status
        if (window._adSenseHotfix) {
          window._adSenseHotfix.setScriptLoaded();
        }
        
        log('Script loaded successfully');
        
        // Process any queued ad pushes
        if (window._adSenseGlobalPush && window._adSenseGlobalPush.length > 0) {
          log(`Processing ${window._adSenseGlobalPush.length} queued ad pushes`);
          window._adSenseGlobalPush.forEach(pushFn => pushFn());
          window._adSenseGlobalPush = [];
        }
      };
      
      script.onerror = (error) => {
        if (!mountedRef.current) return;
        
        window._adSenseScriptLoading = false;
        log('Failed to load script: ' + error, 'error');
        setAdError(true);
        setAdStatus('error');
      };
      
      document.head.appendChild(script);
      return true;
    } catch (error) {
      window._adSenseScriptLoading = false;
      log('Error loading script: ' + error.message, 'error');
      return false;
    }
  }, [log]);

  // FIXED: Enhanced wait for AdSense script to be ready
  const waitForAdSenseScript = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (window._adSenseScriptLoaded) {
        resolve();
        return;
      }

      let attempts = 0;
      const maxAttempts = 15; // Increased for slower connections
      const interval = setInterval(() => {
        if (!mountedRef.current) {
          clearInterval(interval);
          reject(new Error('Component unmounted'));
          return;
        }
        
        attempts++;
        if (window._adSenseScriptLoaded) {
          clearInterval(interval);
          resolve();
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          reject(new Error('AdSense script timeout after ' + (maxAttempts * 500) + 'ms'));
        }
      }, 500);
    });
  }, []);

  // ✅ CRITICAL FIX: Enhanced safe ad push with visibility check and no_div prevention
  const safeAdPush = useCallback(() => {
    if (typeof window === 'undefined') return false;

    try {
      const adElement = adElementRef.current;
      if (!adElement) {
        log('No ad element found', 'warn');
        return false;
      }

      // ✅ CRITICAL FIX: Ensure element is visible and in DOM before pushing
      if (!adElement.offsetParent || adElement.offsetHeight === 0 || adElement.offsetWidth === 0) {
        log('Ad element not visible or not in DOM, delaying push', 'debug');
        
        // Use global tracking for visibility retries
        const retryKey = componentIdRef.current;
        const currentRetries = window._adSenseVisibilityRetries.get(retryKey) || 0;
        
        if (currentRetries < 3) {
          window._adSenseVisibilityRetries.set(retryKey, currentRetries + 1);
          
          setTimeout(() => {
            if (mountedRef.current && adElementRef.current) {
              log(`Retrying ad push (attempt ${currentRetries + 1})`);
              safeAdPush();
            }
          }, 200 * (currentRetries + 1));
          return false;
        } else {
          log('Max visibility retries reached, aborting push', 'warn');
          window._adSenseVisibilityRetries.delete(retryKey);
          return false;
        }
      }

      // Layer 1: Check if this specific element already has ads
      if (window._adSenseProcessedElements.has(adElement)) {
        log('Element already processed, skipping push', 'debug');
        return false;
      }

      // Layer 2: Check Google's internal tracking
      if (adElement.classList.contains('adsbygoogle-noablate')) {
        log('Element already has ads (noablate class)', 'debug');
        return false;
      }

      // Layer 3: Check if element has data-adsbygoogle-status attribute
      const adStatus = adElement.getAttribute('data-adsbygoogle-status');
      if (adStatus) {
        log(`Element already processed (status: ${adStatus})`, 'debug');
        return false;
      }

      // Layer 4: Hotfix integration
      if (window._adSenseHotfix && window._adSenseHotfix.isElementProcessed(adElement)) {
        log('Element already processed (hotfix)', 'debug');
        return false;
      }

      log('Safe push initiated - element is visible and ready');
      
      // Mark element as processed across all tracking systems
      window._adSenseProcessedElements.add(adElement);
      if (window._adSenseHotfix) {
        window._adSenseHotfix.markElementProcessed(adElement);
      }
      
      // Clear visibility retries on successful push
      window._adSenseVisibilityRetries.delete(componentIdRef.current);
      
      // Use the global push method with error handling
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      
      return true;
    } catch (error) {
      log('Safe push error: ' + error.message, 'error');
      return false;
    }
  }, [log, slot]);

  // ENHANCED: Robust ad loading with multiple duplicate protections
  const loadAd = useCallback(async () => {
    if (typeof window === 'undefined' || !mountedRef.current) return;

    // Clear any existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Early returns for various conditions
    if (adInitializedRef.current) {
      log('Component already initialized, skipping', 'debug');
      return;
    }

    if (!slot) {
      log('No slot ID provided', 'warn');
      setAdError(true);
      return;
    }

    if (hasConsent === false) {
      log('Skipping ad load - consent denied');
      return;
    }

    if (isEEAUser && hasConsent !== true) {
      log('Skipping ad load - no consent for EEA user');
      return;
    }

    // CRITICAL FIX: Updated excluded paths - only essential pages
    const excludedPaths = ['/privacy', '/disclaimer', '/contact', '/about'];
    if (excludedPaths.some(path => currentPath.startsWith(path))) {
      log('Skipping ad load - excluded page: ' + currentPath);
      return;
    }

    // HOTFIX INTEGRATION: Check with global hotfix first
    if (window._adSenseHotfix && !window._adSenseHotfix.trackSlot(slot)) {
      log('Blocking duplicate slot (hotfix)', 'debug');
      return;
    }

    // Global slot tracking to prevent duplicates across components
    if (window._adSenseInitializedSlots.has(slot)) {
      log('Slot already initialized globally, skipping', 'debug');
      return;
    }

    // Component instance tracking
    if (window._adSenseComponentInstances.has(componentIdRef.current)) {
      log('Component instance already exists, skipping', 'debug');
      return;
    }

    try {
      setAdStatus('loading');
      adInitializedRef.current = true;
      window._adSenseInitializedSlots.add(slot);
      window._adSenseComponentInstances.set(componentIdRef.current, true);

      // Load AdSense script
      const scriptLoaded = loadAdSenseScript();
      if (!scriptLoaded && !window._adSenseScriptLoaded) {
        throw new Error('AdSense script failed to load');
      }

      // Wait for script to be ready
      await waitForAdSenseScript();

      // ✅ CRITICAL FIX: Additional delay for DOM stability and element visibility
      await new Promise(resolve => setTimeout(resolve, 300));

      log('Loading ad');
      
      // Use safe ad push with duplicate protection
      const pushSuccess = safeAdPush();
      
      if (pushSuccess) {
        setAdStatus('loaded');
        setAdLoaded(true);
        
        // Set a timeout to detect if ad fails to render
        timeoutRef.current = setTimeout(() => {
          if (!mountedRef.current) return;
          
          const adElement = adElementRef.current;
          if (adElement) {
            const isVisible = adElement.offsetHeight > 0 && adElement.offsetWidth > 0;
            const hasContent = adElement.innerHTML.trim().length > 0;
            
            if (!isVisible || !hasContent) {
              log('Ad may have failed to render (no visible content)', 'warn');
              handleAdError();
            } else {
              log('Ad rendered successfully');
            }
          }
        }, 4000);
      } else {
        setAdStatus('duplicate');
        log('Ad push prevented (duplicate element)');
      }
      
    } catch (error) {
      if (!mountedRef.current) return;
      log('Error loading ad: ' + error.message, 'error');
      handleAdError();
    }
  }, [slot, isEEAUser, hasConsent, currentPath, loadAdSenseScript, waitForAdSenseScript, safeAdPush, log]);

  // Enhanced error handling
  const handleAdError = useCallback(() => {
    log('Ad failed to load', 'error');
    setAdError(true);
    setAdStatus('error');
    
    if (slot) {
      window._adSenseInitializedSlots.delete(slot);
    }
    
    if (componentIdRef.current) {
      window._adSenseComponentInstances.delete(componentIdRef.current);
    }
    
    // Clear visibility retries on error
    window._adSenseVisibilityRetries.delete(componentIdRef.current);
    
    adInitializedRef.current = false;
    
    // HOTFIX INTEGRATION: Also clear from hotfix tracking
    if (window._adSenseHotfix && slot) {
      window._adSenseHotfix.clearSlot(slot);
    }
    
    // Clear from processed elements
    if (adElementRef.current) {
      window._adSenseProcessedElements.delete(adElementRef.current);
    }
    
    if (retryCount < maxRetries && mountedRef.current) {
      timeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          setRetryCount(prev => prev + 1);
          setAdError(false);
          setAdStatus('idle');
          adInitializedRef.current = false;
        }
      }, 2000 * (retryCount + 1));
    }
  }, [slot, retryCount, log]);

  // Enhanced consent management
  useEffect(() => {
    checkConsentStatus();
    
    const handleConsentChange = () => {
      if (!mountedRef.current) return;
      log('Consent change detected');
      checkConsentStatus();
      adInitializedRef.current = false;
      
      if (slot) {
        window._adSenseInitializedSlots.delete(slot);
        
        // HOTFIX INTEGRATION: Also clear from hotfix tracking
        if (window._adSenseHotfix) {
          window._adSenseHotfix.clearSlot(slot);
        }
      }
    };
    
    window.addEventListener('consentChanged', handleConsentChange);
    
    return () => {
      window.removeEventListener('consentChanged', handleConsentChange);
    };
  }, [checkConsentStatus, slot, log]);

  // FIXED: Enhanced ad loading effect with proper cleanup
  useEffect(() => {
    mountedRef.current = true;
    
    // Reset state when dependencies change
    if (!adInitializedRef.current) {
      setAdError(false);
      setAdLoaded(false);
      setAdStatus('idle');
    }

    // Don't load if consent is denied
    if (hasConsent === false) {
      log('Not loading ad - consent denied');
      return;
    }

    // Don't load if we don't have consent decision for EEA users
    if (isEEAUser && hasConsent !== true) {
      log('Not loading ad - no consent for EEA user');
      return;
    }

    // ✅ CRITICAL FIX: Increased delay for DOM stability
    const loadTimer = setTimeout(() => {
      if (mountedRef.current) {
        loadAd();
      }
    }, 500);

    // Cleanup function
    return () => {
      mountedRef.current = false;
      clearTimeout(loadTimer);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Clear visibility retries on unmount
      window._adSenseVisibilityRetries.delete(componentIdRef.current);
      
      if (slot && adInitializedRef.current) {
        window._adSenseInitializedSlots.delete(slot);
        if (window._adSenseHotfix) {
          window._adSenseHotfix.clearSlot(slot);
        }
        if (componentIdRef.current) {
          window._adSenseComponentInstances.delete(componentIdRef.current);
        }
        if (adElementRef.current) {
          window._adSenseProcessedElements.delete(adElementRef.current);
        }
        adInitializedRef.current = false;
      }
    };
  }, [slot, currentPath, hasConsent, isEEAUser, retryCount, loadAd, log]);

  // Event listeners for ad element
  useEffect(() => {
    const adElement = adElementRef.current;
    if (!adElement || !mountedRef.current) return;

    const handleAdLoad = () => {
      if (mountedRef.current) {
        log('Ad loaded successfully');
        setAdLoaded(true);
        setAdStatus('loaded');
      }
    };

    const handleAdErrorEvent = () => {
      if (mountedRef.current) {
        log('Ad error event fired', 'error');
        handleAdError();
      }
    };

    adElement.addEventListener('load', handleAdLoad);
    adElement.addEventListener('error', handleAdErrorEvent);

    return () => {
      if (adElement) {
        adElement.removeEventListener('load', handleAdLoad);
        adElement.removeEventListener('error', handleAdErrorEvent);
      }
    };
  }, [handleAdError, log]);

  // =======================================================================
  // RENDER LOGIC - OPTIMIZED TO REDUCE FLICKERING
  // =======================================================================

  // Show consent required message for EEA users without consent
  if (isEEAUser && hasConsent === null) {
    return (
      <div className={`ad-container consent-required ${className}`} data-ad-status="consent-required">
        <div className="consent-message" style={{ 
          background: 'linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)', 
          border: '2px solid #ffc107',
          borderRadius: '8px',
          padding: '20px 15px',
          textAlign: 'center',
          color: '#856404',
          fontSize: '14px',
          fontFamily: 'Inter, Arial, sans-serif',
          margin: '10px 0',
          minHeight: '120px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '28px', marginBottom: '10px', opacity: 0.8 }}>🍪</div>
          <p style={{ fontWeight: '600', marginBottom: '8px', fontSize: '14px', margin: 0 }}>
            Consent Required for Ads
          </p>
          <p style={{ margin: 0, lineHeight: '1.4', fontSize: '13px', opacity: 0.8 }}>
            We need your consent to show personalized ads.
          </p>
        </div>
        <div className="ad-label">Advertisement</div>
      </div>
    );
  }

  // Show consent denied message
  if (isEEAUser && hasConsent === false) {
    return (
      <div className={`ad-container consent-denied ${className}`} data-ad-status="consent-denied">
        <div className="consent-denied-message" style={{ 
          background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', 
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          padding: '20px 15px',
          textAlign: 'center',
          color: '#6c757d',
          fontSize: '14px',
          fontFamily: 'Inter, Arial, sans-serif',
          margin: '10px 0',
          minHeight: '120px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '28px', marginBottom: '10px', opacity: 0.6 }}>🔒</div>
          <p style={{ fontWeight: '600', marginBottom: '8px', fontSize: '14px', margin: 0 }}>
            Ads Disabled
          </p>
          <p style={{ margin: 0, lineHeight: '1.4', fontSize: '13px', opacity: 0.7 }}>
            You have disabled personalized ads.
          </p>
        </div>
        <div className="ad-label">Advertisement</div>
      </div>
    );
  }

  // Show development placeholder or fallback for errors
  if (!isProduction || adError || adStatus === 'duplicate') {
    if (fallbackContent) {
      return <div className={`ad-container fallback-content ${className}`}>{fallbackContent}</div>;
    }

    const isDuplicate = adStatus === 'duplicate';
    const isError = adError;
    
    return (
      <div className={`ad-container ${isError ? 'ad-error' : isDuplicate ? 'ad-duplicate' : 'ad-placeholder'} ${className}`}>
        <div style={{ 
          background: isError ? 
            'linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%)' : 
            isDuplicate ?
            'linear-gradient(135deg, #d1ecf1 0%, #bee5eb 100%)' :
            'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)', 
          border: isError ? '1px solid #dc3545' : isDuplicate ? '1px solid #17a2b8' : '1px dashed #ccc',
          borderRadius: '8px',
          padding: '25px 15px',
          textAlign: 'center',
          color: isError ? '#721c24' : isDuplicate ? '#0c5460' : '#555',
          fontSize: '14px',
          margin: '10px 0',
          minHeight: responsive ? '90px' : '250px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.7 }}>
            {isError ? '❌' : isDuplicate ? '🔄' : '🎯'}
          </div>
          <p style={{ fontWeight: '600', marginBottom: '8px', fontSize: '15px', margin: 0 }}>
            {isError ? 'Ad Failed to Load' : isDuplicate ? 'Ad Already Loaded' : 'AdSense Advertisement'}
          </p>
          <p style={{ margin: '4px 0', fontSize: '13px', opacity: 0.8 }}>
            <strong>Slot:</strong> {slot || 'Not provided'}
          </p>
          <p style={{ margin: '4px 0', fontSize: '13px', opacity: 0.8 }}>
            <strong>Status:</strong> {isError ? 'Error' : isDuplicate ? 'Duplicate Prevented' : 'Placeholder'}
          </p>
          {!isProduction && (
            <p style={{ margin: '4px 0', fontSize: '12px', opacity: 0.6 }}>
              <strong>Component:</strong> {componentIdRef.current}
            </p>
          )}
        </div>
        <div className="ad-label">Advertisement</div>
      </div>
    );
  }

  // Don't render anything in production if conditions aren't met
  if (isProduction && (!slot || (isEEAUser && hasConsent !== true))) {
    return null;
  }

  // Render actual AdSense ad
  return (
    <div 
      className={`ad-container ${className}`} 
      data-ad-slot={slot} 
      data-ad-status={adStatus}
      data-ad-loaded={adLoaded}
      data-component-id={componentIdRef.current}
    >
      <ins
        ref={adElementRef}
        className="adsbygoogle"
        style={{ 
          display: 'block',
          textAlign: 'center',
          minHeight: responsive ? '90px' : '250px',
          overflow: 'hidden',
          borderRadius: '8px',
          ...adStyle
        }}
        data-ad-client="ca-pub-4047817727348673"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
        data-ad-layout={layout}
        data-ad-layout-key={layoutKey}
        key={`${slot}-${currentPath}-${retryCount}`}
      />
      
      <div className="ad-label">Advertisement</div>
      
      <noscript>
        <div style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
          border: '1px solid #5a67d8',
          borderRadius: '8px',
          padding: '20px 15px',
          textAlign: 'center',
          margin: '15px 0',
          color: 'white',
          minHeight: '120px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '28px', marginBottom: '10px' }}>🔒</div>
          <p style={{ fontWeight: '600', marginBottom: '8px', fontSize: '14px', margin: 0 }}>
            JavaScript Required for Ads
          </p>
          <p style={{ margin: 0, fontSize: '13px', opacity: 0.9 }}>
            Please enable JavaScript to view advertisements.
          </p>
        </div>
      </noscript>
    </div>
  );
};

// Ad Units Configuration
export const AdUnits = {
  HEADER: '1529123561',
  IN_ARTICLE: '8087712926',
  SIDEBAR: '5976732519',
  FOOTER: '2835386242',
  BETWEEN_POSTS: '6583059564'
};

// Enhanced consent helper functions
export const consentHelper = {
  setConsent: (granted) => {
    try {
      localStorage.setItem('cookieConsent', granted ? 'true' : 'false');
      localStorage.setItem('adsense_consent', granted ? 'granted' : 'denied');
      
      // Clear all tracking when consent changes
      if (window._adSenseHotfix) {
        window._adSenseHotfix.clearAllSlots();
      }
      if (window._adSenseInitializedSlots) {
        window._adSenseInitializedSlots.clear();
      }
      if (window._adSenseProcessedElements) {
        window._adSenseProcessedElements = new WeakSet();
      }
      if (window._adSenseComponentInstances) {
        window._adSenseComponentInstances.clear();
      }
      if (window._adSenseVisibilityRetries) {
        window._adSenseVisibilityRetries.clear();
      }
      
      const consentEvent = new CustomEvent('consentChanged', {
        detail: { granted }
      });
      window.dispatchEvent(consentEvent);
      
      console.log(`🔄 AdSense: Consent ${granted ? 'granted' : 'denied'}`);
      
      // Google Funding Choices integration
      if (window.googlefc && window.googlefc.call) {
        window.googlefc.call(granted);
      }
      
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
      
      if (window._adSenseHotfix) {
        window._adSenseHotfix.clearAllSlots();
      }
      if (window._adSenseInitializedSlots) {
        window._adSenseInitializedSlots.clear();
      }
      if (window._adSenseProcessedElements) {
        window._adSenseProcessedElements = new WeakSet();
      }
      if (window._adSenseComponentInstances) {
        window._adSenseComponentInstances.clear();
      }
      if (window._adSenseVisibilityRetries) {
        window._adSenseVisibilityRetries.clear();
      }
      
      window.dispatchEvent(new Event('consentChanged'));
      console.log('🔄 AdSense: Consent cleared');
    } catch (error) {
      console.error('❌ AdSense: Error clearing consent:', error);
    }
  },
  
  getConsent: () => {
    return localStorage.getItem('cookieConsent');
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
    const consent = localStorage.getItem('cookieConsent');
    const isEEA = consentHelper.isEEAUser();
    
    console.log(`🔍 AdSense: Initialized - EEA: ${isEEA}, Consent: ${consent}`);
    
    return {
      isEEA,
      hasConsent: consent === 'true',
      needsConsent: isEEA && !consent
    };
  }
};

// Add CSS for loading animation and styles
const adStyles = `
.ad-container {
  margin: 20px 0;
  position: relative;
  transition: opacity 0.3s ease;
}

.ad-label {
  text-align: center;
  font-size: 11px;
  color: #666;
  margin-top: 8px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-family: Inter, Arial, sans-serif;
}

.ad-container[data-ad-status="loading"] {
  opacity: 0.7;
}

.ad-container[data-ad-status="loaded"] {
  opacity: 1;
}

.ad-container[data-ad-status="error"] {
  opacity: 0.8;
}

.consent-required, .consent-denied {
  opacity: 0.9;
  transition: opacity 0.3s ease;
}

.consent-required:hover, .consent-denied:hover {
  opacity: 1;
}

.ad-placeholder {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { opacity: 0.8; }
  50% { opacity: 1; }
  100% { opacity: 0.8; }
}

.adsbygoogle[data-ad-status="filled"] {
  border: 1px solid #e2e8f0;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .ad-container {
    margin: 15px 0;
  }
  
  .ad-label {
    font-size: 10px;
  }
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleId = 'adsense-component-styles';
  if (!document.getElementById(styleId)) {
    const styleSheet = document.createElement('style');
    styleSheet.id = styleId;
    styleSheet.textContent = adStyles;
    document.head.appendChild(styleSheet);
  }
}

export default AdSense;