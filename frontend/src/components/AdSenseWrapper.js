// frontend/src/components/AdSenseWrapper.js
import React from 'react';
import { useLocation } from 'react-router-dom';
import AdSense, { AdUnits } from './AdSense';

const AdSenseWrapper = ({ position, ...props }) => {
  const location = useLocation();
  
  // Don't show ads on certain pages
  const excludedPaths = ['/privacy', '/disclaimer'];
  if (excludedPaths.includes(location.pathname)) {
    return null;
  }

  // Map positions to slots
  const positionToSlot = {
    'header': AdUnits.HEADER,
    'sidebar': AdUnits.SIDEBAR,
    'footer': AdUnits.FOOTER,
    'in-article': AdUnits.IN_ARTICLE,
    'between-posts': AdUnits.BETWEEN_POSTS
  };

  const slot = positionToSlot[position];
  
  if (!slot) {
    console.warn(`No AdSense slot defined for position: ${position}`);
    return null;
  }

  return (
    <AdSense 
      slot={slot}
      currentPath={location.pathname}
      {...props}
    />
  );
};

export default AdSenseWrapper;