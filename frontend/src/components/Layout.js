// frontend/src/components/Layout.js
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import AdSense, { AdUnits } from './AdSense';
import ConsentManager from './ConsentManager'; // NEW: Import ConsentManager
import './Layout.css';

const Layout = ({ 
  children, 
  title = "Wilson Muita - Technology & Programming Blog", 
  description = "Expert insights on web development, programming tutorials, and technology trends. Learn React, Node.js, JavaScript and more.",
  noSidebar = false // NEW: Optional prop to hide sidebar
}) => {
  const location = useLocation();
  
  // Define routes where we don't want to show ads (AdSense policy compliance)
  const noAdRoutes = ['/privacy-policy', '/disclaimer'];
  const shouldShowAds = !noAdRoutes.includes(location.pathname);

  // NEW: Check if current page is blog post for better ad placement
  const isBlogPost = location.pathname.startsWith('/blog/') && location.pathname !== '/blog';

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        
        {/* Preload critical resources */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link rel="dns-prefetch" href="https://api.wilsonmuita.com" />
        
        {/* Preload critical assets */}
        <link rel="preload" href="/config.js" as="script" />
        <link rel="preload" href="/favicon.ico" as="image" />
        
        {/* Canonical URL */}
        <link rel="canonical" href="https://wilsonmuita.com" />
        
        {/* Open Graph Meta Tags */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Wilson Muita - Technology & Programming Blog" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content="https://wilsonmuita.com" />
        <meta property="og:image" content="https://wilsonmuita.com/default-og-image.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:locale" content="en_US" />
        
        {/* Twitter Card Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@WilsonMuita" />
        <meta name="twitter:creator" content="@WilsonMuita" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content="https://wilsonmuita.com/default-og-image.jpg" />
        
        {/* Additional SEO Meta Tags */}
        <meta name="robots" content="index, follow, max-image-preview:large" />
        <meta name="author" content="Wilson Muita" />
        <meta name="keywords" content="technology, programming, web development, react, node.js, javascript, tutorials, software engineering, coding" />
        
        {/* NEW: GDPR Compliance Meta Tags */}
        <meta name="gdpr-notice" content="This site uses cookies for analytics and personalized ads. Manage your preferences in our consent manager." />
        <meta name="consent-management" content="google-cmp" />
        
        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
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
          })}
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
              "https://linkedin.com/in/wilsonmuita"
            ]
          })}
        </script>
        
        {/* Performance Optimizations */}
        <link rel="preconnect" href="https://www.google-analytics.com" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        
        {/* NEW: Preconnect for AdSense and CMP */}
        <link rel="preconnect" href="https://pagead2.googlesyndication.com" />
        <link rel="preconnect" href="https://googleads.g.doubleclick.net" />
        <link rel="preconnect" href="https://fundingchoicesmessages.google.com" />
        
        {/* Theme Color for Mobile */}
        <meta name="theme-color" content="#667eea" />
        
        {/* Favicon Links */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/logo192.png" />
        <link rel="manifest" href="/manifest.json" />
      </Helmet>
      
      <div className="layout">
        <Navbar />
        
        {/* NEW: Header Ad with consent-aware rendering */}
        {shouldShowAds && !isBlogPost && (
          <div className="header-ad-container">
            <AdSense 
              slot={AdUnits.HEADER}
              format="auto"
              responsive={true}
              className="header-ad"
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
            {children}
          </main>
          
          {/* SIDEBAR WITH ADSENSE ADS - Conditionally rendered */}
          {shouldShowAds && !noSidebar && (
            <aside className="sidebar">
              <div className="sidebar-sticky">
                {/* Primary Sidebar Ad - Using your actual sidebar ad slot */}
                <AdSense 
                  slot={AdUnits.SIDEBAR}
                  format="auto"
                  responsive={true}
                  className="sidebar-ad"
                  adStyle={{ 
                    width: '300px',
                    height: '600px',
                    margin: '0 auto'
                  }}
                />
                
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
                  </div>
                </div>
                
                {/* Secondary Sidebar Ad */}
                <div className="sidebar-widget">
                  <AdSense 
                    slot={AdUnits.SIDEBAR}
                    format="auto"
                    responsive={true}
                    className="sidebar-ad-secondary"
                    adStyle={{ 
                      width: '300px',
                      height: '250px',
                      margin: '0 auto'
                    }}
                  />
                </div>
                
                {/* NEW: Privacy & Consent Widget */}
                <div className="sidebar-widget privacy-widget">
                  <h3>🔒 Privacy First</h3>
                  <p>We respect your privacy and comply with GDPR. You can manage your cookie preferences at any time.</p>
                  <button 
                    className="sidebar-link manage-consent-btn"
                    onClick={() => {
                      // Trigger consent manager to show
                      localStorage.removeItem('adsense_consent');
                      window.dispatchEvent(new Event('consentChanged'));
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
        
        {/* NEW: Consent Manager Component */}
        <ConsentManager />
        
        {/* FOOTER WITH ADSENSE AD - Conditionally rendered */}
        <footer className="footer">
          {/* Footer Ad - Conditionally shown */}
          {shouldShowAds && (
            <AdSense 
              slot={AdUnits.FOOTER}
              format="auto"
              responsive={true}
              className="footer-ad"
            />
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
                {/* NEW: Consent Management Link */}
                <button 
                  className="footer-link manage-consent-footer"
                  onClick={() => {
                    localStorage.removeItem('adsense_consent');
                    window.dispatchEvent(new Event('consentChanged'));
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'inherit',
                    textDecoration: 'underline'
                  }}
                >
                  
                </button>
              </div>
            </div>
            <div className="footer-section">
              <p className="footer-text">
                &copy; 2025 Wilson Muita. All rights reserved.
              </p>
              <p className="footer-text-small">
                {/* NEW: GDPR compliance notice */}
                This site is GDPR compliant and uses Google CMP for consent management.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Layout;