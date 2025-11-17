// frontend/src/App.js - UPDATED WITH HOTFIX IMPORTS
import React, { useEffect, useState, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

// Import pages
import HomePage from './pages/HomePage';
import BlogPost from './pages/BlogPost';
import BlogListPage from './pages/BlogListPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Disclaimer from './pages/Disclaimer';

// Import tracking utilities
import utmTracker from './utils/utmTracker';
import { initHeatmapTracking } from './utils/heatmapTracker';

// Import ConsentManager helper for global consent management
import { consentHelper } from './components/AdSense';

// Import analytics debugger for enhanced debugging
import './utils/analyticsDebugger';

// ✅ NEW: Import hotfix utilities
import { adSenseHotfix } from './utils/adSenseHotfix';
import { safeFetch, safeTrackEvent } from './utils/analyticsSafeFetch';
import './utils/analyticsFallback';

// Component to handle page view tracking
const PageViewTracker = () => {
  const location = useLocation();
  const [previousPath, setPreviousPath] = useState('');

  useEffect(() => {
    // Track page view when route changes
    const trackPageView = async () => {
      const currentSessionId = utmTracker.getCurrentSessionId();
      const pageData = {
        type: 'pageview',
        eventName: 'page_view',
        sessionId: currentSessionId,
        page: location.pathname,
        url: window.location.href,
        title: document.title,
        referrer: document.referrer || 'direct',
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        screenResolution: window.screen ? `${window.screen.width}x${window.screen.height}` : 'unknown',
        language: navigator.language,
        ...utmTracker.getUTMParams(),
        metadata: {
          previousPath: previousPath,
          consentStatus: consentHelper.getConsent() || 'not_set',
          isEEAUser: consentHelper.isEEAUser(),
          pathChanged: previousPath !== location.pathname,
          loadTime: performance.timing ? performance.timing.loadEventEnd - performance.timing.navigationStart : 0
        }
      };

      try {
        // ✅ UPDATED: Use safeFetch instead of regular fetch
        const result = await safeFetch('/api/analytics/pageview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(pageData)
        });

        if (!result.success) {
          // Handle different HTTP status codes gracefully
          if (result.error && result.error.includes('403')) {
            console.warn('📊 Analytics: Access forbidden (403). This is normal in development.');
            return;
          } else if (result.error && result.error.includes('404')) {
            console.warn('📊 Analytics: Endpoint not found (404). Analytics API might not be running.');
            return;
          }
          console.warn('Page view tracking failed:', result.error);
          return;
        }

        if (process.env.NODE_ENV !== 'production') {
          console.log('📊 Page View Tracked:', {
            path: location.pathname,
            session: currentSessionId,
            status: 'success'
          });
        }
      } catch (error) {
        // ✅ FIXED: Don't show error for 403/404 in development
        if (process.env.NODE_ENV === 'production') {
          console.warn('Page view tracking failed:', error);
        } else {
          console.log('📊 Analytics not available in development (expected):', error.message);
        }
      }

      // Store current path for next page view
      setPreviousPath(location.pathname);
    };

    // Small delay to ensure DOM is ready
    setTimeout(trackPageView, 100);
  }, [location, previousPath]);

  return null;
};

// Enhanced session management
const generateSessionId = () => {
  if (typeof window === 'undefined') {
    return 'server-side-session';
  }

  try {
    let sessionId = sessionStorage.getItem('blog_session_id');
    
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('blog_session_id', sessionId);
      localStorage.setItem('blog_session_id', sessionId);
      sessionStorage.setItem('session_start_time', Date.now().toString());
    }
    
    return sessionId;
  } catch (error) {
    return 'memory_session_' + Math.random().toString(36).substr(2, 9);
  }
};

// ✅ UPDATED: Enhanced event tracking with safeFetch and better error handling
const trackEvent = async (eventType, metadata = {}, options = {}) => {
  const { maxRetries = 1, retryDelay = 1000 } = options; // Reduced retries for dev
  
  const eventData = {
    type: 'event',
    eventName: eventType,
    sessionId: generateSessionId(),
    page: window.location.pathname,
    url: window.location.href,
    title: document.title,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    screenResolution: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
    language: navigator.language,
    ...utmTracker.getUTMParams(),
    eventData: metadata,
    metadata: {
      consentStatus: consentHelper.getConsent() || 'not_set',
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      timestamp: Date.now(),
      hotfixVersion: '1.0' // Track hotfix usage
    }
  };

  // Development logging
  if (process.env.NODE_ENV !== 'production') {
    console.log('🎯 Event Tracked (Development):', eventType, eventData);
    
    // In development, don't actually send to backend unless explicitly enabled
    if (!process.env.REACT_APP_ANALYTICS_DEV) {
      return { success: true, development: true };
    }
  }

  // Only send to backend in production or if explicitly enabled
  if (process.env.NODE_ENV === 'production' || process.env.REACT_APP_ANALYTICS_DEV === 'true') {
    let retries = 0;
    
    const attemptSend = async () => {
      try {
        // ✅ UPDATED: Use safeFetch instead of regular fetch
        const result = await safeFetch('/api/analytics/event', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventData)
        });

        if (!result.success) {
          // ✅ FIXED: Handle specific HTTP errors gracefully
          if (result.error && result.error.includes('403')) {
            console.warn('🔒 Analytics: Access forbidden (403). This is normal if API is not configured.');
            return { success: false, reason: 'forbidden' };
          } else if (result.error && result.error.includes('404')) {
            console.warn('🔍 Analytics: Endpoint not found (404). Analytics API might not be running.');
            return { success: false, reason: 'not_found' };
          }
          throw new Error(result.error || 'Unknown error');
        }

        return result;
      } catch (error) {
        // ✅ FIXED: Better error handling with specific messaging
        if (retries < maxRetries) {
          retries++;
          console.warn(`Event tracking failed, retry ${retries}/${maxRetries}:`, error.message);
          await new Promise(resolve => setTimeout(resolve, retryDelay * retries));
          return attemptSend();
        } else {
          // Don't throw errors for analytics failures in development
          if (process.env.NODE_ENV === 'production') {
            console.error('Event tracking failed after retries:', error);
          } else {
            console.log('📊 Analytics not available in development (expected):', error.message);
          }
          return { success: false, error: error.message };
        }
      }
    };

    return attemptSend();
  }
  
  return { success: true, development: true };
};

// Enhanced error boundary and performance tracking
const setupErrorTracking = () => {
  // Global error handler
  window.addEventListener('error', (event) => {
    // Don't track errors in development unless explicitly enabled
    if (process.env.NODE_ENV !== 'production' && !process.env.REACT_APP_ANALYTICS_DEV) {
      return;
    }
    
    trackEvent('javascript_error', {
      errorMessage: event.message,
      errorStack: event.error?.stack?.substring(0, 500),
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      errorType: 'window_error'
    });
  });

  // Promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    if (process.env.NODE_ENV !== 'production' && !process.env.REACT_APP_ANALYTICS_DEV) {
      return;
    }
    
    trackEvent('promise_rejection', {
      reason: event.reason?.toString().substring(0, 200),
      errorType: 'unhandled_rejection'
    });
  });

  // Performance monitoring - only in production
  if ('performance' in window && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigationTiming = performance.getEntriesByType('navigation')[0];
        const paintTiming = performance.getEntriesByType('paint');
        
        if (navigationTiming) {
          trackEvent('performance_metrics', {
            loadTime: navigationTiming.loadEventEnd - navigationTiming.navigationStart,
            domContentLoaded: navigationTiming.domContentLoadedEventEnd - navigationTiming.navigationStart,
            firstPaint: paintTiming.find(entry => entry.name === 'first-paint')?.startTime,
            firstContentfulPaint: paintTiming.find(entry => entry.name === 'first-contentful-paint')?.startTime,
            domProcessing: navigationTiming.domComplete - navigationTiming.domLoading
          });
        }
      }, 0);
    });
  }

  // Resource loading errors - only in production
  if (process.env.NODE_ENV === 'production') {
    window.addEventListener('error', (event) => {
      if (event.target && (event.target.tagName === 'SCRIPT' || event.target.tagName === 'LINK' || event.target.tagName === 'IMG')) {
        trackEvent('resource_error', {
          resourceType: event.target.tagName,
          src: event.target.src || event.target.href,
          errorMessage: 'Resource failed to load'
        });
      }
    }, true);
  }
};

// ✅ ENHANCED: Google CMP initialization with AdSense hotfix integration
const initializeGoogleCMP = () => {
  // Initialize AdSense hotfix first
  if (typeof window !== 'undefined' && window._adSenseHotfix) {
    console.log('🔧 AdSense Hotfix: Initialized globally');
    
    // Clear any previously tracked slots on app start
    setTimeout(() => {
      window._adSenseHotfix.clearSlots();
      console.log('🔄 AdSense Hotfix: Cleared previous slot tracking');
    }, 1000);
  }

  // Check if Google Funding Choices is available
  if (window.googlefc && window.googlefc.controlled) {
    console.log('✅ Google Funding Choices CMP detected');
    
    window.googlefc.controlled.push(() => {
      const granted = window.googlefc.controlled.getConsent();
      consentHelper.setConsent(granted);
      console.log('🔄 Google CMP consent updated:', granted);
      
      // Clear AdSense slots when consent changes to allow re-initialization
      if (window._adSenseHotfix) {
        window._adSenseHotfix.clearSlots();
      }
      
      trackEvent('cmp_consent_updated', {
        source: 'google_cmp',
        granted: granted,
        timestamp: new Date().toISOString(),
        hotfixActive: !!window._adSenseHotfix
      });
    });
  } else {
    console.log('ℹ️ Using custom consent manager');
    const consentStatus = consentHelper.initialize();
    console.log('🔍 Custom consent status:', consentStatus);
  }
};

// Enhanced scroll tracking
const setupScrollTracking = () => {
  // Only enable scroll tracking in production
  if (process.env.NODE_ENV !== 'production' && !process.env.REACT_APP_HEATMAP_DEV) {
    return;
  }

  let scrollDepthTracked = [25, 50, 75, 90];
  let trackedDepths = new Set();
  
  const trackScrollDepth = () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrolled = (scrollTop / scrollHeight) * 100;
    
    scrollDepthTracked.forEach(depth => {
      if (scrolled >= depth && !trackedDepths.has(depth)) {
        trackedDepths.add(depth);
        trackEvent('scroll_depth', {
          depth: depth,
          percentage: Math.round(scrolled),
          page: window.location.pathname
        });
      }
    });
  };
  
  // Throttle scroll events
  let scrollTimeout;
  const throttledScroll = () => {
    if (!scrollTimeout) {
      scrollTimeout = setTimeout(() => {
        trackScrollDepth();
        scrollTimeout = null;
      }, 500);
    }
  };
  
  window.addEventListener('scroll', throttledScroll, { passive: true });
};

// ✅ NEW: AdSense error monitoring
const setupAdSenseMonitoring = () => {
  if (typeof window === 'undefined') return;

  // Monitor for AdSense errors
  window.addEventListener('error', (event) => {
    if (event.target && event.target.className === 'adsbygoogle') {
      console.warn('🔧 AdSense error detected, hotfix may help');
      trackEvent('adsense_error_detected', {
        errorType: 'ad_load_error',
        element: 'adsbygoogle',
        hotfixActive: !!window._adSenseHotfix
      });
    }
  });

  // Monitor for AdSense script errors
  const originalConsoleError = console.error;
  console.error = function(...args) {
    if (args[0] && typeof args[0] === 'string' && 
        (args[0].includes('adsbygoogle') || args[0].includes('AdSense'))) {
      console.log('🔧 AdSense error intercepted by hotfix system');
      trackEvent('adsense_console_error', {
        errorMessage: args[0].substring(0, 200),
        hotfixIntercepted: true
      });
    }
    originalConsoleError.apply(console, args);
  };
};

function App() {
  const [consentInitialized, setConsentInitialized] = useState(false);

  // ✅ FIXED: Moved useCallback inside the component
  const handleGlobalClick = useCallback((event) => {
    const target = event.target;
    
    // Track affiliate link clicks
    if (target.closest('.affiliate-link') || target.getAttribute('rel')?.includes('sponsored')) {
      const link = target.closest('a');
      trackEvent('affiliate_click', {
        buttonId: link?.id || 'affiliate_link',
        buttonText: link?.textContent?.substring(0, 100),
        position: link?.getAttribute('data-affiliate-position') || 'unknown',
        href: link?.href,
        elementType: link?.tagName,
        hotfixVersion: '1.0'
      });
    }
    
    // Track CTA button clicks
    if (target.classList.contains('cta-button') || 
        target.classList.contains('newsletter-signup') || 
        target.type === 'submit') {
      trackEvent('cta_click', {
        buttonId: target.id || target.className,
        buttonText: target.textContent?.substring(0, 100),
        type: target.type,
        element: target.tagName,
        classes: target.className
      });
    }

    // Track consent-related interactions
    if (target.closest('.consent-btn') || target.closest('.manage-consent-btn')) {
      trackEvent('consent_interaction', {
        element: target.className || target.textContent?.substring(0, 50),
        action: 'consent_click',
        consentType: target.classList.contains('accept') ? 'accept' : 
                    target.classList.contains('reject') ? 'reject' : 'manage'
      });
    }
    
    // Track external link clicks
    if (target.tagName === 'A' && target.href) {
      try {
        const url = new URL(target.href);
        const isExternal = url.hostname !== window.location.hostname;
        
        if (isExternal && !target.href.includes('utm_source')) {
          trackEvent('external_link_click', {
            href: target.href,
            text: target.textContent?.substring(0, 100),
            isAffiliate: target.classList.contains('affiliate-link'),
            hostname: url.hostname
          });
        }
      } catch (error) {
        // Invalid URL, skip tracking
      }
    }

    // Track ad interactions
    if (target.closest('.adsbygoogle') || target.closest('.ad-container')) {
      trackEvent('ad_interaction', {
        interactionType: 'click',
        element: target.tagName,
        adContainer: target.closest('.ad-container')?.className || 'unknown',
        hotfixActive: !!window._adSenseHotfix
      });
    }
  }, []);

  useEffect(() => {
    // Initialize all tracking systems
    console.log('🔍 Initializing analytics and tracking systems...');
    
    // ✅ NEW: Initialize AdSense monitoring
    setupAdSenseMonitoring();
    
    // Initialize UTM tracking for affiliate links and campaign tracking
    utmTracker.initUTMTracking();
    
    // Initialize heatmap tracking for user behavior visualization
    if (process.env.NODE_ENV === 'production' || process.env.REACT_APP_HEATMAP_DEV === 'true') {
      initHeatmapTracking({
        clickTracking: true,
        scrollTracking: true,
        movementTracking: true
      });
    }
    
    // Initialize Google CMP and custom consent
    initializeGoogleCMP();
    setConsentInitialized(true);
    
    // Setup error and performance tracking
    setupErrorTracking();
    
    // Setup scroll tracking
    setupScrollTracking();
    
    // Track initial app load with hotfix info
    trackEvent('app_loaded', {
      environment: process.env.NODE_ENV,
      reactVersion: React.version,
      userAgent: navigator.userAgent,
      cmpAvailable: !!(window.googlefc && window.googlefc.controlled),
      initialConsent: consentHelper.getConsent() || 'not_set',
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      timestamp: new Date().toISOString(),
      hotfixActive: !!window._adSenseHotfix,
      safeFetchActive: true
    });

    // Add global click listener
    document.addEventListener('click', handleGlobalClick);

    // Cleanup function
    return () => {
      document.removeEventListener('click', handleGlobalClick);
      
      // Restore original console.error if we modified it
      if (console.error.__original) {
        console.error = console.error.__original;
      }
    };
  }, [handleGlobalClick]); // ✅ FIXED: Added handleGlobalClick to dependencies

  return (
    <HelmetProvider>
      <Router>
        {/* Page view tracker component */}
        <PageViewTracker />
        
        {/* Global click handler for automatic link tracking */}
        <div className="App" style={{ minHeight: '100vh' }}>
          <Routes>
            {/* Home Route */}
            <Route path="/" element={<HomePage />} />
            
            {/* Blog Routes */}
            <Route path="/blog" element={<BlogListPage />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            
            {/* Essential Pages for AdSense Compliance */}
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/disclaimer" element={<Disclaimer />} />
            
            {/* 404 fallback */}
            <Route path="*" element={
              <div className="min-h-screen bg-gray-50 flex flex-col">
                <header className="bg-white shadow-sm border-b">
                  <div className="container mx-auto px-4 py-4">
                    <a href="/" className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
                      Wilson's Blog
                    </a>
                  </div>
                </header>
                
                <main className="flex-grow flex items-center justify-center">
                  <div style={{ padding: '2rem', textAlign: 'center' }}>
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">404 - Page Not Found</h1>
                    <p className="text-gray-600 mb-6">The page you're looking for doesn't exist.</p>
                    <p className="space-x-4">
                      <a href="/" className="text-blue-600 hover:text-blue-800 font-medium">
                        Go back to home
                      </a> 
                      <span className="text-gray-400">|</span>
                      <a href="/blog" className="text-blue-600 hover:text-blue-800 font-medium">
                        View all blog posts
                      </a>
                    </p>
                  </div>
                </main>
                
                <footer className="bg-white border-t py-6">
                  <div className="container mx-auto px-4 text-center text-gray-600">
                    <p>&copy; 2025 Wilson Muita. All rights reserved.</p>
                    <div className="mt-2 space-x-4">
                      <a href="/privacy-policy" className="text-blue-600 hover:text-blue-800 text-sm">
                        Privacy Policy
                      </a>
                      <a href="/disclaimer" className="text-blue-600 hover:text-blue-800 text-sm">
                        Disclaimer
                      </a>
                      <a href="/contact" className="text-blue-600 hover:text-blue-800 text-sm">
                        Contact
                      </a>
                    </div>
                  </div>
                </footer>
              </div>
            } />
          </Routes>
        </div>
      </Router>
    </HelmetProvider>
  );
}

// ✅ FIXED: Only export trackEvent once
export { trackEvent };
export default App;