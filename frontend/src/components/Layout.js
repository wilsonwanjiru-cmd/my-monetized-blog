// frontend/src/components/Layout.js
import React from 'react';
import { Helmet } from 'react-helmet-async';
import Navbar from './Navbar';
import './Layout.css';

const Layout = ({ children, title = "Wilson's Blog", description = "Personal blog about technology and passive income" }) => {
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
        <meta property="og:site_name" content="Wilson's Blog" />
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
        <meta name="keywords" content="technology, passive income, blogging, digital marketing, entrepreneurship" />
        
        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "Wilson's Blog",
            "url": "https://wilsonmuita.com",
            "description": "Personal blog about technology, passive income, and digital entrepreneurship",
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
            "name": "Wilson's Blog",
            "url": "https://wilsonmuita.com",
            "logo": "https://wilsonmuita.com/logo512.png",
            "description": "Technology and passive income blog",
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
        <main className="main-content">
          {children}
        </main>
        <footer className="footer">
          <div className="footer-content">
            <div className="footer-section">
              <p>&copy; 2025 Wilson Muita. All rights reserved.</p>
              <div className="footer-links">
                <a href="/privacy-policy" className="footer-link">
                  Privacy Policy
                </a>
                <a href="/contact" className="footer-link">
                  Contact
                </a>
                <a href="/about" className="footer-link">
                  About
                </a>
              </div>
            </div>
            <div className="footer-section">
              <p className="footer-text">
                Building the future of digital entrepreneurship and passive income.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Layout;