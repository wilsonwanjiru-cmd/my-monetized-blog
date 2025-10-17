// frontend/src/components/NewsletterSignup.js
import React, { useState, useEffect } from 'react';
import { blogAPI, apiUtils } from '../utils/api';
import { trackCustomEvent } from '../utils/utmTracker';
import './NewsletterSignup.css';

const NewsletterSignup = ({ source = 'website_sidebar', location = 'unknown' }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState('');
  const [message, setMessage] = useState('');
  const [showNameField, setShowNameField] = useState(false);
  const [apiConnected, setApiConnected] = useState(false);

  // Test API connection on component mount
  useEffect(() => {
    const testConnection = async () => {
      try {
        const connectionTest = await apiUtils.testConnection();
        setApiConnected(connectionTest.connected);
        
        if (connectionTest.connected) {
          console.log('✅ Newsletter API connection successful');
        } else {
          console.warn('⚠️ Newsletter API connection issues:', connectionTest.error);
        }
      } catch (error) {
        console.error('❌ Newsletter API connection failed:', error);
        setApiConnected(false);
      }
    };
    
    testConnection();
  }, []);

  const getUTMParams = () => {
    // Get UTM parameters from URL or use defaults
    const urlParams = new URLSearchParams(window.location.search);
    return {
      utm_source: urlParams.get('utm_source') || 'direct',
      utm_medium: urlParams.get('utm_medium') || 'organic',
      utm_campaign: urlParams.get('utm_campaign') || 'newsletter_signup',
      utm_term: urlParams.get('utm_term') || '',
      utm_content: urlParams.get('utm_content') || location
    };
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    // Basic validation
    if (!email) {
      setStatus('error');
      setMessage('Please enter your email address.');
      return;
    }

    if (!validateEmail(email)) {
      setStatus('error');
      setMessage('Please enter a valid email address.');
      return;
    }

    // Track subscription attempt
    trackCustomEvent('newsletter_subscription_attempt', {
      medium: 'content',
      campaign: 'newsletter',
      content: 'subscription_attempt',
      metadata: {
        email: email,
        name: name || 'not_provided',
        source: source,
        location: location,
        timestamp: new Date().toISOString()
      }
    });

    try {
      const utmParams = getUTMParams();
      
      // Prepare subscriber data for backend
      const subscriberData = {
        email: email.trim().toLowerCase(),
        name: name.trim() || email.split('@')[0], // Use email prefix as name if not provided
        source: source,
        ...utmParams
      };

      console.log('📤 Subscribing to newsletter:', subscriberData);

      const response = await blogAPI.newsletter.subscribe(subscriberData);
      console.log('✅ Newsletter subscription response:', response);

      // Handle different response scenarios
      if (response && (response.success || response.message)) {
        setStatus('success');
        
        // Check if already subscribed
        if (response.message && response.message.includes('Already subscribed')) {
          setMessage('You are already subscribed to our newsletter. Thank you!');
        } else {
          setMessage(response.message || 'Thank you for subscribing! You will receive updates soon.');
        }

        // Track successful subscription
        trackCustomEvent('newsletter_subscription_success', {
          medium: 'content',
          campaign: 'newsletter',
          content: 'subscription_success',
          metadata: {
            email: email,
            name: name || 'not_provided',
            source: source,
            timestamp: new Date().toISOString(),
            response: response.message
          }
        });

        // Reset form
        setEmail('');
        setName('');
        setShowNameField(false);
      } else {
        throw new Error(response?.error || 'Subscription failed. Please try again.');
      }

    } catch (error) {
      console.error('❌ Newsletter subscription error:', error);
      setStatus('error');
      
      // Enhanced error message handling
      let errorMessage = 'Subscription failed. Please try again.';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.data?.message) {
        errorMessage = error.data.message;
      }
      
      // Handle specific error cases
      if (errorMessage.includes('Network error') || errorMessage.includes('Failed to fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (errorMessage.includes('already subscribed') || errorMessage.includes('Already subscribed')) {
        errorMessage = 'This email is already subscribed. Thank you!';
        setStatus('success'); // Treat as success since they're already subscribed
      } else if (errorMessage.includes('valid') && errorMessage.includes('email')) {
        errorMessage = 'Please enter a valid email address.';
      }

      setMessage(errorMessage);

      // Track subscription error
      trackCustomEvent('newsletter_subscription_error', {
        medium: 'content',
        campaign: 'newsletter',
        content: 'subscription_error',
        metadata: {
          email: email,
          error: errorMessage,
          timestamp: new Date().toISOString(),
          errorDetails: {
            code: error.code,
            status: error.status
          }
        }
      });
    }
  };

  const toggleNameField = () => {
    setShowNameField(!showNameField);
    if (!showNameField) {
      // Focus on name field when shown
      setTimeout(() => {
        const nameInput = document.getElementById('newsletter-name');
        if (nameInput) nameInput.focus();
      }, 100);
    }
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    // Auto-fill name from email if name is empty and email contains a name pattern
    if (!name && e.target.value.includes('@')) {
      const emailName = e.target.value.split('@')[0];
      // Only auto-fill if it looks like a name (not random characters)
      if (emailName.length > 2 && emailName.length < 25 && /^[a-zA-Z]+$/.test(emailName)) {
        setName(emailName.charAt(0).toUpperCase() + emailName.slice(1));
      }
    }
  };

  const handleNameChange = (e) => {
    setName(e.target.value);
  };

  return (
    <div className="newsletter-signup">
      <div className="newsletter-header">
        <h3 className="newsletter-title">📬 Stay Updated</h3>
        <p className="newsletter-description">
          Get the latest posts delivered right to your inbox. No spam, unsubscribe anytime.
        </p>
      </div>

      {/* API Connection Status */}
      {!apiConnected && (
        <div className="newsletter-warning">
          <span className="warning-icon">⚠️</span>
          <span>Offline mode: Subscription may not work.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="newsletter-form">
        <div className="form-row">
          <input
            type="email"
            value={email}
            onChange={handleEmailChange}
            placeholder="Enter your email"
            required
            disabled={status === 'loading'}
            className="newsletter-input"
            aria-label="Email address for newsletter subscription"
          />
          <button 
            type="submit" 
            disabled={status === 'loading' || !email}
            className="newsletter-button"
            aria-label="Subscribe to newsletter"
          >
            {status === 'loading' ? (
              <>
                <span className="button-spinner"></span>
                Subscribing...
              </>
            ) : (
              'Subscribe'
            )}
          </button>
        </div>

        {/* Optional Name Field */}
        {!showNameField ? (
          <div className="name-toggle">
            <button 
              type="button" 
              onClick={toggleNameField}
              className="name-toggle-button"
              aria-label="Add name field"
            >
              + Add your name (optional)
            </button>
          </div>
        ) : (
          <div className="name-field">
            <input
              id="newsletter-name"
              type="text"
              value={name}
              onChange={handleNameChange}
              placeholder="Enter your name (optional)"
              disabled={status === 'loading'}
              className="newsletter-input name-input"
              aria-label="Your name for newsletter subscription"
            />
            <button 
              type="button" 
              onClick={toggleNameField}
              className="name-remove-button"
              title="Remove name field"
              aria-label="Remove name field"
            >
              ×
            </button>
          </div>
        )}

        {/* Status Message */}
        {message && (
          <div className={`newsletter-message ${status}`}>
            {message}
          </div>
        )}

        {/* Privacy Note */}
        <div className="privacy-note">
          <small>
            We respect your privacy. Unsubscribe at any time. 
            {!apiConnected && ' (Currently in offline mode)'}
          </small>
        </div>
      </form>

      {/* Success State - Additional Info */}
      {status === 'success' && (
        <div className="success-info">
          <div className="success-tip">
            <strong>What to expect:</strong>
            <ul>
              <li>Weekly blog post updates</li>
              <li>Exclusive content and tips</li>
              <li>No spam - we promise!</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewsletterSignup;