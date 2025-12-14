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
    this.adBlockDetected = false;
    this.adsEnabled = true;
    
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
    if (!this.adsEnabled || this.adBlockDetected) {
      console.log(`🚫 AdManager: Ads disabled or ad blocker detected, skipping slot ${slot}`);
      return false;
    }

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
    if (!this.isScriptLoaded() || this.adQueue.length === 0 || !this.adsEnabled) {
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
    
    if (!this.adsEnabled || this.adBlockDetected) {
      console.log(`🚫 AdManager: Ads disabled or ad blocker detected, skipping slot ${slot}`);
      return false;
    }

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

  // Check for ad blocker
  checkAdBlock() {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') {
        resolve(false);
        return;
      }

      const testAd = document.createElement('div');
      testAd.className = 'adsbygoogle';
      testAd.style.cssText = 'height: 1px; width: 1px; position: absolute; left: -1000px; top: -1000px;';
      document.body.appendChild(testAd);
      
      setTimeout(() => {
        const detected = testAd.offsetHeight === 0 || 
                        testAd.offsetWidth === 0 || 
                        window.getComputedStyle(testAd).display === 'none';
        this.adBlockDetected = detected;
        document.body.removeChild(testAd);
        
        if (detected) {
          console.warn('🚫 AdManager: Ad blocker detected');
          this.onAdBlockDetected();
        }
        
        resolve(detected);
      }, 100);
    });
  }

  // Handle ad blocker detection
  onAdBlockDetected() {
    // Show non-intrusive message
    const message = document.createElement('div');
    message.className = 'ad-block-message-global';
    message.innerHTML = `
      <div style="
        background: #fff3cd;
        border: 1px solid #ffeaa7;
        border-radius: 8px;
        padding: 12px;
        margin: 10px;
        text-align: center;
        color: #856404;
        font-size: 14px;
      ">
        <p style="margin: 0 0 8px 0;">Please consider disabling your ad blocker to support this site.</p>
        <small style="opacity: 0.8;">Ads help keep this content free for everyone.</small>
      </div>
    `;
    
    // Insert at the beginning of body
    document.body.insertBefore(message, document.body.firstChild);
    
    // Remove after 10 seconds
    setTimeout(() => {
      if (message.parentNode) {
        message.remove();
      }
    }, 10000);
  }

  // Setup event listeners
  setupEventListeners() {
    if (typeof window === 'undefined') return;
    
    // Listen for consent changes
    window.addEventListener('consentChanged', (event) => {
      console.log('Consent changed:', event.detail);
      this.handleConsentChange(event.detail);
    });

    // Listen for visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.refreshAds();
      }
    });

    // Refresh ads on route change
    window.addEventListener('popstate', () => {
      setTimeout(() => this.refreshAds(), 1000);
    });
  }

  // Handle consent changes
  handleConsentChange(detail) {
    const { granted } = detail || {};
    
    if (granted) {
      this.enableAds();
    } else {
      this.disableAds();
    }
  }

  // Enable ads
  enableAds() {
    this.adsEnabled = true;
    console.log('✅ AdManager: Ads enabled');
    
    // Reload ads
    this.refreshAds();
  }

  // Disable ads
  disableAds() {
    this.adsEnabled = false;
    console.log('🚫 AdManager: Ads disabled');
    
    // Remove all ads
    this.removeAds();
  }

  // Refresh all ads
  refreshAds() {
    if (!this.adsEnabled || this.adBlockDetected) return;
    
    console.log('🔄 AdManager: Refreshing ads...');
    
    // Clear all slots and reload
    this.clearAllSlots();
    
    // Use AdSense's built-in refresh
    if (window.adsbygoogle) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        console.log('✅ AdManager: Ads refreshed');
      } catch (error) {
        console.warn('⚠️ AdManager: Error refreshing ads:', error);
      }
    }
  }

  // Remove all ads
  removeAds() {
    const ads = document.querySelectorAll('.adsbygoogle, .ad-container');
    ads.forEach(ad => {
      ad.innerHTML = '';
      ad.style.display = 'none';
    });
    
    // Clear tracking
    this.clearAllSlots();
    
    console.log('🧹 AdManager: Ads removed');
  }

  // Get ad revenue estimation (placeholder)
  getRevenueEstimate() {
    if (typeof window === 'undefined') {
      return {
        estimatedRevenue: '0.00',
        adsDisplayed: 0,
        pageViews: 0
      };
    }
    
    const ads = document.querySelectorAll('.adsbygoogle');
    const visibleAds = Array.from(ads).filter(ad => 
      ad.offsetHeight > 0 && ad.offsetWidth > 0
    );
    
    // Very rough estimate based on ad positions
    let estimate = 0;
    visibleAds.forEach(ad => {
      const slot = ad.dataset.adSlot;
      
      // Different ad positions have different estimated values
      // These are example values - actual revenue would come from AdSense
      if (['1529123561', '2835386242'].includes(slot)) {
        estimate += 0.05; // Banner ads
      } else if (['8087712926', '9876543210', '1234567890'].includes(slot)) {
        estimate += 0.10; // In-content ads
      } else if (['5976732519'].includes(slot)) {
        estimate += 0.03; // Sidebar ads
      } else if (['6583059564'].includes(slot)) {
        estimate += 0.04; // Between posts
      } else {
        estimate += 0.05; // Default
      }
    });
    
    return {
      estimatedRevenue: estimate.toFixed(2),
      adsDisplayed: visibleAds.length,
      pageViews: 1 // Would be tracked separately
    };
  }

  // Initialize manager
  async init() {
    if (this.initialized) return this;
    
    // Check if script is already in DOM
    if (typeof window !== 'undefined') {
      const existingScript = document.querySelector('script[src*="pagead2.googlesyndication.com"]');
      if (existingScript) {
        this.markScriptLoaded();
      }
    }
    
    // Check for ad blocker
    await this.checkAdBlock();
    
    // Setup event listeners
    this.setupEventListeners();
    
    this.initialized = true;
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
      adsEnabled: this.adsEnabled,
      adBlockDetected: this.adBlockDetected,
      scriptLoaded: this.isScriptLoaded(),
      scriptLoading: this.scriptLoading,
      loadedSlots: this.getLoadedSlots(),
      pendingSlots: this.getPendingSlots(),
      queueLength: this.adQueue.length,
      revenueEstimate: this.getRevenueEstimate(),
      globalTracking: window._adSenseManager ? {
        loadedSlots: Array.from(window._adSenseManager.loadedSlots || []),
        scriptLoaded: window._adSenseManager.scriptLoaded,
        scriptLoading: window._adSenseManager.scriptLoading
      } : 'Not available'
    };
  }
}

// Singleton instance
let adManagerInstance = null;

const getAdManager = () => {
  if (!adManagerInstance) {
    adManagerInstance = new AdSenseManager();
  }
  return adManagerInstance;
};

// Initialize on page load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(() => {
      getAdManager().init();
    }, 1000);
  });
}

export default getAdManager();