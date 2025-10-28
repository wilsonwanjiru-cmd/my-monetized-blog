// frontend/src/components/Layout.js
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom'; // NEW: Import useLocation for route detection
import Navbar from './Navbar';
import AdSense, { AdUnits } from './AdSense'; // UPDATED IMPORT - now importing AdUnits
import './Layout.css';

const Layout = ({ children, title = "Wilson Muita - Technology & Programming Blog", description = "Expert insights on web development, programming tutorials, and technology trends. Learn React, Node.js, JavaScript and more." }) => {
  const location = useLocation(); // NEW: Get current route
  
  // NEW: Define routes where we don't want to show ads (AdSense policy compliance)
  const noAdRoutes = ['/privacy-policy', '/disclaimer'];
  const shouldShowAds = !noAdRoutes.includes(location.pathname);

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
        
        {/* Theme Color for Mobile */}
        <meta name="theme-color" content="#667eea" />
        
        {/* Favicon Links */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/logo192.png" />
        <link rel="manifest" href="/manifest.json" />
      </Helmet>
      
      <div className="layout">
        <Navbar />
        
        {/* MAIN CONTENT WITH SIDEBAR LAYOUT */}
        <div className="layout-container">
          <main className="main-content">
            {children}
          </main>
          
          {/* SIDEBAR WITH ADSENSE ADS - Conditionally rendered */}
          {shouldShowAds && (
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
                
                {/* Newsletter Widget */}
                <div className="sidebar-widget">
                  <h3>📧 Newsletter</h3>
                  <p>Get the latest programming tutorials and tech insights delivered to your inbox. No spam, unsubscribe anytime.</p>
                  <a href="/contact" className="sidebar-link">
                    Subscribe Now →
                  </a>
                </div>
              </div>
            </aside>
          )}
        </div>
        
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
                {/* UPDATED: Added Disclaimer link */}
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
              </div>
            </div>
            <div className="footer-section">
              <p className="footer-text">
                &copy; 2025 Wilson Muita. All rights reserved.
              </p>
              
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Layout;