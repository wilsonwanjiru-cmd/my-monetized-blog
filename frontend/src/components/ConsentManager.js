// frontend/src/components/ConsentManager.js
import React, { useEffect, useState } from 'react';
import './ConsentManager.css';

const ConsentManager = () => {
  const [showConsent, setShowConsent] = useState(false);
  const [showDetailed, setShowDetailed] = useState(false);
  const [consentGiven, setConsentGiven] = useState(null);
  const [consentSettings, setConsentSettings] = useState({
    necessary: true, // Always required
    analytics: false,
    marketing: false,
    personalization: false
  });

  useEffect(() => {
    // Check if user needs consent (from EEA/UK)
    const needsConsent = checkIfNeedsConsent();
    const hasConsent = localStorage.getItem('adsense_consent');
    
    if (needsConsent && !hasConsent) {
      // Small delay for better UX
      setTimeout(() => setShowConsent(true), 1000);
    }
  }, []);

  // NEW: Listen for show consent events from Layout buttons
  useEffect(() => {
    const handleShowConsent = () => {
      console.log('🎯 Consent manager triggered via button click');
      setShowConsent(true);
      setShowDetailed(false);
    };

    // Listen for both event types that might be dispatched
    window.addEventListener('consentChanged', handleShowConsent);
    window.addEventListener('showConsentManager', handleShowConsent);

    return () => {
      window.removeEventListener('consentChanged', handleShowConsent);
      window.removeEventListener('showConsentManager', handleShowConsent);
    };
  }, []);

  const checkIfNeedsConsent = () => {
    try {
      // Method 1: Check timezone
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const eeaTimezones = [
        'Europe/', 'GB', 'UK', 'London', 'Berlin', 'Paris', 'Rome', 'Madrid',
        'Amsterdam', 'Brussels', 'Vienna', 'Zurich', 'Stockholm', 'Oslo', 'Copenhagen'
      ];
      
      const isEEA = eeaTimezones.some(tz => timezone.includes(tz));
      
      // Method 2: Check browser language
      const browserLang = navigator.language || navigator.userLanguage;
      const eeaLanguages = ['de', 'fr', 'it', 'es', 'nl', 'pl', 'sv', 'no', 'da', 'fi', 'pt', 'el'];
      
      const isEEALang = eeaLanguages.some(lang => browserLang.startsWith(lang));
      
      // Method 3: Check stored preference
      const wasEEAUser = localStorage.getItem('is_eea_user') === 'true';
      
      return isEEA || isEEALang || wasEEAUser;
    } catch (error) {
      console.warn('Error detecting user location:', error);
      return false;
    }
  };

  const handleConsent = (choice) => {
    localStorage.setItem('adsense_consent', choice);
    localStorage.setItem('is_eea_user', 'true');
    setConsentGiven(choice);
    setShowConsent(false);
    setShowDetailed(false);
    
    // Update all AdSense components
    window.dispatchEvent(new Event('consentChanged'));
    
    // Update Google CMP if available
    if (window.googlefc && window.googlefc.call) {
      window.googlefc.call(choice === 'granted');
    }

    // Track consent decision
    if (window.trackEvent) {
      window.trackEvent('consent_decision', {
        choice: choice,
        settings: consentSettings,
        source: showDetailed ? 'detailed' : 'simple'
      });
    }
  };

  const handleDetailedSave = () => {
    // For detailed settings, consent is granted if marketing is enabled
    const consentChoice = consentSettings.marketing ? 'granted' : 'denied';
    handleConsent(consentChoice);
  };

  const toggleSetting = (setting) => {
    setConsentSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  // Don't show if user has already made a choice and no button was clicked
  if (!showConsent) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div className="consent-backdrop" onClick={() => setShowConsent(false)}></div>
      
      <div className="consent-banner">
        <div className="consent-content">
          {/* Header */}
          <div className="consent-header">
            <div className="consent-icon">🍪</div>
            <h3>Your Privacy Choices</h3>
            <button 
              className="consent-close"
              onClick={() => setShowConsent(false)}
              aria-label="Close consent banner"
            >
              ×
            </button>
          </div>

          {!showDetailed ? (
            /* Simple View */
            <>
              <div className="consent-body">
                <p>
                  We use cookies and similar technologies to help personalize content, 
                  tailor and measure ads, and provide a better experience. By clicking 
                  accept, you agree to this use as outlined in our{' '}
                  <a href="/privacy-policy" target="_blank" rel="noopener noreferrer">
                    Privacy Policy
                  </a>.
                </p>
                
                <div className="consent-features">
                  <div className="feature-item">
                    <span className="feature-icon">🔒</span>
                    <span>Secure browsing</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon">📊</span>
                    <span>Analytics & insights</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon">🎯</span>
                    <span>Personalized content</span>
                  </div>
                </div>
              </div>

              <div className="consent-actions">
                <button 
                  className="consent-btn consent-btn-primary"
                  onClick={() => handleConsent('granted')}
                >
                  <span className="btn-icon">✅</span>
                  Accept All
                </button>
                
                <button 
                  className="consent-btn consent-btn-secondary"
                  onClick={() => handleConsent('denied')}
                >
                  <span className="btn-icon">❌</span>
                  Reject All
                </button>
                
                <button 
                  className="consent-btn consent-btn-tertiary"
                  onClick={() => setShowDetailed(true)}
                >
                  <span className="btn-icon">⚙️</span>
                  Customize Settings
                </button>
              </div>
            </>
          ) : (
            /* Detailed View */
            <>
              <div className="consent-body">
                <p>
                  Choose how we use cookies and similar technologies to enhance your 
                  experience. You can change these settings at any time.
                </p>

                <div className="consent-settings">
                  <div className="setting-item setting-required">
                    <div className="setting-info">
                      <h4>Essential Cookies</h4>
                      <p>Required for the website to function properly. Cannot be disabled.</p>
                    </div>
                    <label className="setting-toggle">
                      <input 
                        type="checkbox" 
                        checked={true} 
                        disabled 
                        readOnly
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <h4>Analytics Cookies</h4>
                      <p>Help us understand how visitors interact with our website.</p>
                    </div>
                    <label className="setting-toggle">
                      <input 
                        type="checkbox" 
                        checked={consentSettings.analytics}
                        onChange={() => toggleSetting('analytics')}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <h4>Marketing Cookies</h4>
                      <p>Used to deliver relevant ads and measure ad performance.</p>
                    </div>
                    <label className="setting-toggle">
                      <input 
                        type="checkbox" 
                        checked={consentSettings.marketing}
                        onChange={() => toggleSetting('marketing')}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <h4>Personalization Cookies</h4>
                      <p>Remember your preferences and personalize your experience.</p>
                    </div>
                    <label className="setting-toggle">
                      <input 
                        type="checkbox" 
                        checked={consentSettings.personalization}
                        onChange={() => toggleSetting('personalization')}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="consent-actions detailed-actions">
                <button 
                  className="consent-btn consent-btn-secondary"
                  onClick={() => setShowDetailed(false)}
                >
                  ← Back
                </button>
                
                <div className="action-group">
                  <button 
                    className="consent-btn consent-btn-outline"
                    onClick={() => handleConsent('denied')}
                  >
                    Reject All
                  </button>
                  
                  <button 
                    className="consent-btn consent-btn-primary"
                    onClick={handleDetailedSave}
                  >
                    Save Preferences
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Footer Links */}
          <div className="consent-footer">
            <a href="/privacy-policy" target="_blank" rel="noopener noreferrer">
              Privacy Policy
            </a>
            {/* <a href="/cookie-policy" target="_blank" rel="noopener noreferrer">
              Cookie Policy
            </a>
            <a href="/terms" target="_blank" rel="noopener noreferrer">
              Terms of Service
            </a> */}
          </div>
        </div>
      </div>
    </>
  );
};

export default ConsentManager;