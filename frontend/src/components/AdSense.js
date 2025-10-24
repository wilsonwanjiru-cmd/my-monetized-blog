// frontend/src/components/AdSense.js
import React, { useEffect, useState } from 'react';

const AdSense = ({ 
  slot, 
  format = 'auto', 
  responsive = true, 
  className = '',
  layout = '',
  layoutKey = '',
  adStyle = {}
}) => {
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  // Check if we're in production - FIXED: Proper environment detection
  const isProduction = process.env.NODE_ENV === 'production' || 
                      window.location.hostname === 'wilsonmuita.com' ||
                      window.location.hostname === 'www.wilsonmuita.com';

  useEffect(() => {
    const loadAd = () => {
      try {
        if (window.adsbygoogle) {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          setAdLoaded(true);
          console.log(`✅ AdSense ad loaded for slot: ${slot}`);
        } else {
          console.warn('AdSense script not loaded yet, retrying...');
          
          if (retryCount < maxRetries) {
            setTimeout(() => {
              setRetryCount(prev => prev + 1);
              if (window.adsbygoogle) {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
                setAdLoaded(true);
              }
            }, 1000 * (retryCount + 1));
          } else {
            setAdError(true);
            console.error('❌ Failed to load AdSense after multiple retries');
          }
        }
      } catch (err) {
        console.error('AdSense error:', err);
        setAdError(true);
      }
    };

    // Reset states when slot changes
    setAdLoaded(false);
    setAdError(false);
    setRetryCount(0);

    // Load ad after component mounts
    const timer = setTimeout(loadAd, 100);
    
    return () => clearTimeout(timer);
  }, [slot, format, responsive, retryCount]);

  // Show placeholder only in development mode - FIXED: Use isProduction check
  if (!isProduction && adError) {
    return (
      <div className={`ad-container ad-placeholder ${className}`}>
        <div style={{ 
          background: 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)', 
          border: '2px dashed #ccc',
          borderRadius: '12px',
          padding: '30px 20px',
          textAlign: 'center',
          color: '#555',
          fontSize: '14px',
          fontFamily: 'Arial, sans-serif'
        }}>
          <div style={{ 
            fontSize: '48px', 
            marginBottom: '10px',
            opacity: 0.7
          }}>
            🎯
          </div>
          <p style={{ 
            fontWeight: 'bold', 
            marginBottom: '8px',
            fontSize: '16px',
            color: '#333'
          }}>
            AdSense Advertisement
          </p>
          <p style={{ marginBottom: '4px' }}>
            <strong>Slot:</strong> {slot}
          </p>
          <p style={{ marginBottom: '4px' }}>
            <strong>Format:</strong> {format}
          </p>
          <p style={{ marginBottom: '4px' }}>
            <strong>Responsive:</strong> {responsive ? 'Yes' : 'No'}
          </p>
          <p style={{ 
            marginTop: '12px', 
            fontSize: '12px', 
            color: '#888',
            fontStyle: 'italic'
          }}>
            This ad would be displayed in production
          </p>
        </div>
        <div className="ad-label">Advertisement</div>
      </div>
    );
  }

  // Show loading state in development only
  if (!isProduction && !adLoaded && !adError) {
    return (
      <div className={`ad-container ad-loading ${className}`}>
        <div style={{ 
          background: '#f8f9fa', 
          border: '1px solid #e9ecef',
          borderRadius: '8px',
          padding: '20px',
          textAlign: 'center',
          color: '#6c757d'
        }}>
          <div style={{ 
            width: '20px', 
            height: '20px', 
            border: '2px solid #f3f3f3',
            borderTop: '2px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 10px'
          }}></div>
          <p>Loading Ad...</p>
        </div>
      </div>
    );
  }

  // In production, only show the actual ad or nothing
  return (
    <div className={`ad-container ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ 
          display: 'block',
          textAlign: 'center',
          minHeight: responsive ? '90px' : '250px',
          overflow: 'hidden',
          ...adStyle
        }}
        data-ad-client="ca-pub-4047817727348673"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
        data-ad-layout={layout}
        data-ad-layout-key={layoutKey}
      />
      <div className="ad-label">Advertisement</div>
      
      {/* Enhanced fallback for ad blockers */}
      <noscript>
        <div style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
          border: '1px solid #5a67d8',
          borderRadius: '8px',
          padding: '25px 20px',
          textAlign: 'center',
          margin: '15px 0',
          color: 'white'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>🔒</div>
          <p style={{ 
            fontWeight: 'bold', 
            marginBottom: '8px',
            fontSize: '16px'
          }}>
            Ad Blocker Detected
          </p>
          <p style={{ 
            marginBottom: '12px',
            fontSize: '14px',
            opacity: 0.9
          }}>
            Please consider disabling your ad blocker to support our blog
          </p>
          <p style={{ 
            fontSize: '12px',
            opacity: 0.7,
            fontStyle: 'italic'
          }}>
            Your support helps us create more quality content
          </p>
        </div>
      </noscript>
    </div>
  );
};

// Ad Units Configuration with ALL your actual ad slot IDs
export const AdUnits = {
  // Header ad - Your existing header ad
  HEADER: '1529123561',
  
  // In-article ad - Your new in-article ad slot
  IN_ARTICLE: '8087712926',
  
  // Sidebar ad - Your new sidebar ad slot
  SIDEBAR: '5976732519',
  
  // Footer ad - Your new footer ad slot
  FOOTER: '2835386242',
  
  // Between posts ad - Your new between-posts ad slot
  BETWEEN_POSTS: '6583059564'
};

export default AdSense;