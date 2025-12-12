// frontend/src/utils/adSenseHotfix.js
// Comprehensive AdSense Hotfix with enhanced duplicate prevention

class AdSenseHotfix {
  constructor() {
    // Initialize only once
    if (typeof window !== 'undefined' && window._adSenseHotfixInstance) {
      return window._adSenseHotfixInstance;
    }

    this.initializedSlots = new Set();
    this.processedElements = new WeakSet();
    this.scriptLoaded = false;
    this.scriptLoading = false;
    this.pushAttempts = new Map();
    this.pushQueue = [];
    this.maxRetries = 3;
    this.initialized = false;

    // Store instance globally
    if (typeof window !== 'undefined') {
      window._adSenseHotfixInstance = this;
    }

    this.init();
  }

  // Initialize the hotfix
  init() {
    if (this.initialized) return;

    // Check if script is already loaded
    this.checkScriptStatus();
    
    // Apply push wrapper
    this.applyPushWrapper();
    
    // Set up event listeners
    this.setupEventListeners();
    
    this.initialized = true;
    console.log('🔧 AdSenseHotfix: Initialized');
  }

  // Check AdSense script status
  checkScriptStatus() {
    if (typeof window === 'undefined') return;

    const existingScript = document.querySelector('script[src*="pagead2.googlesyndication.com"]');
    if (existingScript) {
      this.scriptLoaded = true;
      console.log('✅ AdSenseHotfix: Script already loaded in DOM');
    }

    if (window.adsbygoogle) {
      this.scriptLoaded = true;
      console.log('✅ AdSenseHotfix: adsbygoogle object exists');
    }
  }

  // Apply push wrapper to prevent duplicates
  applyPushWrapper() {
    if (typeof window === 'undefined') return;

    // Store original push function
    const originalPush = window.adsbygoogle ? window.adsbygoogle.push : null;

    // Define wrapper function
    const pushWrapper = function() {
      const args = arguments;
      const hotfix = window._adSenseHotfixInstance;

      if (!hotfix) {
        return originalPush ? originalPush.apply(this, args) : undefined;
      }

      try {
        // Process each config in the arguments
        const validConfigs = [];
        
        for (let i = 0; i < args.length; i++) {
          const config = args[i];
          
          if (!config || typeof config !== 'object') {
            validConfigs.push(config);
            continue;
          }

          // Extract slot information
          const slot = hotfix.extractSlotFromConfig(config);
          
          // Check if element is already processed
          if (config.element && hotfix.isElementProcessed(config.element)) {
            console.log('🚫 AdSenseHotfix: Element already processed, skipping');
            continue;
          }

          // Check if slot is already initialized
          if (slot && hotfix.isSlotLoaded(slot)) {
            console.log(`🚫 AdSenseHotfix: Slot ${slot} already loaded, skipping`);
            continue;
          }

          // Mark as processed
          if (config.element) {
            hotfix.markElementProcessed(config.element);
          }
          
          if (slot) {
            hotfix.markSlotLoaded(slot);
          }

          validConfigs.push(config);
        }

        // If no valid configs remain, return early
        if (validConfigs.length === 0) {
          console.log('⏩ AdSenseHotfix: All configs were duplicates, skipping push');
          return;
        }

        // Call original push with filtered configs
        if (originalPush) {
          return originalPush.apply(this, validConfigs);
        } else {
          // Queue for later if original push not available
          hotfix.queuePush(() => {
            if (originalPush) {
              originalPush.apply(this, validConfigs);
            }
          });
        }
      } catch (error) {
        console.error('❌ AdSenseHotfix: Push wrapper error:', error);
        
        // Fallback to original push
        if (originalPush) {
          return originalPush.apply(this, args);
        }
      }
    };

    // Apply wrapper
    if (window.adsbygoogle) {
      window.adsbygoogle.push = pushWrapper;
      console.log('✅ AdSenseHotfix: Push wrapper applied');
    } else {
      // Wait for adsbygoogle to be defined
      this.waitForAdsByGoogle(pushWrapper);
    }
  }

  // Wait for adsbygoogle object to be available
  waitForAdsByGoogle(pushWrapper) {
    if (typeof window === 'undefined') return;

    let attempts = 0;
    const maxAttempts = 20; // Try for 10 seconds (500ms * 20)
    
    const interval = setInterval(() => {
      attempts++;
      
      if (window.adsbygoogle) {
        clearInterval(interval);
        window.adsbygoogle.push = pushWrapper;
        console.log('✅ AdSenseHotfix: Push wrapper applied (delayed)');
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        console.warn('⚠️ AdSenseHotfix: Timeout waiting for adsbygoogle object');
      }
    }, 500);
  }

  // Queue a push for later execution
  queuePush(pushFunction) {
    this.pushQueue.push(pushFunction);
    
    // Try to process queue after script loads
    if (this.scriptLoaded && this.pushQueue.length > 0) {
      this.processPushQueue();
    }
  }

  // Process queued pushes
  processPushQueue() {
    if (this.pushQueue.length === 0) return;
    
    console.log(`🔄 AdSenseHotfix: Processing ${this.pushQueue.length} queued pushes`);
    
    while (this.pushQueue.length > 0) {
      const pushFn = this.pushQueue.shift();
      try {
        pushFn();
      } catch (error) {
        console.warn('⚠️ AdSenseHotfix: Error processing queued push:', error);
      }
    }
  }

  // Extract slot from various config formats
  extractSlotFromConfig(config) {
    if (!config) return null;

    // Direct slot property
    if (config.slot) return config.slot;
    if (config.dataAdSlot) return config.dataAdSlot;
    if (config.adSlot) return config.adSlot;

    // Extract from element
    if (config.element && config.element.getAttribute) {
      return config.element.getAttribute('data-ad-slot');
    }

    return null;
  }

  // Slot management
  isSlotLoaded(slot) {
    return this.initializedSlots.has(slot);
  }

  markSlotLoaded(slot) {
    if (!slot) return;
    this.initializedSlots.add(slot);
  }

  clearSlot(slot) {
    this.initializedSlots.delete(slot);
    this.pushAttempts.delete(slot);
  }

  clearAllSlots() {
    const slotCount = this.initializedSlots.size;
    this.initializedSlots.clear();
    this.pushAttempts.clear();
    console.log(`🧹 AdSenseHotfix: Cleared ${slotCount} slots`);
  }

  // Element tracking
  markElementProcessed(element) {
    this.processedElements.add(element);
  }

  isElementProcessed(element) {
    return this.processedElements.has(element);
  }

  // Script management
  setScriptLoaded() {
    this.scriptLoaded = true;
    this.scriptLoading = false;
    
    // Process any queued pushes
    this.processPushQueue();
    
    console.log('✅ AdSenseHotfix: Script loaded status updated');
  }

  setScriptLoading() {
    this.scriptLoading = true;
    console.log('⏳ AdSenseHotfix: Script loading status updated');
  }

  isScriptLoaded() {
    return this.scriptLoaded;
  }

  isScriptLoading() {
    return this.scriptLoading;
  }

  // Setup event listeners for SPA navigation
  setupEventListeners() {
    if (typeof window === 'undefined') return;

    // Handle browser navigation
    window.addEventListener('popstate', () => {
      this.handlePageChange();
    });

    // Handle hash changes
    window.addEventListener('hashchange', () => {
      this.handlePageChange();
    });

    // Custom event for React Router
    window.addEventListener('routeChange', () => {
      this.handlePageChange();
    });

    // MutationObserver for dynamic content
    if (typeof MutationObserver !== 'undefined') {
      this.setupMutationObserver();
    }
  }

  // Handle page changes (for SPAs)
  handlePageChange() {
    console.log('🔄 AdSenseHotfix: Page change detected, clearing slots');
    this.clearAllSlots();
    
    // Reinitialize after a delay
    setTimeout(() => {
      this.applyPushWrapper();
    }, 100);
  }

  // Setup mutation observer for dynamic content
  setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      let hasAdElements = false;

      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) {
              // Check if node or its children contain adsbygoogle elements
              if (node.classList && node.classList.contains('adsbygoogle')) {
                hasAdElements = true;
              } else if (node.querySelector && node.querySelector('.adsbygoogle')) {
                hasAdElements = true;
              }
            }
          });
        }
      });

      if (hasAdElements) {
        console.log('🔄 AdSenseHotfix: Dynamic ad elements detected, resetting tracking');
        this.clearAllSlots();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Get status for debugging
  getStatus() {
    return {
      slots: Array.from(this.initializedSlots),
      scriptLoaded: this.scriptLoaded,
      scriptLoading: this.scriptLoading,
      pushQueueLength: this.pushQueue.length,
      processedElementsCount: 'WeakSet (count not available)'
    };
  }

  // Reset hotfix (for testing)
  reset() {
    this.clearAllSlots();
    this.processedElements = new WeakSet();
    this.pushQueue = [];
    console.log('🔄 AdSenseHotfix: Reset complete');
  }
}

// Create singleton instance
let adSenseHotfixInstance = null;

// Initialize when DOM is ready
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      adSenseHotfixInstance = new AdSenseHotfix();
    });
  } else {
    adSenseHotfixInstance = new AdSenseHotfix();
  }
}

// Export the class and instance
export default AdSenseHotfix;
export { adSenseHotfixInstance };