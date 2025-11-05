// frontend/src/utils/adManager.js
class AdManager {
  constructor() {
    this.initializedSlots = new Set();
    this.maxRetries = 2;
    this.retryDelays = [1000, 3000, 5000]; // Progressive delays
  }

  initializeAd(slotId) {
    // Check if already initialized
    if (this.initializedSlots.has(slotId)) {
      console.log(`AdSense: Slot ${slotId} already initialized, skipping`);
      return false;
    }

    // Mark as initialized
    this.initializedSlots.add(slotId);
    console.log(`AdSense: Initializing slot ${slotId}`);
    return true;
  }

  canRetry(slotId, retryCount) {
    return retryCount < this.maxRetries;
  }

  getRetryDelay(retryCount) {
    return this.retryDelays[retryCount] || 5000;
  }

  resetSlot(slotId) {
    this.initializedSlots.delete(slotId);
  }

  // Clear all on page navigation
  clearAll() {
    this.initializedSlots.clear();
  }
}

// Singleton instance
export const adManager = new AdManager();

// Initialize on page load
if (typeof window !== 'undefined') {
  window.adManager = adManager;
}