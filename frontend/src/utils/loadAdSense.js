// frontend/src/utils/loadAdSense.js
// Simple script to load AdSense globally

export const loadAdSenseScript = () => {
  if (typeof window === 'undefined') return false;
  
  // Prevent multiple loads
  if (window._adSenseScriptLoading || window._adSenseScriptLoaded) {
    return window._adSenseScriptLoaded;
  }
  
  window._adSenseScriptLoading = true;
  
  // Check if script already exists
  const existingScript = document.querySelector('script[src*="pagead2.googlesyndication.com"]');
  if (existingScript) {
    window._adSenseScriptLoaded = true;
    window._adSenseScriptLoading = false;
    return true;
  }
  
  try {
    const script = document.createElement('script');
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4047817727348673';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.setAttribute('data-ad-client', 'ca-pub-4047817727348673');
    
    script.onload = () => {
      window._adSenseScriptLoaded = true;
      window._adSenseScriptLoading = false;
      window.adsbygoogle = window.adsbygoogle || [];
      console.log('✅ AdSense script loaded globally');
    };
    
    script.onerror = () => {
      window._adSenseScriptLoading = false;
      console.error('❌ Failed to load AdSense script globally');
    };
    
    document.head.appendChild(script);
    return true;
  } catch (error) {
    window._adSenseScriptLoading = false;
    console.error('❌ Error loading AdSense script globally:', error);
    return false;
  }
};

// Initialize on page load
if (typeof window !== 'undefined') {
  // Wait a bit to let page load first
  setTimeout(() => {
    loadAdSenseScript();
  }, 1500);
}

export default loadAdSenseScript;