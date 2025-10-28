// frontend/src/App.js
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

// Import pages
import HomePage from './pages/HomePage';
import BlogPost from './pages/BlogPost';
import BlogListPage from './pages/BlogListPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Disclaimer from './pages/Disclaimer'; // NEW: Import Disclaimer page

// Import tracking utilities
import utmTracker from './utils/utmTracker';
import { initHeatmapTracking } from './utils/heatmapTracker';

// Component to handle page view tracking
const PageViewTracker = () => {
  const location = useLocation();

  useEffect(() => {
    // Track page view when route changes
    const trackPageView = async () => {
      const pageData = {
        eventType: 'pageview',
        url: window.location.href,
        path: location.pathname,
        sessionId: utmTracker.getCurrentSessionId(),
        metadata: {
          title: document.title,
          referrer: document.referrer,
          previousPath: sessionStorage.getItem('previous_path') || ''
        }
      };

      try {
        // Send to backend analytics
        await fetch('/api/analytics/track', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(pageData)
        });

        if (process.env.NODE_ENV !== 'production') {
          console.log('📊 Page View:', pageData);
        }
      } catch (error) {
        console.warn('Page view tracking failed:', error);
      }

      // Store current path for next page view
      sessionStorage.setItem('previous_path', location.pathname);
    };

    trackPageView();
  }, [location]);

  return null;
};

// Generate a robust session ID
const generateSessionId = () => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return 'server-side-session';
  }

  try {
    let sessionId = sessionStorage.getItem('blog_session_id');
    
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('blog_session_id', sessionId);
      
      // Also store in localStorage for cross-tab session persistence
      localStorage.setItem('blog_session_id', sessionId);
    }
    
    return sessionId;
  } catch (error) {
    // Fallback if storage is not available
    console.warn('Session storage not available, using memory session');
    return 'memory_session_' + Math.random().toString(36).substr(2, 9);
  }
};

// Enhanced event tracking function
const trackEvent = async (eventType, metadata = {}) => {
  const eventData = {
    eventType,
    url: window.location.href,
    path: window.location.pathname,
    timestamp: new Date().toISOString(),
    sessionId: generateSessionId(),
    metadata,
    userAgent: navigator.userAgent,
    screenResolution: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    language: navigator.language
  };

  // Always log events in development for debugging
  if (process.env.NODE_ENV !== 'production') {
    console.log('🎯 Event Tracked:', eventType, eventData);
  }

  // Only send to backend in production or if explicitly enabled
  if (process.env.NODE_ENV === 'production' || process.env.REACT_APP_ANALYTICS_DEV === 'true') {
    try {
      const response = await fetch('/api/analytics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.warn('Event tracking failed:', error);
      
      // Optional: Implement retry logic or offline queue here
      if (process.env.NODE_ENV !== 'production') {
        console.log('Event data that failed to send:', eventData);
      }
    }
  }
};

// Global click handler for automatic event tracking
const handleGlobalClick = (event) => {
  const target = event.target;
  
  // Track affiliate link clicks
  if (target.closest('.affiliate-link') || target.getAttribute('rel')?.includes('sponsored')) {
    const link = target.closest('a');
    trackEvent('affiliate_click', {
      element: 'affiliate_link',
      href: link?.href,
      text: link?.textContent?.substring(0, 100),
      product: link?.getAttribute('data-affiliate-product'),
      position: link?.getAttribute('data-affiliate-position')
    });
  }
  
  // Track CTA button clicks
  if (target.classList.contains('cta-button') || 
      target.classList.contains('newsletter-signup') || 
      target.type === 'submit') {
    trackEvent('cta_click', {
      element: target.className,
      text: target.textContent?.substring(0, 100),
      type: target.type,
      id: target.id
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
          isAffiliate: target.classList.contains('affiliate-link')
        });
      }
    } catch (error) {
      // Invalid URL, skip tracking
    }
  }
};

// Enhanced error boundary and performance tracking
const setupErrorTracking = () => {
  // Global error handler
  window.addEventListener('error', (event) => {
    trackEvent('javascript_error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error?.toString()
    });
  });

  // Promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    trackEvent('promise_rejection', {
      reason: event.reason?.toString()
    });
  });

  // Performance monitoring
  if ('performance' in window) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigationTiming = performance.getEntriesByType('navigation')[0];
        if (navigationTiming) {
          trackEvent('performance_metrics', {
            loadTime: navigationTiming.loadEventEnd - navigationTiming.navigationStart,
            domContentLoaded: navigationTiming.domContentLoadedEventEnd - navigationTiming.navigationStart,
            firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime,
            firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime
          });
        }
      }, 0);
    });
  }
};

function App() {
  useEffect(() => {
    // Initialize all tracking systems
    console.log('🔍 Initializing analytics and tracking systems...');
    
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
    
    // Setup error and performance tracking
    setupErrorTracking();
    
    // Track initial app load
    trackEvent('app_loaded', {
      environment: process.env.NODE_ENV,
      reactVersion: React.version,
      userAgent: navigator.userAgent
    });

    // Add global click listener
    document.addEventListener('click', handleGlobalClick);

    // Cleanup function
    return () => {
      document.removeEventListener('click', handleGlobalClick);
    };
  }, []);

  return (
    <HelmetProvider>
      <Router>
        {/* Page view tracker component */}
        <PageViewTracker />
        
        {/* Global click handler for automatic link tracking */}
        <div className="App" style={{ minHeight: '100vh' }}>
          {/* ✅ REMOVED: Layout wrapper from here to prevent duplicates */}
          {/* Each page component now handles its own Layout wrapper */}
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
            <Route path="/disclaimer" element={<Disclaimer />} /> {/* NEW: Disclaimer route */}
            
            {/* 404 fallback - Now with proper Layout wrapper */}
            <Route path="*" element={
              <div className="min-h-screen bg-gray-50 flex flex-col">
                {/* Simple header for 404 page */}
                <header className="bg-white shadow-sm border-b">
                  <div className="container mx-auto px-4 py-4">
                    <a href="/" className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
                      Wilson's Blog
                    </a>
                  </div>
                </header>
                
                {/* 404 content */}
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
                
                {/* Simple footer for 404 page */}
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