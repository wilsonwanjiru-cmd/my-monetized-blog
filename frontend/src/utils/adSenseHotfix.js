// frontend/src/utils/adSenseHotfix.js
// Enhanced AdSense Hotfix with better duplicate prevention

class AdSenseHotfix {
  constructor() {
    this.slots = new Set();
    this.scriptLoaded = false;
    this.scriptLoading = false;
    this.pushQueue = [];
    this.initialized = false;
    this.init();
  }

  init() {
    if (this.initialized) return;
    
    console.log('🔧 AdSense Hotfix: Initializing global management');
    this.initialized = true;
    
    // Initialize global ad queue
    window.adsbygoogle = window.adsbygoogle || [];
    
    // Override push method to intercept ad requests
    const originalPush = window.adsbygoogle.push;
    window.adsbygoogle.push = (adConfig) => {
      if (adConfig && typeof adConfig === 'object') {
        const slot = this.extractSlotFromConfig(adConfig);
        if (slot && this.slots.has(slot)) {
          console.log(`🔧 AdSense Hotfix: Blocking push for duplicate slot ${slot}`);
          return;
        }
        
        if (slot) {
          this.slots.add(slot);
          console.log(`🔧 AdSense Hotfix: Tracking new slot ${slot}`);
        }
      }
      
      originalPush.call(window.adsbygoogle, adConfig);
    };
  }

  extractSlotFromConfig(config) {
    if (config.dataAdSlot) return config.dataAdSlot;
    if (config.adSlot) return config.adSlot;
    
    // Extract from ins element if it exists
    if (config.element && config.element.getAttribute) {
      return config.element.getAttribute('data-ad-slot');
    }
    
    return null;
  }

  trackSlot(slot) {
    if (!slot) return true;
    
    if (this.slots.has(slot)) {
      console.log(`🔄 AdSense Hotfix: Slot ${slot} already tracked`);
      return false;
    }
    
    this.slots.add(slot);
    console.log(`✅ AdSense Hotfix: Tracking slot ${slot}`);
    return true;
  }

  clearSlot(slot) {
    if (slot) {
      this.slots.delete(slot);
      console.log(`🧹 AdSense Hotfix: Cleared slot ${slot}`);
    }
  }

  clearAllSlots() {
    console.log('🔄 AdSense Hotfix: Cleared all slot tracking');
    this.slots.clear();
  }

  reset() {
    console.log('🔄 AdSense Hotfix: Cleared previous slot tracking');
    this.slots.clear();
    this.initialized = false;
  }
}

// Initialize global instance
if (typeof window !== 'undefined') {
  window._adSenseHotfix = new AdSenseHotfix();
}

export default AdSenseHotfix;