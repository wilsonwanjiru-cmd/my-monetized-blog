// frontend/src/utils/adSenseHotfix.js
// Emergency fix for AdSense 400 errors and duplicate initialization

if (typeof window !== 'undefined') {
  // Enhanced global AdSense management
  window._adSenseHotfix = {
    initialized: false,
    slots: new Set(),
    queue: [],
    
    init: function() {
      if (this.initialized) return;
      
      console.log('🔧 AdSense Hotfix: Initializing global management');
      this.initialized = true;
      
      // Override the global push method to prevent duplicates
      const originalPush = window.adsbygoogle && window.adsbygoogle.push;
      if (window.adsbygoogle && typeof originalPush === 'function') {
        window.adsbygoogle.push = function(...args) {
          try {
            // Check if this is an ad config object
            if (args[0] && typeof args[0] === 'object' && !Array.isArray(args[0])) {
              const adConfig = args[0];
              if (adConfig && window._adSenseHotfix.slots.has(adConfig.slot)) {
                console.log(`🔄 AdSense Hotfix: Skipping duplicate slot ${adConfig.slot}`);
                return;
              }
              
              if (adConfig && adConfig.slot) {
                window._adSenseHotfix.slots.add(adConfig.slot);
                console.log(`✅ AdSense Hotfix: Tracking slot ${adConfig.slot}`);
              }
            }
            
            // Call original push method
            return originalPush.apply(this, args);
          } catch (error) {
            console.warn('AdSense Hotfix: Push error', error);
          }
        };
      }
    },
    
    trackSlot: function(slot) {
      if (!slot) return false;
      if (this.slots.has(slot)) {
        console.log(`🔄 AdSense Hotfix: Slot ${slot} already tracked`);
        return false;
      }
      this.slots.add(slot);
      return true;
    },
    
    clearSlots: function() {
      this.slots.clear();
      console.log('🔄 AdSense Hotfix: Cleared all slot tracking');
    }
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window._adSenseHotfix.init();
    });
  } else {
    window._adSenseHotfix.init();
  }
}

export const adSenseHotfix = window._adSenseHotfix;