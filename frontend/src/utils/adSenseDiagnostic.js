// frontend/src/utils/adSenseDiagnostic.js
export const diagnoseAdSenseIssues = () => {
  const diagnostics = {
    errors: [],
    warnings: [],
    info: [],
    suggestions: []
  };

  // Check if window is available
  if (typeof window === 'undefined') {
    diagnostics.errors.push('Window object not available (SSR/Node.js environment)');
    return diagnostics;
  }

  // 1. Check if AdSense script is loaded
  const adSenseScript = document.querySelector('script[src*="pagead2.googlesyndication.com"]');
  if (!adSenseScript) {
    diagnostics.errors.push('AdSense script not found in DOM');
  } else {
    diagnostics.info.push(`AdSense script found: ${adSenseScript.src}`);
  }

  // 2. Check if adsbygoogle is defined
  if (!window.adsbygoogle) {
    diagnostics.errors.push('window.adsbygoogle is not defined');
  } else {
    diagnostics.info.push('window.adsbygoogle is available');
  }

  // 3. Check for ad blockers
  const testAd = document.createElement('div');
  testAd.className = 'adsbygoogle';
  testAd.style.cssText = 'height: 1px; width: 1px; position: absolute; left: -1000px; top: -1000px;';
  document.body.appendChild(testAd);
  
  setTimeout(() => {
    const adBlockDetected = testAd.offsetHeight === 0 || 
                           testAd.offsetWidth === 0 || 
                           window.getComputedStyle(testAd).display === 'none';
    
    if (adBlockDetected) {
      diagnostics.warnings.push('Ad blocker detected');
    }
    
    if (testAd.parentNode) {
      document.body.removeChild(testAd);
    }
  }, 100);

  // 4. Check network errors for AdSense
  const networkErrors = performance.getEntriesByType('resource')
    .filter(entry => entry.name.includes('googleads.g.doubleclick.net') || 
                     entry.name.includes('pagead2.googlesyndication.com'))
    .filter(entry => entry.initiatorType === 'script' || entry.initiatorType === 'img')
    .filter(entry => entry.responseStatus && entry.responseStatus >= 400);

  if (networkErrors.length > 0) {
    networkErrors.forEach(error => {
      diagnostics.errors.push(`AdSense network error: ${error.name} - Status: ${error.responseStatus}`);
    });
  }

  // 5. Check current domain
  const currentDomain = window.location.hostname;
  const isLocalhost = currentDomain === 'localhost' || currentDomain === '127.0.0.1';
  
  if (isLocalhost) {
    diagnostics.info.push('Running on localhost - AdSense will not show real ads');
  } else {
    diagnostics.info.push(`Running on domain: ${currentDomain}`);
  }

  // 6. Check for console errors
  const originalError = console.error;
  const adErrors = [];
  
  console.error = function(...args) {
    const errorMsg = args.join(' ');
    if (errorMsg.includes('adsbygoogle') || 
        errorMsg.includes('AdSense') || 
        errorMsg.includes('googleads')) {
      adErrors.push(errorMsg);
    }
    originalError.apply(console, args);
  };

  // 7. Provide suggestions based on findings
  if (diagnostics.errors.length > 0) {
    diagnostics.suggestions.push(
      'Fix the errors above first',
      'Ensure your AdSense account is properly configured',
      'Check if your domain is verified in AdSense',
      'Verify ad slots are correctly set up'
    );
  }

  if (diagnostics.warnings.length > 0) {
    diagnostics.suggestions.push(
      'Consider adding ad blocker detection',
      'Provide fallback content for users with ad blockers'
    );
  }

  return diagnostics;
};

// Run diagnostics on page load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(() => {
      const diagnostics = diagnoseAdSenseIssues();
      console.group('🔍 AdSense Diagnostics');
      console.log('Diagnostics:', diagnostics);
      
      if (diagnostics.errors.length > 0) {
        console.error('❌ Errors:', diagnostics.errors);
      }
      
      if (diagnostics.warnings.length > 0) {
        console.warn('⚠️ Warnings:', diagnostics.warnings);
      }
      
      if (diagnostics.info.length > 0) {
        console.info('ℹ️ Info:', diagnostics.info);
      }
      
      if (diagnostics.suggestions.length > 0) {
        console.log('💡 Suggestions:', diagnostics.suggestions);
      }
      console.groupEnd();
    }, 3000);
  });
}

export default diagnoseAdSenseIssues;