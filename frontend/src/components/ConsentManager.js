// frontend/src/components/ConsentManager.js
import React, { useState, useEffect } from 'react';
import './ConsentManager.css';

const ConsentManager = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetailed, setShowDetailed] = useState(false);
  const [consentSettings, setConsentSettings] = useState({
    necessary: true, // Always required
    analytics: false,
    marketing: false,
    personalization: false
  });

  useEffect(() => {
    // Check if user has already given consent
    const consent = localStorage.getItem('cookieConsent');
    const needsConsent = checkIfNeedsConsent();
    
    console.log('🔍 Consent check:', { consent, needsConsent });
    
    // Show banner if no consent decision and user needs consent
    if (!consent && needsConsent) {
      // Small delay for better UX
      setTimeout(() => {
        setShowBanner(true);
        console.log('🍪 Showing consent banner');
      }, 1500);
    }
    
    // For non-EEA users, auto-grant consent on first visit
    if (!consent && !needsConsent) {
      console.log('🌍 Non-EEA user detected, auto-granting consent');
      acceptCookies(); // Auto-accept for non-EEA users
    }
  }, []);

  // Listen for show consent events from other components
  useEffect(() => {
    const handleShowConsent = () => {
      console.log('🎯 Consent manager triggered via button click');
      setShowBanner(true);
      setShowDetailed(false);
    };

    window.addEventListener('showConsentManager', handleShowConsent);
    return () => {
      window.removeEventListener('showConsentManager', handleShowConsent);
    };
  }, []);

  // Check if user needs consent (EEA/UK users)
  const checkIfNeedsConsent = () => {
    try {
      // Skip consent check in development/localhost
      if (window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1')) {
        console.log('🏠 Development environment, skipping consent check');
        return false;
      }
      
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
      
      const needsConsent = isEEA || isEEALang || wasEEAUser;
      console.log('🌍 Location check:', { timezone, browserLang, isEEA, isEEALang, wasEEAUser, needsConsent });
      
      return needsConsent;
    } catch (error) {
      console.warn('Error detecting user location:', error);
      return false;
    }
  };

  // Handle accept all cookies
  const acceptCookies = () => {
    console.log('✅ Accepting all cookies');
    
    localStorage.setItem('cookieConsent', 'true');
    localStorage.setItem('adsense_consent', 'granted');
    localStorage.setItem('is_eea_user', 'true');
    localStorage.setItem('consent_timestamp', new Date().toISOString());
    
    // Set all consent settings to true
    setConsentSettings({
      necessary: true,
      analytics: true,
      marketing: true,
      personalization: true
    });

    setShowBanner(false);
    setShowDetailed(false);
    
    // Update all components that depend on consent
    window.dispatchEvent(new CustomEvent('consentChanged', { 
      detail: { 
        granted: true, 
        source: 'accept-all',
        timestamp: new Date().toISOString()
      }
    }));
    
    // Update Google CMP if available
    if (window.googlefc && window.googlefc.call) {
      window.googlefc.call(true);
    }

    // Track consent decision
    trackConsentEvent('accepted_all');

    // Reload to apply changes to ads and analytics
    console.log('🔄 Reloading page to apply consent changes...');
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  // Handle reject non-essential cookies
  const rejectCookies = () => {
    console.log('❌ Rejecting non-essential cookies');
    
    localStorage.setItem('cookieConsent', 'false');
    localStorage.setItem('adsense_consent', 'denied');
    localStorage.setItem('is_eea_user', 'true');
    localStorage.setItem('consent_timestamp', new Date().toISOString());
    
    // Set only necessary cookies
    setConsentSettings({
      necessary: true,
      analytics: false,
      marketing: false,
      personalization: false
    });

    setShowBanner(false);
    setShowDetailed(false);
    
    // Clear any existing tracking data
    localStorage.removeItem('analytics_session_id');
    localStorage.removeItem('analytics_session_timestamp');
    
    // Update all components that depend on consent
    window.dispatchEvent(new CustomEvent('consentChanged', { 
      detail: { 
        granted: false, 
        source: 'reject-non-essential',
        timestamp: new Date().toISOString()
      }
    }));
    
    // Update Google CMP if available
    if (window.googlefc && window.googlefc.call) {
      window.googlefc.call(false);
    }

    // Track consent decision
    trackConsentEvent('rejected_non_essential');

    // Reload to apply changes to ads and analytics
    console.log('🔄 Reloading page to apply consent changes...');
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  // Handle custom settings save
  const handleCustomSave = () => {
    console.log('⚙️ Saving custom consent settings:', consentSettings);
    
    // For custom settings, consent is granted if marketing is enabled (for ads)
    const hasMarketingConsent = consentSettings.marketing;
    
    localStorage.setItem('cookieConsent', hasMarketingConsent ? 'true' : 'false');
    localStorage.setItem('adsense_consent', hasMarketingConsent ? 'granted' : 'denied');
    localStorage.setItem('is_eea_user', 'true');
    localStorage.setItem('consent_timestamp', new Date().toISOString());
    localStorage.setItem('consent_settings', JSON.stringify(consentSettings));

    setShowBanner(false);
    setShowDetailed(false);
    
    // Update all components that depend on consent
    window.dispatchEvent(new CustomEvent('consentChanged', { 
      detail: { 
        granted: hasMarketingConsent, 
        settings: consentSettings,
        source: 'custom-settings',
        timestamp: new Date().toISOString()
      }
    }));
    
    // Update Google CMP if available
    if (window.googlefc && window.googlefc.call) {
      window.googlefc.call(hasMarketingConsent);
    }

    // Track consent decision
    trackConsentEvent('custom_settings', consentSettings);

    // Reload to apply changes to ads and analytics
    console.log('🔄 Reloading page to apply consent changes...');
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  // Track consent events for analytics
  const trackConsentEvent = (action, data = {}) => {
    try {
      // Simple tracking without requiring consent
      const eventData = {
        eventName: 'consent_decision',
        eventData: {
          action,
          ...data,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          pageUrl: window.location.href
        }
      };
      
      console.log('📊 Consent Event:', eventData);
      
      // Send to your analytics endpoint if consent is given for analytics
      const analyticsConsent = localStorage.getItem('cookieConsent') === 'true' || 
                               (data.settings && data.settings.analytics);
      
      if (analyticsConsent && window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) {
        fetch(`${window.APP_CONFIG.API_BASE_URL}/api/analytics/event`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventData)
        }).catch(err => console.warn('Failed to send analytics event:', err));
      }
    } catch (error) {
      console.warn('Error tracking consent event:', error);
    }
  };

  // Toggle individual consent settings
  const toggleSetting = (setting) => {
    if (setting === 'necessary') return; // Cannot toggle necessary cookies
    
    setConsentSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  // Close banner without making a decision
  const handleCloseBanner = () => {
    console.log('🚪 Closing consent banner without decision');
    setShowBanner(false);
    
    // If user closes without deciding, assume they want only necessary cookies
    if (!localStorage.getItem('cookieConsent')) {
      localStorage.setItem('cookieConsent', 'false');
      localStorage.setItem('adsense_consent', 'denied');
      
      window.dispatchEvent(new CustomEvent('consentChanged', { 
        detail: { 
          granted: false, 
          source: 'banner-closed',
          timestamp: new Date().toISOString()
        }
      }));
    }
  };

  // Don't show if user has already made a decision
  if (!showBanner) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className="consent-backdrop" 
        onClick={handleCloseBanner}
      ></div>
      
      <div className="consent-banner">
        <div className="consent-content">
          
          {/* Simple View */}
          {!showDetailed ? (
            <>
              <div className="consent-header">
                <div className="consent-icon">🍪</div>
                <h3>Cookie Consent</h3>
                <button 
                  className="consent-close"
                  onClick={handleCloseBanner}
                  aria-label="Close consent banner"
                >
                  ×
                </button>
              </div>

              <div className="consent-body">
                <p>
                  We use cookies to personalize content and ads, to provide social media features 
                  and to analyze our traffic. We also share information about your use of our site 
                  with our social media, advertising and analytics partners.
                </p>
                
                <div className="consent-features">
                  <div className="feature-item">
                    <span className="feature-icon">🔒</span>
                    <span>Essential for site function</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon">📊</span>
                    <span>Analytics & insights</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon">🎯</span>
                    <span>Personalized ads & content</span>
                  </div>
                </div>
              </div>

              <div className="consent-actions">
                <button 
                  onClick={acceptCookies} 
                  className="consent-btn consent-btn-primary"
                >
                  <span className="btn-icon">✅</span>
                  Accept All
                </button>
                
                <button 
                  onClick={rejectCookies} 
                  className="consent-btn consent-btn-secondary"
                >
                  <span className="btn-icon">❌</span>
                  Reject Non-Essential
                </button>
                
                <button 
                  onClick={() => setShowDetailed(true)}
                  className="consent-btn consent-btn-tertiary"
                >
                  <span className="btn-icon">⚙️</span>
                  Customize Settings
                </button>
              </div>

              <div className="consent-footer">
                {/* CRITICAL FIX: Updated /privacy to /privacy-policy */}
                <a href="/privacy-policy" target="_blank" rel="noopener noreferrer">
                  Privacy Policy
                </a>
                <a href="/disclaimer" target="_blank" rel="noopener noreferrer">
                  Disclaimer
                </a>
                <a href="/contact" target="_blank" rel="noopener noreferrer">
                  Contact
                </a>
              </div>
            </>
          ) : (
            /* Detailed Settings View */
            <>
              <div className="consent-header">
                <div className="consent-icon">⚙️</div>
                <h3>Cookie Settings</h3>
                <button 
                  className="consent-close"
                  onClick={handleCloseBanner}
                  aria-label="Close consent banner"
                >
                  ×
                </button>
              </div>

              <div className="consent-body">
                <p>
                  Choose how we use cookies and similar technologies to enhance your 
                  experience. You can change these settings at any time from our privacy policy page.
                </p>

                <div className="consent-settings">
                  {/* Necessary Cookies - Always enabled */}
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

                  {/* Analytics Cookies */}
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

                  {/* Marketing Cookies */}
                  <div className="setting-item">
                    <div className="setting-info">
                      <h4>Marketing Cookies</h4>
                      <p>Used to deliver relevant ads and measure ad performance. Required for AdSense.</p>
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

                  {/* Personalization Cookies */}
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
                  ← Back to Simple View
                </button>
                
                <div className="action-group">
                  <button 
                    className="consent-btn consent-btn-outline"
                    onClick={rejectCookies}
                  >
                    Reject All
                  </button>
                  
                  <button 
                    className="consent-btn consent-btn-primary"
                    onClick={handleCustomSave}
                  >
                    Save Preferences
                  </button>
                </div>
              </div>

              <div className="consent-footer">
                {/* CRITICAL FIX: Updated /privacy to /privacy-policy */}
                <a href="/privacy-policy" target="_blank" rel="noopener noreferrer">
                  Privacy Policy
                </a>
                <a href="/disclaimer" target="_blank" rel="noopener noreferrer">
                  Disclaimer
                </a>
                <a href="/contact" target="_blank" rel="noopener noreferrer">
                  Contact
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

// Export helper functions for use in other components
export const consentHelper = {
  // Check current consent status
  getConsent: () => {
    try {
      return localStorage.getItem('cookieConsent') === 'true';
    } catch (error) {
      console.warn('Error getting consent:', error);
      return false;
    }
  },

  // Check if user needs to give consent
  needsConsent: () => {
    try {
      const consent = localStorage.getItem('cookieConsent');
      return consent === null;
    } catch (error) {
      console.warn('Error checking consent needs:', error);
      return false;
    }
  },

  // Show consent manager programmatically
  showConsentManager: () => {
    window.dispatchEvent(new Event('showConsentManager'));
  },

  // Reset consent (for testing or user preference change)
  resetConsent: () => {
    try {
      localStorage.removeItem('cookieConsent');
      localStorage.removeItem('adsense_consent');
      localStorage.removeItem('is_eea_user');
      localStorage.removeItem('consent_settings');
      localStorage.removeItem('consent_timestamp');
      localStorage.removeItem('analytics_session_id');
      localStorage.removeItem('analytics_session_timestamp');
      
      window.dispatchEvent(new CustomEvent('consentChanged', { 
        detail: { granted: false, source: 'reset' }
      }));
      
      console.log('🔄 Consent reset successfully');
      
      // Show banner again
      setTimeout(() => {
        window.dispatchEvent(new Event('showConsentManager'));
      }, 1000);
      
      return true;
    } catch (error) {
      console.error('Error resetting consent:', error);
      return false;
    }
  },

  // Get detailed consent settings
  getConsentSettings: () => {
    try {
      const settings = localStorage.getItem('consent_settings');
      return settings ? JSON.parse(settings) : {
        necessary: true,
        analytics: false,
        marketing: false,
        personalization: false
      };
    } catch (error) {
      console.warn('Error getting consent settings:', error);
      return {
        necessary: true,
        analytics: false,
        marketing: false,
        personalization: false
      };
    }
  },

  // Get consent timestamp
  getConsentTimestamp: () => {
    try {
      return localStorage.getItem('consent_timestamp');
    } catch (error) {
      console.warn('Error getting consent timestamp:', error);
      return null;
    }
  },

  // Check if consent is valid (not older than 13 months)
  isConsentValid: () => {
    try {
      const timestamp = localStorage.getItem('consent_timestamp');
      if (!timestamp) return false;
      
      const consentDate = new Date(timestamp);
      const now = new Date();
      const monthsDiff = (now.getTime() - consentDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
      
      return monthsDiff <= 13; // GDPR requires renewal every 13 months
    } catch (error) {
      console.warn('Error checking consent validity:', error);
      return false;
    }
  }
};

export default ConsentManager;