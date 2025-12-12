// frontend/src/utils/adManager.js
// Central AdSense management to prevent duplicates and handle lifecycle

class AdSenseManager {
  constructor() {
    this.loadedSlots = new Set();
    this.pendingSlots = new Set();
    this.scriptLoaded = false;
    this.scriptLoading = false;
    this.initialized = false;
    this.adQueue = [];
    this.maxRetries = 3;
    this.retryDelays = [1000, 3000, 5000]; // Retry delays in milliseconds
    
    // Initialize global tracking
    this.initGlobalTracking();
  }

  // Initialize global tracking variables
  initGlobalTracking() {
    if (typeof window === 'undefined') return;
    
    window._adSenseManager = window._adSenseManager || {
      loadedSlots: new Set(),
      processedElements: new WeakSet(),
      scriptLoaded: false,
      scriptLoading: false,
      pushQueue: []
    };
  }

  // Check if slot is already loaded
  isSlotLoaded(slot) {
    return this.loadedSlots.has(slot) || 
           (window._adSenseManager && window._adSenseManager.loadedSlots.has(slot));
  }

  // Check if slot is pending (being loaded)
  isSlotPending(slot) {
    return this.pendingSlots.has(slot);
  }

  // Mark slot as loaded
  markSlotLoaded(slot) {
    this.loadedSlots.add(slot);
    this.pendingSlots.delete(slot);
    
    if (window._adSenseManager) {
      window._adSenseManager.loadedSlots.add(slot);
    }
    
    console.log(`✅ AdManager: Slot ${slot} marked as loaded`);
  }

  // Mark slot as pending (being loaded)
  markSlotPending(slot) {
    this.pendingSlots.add(slot);
    console.log(`⏳ AdManager: Slot ${slot} marked as pending`);
  }

  // Clear a specific slot
  clearSlot(slot) {
    this.loadedSlots.delete(slot);
    this.pendingSlots.delete(slot);
    
    if (window._adSenseManager) {
      window._adSenseManager.loadedSlots.delete(slot);
    }
    
    console.log(`🧹 AdManager: Cleared slot ${slot}`);
  }

  // Clear all loaded slots (useful for page navigation)
  clearAllSlots() {
    const loadedCount = this.loadedSlots.size;
    const pendingCount = this.pendingSlots.size;
    
    this.loadedSlots.clear();
    this.pendingSlots.clear();
    
    if (window._adSenseManager) {
      window._adSenseManager.loadedSlots.clear();
      window._adSenseManager.processedElements = new WeakSet();
    }
    
    console.log(`🧹 AdManager: Cleared ${loadedCount} loaded and ${pendingCount} pending slots`);
  }

  // Get all loaded slots for debugging
  getLoadedSlots() {
    return Array.from(this.loadedSlots);
  }

  // Get all pending slots
  getPendingSlots() {
    return Array.from(this.pendingSlots);
  }

  // Get all slots (loaded + pending)
  getAllSlots() {
    return {
      loaded: this.getLoadedSlots(),
      pending: this.getPendingSlots(),
      total: this.loadedSlots.size + this.pendingSlots.size
    };
  }

  // Check if AdSense script is loaded
  isScriptLoaded() {
    return this.scriptLoaded || (window._adSenseManager && window._adSenseManager.scriptLoaded);
  }

  // Mark script as loaded
  markScriptLoaded() {
    this.scriptLoaded = true;
    this.scriptLoading = false;
    
    if (window._adSenseManager) {
      window._adSenseManager.scriptLoaded = true;
      window._adSenseManager.scriptLoading = false;
    }
    
    console.log('✅ AdManager: AdSense script marked as loaded');
    
    // Process any queued ads
    this.processQueue();
  }

  // Mark script as loading
  markScriptLoading() {
    this.scriptLoading = true;
    
    if (window._adSenseManager) {
      window._adSenseManager.scriptLoading = true;
    }
    
    console.log('⏳ AdManager: AdSense script marked as loading');
  }

  // Queue an ad for loading
  queueAd(slot, containerId, options = {}) {
    if (this.isSlotLoaded(slot) || this.isSlotPending(slot)) {
      console.log(`⏩ AdManager: Slot ${slot} already loaded or pending, skipping queue`);
      return false;
    }

    const adConfig = {
      slot,
      containerId,
      options,
      retryCount: 0,
      addedToQueue: Date.now()
    };

    this.adQueue.push(adConfig);
    this.markSlotPending(slot);
    
    console.log(`📋 AdManager: Queued ad slot ${slot} for container ${containerId}`);
    
    // Try to process immediately if script is loaded
    if (this.isScriptLoaded()) {
      this.processQueue();
    }
    
    return true;
  }

  // Process the ad queue
  processQueue() {
    if (!this.isScriptLoaded() || this.adQueue.length === 0) {
      return;
    }

    console.log(`🔄 AdManager: Processing ${this.adQueue.length} queued ads`);
    
    // Process ads with a small delay between each to avoid rate limiting
    this.adQueue.forEach((adConfig, index) => {
      setTimeout(() => {
        this.loadAd(adConfig);
      }, index * 100); // 100ms delay between each ad
    });
    
    this.adQueue = [];
  }

  // Load an ad with retry logic
  async loadAd(adConfig) {
    const { slot, containerId, options, retryCount } = adConfig;
    
    if (this.isSlotLoaded(slot)) {
      console.log(`⏩ AdManager: Slot ${slot} already loaded, skipping`);
      return false;
    }

    if (!this.isScriptLoaded()) {
      console.warn(`⚠️ AdManager: Script not loaded for slot ${slot}, requeuing`);
      this.requeueAd(adConfig);
      return false;
    }

    try {
      const container = document.getElementById(containerId);
      if (!container) {
        console.warn(`⚠️ AdManager: Container ${containerId} not found for slot ${slot}`);
        if (retryCount < this.maxRetries) {
          this.requeueAd({ ...adConfig, retryCount: retryCount + 1 });
        }
        return false;
      }

      // Clear container
      container.innerHTML = '';

      // Create ad element
      const adElement = document.createElement('ins');
      adElement.className = 'adsbygoogle';
      adElement.style.display = 'block';
      adElement.style.textAlign = 'center';
      adElement.style.minHeight = '90px';
      adElement.dataset.adClient = 'ca-pub-4047817727348673';
      adElement.dataset.adSlot = slot;
      adElement.dataset.adFormat = options.format || 'auto';
      adElement.dataset.fullWidthResponsive = options.responsive !== false ? 'true' : 'false';

      if (options.layout) {
        adElement.dataset.adLayout = options.layout;
      }

      if (options.layoutKey) {
        adElement.dataset.adLayoutKey = options.layoutKey;
      }

      // Check if element is already processed globally
      if (window._adSenseManager && window._adSenseManager.processedElements.has(adElement)) {
        console.log(`⏩ AdManager: Element already processed globally for slot ${slot}`);
        return false;
      }

      container.appendChild(adElement);

      // Wait a bit for element to be in DOM
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check if element is visible
      if (!adElement.offsetParent || adElement.offsetHeight === 0 || adElement.offsetWidth === 0) {
        console.warn(`⚠️ AdManager: Ad element not visible for slot ${slot}`);
        if (retryCount < this.maxRetries) {
          this.requeueAd({ ...adConfig, retryCount: retryCount + 1 });
        }
        return false;
      }

      // Push to AdSense
      if (window.adsbygoogle) {
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          this.markSlotLoaded(slot);
          
          if (window._adSenseManager) {
            window._adSenseManager.processedElements.add(adElement);
          }
          
          console.log(`✅ AdManager: Successfully loaded ad slot ${slot}`);
          return true;
        } catch (pushError) {
          console.error(`❌ AdManager: Error pushing ad for slot ${slot}:`, pushError);
          if (retryCount < this.maxRetries) {
            this.requeueAd({ ...adConfig, retryCount: retryCount + 1 });
          }
          return false;
        }
      }
      
      return false;
    } catch (error) {
      console.error(`❌ AdManager: Error loading ad for slot ${slot}:`, error);
      if (retryCount < this.maxRetries) {
        this.requeueAd({ ...adConfig, retryCount: retryCount + 1 });
      }
      return false;
    }
  }

  // Requeue an ad with exponential backoff
  requeueAd(adConfig) {
    const { slot, retryCount } = adConfig;
    
    if (retryCount >= this.maxRetries) {
      console.warn(`❌ AdManager: Max retries reached for slot ${slot}, giving up`);
      this.clearSlot(slot);
      return;
    }

    const delay = this.retryDelays[retryCount] || 5000;
    
    console.log(`🔄 AdManager: Requeuing slot ${slot} (retry ${retryCount + 1}/${this.maxRetries}) in ${delay}ms`);
    
    setTimeout(() => {
      if (!this.isSlotLoaded(slot)) {
        this.adQueue.push(adConfig);
        this.processQueue();
      }
    }, delay);
  }

  // Initialize AdSense script
  initAdSenseScript() {
    if (typeof window === 'undefined') return false;
    
    if (this.isScriptLoaded()) {
      console.log('✅ AdManager: Script already loaded');
      return true;
    }

    if (this.scriptLoading) {
      console.log('⏳ AdManager: Script already loading');
      return false;
    }

    this.markScriptLoading();
    
    try {
      const script = document.createElement('script');
      script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4047817727348673';
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.setAttribute('data-ad-client', 'ca-pub-4047817727348673');
      
      script.onload = () => {
        this.markScriptLoaded();
        console.log('✅ AdManager: AdSense script loaded successfully');
      };
      
      script.onerror = () => {
        this.scriptLoading = false;
        console.error('❌ AdManager: Failed to load AdSense script');
      };
      
      document.head.appendChild(script);
      return true;
    } catch (error) {
      this.scriptLoading = false;
      console.error('❌ AdManager: Error loading AdSense script:', error);
      return false;
    }
  }

  // Initialize manager
  init() {
    if (this.initialized) return;
    
    this.initialized = true;
    
    // Check if script is already in DOM
    if (typeof window !== 'undefined') {
      const existingScript = document.querySelector('script[src*="pagead2.googlesyndication.com"]');
      if (existingScript) {
        this.markScriptLoaded();
      }
    }
    
    console.log('🔧 AdManager: Initialized successfully');
    return this;
  }

  // Reset manager (for testing or page navigation)
  reset() {
    this.clearAllSlots();
    this.adQueue = [];
    this.scriptLoaded = false;
    this.scriptLoading = false;
    console.log('🔄 AdManager: Reset complete');
  }

  // Get manager status for debugging
  getStatus() {
    return {
      initialized: this.initialized,
      scriptLoaded: this.isScriptLoaded(),
      scriptLoading: this.scriptLoading,
      loadedSlots: this.getLoadedSlots(),
      pendingSlots: this.getPendingSlots(),
      queueLength: this.adQueue.length,
      globalTracking: window._adSenseManager ? {
        loadedSlots: Array.from(window._adSenseManager.loadedSlots || []),
        scriptLoaded: window._adSenseManager.scriptLoaded,
        scriptLoading: window._adSenseManager.scriptLoading
      } : 'Not available'
    };
  }
}

// Singleton instance
const adManager = new AdSenseManager().init();
export default adManager;