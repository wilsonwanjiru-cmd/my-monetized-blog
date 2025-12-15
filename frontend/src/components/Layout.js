// frontend/src/components/Layout.js
import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import AdSenseFixed, { AdUnits } from './AdSenseFixed';
import ConsentManager from './ConsentManager';
import './Layout.css';

const Layout = ({ 
  children, 
  title = "Wilson Muita - Technology & Programming Blog", 
  description = "Expert insights on web development, programming tutorials, and technology trends. Learn React, Node.js, JavaScript and more.",
  noSidebar = false,
  canonicalUrl = null,
  ogImage = "https://wilsonmuita.com/default-og-image.jpg",
  twitterImage = "https://wilsonmuita.com/default-og-image.jpg",
  articleMeta = null,
  noAds = false
}) => {
  const location = useLocation();
  const [hasConsent, setHasConsent] = useState(false);
  
  // Check consent on mount and when storage changes
  useEffect(() => {
    const checkConsent = () => {
      try {
        // Use config helper if available, otherwise fallback to localStorage
        if (window.hasAdConsent) {
          setHasConsent(window.hasAdConsent());
        } else {
          const consent = localStorage.getItem('adsense_consent') === 'granted';
          setHasConsent(consent);
        }
      } catch (error) {
        console.warn('Error checking consent:', error);
        setHasConsent(false);
      }
    };
    
    // Initial check
    checkConsent();
    
    // Listen for consent changes
    const handleConsentChange = () => {
      checkConsent();
    };
    
    window.addEventListener('consentChanged', handleConsentChange);
    window.addEventListener('storage', handleConsentChange);
    
    return () => {
      window.removeEventListener('consentChanged', handleConsentChange);
      window.removeEventListener('storage', handleConsentChange);
    };
  }, []);
  
  // Define routes where we don't want to show ads (AdSense policy compliance)
  const noAdRoutes = useMemo(() => [
    '/privacy-policy', 
    '/disclaimer', 
    '/contact', 
    '/about',
    '/terms',
    '/login',
    '/register'
  ], []);
  
  // Determine if ads should be shown
  const shouldShowAds = useMemo(() => {
    // If noAds prop is explicitly set to true
    if (noAds) return false;
    
    // Check if route is excluded
    const isExcludedRoute = noAdRoutes.some(route => 
      location.pathname === route || location.pathname.startsWith(`${route}/`)
    );
    
    // Check if AdSense is enabled in config
    const isAdSenseEnabled = window.isAdSenseEnabled ? window.isAdSenseEnabled() : true;
    
    return !isExcludedRoute && isAdSenseEnabled && hasConsent;
  }, [location.pathname, noAdRoutes, hasConsent, noAds]);
  
  // Check if current page is blog post for better ad placement
  const isBlogPost = useMemo(() => {
    return location.pathname.startsWith('/blog/') && location.pathname !== '/blog';
  }, [location.pathname]);
  
  // Check if current page is homepage
  const isHomepage = useMemo(() => {
    return location.pathname === '/';
  }, [location.pathname]);
  
  // Determine canonical URL
  const resolvedCanonicalUrl = useMemo(() => {
    if (canonicalUrl) return canonicalUrl;
    return `https://wilsonmuita.com${location.pathname}`;
  }, [canonicalUrl, location.pathname]);
  
  // Get environment for debugging
  const environment = useMemo(() => {
    return window.getConfig ? window.getConfig('ENVIRONMENT', 'production') : 'production';
  }, []);
  
  // Check if debug mode is enabled
  const isDebugMode = useMemo(() => {
    return environment === 'development' || window.location.search.includes('debug=true');
  }, [environment]);
  
  // Log debug info in development
  useEffect(() => {
    if (isDebugMode) {
      console.log('📊 Layout Debug Info:', {
        pathname: location.pathname,
        shouldShowAds,
        hasConsent,
        isBlogPost,
        isHomepage,
        environment
      });
    }
  }, [location.pathname, shouldShowAds, hasConsent, isBlogPost, isHomepage, environment, isDebugMode]);
  
  // Generate structured data based on page type
  const generateStructuredData = () => {
    const baseData = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "Wilson Muita - Technology & Programming Blog",
      "url": "https://wilsonmuita.com",
      "description": "Expert insights on web development, programming tutorials, and technology trends. Learn React, Node.js, JavaScript and more.",
      "publisher": {
        "@type": "Person",
        "name": "Wilson Muita",
        "url": "https://wilsonmuita.com/about"
      },
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://wilsonmuita.com/search?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    };
    
    if (articleMeta && isBlogPost) {
      return {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": articleMeta.title || title,
        "description": articleMeta.description || description,
        "image": articleMeta.image || ogImage,
        "datePublished": articleMeta.datePublished || new Date().toISOString(),
        "dateModified": articleMeta.dateModified || new Date().toISOString(),
        "author": {
          "@type": "Person",
          "name": "Wilson Muita",
          "url": "https://wilsonmuita.com/about"
        },
        "publisher": {
          "@type": "Organization",
          "name": "Wilson Muita",
          "logo": {
            "@type": "ImageObject",
            "url": "https://wilsonmuita.com/logo512.png"
          }
        },
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": resolvedCanonicalUrl
        }
      };
    }
    
    return baseData;
  };

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        
        {/* Preload critical resources */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link rel="dns-prefetch" href="https://api.wilsonmuita.com" />
        
        {/* Preload critical assets */}
        <link rel="preload" href="/config.js" as="script" />
        <link rel="preload" href="/favicon.ico" as="image" />
        
        {/* Canonical URL */}
        <link rel="canonical" href={resolvedCanonicalUrl} />
        
        {/* Open Graph Meta Tags */}
        <meta property="og:type" content={isBlogPost ? "article" : "website"} />
        <meta property="og:site_name" content="Wilson Muita - Technology & Programming Blog" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={resolvedCanonicalUrl} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={title} />
        <meta property="og:locale" content="en_US" />
        
        {isBlogPost && articleMeta && (
          <>
            <meta property="article:published_time" content={articleMeta.datePublished || new Date().toISOString()} />
            <meta property="article:modified_time" content={articleMeta.dateModified || new Date().toISOString()} />
            <meta property="article:author" content="Wilson Muita" />
            {articleMeta.tags && articleMeta.tags.map(tag => (
              <meta property="article:tag" content={tag} key={tag} />
            ))}
          </>
        )}
        
        {/* Twitter Card Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@WilsonMuita" />
        <meta name="twitter:creator" content="@WilsonMuita" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={twitterImage} />
        <meta name="twitter:image:alt" content={title} />
        
        {/* Additional SEO Meta Tags */}
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <meta name="author" content="Wilson Muita" />
        <meta name="keywords" content="technology, programming, web development, react, node.js, javascript, tutorials, software engineering, coding" />
        
        {/* GDPR Compliance Meta Tags */}
        <meta name="gdpr-notice" content="This site uses cookies for analytics and personalized ads. Manage your preferences in our consent manager." />
        <meta name="consent-management" content="google-cmp" />
        
        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(generateStructuredData())}
        </script>

        {/* Additional Organization Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Wilson Muita",
            "url": "https://wilsonmuita.com",
            "logo": "https://wilsonmuita.com/logo512.png",
            "description": "Technology, Programming, and Web Development Insights",
            "sameAs": [
              "https://twitter.com/WilsonMuita",
              "https://linkedin.com/in/wilsonmuita",
              "https://github.com/wilsonmuita"
            ]
          })}
        </script>
        
        {/* Performance Optimizations */}
        <link rel="preconnect" href="https://www.google-analytics.com" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        
        {/* Preconnect for AdSense and CMP */}
        <link rel="preconnect" href="https://pagead2.googlesyndication.com" />
        <link rel="preconnect" href="https://googleads.g.doubleclick.net" />
        <link rel="preconnect" href="https://fundingchoicesmessages.google.com" />
        <link rel="preconnect" href="https://tpc.googlesyndication.com" />
        
        {/* Theme Color for Mobile */}
        <meta name="theme-color" content="#667eea" />
        
        {/* Favicon Links */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/logo192.png" />
        <link rel="manifest" href="/manifest.json" />
        
        {/* Additional meta for PWA */}
        <meta name="application-name" content="Wilson Muita Blog" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Wilson Muita Blog" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#667eea" />
        <meta name="msapplication-tap-highlight" content="no" />
      </Helmet>
      
      <div className="layout" data-environment={environment}>
        <Navbar />
        
        {/* Header Ad with consent-aware rendering */}
        {shouldShowAds && !isBlogPost && isHomepage && (
          <div className="header-ad-container" data-ad-type="header">
            <AdSenseFixed 
              slot={AdUnits.HEADER}
              format="auto"
              responsive={true}
              className="header-ad"
              fullWidthResponsive={true}
              lazyLoad={true}
              debug={isDebugMode}
              adStyle={{ 
                margin: '10px auto',
                maxWidth: '728px'
              }}
            />
          </div>
        )}
        
        {/* MAIN CONTENT WITH SIDEBAR LAYOUT */}
        <div className={`layout-container ${noSidebar ? 'no-sidebar' : ''}`}>
          <main className="main-content">
            {/* In-article ad for blog posts (top) */}
            {shouldShowAds && isBlogPost && (
              <div className="in-article-ad-top" data-ad-type="in-article-top">
                <AdSenseFixed 
                  slot={AdUnits.IN_ARTICLE}
                  format="auto"
                  responsive={true}
                  className="in-article-ad"
                  fullWidthResponsive={true}
                  lazyLoad={true}
                  debug={isDebugMode}
                  adStyle={{ 
                    margin: '20px auto',
                    maxWidth: '728px'
                  }}
                />
              </div>
            )}
            
            {children}
            
            {/* In-article ad for blog posts (bottom) */}
            {shouldShowAds && isBlogPost && (
              <div className="in-article-ad-bottom" data-ad-type="in-article-bottom">
                <AdSenseFixed 
                  slot={AdUnits.BETWEEN_POSTS}
                  format="auto"
                  responsive={true}
                  className="in-article-ad"
                  fullWidthResponsive={true}
                  lazyLoad={true}
                  debug={isDebugMode}
                  adStyle={{ 
                    margin: '20px auto',
                    maxWidth: '728px'
                  }}
                />
              </div>
            )}
          </main>
          
          {/* SIDEBAR WITH ADSENSE ADS - Conditionally rendered */}
          {shouldShowAds && !noSidebar && (
            <aside className="sidebar">
              <div className="sidebar-sticky">
                {/* Primary Sidebar Ad */}
                <div className="sidebar-ad-wrapper" data-ad-type="sidebar-primary">
                  <AdSenseFixed 
                    slot={AdUnits.SIDEBAR}
                    format="auto"
                    responsive={true}
                    className="sidebar-ad"
                    lazyLoad={true}
                    debug={isDebugMode}
                    adStyle={{ 
                      width: '300px',
                      height: '600px',
                      margin: '0 auto'
                    }}
                  />
                </div>
                
                {/* About Me Widget */}
                <div className="sidebar-widget">
                  <h3>👨‍💻 About Me</h3>
                  <p>Welcome to my technology blog! I'm Wilson Muita, a passionate web developer sharing insights on programming, modern web technologies, and software development best practices.</p>
                  <a href="/about" className="sidebar-link">
                    Learn More →
                  </a>
                </div>
                
                {/* Popular Topics Widget */}
                <div className="sidebar-widget">
                  <h3>🚀 Popular Topics</h3>
                  <div className="sidebar-tags">
                    <span className="sidebar-tag">React</span>
                    <span className="sidebar-tag">Node.js</span>
                    <span className="sidebar-tag">JavaScript</span>
                    <span className="sidebar-tag">Web Development</span>
                    <span className="sidebar-tag">Programming</span>
                    <span className="sidebar-tag">Technology</span>
                    <span className="sidebar-tag">TypeScript</span>
                    <span className="sidebar-tag">Next.js</span>
                    <span className="sidebar-tag">Python</span>
                  </div>
                </div>
                
                {/* Secondary Sidebar Ad */}
                <div className="sidebar-widget" data-ad-type="sidebar-secondary">
                  <AdSenseFixed 
                    slot={AdUnits.SIDEBAR}
                    format="auto"
                    responsive={true}
                    className="sidebar-ad-secondary"
                    lazyLoad={true}
                    debug={isDebugMode}
                    adStyle={{ 
                      width: '300px',
                      height: '250px',
                      margin: '0 auto'
                    }}
                  />
                </div>
                
                {/* Privacy & Consent Widget */}
                <div className="sidebar-widget privacy-widget">
                  <h3>🔒 Privacy First</h3>
                  <p>We respect your privacy and comply with GDPR. You can manage your cookie preferences at any time.</p>
                  <button 
                    className="sidebar-link manage-consent-btn"
                    onClick={() => {
                      // Trigger consent manager
                      const event = new Event('showConsentManager');
                      window.dispatchEvent(event);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    Manage Privacy Settings →
                  </button>
                </div>
              </div>
            </aside>
          )}
        </div>
        
        {/* Consent Manager Component */}
        <ConsentManager />
        
        {/* FOOTER WITH ADSENSE AD - Conditionally rendered */}
        <footer className="footer">
          {/* Footer Ad - Conditionally shown */}
          {shouldShowAds && (
            <div className="footer-ad-wrapper" data-ad-type="footer">
              <AdSenseFixed 
                slot={AdUnits.FOOTER}
                format="auto"
                responsive={true}
                className="footer-ad"
                fullWidthResponsive={true}
                lazyLoad={true}
                debug={isDebugMode}
              />
            </div>
          )}
          
          <div className="footer-content">
            <div className="footer-section">
              <div className="footer-links">
                <a href="/privacy-policy" className="footer-link">
                  Privacy Policy
                </a>
                <a href="/disclaimer" className="footer-link">
                  Disclaimer
                </a>
                <a href="/contact" className="footer-link">
                  Contact
                </a>
                <a href="/about" className="footer-link">
                  About
                </a>
                <a href="/blog" className="footer-link">
                  Blog
                </a>
                <button 
                  className="footer-link manage-consent-footer"
                  onClick={() => {
                    const event = new Event('showConsentManager');
                    window.dispatchEvent(event);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'inherit',
                    textDecoration: 'underline',
                    fontFamily: 'inherit',
                    fontSize: 'inherit',
                    padding: 0
                  }}
                >
                  Cookie Preferences
                </button>
              </div>
            </div>
            <div className="footer-section">
              <p className="footer-text">
                &copy; 2025 Wilson Muita. All rights reserved.
              </p>
              <p className="footer-text-small">
                This site is GDPR compliant and uses Google CMP for consent management.
              </p>
              {isDebugMode && (
                <p className="footer-debug-info">
                  Environment: {environment} | Ads: {shouldShowAds ? 'Enabled' : 'Disabled'} | Consent: {hasConsent ? 'Granted' : 'Not Granted'}
                </p>
              )}
            </div>
            <div className="footer-section">
              <div className="footer-social">
                <a href="https://twitter.com/WilsonMuita" className="footer-social-link" target="_blank" rel="noopener noreferrer">
                  Twitter
                </a>
                <a href="https://linkedin.com/in/wilsonmuita" className="footer-social-link" target="_blank" rel="noopener noreferrer">
                  LinkedIn
                </a>
                <a href="https://github.com/wilsonmuita" className="footer-social-link" target="_blank" rel="noopener noreferrer">
                  GitHub
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

// Default prop values for article meta
Layout.defaultProps = {
  articleMeta: null,
  canonicalUrl: null,
  ogImage: "https://wilsonmuita.com/default-og-image.jpg",
  twitterImage: "https://wilsonmuita.com/default-og-image.jpg",
  noAds: false
};

export default Layout;