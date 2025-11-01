// frontend/src/components/AdSense.js
import React, { useEffect, useState } from 'react';

const AdSense = ({ 
  slot, 
  format = 'auto', 
  responsive = true, 
  className = '',
  layout = '',
  layoutKey = '',
  adStyle = {}
}) => {
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [hasConsent, setHasConsent] = useState(null);
  const [isEEAUser, setIsEEAUser] = useState(false);
  const maxRetries = 3;

  // Check if we're in production - FIXED: Proper environment detection
  const isProduction = process.env.NODE_ENV === 'production' || 
                      window.location.hostname === 'wilsonmuita.com' ||
                      window.location.hostname === 'www.wilsonmuita.com';

  // Check if user is from EEA/UK (requires consent)
  const checkIfEEAUser = () => {
    try {
      // Method 1: Check timezone (basic detection)
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const eeaTimezones = [
        'Europe/', 'GB', 'UK', 'London', 'Berlin', 'Paris', 'Rome', 'Madrid',
        'Amsterdam', 'Brussels', 'Vienna', 'Zurich', 'Stockholm', 'Oslo'
      ];
      
      const isEEA = eeaTimezones.some(tz => timezone.includes(tz));
      
      // Method 2: Check browser language
      const browserLang = navigator.language || navigator.userLanguage;
      const eeaLanguages = ['de', 'fr', 'it', 'es', 'nl', 'pl', 'sv', 'no', 'da', 'fi'];
      
      const isEEALang = eeaLanguages.some(lang => browserLang.startsWith(lang));
      
      // Method 3: Check if consent was previously stored (most reliable)
      const storedConsent = localStorage.getItem('adsense_consent');
      const wasEEAUser = localStorage.getItem('is_eea_user') === 'true';
      
      return isEEA || isEEALang || wasEEAUser || storedConsent !== null;
    } catch (error) {
      console.warn('Error detecting user location:', error);
      return false;
    }
  };

  // Check consent status
  const checkConsentStatus = () => {
    const consent = localStorage.getItem('adsense_consent');
    const userIsEEA = checkIfEEAUser();
    
    setIsEEAUser(userIsEEA);
    
    if (!userIsEEA) {
      // Non-EEA users don't need consent
      setHasConsent(true);
      return true;
    }
    
    if (consent === 'granted') {
      setHasConsent(true);
      return true;
    } else if (consent === 'denied') {
      setHasConsent(false);
      return false;
    } else {
      // Consent not yet given - wait for user decision
      setHasConsent(null);
      return null;
    }
  };

  useEffect(() => {
    // Check consent status on component mount
    checkConsentStatus();
    
    // Listen for consent changes from ConsentManager
    const handleConsentChange = () => {
      checkConsentStatus();
    };
    
    window.addEventListener('consentChanged', handleConsentChange);
    
    return () => {
      window.removeEventListener('consentChanged', handleConsentChange);
    };
  }, []);

  useEffect(() => {
    const loadAd = () => {
      // Don't load ads if consent is denied or not given for EEA users
      if ((isEEAUser && hasConsent === false) || (isEEAUser && hasConsent === null)) {
        console.log('Ad loading skipped due to consent status:', { isEEAUser, hasConsent });
        return;
      }

      try {
        if (window.adsbygoogle) {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          setAdLoaded(true);
          console.log(`✅ AdSense ad loaded for slot: ${slot}`);
        } else {
          console.warn('AdSense script not loaded yet, retrying...');
          
          if (retryCount < maxRetries) {
            setTimeout(() => {
              setRetryCount(prev => prev + 1);
              if (window.adsbygoogle) {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
                setAdLoaded(true);
              }
            }, 1000 * (retryCount + 1));
          } else {
            setAdError(true);
            console.error('❌ Failed to load AdSense after multiple retries');
          }
        }
      } catch (err) {
        console.error('AdSense error:', err);
        setAdError(true);
      }
    };

    // Reset states when slot changes
    setAdLoaded(false);
    setAdError(false);
    setRetryCount(0);

    // Load ad after component mounts (if consent allows)
    const timer = setTimeout(loadAd, 100);
    
    return () => clearTimeout(timer);
  }, [slot, format, responsive, retryCount, hasConsent, isEEAUser]);

  // =======================================================================
  // RENDER LOGIC WITH CONSENT MANAGEMENT
  // =======================================================================

  // Show consent required message for EEA users without consent decision
  if (isEEAUser && hasConsent === null) {
    return (
      <div className={`ad-container consent-required ${className}`}>
        <div style={{ 
          background: 'linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)', 
          border: '2px solid #ffc107',
          borderRadius: '12px',
          padding: '25px 20px',
          textAlign: 'center',
          color: '#856404',
          fontSize: '14px',
          fontFamily: 'Arial, sans-serif'
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
            lineHeight: '1.4'
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
        <div className="ad-label">Advertisement</div>
      </div>
    );
  }

  // Show consent denied message for EEA users who refused consent
  if (isEEAUser && hasConsent === false) {
    return (
      <div className={`ad-container consent-denied ${className}`}>
        <div style={{ 
          background: 'linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%)', 
          border: '2px solid #dc3545',
          borderRadius: '12px',
          padding: '25px 20px',
          textAlign: 'center',
          color: '#721c24',
          fontSize: '14px',
          fontFamily: 'Arial, sans-serif'
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
            lineHeight: '1.4'
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
        <div className="ad-label">Advertisement</div>
      </div>
    );
  }

  // Show placeholder only in development mode - FIXED: Use isProduction check
  if (!isProduction && adError) {
    return (
      <div className={`ad-container ad-placeholder ${className}`}>
        <div style={{ 
          background: 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)', 
          border: '2px dashed #ccc',
          borderRadius: '12px',
          padding: '30px 20px',
          textAlign: 'center',
          color: '#555',
          fontSize: '14px',
          fontFamily: 'Arial, sans-serif'
        }}>
          <div style={{ 
            fontSize: '48px', 
            marginBottom: '10px',
            opacity: 0.7
          }}>
            🎯
          </div>
          <p style={{ 
            fontWeight: 'bold', 
            marginBottom: '8px',
            fontSize: '16px',
            color: '#333'
          }}>
            AdSense Advertisement
          </p>
          <p style={{ marginBottom: '4px' }}>
            <strong>Slot:</strong> {slot}
          </p>
          <p style={{ marginBottom: '4px' }}>
            <strong>Format:</strong> {format}
          </p>
          <p style={{ marginBottom: '4px' }}>
            <strong>Responsive:</strong> {responsive ? 'Yes' : 'No'}
          </p>
          <p style={{ marginBottom: '4px' }}>
            <strong>Consent:</strong> {hasConsent === true ? 'Granted' : hasConsent === false ? 'Denied' : 'Not Required'}
          </p>
          <p style={{ marginBottom: '4px' }}>
            <strong>Region:</strong> {isEEAUser ? 'EEA/UK' : 'Non-EEA'}
          </p>
          <p style={{ 
            marginTop: '12px', 
            fontSize: '12px', 
            color: '#888',
            fontStyle: 'italic'
          }}>
            This ad would be displayed in production
          </p>
        </div>
        <div className="ad-label">Advertisement</div>
      </div>
    );
  }

  // Show loading state in development only
  if (!isProduction && !adLoaded && !adError) {
    return (
      <div className={`ad-container ad-loading ${className}`}>
        <div style={{ 
          background: '#f8f9fa', 
          border: '1px solid #e9ecef',
          borderRadius: '8px',
          padding: '20px',
          textAlign: 'center',
          color: '#6c757d'
        }}>
          <div style={{ 
            width: '20px', 
            height: '20px', 
            border: '2px solid #f3f3f3',
            borderTop: '2px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 10px'
          }}></div>
          <p>Loading Ad...</p>
          <p style={{ fontSize: '12px', marginTop: '8px', color: '#999' }}>
            Consent: {hasConsent === true ? '✅ Granted' : hasConsent === false ? '❌ Denied' : '🌍 Not Required'}
          </p>
        </div>
      </div>
    );
  }

  // Don't render actual ad in production if there's no consent for EEA users
  if (isProduction && isEEAUser && hasConsent !== true) {
    return null;
  }

  // In production with consent, only show the actual ad or nothing
  return (
    <div className={`ad-container ${className}`}>
      <ins
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
      />
      <div className="ad-label">Advertisement</div>
      
      {/* Enhanced fallback for ad blockers */}
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
            Ad Blocker Detected
          </p>
          <p style={{ 
            marginBottom: '12px',
            fontSize: '14px',
            opacity: 0.9
          }}>
            Please consider disabling your ad blocker to support our blog
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

// Export helper functions for use in ConsentManager
export const consentHelper = {
  setConsent: (granted) => {
    localStorage.setItem('adsense_consent', granted ? 'granted' : 'denied');
    localStorage.setItem('is_eea_user', 'true'); // Mark as EEA user once they make a choice
    
    // Dispatch event to notify all AdSense components
    window.dispatchEvent(new Event('consentChanged'));
    
    // Update Google CMP if available
    if (window.googlefc && window.googlefc.call) {
      window.googlefc.call(granted);
    }
  },
  
  clearConsent: () => {
    localStorage.removeItem('adsense_consent');
    window.dispatchEvent(new Event('consentChanged'));
  },
  
  getConsent: () => {
    return localStorage.getItem('adsense_consent');
  },
  
  isEEAUser: () => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const eeaTimezones = ['Europe/', 'GB', 'UK', 'London'];
    return eeaTimezones.some(tz => timezone.includes(tz));
  }
};

export default AdSense;