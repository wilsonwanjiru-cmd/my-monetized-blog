// frontend/src/utils/adManager.js
// Central AdSense management to prevent duplicates

class AdSenseManager {
  constructor() {
    this.loadedSlots = new Set();
    this.scriptLoaded = false;
    this.scriptLoading = false;
    this.init();
  }

  init() {
    if (typeof window === 'undefined') return;
    
    // Initialize global variables
    window._adSenseLoadedSlots = window._adSenseLoadedSlots || new Set();
    window._adSenseScriptLoaded = window._adSenseScriptLoaded || false;
  }

  // Check if slot is already loaded
  isSlotLoaded(slot) {
    return this.loadedSlots.has(slot) || 
           (window._adSenseLoadedSlots && window._adSenseLoadedSlots.has(slot));
  }

  // Mark slot as loaded
  markSlotLoaded(slot) {
    this.loadedSlots.add(slot);
    if (window._adSenseLoadedSlots) {
      window._adSenseLoadedSlots.add(slot);
    }
  }

  // Clear all loaded slots (useful for page navigation)
  clearSlots() {
    this.loadedSlots.clear();
    if (window._adSenseLoadedSlots) {
      window._adSenseLoadedSlots.clear();
    }
  }

  // Get all loaded slots for debugging
  getLoadedSlots() {
    return Array.from(this.loadedSlots);
  }
}

// Singleton instance
const adSenseManager = new AdSenseManager();
export default adSenseManager;