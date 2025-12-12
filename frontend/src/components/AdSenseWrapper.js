// frontend/src/components/AdSenseWrapper.js
import React, { useRef, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

// Ad Unit Configuration
export const AdUnits = {
  HEADER: '1529123561',
  IN_ARTICLE: '8087712926',
  SIDEBAR: '5976732519',
  FOOTER: '2835386242',
  BETWEEN_POSTS: '6583059564',
  IN_CONTENT_1: '9876543210',
  IN_CONTENT_2: '1234567890'
};

const AdSenseWrapper = ({ 
  position, 
  format = 'auto', 
  responsive = true, 
  className = '', 
  fallbackContent = null,
  layout = '',
  layoutKey = '',
  ...props 
}) => {
  const location = useLocation();
  const adInitializedRef = useRef(false);
  const adContainerRef = useRef(null);
  
  // Enhanced excluded paths - only essential compliance pages
  const excludedPaths = useMemo(() => [
    '/privacy', 
    '/privacy-policy', 
    '/disclaimer', 
    '/about', 
    '/contact'
  ], []);
  
  const isExcluded = useMemo(() => 
    excludedPaths.some(path => 
      location.pathname === path || location.pathname.startsWith(`${path}/`)
    ),
    [location.pathname, excludedPaths]
  );

  // Map positions to slots with optimized formats
  const positionToSlot = useMemo(() => ({
    'header': AdUnits.HEADER,
    'sidebar': AdUnits.SIDEBAR,
    'footer': AdUnits.FOOTER,
    'in-article': AdUnits.IN_ARTICLE,
    'between-posts': AdUnits.BETWEEN_POSTS,
    'in-content-1': AdUnits.IN_CONTENT_1,
    'in-content-2': AdUnits.IN_CONTENT_2
  }), []);

  // Auto-detect format based on position
  const getAutoFormat = useMemo(() => (pos) => {
    const formatMap = {
      'header': 'auto',
      'sidebar': 'vertical',
      'footer': 'auto',
      'in-article': 'fluid',
      'between-posts': 'rectangle',
      'in-content-1': 'fluid',
      'in-content-2': 'fluid'
    };
    return formatMap[pos] || 'auto';
  }, []);

  const slot = useMemo(() => positionToSlot[position], [position, positionToSlot]);

  useEffect(() => {
    // Don't initialize if excluded or no slot
    if (isExcluded || !slot) {
      return;
    }

    // Function to initialize AdSense ad
    const initializeAdSense = () => {
      // Don't initialize if already done
      if (adInitializedRef.current || !adContainerRef.current) {
        return;
      }

      // Wait for AdSense script to load
      if (!window.adsbygoogle) {
        console.warn('AdSense script not loaded yet, retrying...');
        setTimeout(initializeAdSense, 500);
        return;
      }

      try {
        // Clear container
        adContainerRef.current.innerHTML = '';
        
        // Create new ad element
        const adElement = document.createElement('ins');
        adElement.className = 'adsbygoogle';
        adElement.style.display = 'block';
        adElement.dataset.adClient = 'ca-pub-4047817727348673';
        adElement.dataset.adSlot = slot;
        
        const finalFormat = format === 'auto' ? getAutoFormat(position) : format;
        if (finalFormat !== 'auto') {
          adElement.dataset.adFormat = finalFormat;
        }
        
        if (layout) {
          adElement.dataset.adLayout = layout;
        }
        
        if (layoutKey) {
          adElement.dataset.adLayoutKey = layoutKey;
        }
        
        adElement.dataset.fullWidthResponsive = responsive ? 'true' : 'false';
        
        // Append to container
        adContainerRef.current.appendChild(adElement);
        
        // Check if this slot is already initialized globally
        const slotKey = `adsense_initialized_${slot}`;
        if (window[slotKey]) {
          console.log(`AdSense slot ${slot} already initialized, skipping`);
          return;
        }
        
        // Initialize the ad
        if (window.adsbygoogle) {
          try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
            window[slotKey] = true;
            adInitializedRef.current = true;
            console.log(`✅ AdSense slot ${slot} initialized for position: ${position}`);
          } catch (pushError) {
            console.warn(`⚠️ AdSense push error for slot ${slot}:`, pushError.message);
          }
        }
      } catch (error) {
        console.error('❌ AdSense initialization error:', error);
      }
    };

    // Delay initialization to ensure DOM is ready
    const timer = setTimeout(initializeAdSense, 1000);
    
    // Also initialize when the page is fully loaded
    if (document.readyState === 'complete') {
      initializeAdSense();
    } else {
      window.addEventListener('load', initializeAdSense);
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener('load', initializeAdSense);
      
      // Clean up global tracking when component unmounts
      if (slot && window[`adsense_initialized_${slot}`]) {
        delete window[`adsense_initialized_${slot}`];
      }
      adInitializedRef.current = false;
    };
  }, [slot, format, position, responsive, layout, layoutKey, isExcluded, getAutoFormat]);

  // If excluded or no slot, return null
  if (isExcluded || !slot) {
    console.warn(`No AdSense slot defined for position: ${position} or path is excluded`);
    return fallbackContent || null;
  }

  // Enhanced props for better ad performance
  const containerProps = {
    className: `ad-wrapper ad-wrapper-${position} ${className}`,
    'data-ad-position': position,
    'data-ad-slot': slot,
    'data-ad-format': format === 'auto' ? getAutoFormat(position) : format,
    'data-ad-responsive': responsive,
    ref: adContainerRef,
    ...props
  };

  return (
    <div {...containerProps}>
      {/* Fallback content shown while ad loads */}
      {fallbackContent || (
        <div style={{ 
          minHeight: '90px', 
          background: '#f5f5f5', 
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#666',
          fontSize: '14px'
        }}>
          <div>Loading advertisement...</div>
        </div>
      )}
    </div>
  );
};

// Helper to get ad unit description
export const getAdUnitDescription = (slot) => {
  const descriptions = {
    [AdUnits.HEADER]: 'Top banner ad across all pages',
    [AdUnits.IN_ARTICLE]: 'In-content ad within blog posts',
    [AdUnits.SIDEBAR]: 'Sidebar vertical ad',
    [AdUnits.FOOTER]: 'Bottom banner ad',
    [AdUnits.BETWEEN_POSTS]: 'Between blog posts in listings',
    [AdUnits.IN_CONTENT_1]: 'First in-content ad placement',
    [AdUnits.IN_CONTENT_2]: 'Second in-content ad placement'
  };
  return descriptions[slot] || 'Advertisement';
};

export default AdSenseWrapper;