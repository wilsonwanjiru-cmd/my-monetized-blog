// frontend/src/components/AdSense.js
import React, { useEffect, useState, useCallback, useRef } from 'react';

// Global tracking for script and ad initialization
window._adSenseScriptLoaded = false;
window._adSenseInitializedSlots = window._adSenseInitializedSlots || new Set();

const AdSense = ({ 
  slot, 
  format = 'auto', 
  responsive = true, 
  className = '',
  layout = '',
  layoutKey = '',
  adStyle = {},
  fallbackContent = null,
  currentPath = window.location.pathname
}) => {
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [hasConsent, setHasConsent] = useState(null);
  const [isEEAUser, setIsEEAUser] = useState(false);
  const [adStatus, setAdStatus] = useState('idle');
  const maxRetries = 2;
  const adInitializedRef = useRef(false);
  const adElementRef = useRef(null);

  // Enhanced environment detection
  const isProduction = process.env.NODE_ENV === 'production' || 
                      window.location.hostname === 'wilsonmuita.com' ||
                      window.location.hostname === 'www.wilsonmuita.com';

  // Enhanced EEA user detection with multiple fallbacks
  const checkIfEEAUser = useCallback(() => {
    try {
      // Method 1: Check timezone
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const eeaTimezones = [
        'Europe/', 'GB', 'UK', 'London', 'Berlin', 'Paris', 'Rome', 'Madrid',
        'Amsterdam', 'Brussels', 'Vienna', 'Zurich', 'Stockholm', 'Oslo',
        'Copenhagen', 'Helsinki', 'Dublin', 'Lisbon', 'Warsaw', 'Prague'
      ];
      
      const isEEATimezone = eeaTimezones.some(tz => timezone.includes(tz));
      
      // Method 2: Check browser language
      const browserLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
      const eeaLanguages = ['de', 'fr', 'it', 'es', 'nl', 'pl', 'sv', 'no', 'da', 'fi', 'pt', 'cs', 'hu', 'ro'];
      
      const isEEALanguage = eeaLanguages.some(lang => browserLang.startsWith(lang));
      
      // Method 3: Check stored consent preference (most reliable)
      const storedConsent = localStorage.getItem('cookieConsent');
      const wasEEAUser = localStorage.getItem('is_eea_user') === 'true';
      
      // Method 4: Check GDPR consent string if available
      const hasGDPRConsent = localStorage.getItem('gdpr_consent') !== null;
      
      return isEEATimezone || isEEALanguage || wasEEAUser || storedConsent !== null || hasGDPRConsent;
    } catch (error) {
      console.warn('Error detecting user location:', error);
      return false;
    }
  }, []);

  // FIXED: Enhanced consent status checking with simplified logic
  const checkConsentStatus = useCallback(() => {
    const consent = localStorage.getItem('cookieConsent');
    const adsenseConsent = localStorage.getItem('adsense_consent');
    const userIsEEA = checkIfEEAUser();
    
    setIsEEAUser(userIsEEA);
    
    // CRITICAL FIX: If user has explicitly denied consent, don't load ads
    if (consent === 'false' || adsenseConsent === 'denied') {
      setHasConsent(false);
      return false;
    }
    
    // If user has given consent or doesn't need consent, load ads
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

  // FIXED: Load AdSense script with global flag to prevent multiple loading
  const loadAdSenseScript = useCallback(() => {
    // Check if script is already loaded globally
    if (window._adSenseScriptLoaded) {
      console.log('✅ AdSense script already loaded (global check)');
      return true;
    }

    // Check if script is already loaded
    if (window.adsbygoogle) {
      window._adSenseScriptLoaded = true;
      console.log('✅ AdSense script already loaded (window.adsbygoogle check)');
      return true;
    }

    // Check if script tag already exists
    const existingScript = document.querySelector('script[src*="pagead2.googlesyndication.com"]');
    if (existingScript) {
      window._adSenseScriptLoaded = true;
      console.log('✅ AdSense script tag already exists');
      return true;
    }

    try {
      const script = document.createElement('script');
      script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4047817727348673';
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.onload = () => {
        window._adSenseScriptLoaded = true;
        console.log('✅ AdSense script loaded successfully');
      };
      script.onerror = (error) => {
        console.error('❌ Failed to load AdSense script:', error);
        setAdError(true);
        setAdStatus('error');
      };
      document.head.appendChild(script);
      return true;
    } catch (error) {
      console.error('❌ Error loading AdSense script:', error);
      return false;
    }
  }, []);

  // FIXED: Robust AdSense loading with prevention of repeated initialization
  const loadAd = useCallback(() => {
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

    // CRITICAL FIX: Don't load ads if consent is explicitly denied
    if (hasConsent === false) {
      console.log('🔒 AdSense: Skipping ad load - consent denied');
      return;
    }

    // Check if ads should be loaded based on consent and environment
    if (isEEAUser && hasConsent !== true) {
      console.log('🔒 AdSense: Skipping ad load - no consent for EEA user');
      return;
    }

    // Don't load ads on excluded pages
    const excludedPaths = ['/privacy', '/disclaimer', '/about'];
    if (excludedPaths.includes(window.location.pathname)) {
      console.log('🚫 AdSense: Skipping ad load - excluded page');
      return;
    }

    setAdStatus('loading');
    adInitializedRef.current = true;
    window._adSenseInitializedSlots.add(slot);

    // Load AdSense script first
    const scriptLoaded = loadAdSenseScript();
    if (!scriptLoaded) {
      setAdError(true);
      setAdStatus('error');
      window._adSenseInitializedSlots.delete(slot);
      adInitializedRef.current = false;
      return;
    }

    // Check if the script is ready, push the ad request
    const pushAd = () => {
      try {
        console.log(`📢 AdSense: Loading ad for slot ${slot}`);
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        setAdStatus('pushed');
      } catch (e) {
        console.error('❌ AdSense push error:', e);
        setAdError(true);
        setAdStatus('error');
        window._adSenseInitializedSlots.delete(slot);
        adInitializedRef.current = false;
      }
    };

    // Use a timeout to ensure the script is loaded
    const timer = setTimeout(() => {
      if (window.adsbygoogle) {
        pushAd();
      } else {
        console.log('⏳ AdSense script not loaded yet');
        setAdError(true);
        setAdStatus('error');
        window._adSenseInitializedSlots.delete(slot);
        adInitializedRef.current = false;
        
        // Retry logic
        if (retryCount < maxRetries) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 2000 * (retryCount + 1));
        }
      }
    }, 1500); // Increased delay to ensure DOM readiness

    // Cleanup function to clear the timeout if the component unmounts
    return () => {
      clearTimeout(timer);
    };
  }, [slot, isEEAUser, hasConsent, retryCount, loadAdSenseScript]);

  // Handle ad loaded event
  const handleAdLoad = useCallback(() => {
    console.log(`✅ AdSense: Ad loaded successfully for slot ${slot}`);
    setAdLoaded(true);
    setAdStatus('loaded');
    setAdError(false);
  }, [slot]);

  // Handle ad error event
  const handleAdError = useCallback(() => {
    console.error(`❌ AdSense: Ad failed to load for slot ${slot}`);
    setAdError(true);
    setAdStatus('error');
    window._adSenseInitializedSlots.delete(slot);
    adInitializedRef.current = false;
    
    if (retryCount < maxRetries) {
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
      }, 2000 * (retryCount + 1));
    }
  }, [slot, retryCount]);

  // FIXED: Effect for consent management with better initialization
  useEffect(() => {
    const consentStatus = checkConsentStatus();
    
    // Listen for consent changes from ConsentManager
    const handleConsentChange = () => {
      console.log('🔄 AdSense: Consent change detected');
      checkConsentStatus();
      // Reset initialization state when consent changes
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

  // FIXED: Effect for ad loading with prevention of repeated calls
  useEffect(() => {
    // Reset states when slot or path changes
    if (!adInitializedRef.current) {
      setAdLoaded(false);
      setAdError(false);
      setRetryCount(0);
      setAdStatus('idle');
    }

    // CRITICAL FIX: Only load ads if we have consent or user doesn't need consent
    if (hasConsent === false) {
      console.log('🔒 AdSense: Not loading ad - consent denied');
      return;
    }

    // Load ad after a short delay to ensure DOM is ready
    const cleanup = loadAd();
    
    return cleanup;
  }, [slot, currentPath, loadAd, hasConsent]);

  // Add event listeners for ad callbacks
  useEffect(() => {
    const adElement = adElementRef.current;
    if (adElement) {
      adElement.addEventListener('load', handleAdLoad);
      adElement.addEventListener('error', handleAdError);
    }

    return () => {
      if (adElement) {
        adElement.removeEventListener('load', handleAdLoad);
        adElement.removeEventListener('error', handleAdError);
      }
    };
  }, [handleAdLoad, handleAdError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (slot && adInitializedRef.current) {
        window._adSenseInitializedSlots.delete(slot);
      }
    };
  }, [slot]);

  // =======================================================================
  // RENDER LOGIC WITH CONSENT MANAGEMENT
  // =======================================================================

  // Show consent required message for EEA users without consent decision
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
          <div style={{ 
            fontSize: '32px', 
            marginBottom: '12px',
            opacity: 0.8
          }}>
            🍪
          </div>
          <p style={{ 
            fontWeight: 'bold', 
            marginBottom: '8px',
            fontSize: '15px',
            color: '#856404'
          }}>
            Consent Required for Ads
          </p>
          <p style={{ 
            marginBottom: '12px',
            lineHeight: '1.4',
            fontSize: '14px'
          }}>
            We need your consent to show personalized ads in your region.
            Please check the consent banner at the bottom of the page.
          </p>
          <p style={{ 
            fontSize: '12px', 
            color: '#997404',
            fontStyle: 'italic',
            marginBottom: '0'
          }}>
            This message appears for visitors from the European Economic Area
          </p>
        </div>
        <div className="ad-label" style={{ 
          textAlign: 'center', 
          fontSize: '11px', 
          color: '#666',
          marginTop: '8px',
          fontWeight: 'bold'
        }}>
          Advertisement
        </div>
      </div>
    );
  }

  // Show consent denied message for EEA users who refused consent
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
          <div style={{ 
            fontSize: '32px', 
            marginBottom: '12px',
            opacity: 0.8
          }}>
            🔒
          </div>
          <p style={{ 
            fontWeight: 'bold', 
            marginBottom: '8px',
            fontSize: '15px',
            color: '#721c24'
          }}>
            Ads Disabled by Your Choice
          </p>
          <p style={{ 
            marginBottom: '12px',
            lineHeight: '1.4',
            fontSize: '14px'
          }}>
            You've chosen not to consent to personalized advertising.
            Thank you for your privacy preference.
          </p>
          <p style={{ 
            fontSize: '12px', 
            color: '#8c2531',
            fontStyle: 'italic',
            marginBottom: '0'
          }}>
            You can change your consent in our privacy settings
          </p>
        </div>
        <div className="ad-label" style={{ 
          textAlign: 'center', 
          fontSize: '11px', 
          color: '#666',
          marginTop: '8px',
          fontWeight: 'bold'
        }}>
          Advertisement
        </div>
      </div>
    );
  }

  // Show development placeholder or fallback for errors
  if (!isProduction || adError) {
    if (fallbackContent) {
      return (
        <div className={`ad-container fallback-content ${className}`}>
          {fallbackContent}
        </div>
      );
    }

    return (
      <div className={`ad-container ${adError ? 'ad-error' : 'ad-placeholder'} ${className}`} data-ad-status={adError ? 'error' : 'placeholder'}>
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
          fontFamily: 'Arial, sans-serif',
          margin: '10px 0'
        }}>
          <div style={{ 
            fontSize: '48px', 
            marginBottom: '10px',
            opacity: 0.7
          }}>
            {adError ? '❌' : '🎯'}
          </div>
          <p style={{ 
            fontWeight: 'bold', 
            marginBottom: '8px',
            fontSize: '16px',
            color: adError ? '#721c24' : '#333'
          }}>
            {adError ? 'Ad Failed to Load' : 'AdSense Advertisement'}
          </p>
          <p style={{ marginBottom: '4px', fontSize: '14px' }}>
            <strong>Slot:</strong> {slot || 'Not provided'}
          </p>
          <p style={{ marginBottom: '4px', fontSize: '14px' }}>
            <strong>Format:</strong> {format}
          </p>
          <p style={{ marginBottom: '4px', fontSize: '14px' }}>
            <strong>Status:</strong> 
            <span style={{ 
              color: adError ? '#dc3545' : '#28a745',
              fontWeight: 'bold',
              marginLeft: '5px'
            }}>
              {adError ? 'Error' : 'Placeholder'}
            </span>
          </p>
          <p style={{ marginBottom: '4px', fontSize: '14px' }}>
            <strong>Consent:</strong> 
            <span style={{ 
              color: hasConsent === true ? '#28a745' : hasConsent === false ? '#dc3545' : '#6c757d',
              fontWeight: 'bold',
              marginLeft: '5px'
            }}>
              {hasConsent === true ? 'Granted' : hasConsent === false ? 'Denied' : 'Not Required'}
            </span>
          </p>
          <p style={{ marginBottom: '4px', fontSize: '14px' }}>
            <strong>Region:</strong> 
            <span style={{ 
              color: isEEAUser ? '#dc3545' : '#28a745',
              fontWeight: 'bold',
              marginLeft: '5px'
            }}>
              {isEEAUser ? 'EEA/UK' : 'Non-EEA'}
            </span>
          </p>
          {adError && retryCount > 0 && (
            <p style={{ marginBottom: '4px', fontSize: '14px' }}>
              <strong>Retries:</strong> {retryCount}/{maxRetries}
            </p>
          )}
          <p style={{ 
            marginTop: '12px', 
            fontSize: '12px', 
            color: adError ? '#8c2531' : '#888',
            fontStyle: 'italic'
          }}>
            {adError ? 
              'Ad failed to load. This might be due to network issues or ad blocker.' : 
              'This ad would be displayed in production'}
          </p>
        </div>
        <div className="ad-label" style={{ 
          textAlign: 'center', 
          fontSize: '11px', 
          color: '#666',
          marginTop: '8px',
          fontWeight: 'bold'
        }}>
          Advertisement
        </div>
      </div>
    );
  }

  // CRITICAL FIX: Don't render anything in production if consent is denied
  if (isProduction && hasConsent === false) {
    console.log('🔒 AdSense: Not rendering ad - consent denied in production');
    return null;
  }

  // Don't render anything in production if conditions aren't met
  if (isProduction && (!slot || (isEEAUser && hasConsent !== true))) {
    return null;
  }

  // Render actual AdSense ad with key to prevent re-renders
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
        data-ad-status={adStatus}
        key={`${slot}-${currentPath}-${retryCount}`} // CRITICAL: This helps React identify unique ad instances
      />
      
      <div className="ad-label" style={{ 
        textAlign: 'center', 
        fontSize: '11px', 
        color: '#666',
        marginTop: '8px',
        fontWeight: 'bold'
      }}>
        Advertisement
      </div>
      
      {/* Enhanced fallback for ad blockers and noscript */}
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
          <p style={{ 
            fontWeight: 'bold', 
            marginBottom: '8px',
            fontSize: '16px'
          }}>
            JavaScript Required for Ads
          </p>
          <p style={{ 
            marginBottom: '12px',
            fontSize: '14px',
            opacity: 0.9
          }}>
            Please enable JavaScript to view advertisements and support our blog
          </p>
          <p style={{ 
            fontSize: '12px',
            opacity: 0.7,
            fontStyle: 'italic'
          }}>
            Your support helps us create more quality content
          </p>
        </div>
      </noscript>
    </div>
  );
};

// Ad Units Configuration with ALL your actual ad slot IDs
export const AdUnits = {
  // Header ad - Your existing header ad
  HEADER: '1529123561',
  
  // In-article ad - Your new in-article ad slot
  IN_ARTICLE: '8087712926',
  
  // Sidebar ad - Your new sidebar ad slot
  SIDEBAR: '5976732519',
  
  // Footer ad - Your new footer ad slot
  FOOTER: '2835386242',
  
  // Between posts ad - Your new between-posts ad slot
  BETWEEN_POSTS: '6583059564'
};

// Enhanced consent helper functions
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