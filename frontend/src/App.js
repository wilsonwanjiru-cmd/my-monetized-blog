// frontend/src/App.js
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

// Import pages
import HomePage from './pages/HomePage';
import BlogPost from './pages/BlogPost';
import BlogListPage from './pages/BlogListPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import Layout from './components/Layout';

// Import tracking utilities
import { initUTMTracking, AffiliateLink } from './utils/utmTracker';
import { initHeatmapTracking } from './utils/heatmapTracker';
import { initAnalyticsTracking } from './utils/analyticsTracker';

// Generate a unique session ID with localStorage safety check
const generateSessionId = () => {
  // Check if localStorage is available (browser environment)
  if (typeof localStorage !== 'undefined') {
    let sessionId = localStorage.getItem('session_id');
    if (!sessionId) {
      sessionId = 'session_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('session_id', sessionId);
    }
    return sessionId;
  }
  // Fallback for when localStorage isn't available
  return 'session_' + Math.random().toString(36).substr(2, 9);
};

// Track custom events
const trackEvent = (eventType, metadata = {}) => {
  if (process.env.NODE_ENV === 'production') {
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventType,
        url: window.location.pathname,
        timestamp: new Date().toISOString(),
        sessionId: generateSessionId(),
        metadata,
        userAgent: navigator.userAgent,
        screenResolution: window.screen ? `${window.screen.width}x${window.screen.height}` : 'unknown' // ✅ Fixed: using window.screen
      })
    }).catch(error => {
      console.warn('Event tracking failed:', error);
    });
  }
};

// Global click handler for automatic event tracking
const handleGlobalClick = (event) => {
  if (process.env.NODE_ENV !== 'production') return;

  const target = event.target;
  
  // Track affiliate link clicks
  if (target.closest('.affiliate-link') || target.href?.includes('utm_source=affiliate')) {
    trackEvent('affiliate_click', {
      element: 'affiliate_link',
      href: target.href,
      text: target.textContent?.substring(0, 100)
    });
  }
  
  // Track CTA button clicks
  if (target.classList.contains('cta-button') || target.type === 'submit') {
    trackEvent('cta_click', {
      element: target.className,
      text: target.textContent?.substring(0, 100),
      type: target.type
    });
  }
  
  // Track newsletter signups
  if (target.type === 'email' || target.form?.classList.contains('newsletter-form')) {
    trackEvent('newsletter_engagement', {
      element: 'newsletter_form',
      action: 'interaction'
    });
  }
};

function App() {
  // Function to track page views
  const trackPageView = (pathname) => {
    if (process.env.NODE_ENV === 'production') {
      // Send pageview to your analytics backend
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventType: 'pageview',
          url: pathname,
          timestamp: new Date().toISOString(),
          sessionId: generateSessionId(),
        })
      }).catch(error => {
        console.warn('Analytics tracking failed:', error);
      });
    }
  };

  useEffect(() => {
    // Initialize all tracking systems in production only
    if (process.env.NODE_ENV === 'production') {
      console.log('🔍 Initializing analytics and tracking...');
      
      // Initialize UTM tracking for affiliate links and campaign tracking
      initUTMTracking();
      
      // Initialize heatmap tracking for user behavior visualization
      initHeatmapTracking();
      
      // Initialize custom analytics event tracking
      initAnalyticsTracking();
      
      // Track initial page view
      trackPageView(window.location.pathname);
    } else {
      console.log('🚫 Analytics disabled in development mode');
    }
  }, []);

  return (
    <HelmetProvider>
      <Router>
        {/* Global click handler for automatic link tracking */}
        <div 
          className="App" 
          onClick={handleGlobalClick}
          style={{ minHeight: '100vh' }}
        >
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/blog" element={<BlogListPage />} />
              {/* ✅ FIXED: Changed from /blog/:slug to /post/:slug to match your URL structure */}
              <Route path="/post/:slug" element={<BlogPost />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              {/* Add more routes as needed */}
            </Routes>
          </Layout>
        </div>
      </Router>
    </HelmetProvider>
  );
}

// Export for use in other components
export { trackEvent, AffiliateLink };
export default App;