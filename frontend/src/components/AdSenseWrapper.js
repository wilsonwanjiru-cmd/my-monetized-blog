// frontend/src/components/AdSenseWrapper.js - FIXED VERSION
import React from 'react';
import { useLocation } from 'react-router-dom';
import AdSense, { AdUnits } from './AdSense';

const AdSenseWrapper = ({ position, format = 'auto', responsive = true, className = '', fallbackContent = null, ...props }) => {
  const location = useLocation();
  
  // Enhanced excluded paths - only essential compliance pages
  const excludedPaths = ['/privacy', '/privacy-policy', '/disclaimer', '/about', '/contact'];
  if (excludedPaths.includes(location.pathname)) {
    return null;
  }

  // Map positions to slots with optimized formats
  const positionToSlot = {
    'header': AdUnits.HEADER,
    'sidebar': AdUnits.SIDEBAR,
    'footer': AdUnits.FOOTER,
    'in-article': AdUnits.IN_ARTICLE,
    'between-posts': AdUnits.BETWEEN_POSTS
  };

  // Auto-detect format based on position
  const getAutoFormat = (pos) => {
    const formatMap = {
      'header': 'auto',
      'sidebar': 'vertical',
      'footer': 'auto',
      'in-article': 'fluid',
      'between-posts': 'rectangle'
    };
    return formatMap[pos] || 'auto';
  };

  const slot = positionToSlot[position];
  
  if (!slot) {
    console.warn(`No AdSense slot defined for position: ${position}`);
    return fallbackContent || null;
  }

  // Enhanced props for better ad performance
  const adProps = {
    slot,
    format: format === 'auto' ? getAutoFormat(position) : format,
    responsive,
    className: `ad-${position} ${className}`,
    currentPath: location.pathname,
    fallbackContent,
    ...props
  };

  return (
    <div className={`ad-wrapper ad-wrapper-${position}`} data-ad-position={position}>
      <AdSense {...adProps} />
    </div>
  );
};

// ✅ FIXED: Removed duplicate AdUnits export - using imported one instead

// Helper to get ad unit description
export const getAdUnitDescription = (slot) => {
  const descriptions = {
    [AdUnits.HEADER]: 'Top banner ad across all pages',
    [AdUnits.IN_ARTICLE]: 'In-content ad within blog posts',
    [AdUnits.SIDEBAR]: 'Sidebar vertical ad',
    [AdUnits.FOOTER]: 'Bottom banner ad',
    [AdUnits.BETWEEN_POSTS]: 'Between blog posts in listings'
  };
  return descriptions[slot] || 'Advertisement';
};

export default AdSenseWrapper;