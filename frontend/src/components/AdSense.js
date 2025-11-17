// frontend/src/components/AdSense.js - FIXED VERSION WITH DUPLICATE PREVENTION
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
  currentPath = typeof window !== 'undefined' ? window.location.pathname : '/'
}) => {
  const [adError, setAdError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [hasConsent, setHasConsent] = useState(null);
  const [isEEAUser, setIsEEAUser] = useState(false);
  const [adStatus, setAdStatus] = useState('idle');
  const maxRetries = 2;
  const adInitializedRef = useRef(false);
  const adElementRef = useRef(null);
  const componentIdRef = useRef(`ad-${slot}-${Math.random().toString(36).substr(2, 9)}`);

  const isProduction = process.env.NODE_ENV === 'production' || 
                      (typeof window !== 'undefined' && (
                        window.location.hostname === 'wilsonmuita.com' ||
                        window.location.hostname === 'www.wilsonmuita.com'
                      ));

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
        'Copenhagen', 'Helsinki', 'Dublin', 'Lisbon', 'Warsaw', 'Prague'
      ];
      
      const isEEATimezone = eeaTimezones.some(tz => timezone.includes(tz));
      
      // Browser language detection
      const browserLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
      const eeaLanguages = ['de', 'fr', 'it', 'es', 'nl', 'pl', 'sv', 'no', 'da', 'fi', 'pt', 'cs', 'hu', 'ro'];
      const isEEALanguage = eeaLanguages.some(lang => browserLang.startsWith(lang));
      
      return isEEATimezone || isEEALanguage;
    } catch (error) {
      return false;
    }
  }, []);

  // Consent status checking
  const checkConsentStatus = useCallback(() => {
    if (typeof window === 'undefined') return false;
    
    const consent = localStorage.getItem('cookieConsent');
    const adsenseConsent = localStorage.getItem('adsense_consent');
    const userIsEEA = checkIfEEAUser();
    
    setIsEEAUser(userIsEEA);
    
    // If user explicitly denied consent, don't load ads
    if (consent === 'false' || adsenseConsent === 'denied') {
      setHasConsent(false);
      return false;
    }
    
    // If user gave consent or doesn't need consent, load ads
    if (consent === 'true' || adsenseConsent === 'granted') {
      setHasConsent(true);
      return true;
    }
    
    // Non-EEA users don't need explicit consent
    if (!userIsEEA) {
      setHasConsent(true);
      return true;
    }
    
    // EEA users without consent decision - wait for user decision
    setHasConsent(null);
    return null;
  }, [checkIfEEAUser]);

  // ✅ FIXED: Global AdSense script loading with duplicate prevention
  const loadAdSenseScript = useCallback(() => {
    if (typeof window === 'undefined') return false;

    // Check if script is already loaded globally
    if (window._adSenseScriptLoaded) {
      console.log('✅ AdSense script already loaded (global check)');
      return true;
    }

    // Check if script is already in DOM
    const existingScript = document.querySelector('script[src*="pagead2.googlesyndication.com"]');
    if (existingScript) {
      window._adSenseScriptLoaded = true;
      console.log('✅ AdSense script tag already exists in DOM');
      return true;
    }

    // Prevent multiple simultaneous loading attempts
    if (window._adSenseScriptLoading) {
      console.log('⏳ AdSense script loading in progress, waiting...');
      return false;
    }

    window._adSenseScriptLoading = true;

    try {
      const script = document.createElement('script');
      script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4047817727348673';
      script.async = true;
      script.crossOrigin = 'anonymous';
      
      script.onload = () => {
        window._adSenseScriptLoaded = true;
        window._adSenseScriptLoading = false;
        console.log('✅ AdSense script loaded successfully');
        
        // Process any queued ad pushes
        if (window._adSenseGlobalPush && window._adSenseGlobalPush.length > 0) {
          console.log(`📢 Processing ${window._adSenseGlobalPush.length} queued ad pushes`);
          window._adSenseGlobalPush.forEach(pushFn => pushFn());
          window._adSenseGlobalPush = [];
        }
      };
      
      script.onerror = (error) => {
        window._adSenseScriptLoading = false;
        console.error('❌ Failed to load AdSense script:', error);
        setAdError(true);
        setAdStatus('error');
      };
      
      document.head.appendChild(script);
      return true;
    } catch (error) {
      window._adSenseScriptLoading = false;
      console.error('❌ Error loading AdSense script:', error);
      return false;
    }
  }, []);

  // ✅ FIXED: Wait for AdSense script to be ready
  const waitForAdSenseScript = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (window._adSenseScriptLoaded) {
        resolve();
        return;
      }

      let attempts = 0;
      const maxAttempts = 10;
      const interval = setInterval(() => {
        attempts++;
        if (window._adSenseScriptLoaded) {
          clearInterval(interval);
          resolve();
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          reject(new Error('AdSense script timeout'));
        }
      }, 500);
    });
  }, []);

  // ✅ CRITICAL FIX: Safe ad push with duplicate element detection
  const safeAdPush = useCallback(() => {
    if (typeof window === 'undefined') return false;

    try {
      const adElement = adElementRef.current;
      if (!adElement) {
        console.warn('❌ AdSense: No ad element found');
        return false;
      }

      // CRITICAL: Check if this specific element already has ads
      if (window._adSenseProcessedElements.has(adElement)) {
        console.log('🚫 AdSense: Element already processed, skipping push');
        return false;
      }

      // Check if element already has ads by Google's internal tracking
      if (adElement.classList.contains('adsbygoogle-noablate')) {
        console.log('🚫 AdSense: Element already has ads (noablate class)');
        return false;
      }

      // Check if element has data-adsbygoogle-status attribute (set by Google after processing)
      if (adElement.getAttribute('data-adsbygoogle-status')) {
        console.log('🚫 AdSense: Element already processed (has status attribute)');
        return false;
      }

      console.log(`📢 AdSense: Safe push for slot ${slot}`);
      
      // Mark element as processed before pushing
      window._adSenseProcessedElements.add(adElement);
      
      // Use the global push method
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      
      return true;
    } catch (error) {
      console.error('❌ AdSense: Safe push error:', error);
      return false;
    }
  }, [slot]);

  // ✅ ENHANCED: Robust ad loading with multiple duplicate protections
  const loadAd = useCallback(async () => {
    if (typeof window === 'undefined') return;

    // Early returns for various conditions
    if (adInitializedRef.current) {
      console.log(`🔄 AdSense: Component ${slot} already initialized, skipping`);
      return;
    }

    if (!slot) {
      console.warn('⚠️ AdSense: No slot ID provided');
      setAdError(true);
      return;
    }

    if (hasConsent === false) {
      console.log('🔒 AdSense: Skipping ad load - consent denied');
      return;
    }

    if (isEEAUser && hasConsent !== true) {
      console.log('🔒 AdSense: Skipping ad load - no consent for EEA user');
      return;
    }

    // CRITICAL FIX: Updated excluded paths - only essential pages
    const excludedPaths = ['/privacy', '/disclaimer'];
    if (excludedPaths.includes(currentPath)) {
      console.log('🚫 AdSense: Skipping ad load - excluded page:', currentPath);
      return;
    }

    // 🔧 HOTFIX INTEGRATION: Check with global hotfix first
    if (window._adSenseHotfix && !window._adSenseHotfix.trackSlot(slot)) {
      console.log(`🔧 AdSense Hotfix: Blocking duplicate slot ${slot}`);
      return;
    }

    // Global slot tracking to prevent duplicates across components
    if (window._adSenseInitializedSlots.has(slot)) {
      console.log(`🔄 AdSense: Slot ${slot} already initialized globally, skipping`);
      return;
    }

    try {
      setAdStatus('loading');
      adInitializedRef.current = true;
      window._adSenseInitializedSlots.add(slot);

      // Load AdSense script
      const scriptLoaded = loadAdSenseScript();
      if (!scriptLoaded && !window._adSenseScriptLoaded) {
        throw new Error('AdSense script failed to load');
      }

      // Wait for script to be ready
      await waitForAdSenseScript();

      // Wait a bit for DOM to be fully ready
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log(`📢 AdSense: Loading ad for slot ${slot}`);
      
      // Use safe ad push with duplicate protection
      const pushSuccess = safeAdPush();
      
      if (pushSuccess) {
        setAdStatus('loaded');
        
        // Set a timeout to detect if ad fails to load
        setTimeout(() => {
          const adElement = adElementRef.current;
          if (adElement && adElement.offsetHeight === 0 && adStatus === 'loaded') {
            console.warn(`⚠️ AdSense: Ad slot ${slot} may have failed to load`);
            handleAdError();
          }
        }, 3000);
      } else {
        setAdStatus('duplicate');
        console.log('🔄 AdSense: Ad push prevented (duplicate element)');
      }
      
    } catch (error) {
      console.error(`❌ AdSense: Error loading ad for slot ${slot}:`, error);
      handleAdError();
    }
  }, [slot, isEEAUser, hasConsent, currentPath, loadAdSenseScript, waitForAdSenseScript, safeAdPush, adStatus]);

  const handleAdError = useCallback(() => {
    console.error(`❌ AdSense: Ad failed to load for slot ${slot}`);
    setAdError(true);
    setAdStatus('error');
    
    if (slot) {
      window._adSenseInitializedSlots.delete(slot);
    }
    adInitializedRef.current = false;
    
    // 🔧 HOTFIX INTEGRATION: Also clear from hotfix tracking
    if (window._adSenseHotfix) {
      window._adSenseHotfix.clearSlot(slot);
    }
    
    // Clear from processed elements
    if (adElementRef.current) {
      window._adSenseProcessedElements.delete(adElementRef.current);
    }
    
    if (retryCount < maxRetries) {
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
      }, 2000 * (retryCount + 1));
    }
  }, [slot, retryCount]);

  // Consent management
  useEffect(() => {
    checkConsentStatus();
    
    const handleConsentChange = () => {
      console.log('🔄 AdSense: Consent change detected');
      checkConsentStatus();
      adInitializedRef.current = false;
      if (slot) {
        window._adSenseInitializedSlots.delete(slot);
        
        // 🔧 HOTFIX INTEGRATION: Also clear from hotfix tracking
        if (window._adSenseHotfix) {
          window._adSenseHotfix.clearSlot(slot);
        }
      }
    };
    
    window.addEventListener('consentChanged', handleConsentChange);
    
    return () => {
      window.removeEventListener('consentChanged', handleConsentChange);
    };
  }, [checkConsentStatus, slot]);

  // Ad loading effect - FIXED: Only load when all conditions are met
  useEffect(() => {
    // Reset state when dependencies change
    if (!adInitializedRef.current) {
      setAdError(false);
      setRetryCount(0);
      setAdStatus('idle');
    }

    // Don't load if consent is denied
    if (hasConsent === false) {
      console.log('🔒 AdSense: Not loading ad - consent denied');
      return;
    }

    // Don't load if we don't have consent decision for EEA users
    if (isEEAUser && hasConsent !== true) {
      console.log('🔒 AdSense: Not loading ad - no consent for EEA user');
      return;
    }

    // Load the ad
    loadAd();

    // Cleanup function
    return () => {
      if (slot && adInitializedRef.current) {
        window._adSenseInitializedSlots.delete(slot);
        if (window._adSenseHotfix) {
          window._adSenseHotfix.clearSlot(slot);
        }
        if (adElementRef.current) {
          window._adSenseProcessedElements.delete(adElementRef.current);
        }
        adInitializedRef.current = false;
      }
    };
  }, [slot, currentPath, hasConsent, isEEAUser, retryCount, loadAd]);

  // Event listeners for ad element
  useEffect(() => {
    const adElement = adElementRef.current;
    if (adElement) {
      adElement.addEventListener('error', handleAdError);
    }

    return () => {
      if (adElement) {
        adElement.removeEventListener('error', handleAdError);
      }
    };
  }, [handleAdError]);

  // =======================================================================
  // RENDER LOGIC
  // =======================================================================

  // Show consent required message for EEA users without consent
  if (isEEAUser && hasConsent === null) {
    return (
      <div className={`ad-container consent-required ${className}`} data-ad-status="consent-required">
        <div className="consent-message" style={{ 
          background: 'linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)', 
          border: '2px solid #ffc107',
          borderRadius: '12px',
          padding: '25px 20px',
          textAlign: 'center',
          color: '#856404',
          fontSize: '14px',
          fontFamily: 'Arial, sans-serif',
          margin: '10px 0'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.8 }}>🍪</div>
          <p style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '15px' }}>
            Consent Required for Ads
          </p>
          <p style={{ marginBottom: '12px', lineHeight: '1.4', fontSize: '14px' }}>
            We need your consent to show personalized ads in your region.
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
          background: 'linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%)', 
          border: '2px solid #dc3545',
          borderRadius: '12px',
          padding: '25px 20px',
          textAlign: 'center',
          color: '#721c24',
          fontSize: '14px',
          fontFamily: 'Arial, sans-serif',
          margin: '10px 0'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.8 }}>🔒</div>
          <p style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '15px' }}>
            Ads Disabled by Your Choice
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

    return (
      <div className={`ad-container ${adError ? 'ad-error' : 'ad-placeholder'} ${className}`}>
        <div style={{ 
          background: adError ? 
            'linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%)' : 
            'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)', 
          border: adError ? '2px solid #dc3545' : '2px dashed #ccc',
          borderRadius: '12px',
          padding: '30px 20px',
          textAlign: 'center',
          color: adError ? '#721c24' : '#555',
          fontSize: '14px',
          margin: '10px 0'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '10px', opacity: 0.7 }}>
            {adError ? '❌' : adStatus === 'duplicate' ? '🔄' : '🎯'}
          </div>
          <p style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '16px' }}>
            {adError ? 'Ad Failed to Load' : adStatus === 'duplicate' ? 'Ad Already Loaded' : 'AdSense Advertisement'}
          </p>
          <p><strong>Slot:</strong> {slot || 'Not provided'}</p>
          <p><strong>Status:</strong> {adError ? 'Error' : adStatus === 'duplicate' ? 'Duplicate Prevented' : 'Placeholder'}</p>
          <p><strong>Hotfix Active:</strong> {typeof window !== 'undefined' && window._adSenseHotfix ? '✅ Yes' : '❌ No'}</p>
          <p><strong>Component ID:</strong> {componentIdRef.current}</p>
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
          ...adStyle
        }}
        data-ad-client="ca-pub-4047817727348673"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
        data-ad-layout={layout}
        data-ad-layout-key={layoutKey}
        key={`${slot}-${currentPath}-${retryCount}-${componentIdRef.current}`}
      />
      
      <div className="ad-label">Advertisement</div>
      
      <noscript>
        <div style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
          border: '1px solid #5a67d8',
          borderRadius: '8px',
          padding: '25px 20px',
          textAlign: 'center',
          margin: '15px 0',
          color: 'white'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>🔒</div>
          <p style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '16px' }}>
            JavaScript Required for Ads
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
    localStorage.setItem('cookieConsent', granted ? 'true' : 'false');
    localStorage.setItem('adsense_consent', granted ? 'granted' : 'denied');
    localStorage.setItem('is_eea_user', 'true');
    
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
    
    const consentEvent = new CustomEvent('consentChanged', {
      detail: { granted }
    });
    window.dispatchEvent(consentEvent);
    
    console.log(`🔄 AdSense: Consent ${granted ? 'granted' : 'denied'}`);
    
    if (window.googlefc && window.googlefc.call) {
      window.googlefc.call(granted);
    }
    
    if (granted) {
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  },
  
  clearConsent: () => {
    localStorage.removeItem('cookieConsent');
    localStorage.removeItem('adsense_consent');
    localStorage.removeItem('is_eea_user');
    
    if (window._adSenseHotfix) {
      window._adSenseHotfix.clearAllSlots();
    }
    if (window._adSenseInitializedSlots) {
      window._adSenseInitializedSlots.clear();
    }
    if (window._adSenseProcessedElements) {
      window._adSenseProcessedElements = new WeakSet();
    }
    
    window.dispatchEvent(new Event('consentChanged'));
    console.log('🔄 AdSense: Consent cleared');
  },
  
  getConsent: () => {
    return localStorage.getItem('cookieConsent');
  },
  
  getContent: () => {
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

// Add CSS for loading animation
const adStyles = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.ad-container {
  margin: 15px 0;
  position: relative;
}

.ad-label {
  text-align: center;
  font-size: 11px;
  color: #666;
  margin-top: 8px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.ad-loading .adsbygoogle {
  opacity: 0.5;
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
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = adStyles;
  document.head.appendChild(styleSheet);
}

export default AdSense;