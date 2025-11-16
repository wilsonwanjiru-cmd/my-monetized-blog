// frontend/src/components/AdSense.js - OPTIMIZED VERSION
import React, { useEffect, useState, useCallback, useRef } from 'react';

// Global tracking for script and ad initialization - SINGLE SOURCE OF TRUTH
if (typeof window !== 'undefined') {
  window._adSenseScriptLoaded = window._adSenseScriptLoaded || false;
  window._adSenseScriptLoading = window._adSenseScriptLoading || false;
  window._adSenseInitializedSlots = window._adSenseInitializedSlots || new Set();
  window._adSenseGlobalPush = window._adSenseGlobalPush || [];
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

  // ✅ FIXED: Global AdSense script loading with proper synchronization
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

  // ✅ FIXED: Robust ad loading with global slot tracking
  const loadAd = useCallback(() => {
    if (typeof window === 'undefined') return;

    // Prevent multiple initializations for the same slot
    if (adInitializedRef.current) {
      console.log(`🔄 AdSense: Ad for slot ${slot} already initialized, skipping`);
      return;
    }

    // Global slot tracking to prevent duplicates across components
    if (window._adSenseInitializedSlots.has(slot)) {
      console.log(`🔄 AdSense: Slot ${slot} already initialized globally, skipping`);
      return;
    }

    if (!slot) {
      console.warn('⚠️ AdSense: No slot ID provided');
      setAdError(true);
      return;
    }

    // Don't load ads if consent is explicitly denied
    if (hasConsent === false) {
      console.log('🔒 AdSense: Skipping ad load - consent denied');
      return;
    }

    // Check if ads should be loaded based on consent and environment
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

    setAdStatus('loading');
    adInitializedRef.current = true;
    window._adSenseInitializedSlots.add(slot);

    // Load AdSense script first
    const scriptLoaded = loadAdSenseScript();
    if (!scriptLoaded && !window._adSenseScriptLoaded) {
      setAdError(true);
      setAdStatus('error');
      window._adSenseInitializedSlots.delete(slot);
      adInitializedRef.current = false;
      return;
    }

    const pushAd = () => {
      try {
        console.log(`📢 AdSense: Loading ad for slot ${slot}`);
        
        // Use global push array to ensure proper sequencing
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        
        setAdStatus('pushed');
        
        // Set a timeout to detect if ad fails to load
        setTimeout(() => {
          if (adStatus === 'pushed') {
            const adElement = adElementRef.current;
            if (adElement && adElement.offsetHeight === 0) {
              console.warn(`⚠️ AdSense: Ad slot ${slot} may have failed to load`);
              handleAdError();
            }
          }
        }, 3000);
        
      } catch (e) {
        console.error('❌ AdSense push error:', e);
        handleAdError();
      }
    };

    // Wait for script to be ready
    if (window.adsbygoogle && window._adSenseScriptLoaded) {
      pushAd();
    } else {
      // Script not ready yet, queue the push
      console.log('⏳ AdSense script not ready, queuing ad push for slot:', slot);
      
      if (!window._adSenseGlobalPush) {
        window._adSenseGlobalPush = [];
      }
      window._adSenseGlobalPush.push(pushAd);
      
      // Fallback: try again after delay
      const timer = setTimeout(() => {
        if (window.adsbygoogle && !adInitializedRef.current) {
          pushAd();
        }
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [slot, isEEAUser, hasConsent, currentPath, loadAdSenseScript, adStatus]);

  const handleAdError = useCallback(() => {
    console.error(`❌ AdSense: Ad failed to load for slot ${slot}`);
    setAdError(true);
    setAdStatus('error');
    
    if (slot) {
      window._adSenseInitializedSlots.delete(slot);
    }
    adInitializedRef.current = false;
    
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
      }
    };
    
    window.addEventListener('consentChanged', handleConsentChange);
    
    return () => {
      window.removeEventListener('consentChanged', handleConsentChange);
    };
  }, [checkConsentStatus, slot]);

  // Ad loading effect
  useEffect(() => {
    if (!adInitializedRef.current) {
      setAdError(false);
      setRetryCount(0);
      setAdStatus('idle');
    }

    if (hasConsent === false) {
      console.log('🔒 AdSense: Not loading ad - consent denied');
      return;
    }

    const cleanup = loadAd();
    return cleanup;
  }, [slot, currentPath, loadAd, hasConsent, retryCount]);

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (slot && adInitializedRef.current) {
        window._adSenseInitializedSlots.delete(slot);
      }
    };
  }, [slot]);

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
  if (!isProduction || adError) {
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
            {adError ? '❌' : '🎯'}
          </div>
          <p style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '16px' }}>
            {adError ? 'Ad Failed to Load' : 'AdSense Advertisement'}
          </p>
          <p><strong>Slot:</strong> {slot || 'Not provided'}</p>
          <p><strong>Status:</strong> {adError ? 'Error' : 'Placeholder'}</p>
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
    <div className={`ad-container ${className}`} data-ad-slot={slot} data-ad-status={adStatus}>
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
        key={`${slot}-${currentPath}-${retryCount}`}
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

// ✅ FIXED: Enhanced consent helper functions with missing getContent method
export const consentHelper = {
  setConsent: (granted) => {
    localStorage.setItem('cookieConsent', granted ? 'true' : 'false');
    localStorage.setItem('adsense_consent', granted ? 'granted' : 'denied');
    localStorage.setItem('is_eea_user', 'true'); // Mark as EEA user once they make a choice
    
    // Dispatch event to notify all AdSense components
    const consentEvent = new CustomEvent('consentChanged', {
      detail: { granted }
    });
    window.dispatchEvent(consentEvent);
    
    console.log(`🔄 AdSense: Consent ${granted ? 'granted' : 'denied'}`);
    
    // Update Google CMP if available
    if (window.googlefc && window.googlefc.call) {
      window.googlefc.call(granted);
    }
    
    // Reload ads if consent was granted
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
    window.dispatchEvent(new Event('consentChanged'));
    console.log('🔄 AdSense: Consent cleared');
  },
  
  getConsent: () => {
    return localStorage.getItem('cookieConsent');
  },
  
  // ✅ CRITICAL FIX: Added missing getContent method
  getContent: () => {
    // This might be a typo in other files - return same as getConsent for now
    // If you need separate content consent, implement specific logic here
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
  
  // Initialize AdSense consent management
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
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = adStyles;
  document.head.appendChild(styleSheet);
}

export default AdSense;