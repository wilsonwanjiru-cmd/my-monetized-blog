// frontend/src/utils/adSenseHotfix.js - ENHANCED VERSION
// Comprehensive AdSense Hotfix with duplicate prevention and error handling

(function() {
  'use strict';

  // Global AdSense management with enhanced duplicate prevention
  if (typeof window._adSenseHotfix === 'undefined') {
    window._adSenseHotfix = {
      // Track initialized slots
      initializedSlots: new Set(),
      
      // Track processed elements
      processedElements: new WeakSet(),
      
      // Track script loading state
      scriptLoaded: false,
      scriptLoading: false,
      
      // Track push attempts
      pushAttempts: new Map(),
      
      // Enhanced slot tracking
      trackSlot: function(slot) {
        if (!slot) return true;
        
        if (this.initializedSlots.has(slot)) {
          console.log('🔄 AdSense Hotfix: Slot already tracked', slot);
          return false;
        }
        this.initializedSlots.add(slot);
        console.log('✅ AdSense Hotfix: Tracking slot', slot);
        return true;
      },
      
      // Clear single slot
      clearSlot: function(slot) {
        if (slot) {
          this.initializedSlots.delete(slot);
          this.pushAttempts.delete(slot);
          console.log('🧹 AdSense Hotfix: Cleared slot', slot);
        }
      },
      
      // FIXED: Added clearSlots for backward compatibility
      clearSlots: function() {
        const slotCount = this.initializedSlots.size;
        this.initializedSlots.clear();
        this.pushAttempts.clear();
        console.log(`🧹 AdSense Hotfix: Cleared ${slotCount} slots`);
      },
      
      clearAllSlots: function() {
        const slotCount = this.initializedSlots.size;
        this.initializedSlots.clear();
        this.pushAttempts.clear();
        console.log(`🧹 AdSense Hotfix: Cleared all ${slotCount} slots`);
      },
      
      // Element tracking
      markElementProcessed: function(element) {
        this.processedElements.add(element);
      },
      
      isElementProcessed: function(element) {
        return this.processedElements.has(element);
      },
      
      // Script management
      setScriptLoaded: function() {
        this.scriptLoaded = true;
        this.scriptLoading = false;
        console.log('✅ AdSense Hotfix: Script loaded status updated');
      },
      
      setScriptLoading: function() {
        this.scriptLoading = true;
        console.log('⏳ AdSense Hotfix: Script loading status updated');
      },
      
      isScriptLoaded: function() {
        return this.scriptLoaded;
      },
      
      isScriptLoading: function() {
        return this.scriptLoading;
      },
      
      // Push attempt tracking
      trackPushAttempt: function(slot) {
        const attempts = this.pushAttempts.get(slot) || 0;
        this.pushAttempts.set(slot, attempts + 1);
        return attempts + 1;
      },
      
      getPushAttempts: function(slot) {
        return this.pushAttempts.get(slot) || 0;
      },
      
      // Reset for page changes
      reset: function() {
        const slotCount = this.initializedSlots.size;
        this.initializedSlots.clear();
        this.processedElements = new WeakSet();
        this.pushAttempts.clear();
        console.log(`🔄 AdSense Hotfix: Reset - cleared ${slotCount} slots`);
      },
      
      // Get status for debugging
      getStatus: function() {
        return {
          slots: Array.from(this.initializedSlots),
          scriptLoaded: this.scriptLoaded,
          scriptLoading: this.scriptLoading,
          pushAttempts: Object.fromEntries(this.pushAttempts),
          processedElementsCount: 'WeakSet (count not available)'
        };
      },
      
      // Extract slot from various config formats
      extractSlotFromConfig: function(config) {
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
    };

    console.log('🔧 AdSense Hotfix: Initialized global management');
  }

  // Enhanced AdSense push wrapper with multiple protection layers
  const initAdSensePushWrapper = function() {
    if (!window.adsbygoogle) {
      window.adsbygoogle = [];
    }
    
    // Only apply wrapper once
    if (window.adsbygoogle._hotfixApplied) {
      return;
    }
    
    const originalPush = window.adsbygoogle.push;
    let wrapperApplied = false;
    
    const applyPushWrapper = function() {
      if (wrapperApplied) return;
      
      window.adsbygoogle.push = function() {
        try {
          const args = arguments;
          
          // Handle multiple argument formats
          if (args.length > 0) {
            for (let i = 0; i < args.length; i++) {
              const arg = args[i];
              
              if (arg && typeof arg === 'object') {
                const slot = window._adSenseHotfix.extractSlotFromConfig(arg);
                
                // Layer 1: Check slot-level duplication
                if (slot && !window._adSenseHotfix.trackSlot(slot)) {
                  console.log('🚫 AdSense Hotfix: Blocking duplicate slot push', slot);
                  continue; // Skip this config but process others
                }
                
                // Layer 2: Check element-level duplication
                if (arg.element) {
                  if (window._adSenseHotfix.isElementProcessed(arg.element)) {
                    console.log('🚫 AdSense Hotfix: Blocking duplicate element push');
                    if (slot) {
                      window._adSenseHotfix.clearSlot(slot);
                    }
                    continue;
                  }
                  window._adSenseHotfix.markElementProcessed(arg.element);
                }
                
                // Layer 3: Track push attempt
                if (slot) {
                  const attempts = window._adSenseHotfix.trackPushAttempt(slot);
                  if (attempts > 1) {
                    console.warn(`⚠️ AdSense Hotfix: Multiple push attempts for slot ${slot}: ${attempts}`);
                  }
                }
              }
            }
          }
          
          // Call original push method with all arguments
          if (originalPush) {
            return originalPush.apply(this, args);
          }
        } catch (error) {
          console.error('❌ AdSense Hotfix: Push wrapper error:', error);
          
          // Fallback to original push if wrapper fails
          if (originalPush) {
            return originalPush.apply(this, arguments);
          }
        }
      };
      
      window.adsbygoogle._hotfixApplied = true;
      wrapperApplied = true;
      console.log('✅ AdSense Hotfix: Push wrapper applied');
    };
    
    // Apply wrapper immediately if possible, or wait for adsbygoogle
    if (window.adsbygoogle && window.adsbygoogle.push) {
      applyPushWrapper();
    } else {
      // Wait for adsbygoogle to be defined
      const checkInterval = setInterval(() => {
        if (window.adsbygoogle && window.adsbygoogle.push) {
          clearInterval(checkInterval);
          applyPushWrapper();
        }
      }, 100);
      
      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!wrapperApplied) {
          console.warn('⚠️ AdSense Hotfix: Timeout applying push wrapper');
        }
      }, 5000);
    }
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdSensePushWrapper);
  } else {
    initAdSensePushWrapper();
  }

  // Enhanced page navigation handling for SPAs
  if (typeof window !== 'undefined' && window.addEventListener) {
    // Handle browser navigation
    window.addEventListener('popstate', function() {
      setTimeout(() => {
        console.log('🔄 AdSense Hotfix: Page navigation detected, resetting tracking');
        window._adSenseHotfix.reset();
      }, 100);
    });

    // Handle hash changes
    window.addEventListener('hashchange', function() {
      setTimeout(() => {
        console.log('🔄 AdSense Hotfix: Hash change detected, resetting tracking');
        window._adSenseHotfix.reset();
      }, 100);
    });

    // Custom event for React Router and other SPAs
    window.addEventListener('routeChange', function() {
      setTimeout(() => {
        console.log('🔄 AdSense Hotfix: Route change detected, resetting tracking');
        window._adSenseHotfix.reset();
      }, 100);
    });

    // MutationObserver for dynamic content changes
    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver(function(mutations) {
        let shouldReset = false;
        
        mutations.forEach(function(mutation) {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            // Check if new ad elements were added
            mutation.addedNodes.forEach(function(node) {
              if (node.nodeType === 1 && (
                node.classList.contains('adsbygoogle') ||
                node.querySelector('.adsbygoogle')
              )) {
                shouldReset = true;
              }
            });
          }
        });
        
        if (shouldReset) {
          console.log('🔄 AdSense Hotfix: Dynamic content change detected, resetting tracking');
          window._adSenseHotfix.reset();
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }

  // Global error handler for AdSense errors
  const originalConsoleError = console.error;
  console.error = function(...args) {
    // Suppress specific AdSense errors
    if (args[0] && typeof args[0] === 'string') {
      const message = args[0];
      
      // Suppress duplicate slot errors
      if (message.includes('adsbygoogle.push() error') && 
          message.includes('already have ads in them')) {
        console.log('🚫 AdSense Hotfix: Suppressed duplicate slot error');
        return;
      }
      
      // Suppress resource loading errors for AdSense
      if (message.includes('Failed to load resource') && 
          (message.includes('googleads') || message.includes('googlesyndication'))) {
        console.log('🌐 AdSense Hotfix: Suppressed network error for AdSense resource');
        return;
      }
    }
    
    // Call original console.error
    originalConsoleError.apply(console, args);
  };

  // Performance monitoring for AdSense
  if (typeof window !== 'undefined' && window.performance) {
    window.addEventListener('load', function() {
      setTimeout(function() {
        const status = window._adSenseHotfix.getStatus();
        console.log('📊 AdSense Hotfix Status:', status);
        
        // Log performance metrics
        if (window.performance && window.performance.getEntriesByType) {
          const adScriptEntries = window.performance.getEntriesByType('resource').filter(
            entry => entry.name.includes('googlesyndication.com')
          );
          
          if (adScriptEntries.length > 0) {
            console.log('⏱️ AdSense Script Load Time:', adScriptEntries[0].duration.toFixed(2) + 'ms');
          }
        }
      }, 2000);
    });
  }

  console.log('✅ AdSense Hotfix: Loaded successfully with enhanced protection');

  // Export for module systems
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = window._adSenseHotfix;
  }
})();

// Class-based export for modern modules
class AdSenseHotfix {
  constructor() {
    if (typeof window !== 'undefined' && window._adSenseHotfix) {
      return window._adSenseHotfix;
    }
    
    // Fallback initialization if global object doesn't exist
    if (typeof window !== 'undefined') {
      window._adSenseHotfix = {
        initializedSlots: new Set(),
        processedElements: new WeakSet(),
        scriptLoaded: false,
        scriptLoading: false,
        pushAttempts: new Map(),
        
        trackSlot: function(slot) {
          if (!slot) return true;
          if (this.initializedSlots.has(slot)) return false;
          this.initializedSlots.add(slot);
          return true;
        },
        
        clearSlot: function(slot) {
          if (slot) {
            this.initializedSlots.delete(slot);
            this.pushAttempts.delete(slot);
          }
        },
        
        clearSlots: function() {
          this.initializedSlots.clear();
          this.pushAttempts.clear();
        },
        
        clearAllSlots: function() {
          this.initializedSlots.clear();
          this.pushAttempts.clear();
        },
        
        markElementProcessed: function(element) {
          this.processedElements.add(element);
        },
        
        isElementProcessed: function(element) {
          return this.processedElements.has(element);
        },
        
        setScriptLoaded: function() {
          this.scriptLoaded = true;
          this.scriptLoading = false;
        },
        
        setScriptLoading: function() {
          this.scriptLoading = true;
        },
        
        isScriptLoaded: function() {
          return this.scriptLoaded;
        },
        
        isScriptLoading: function() {
          return this.scriptLoading;
        },
        
        trackPushAttempt: function(slot) {
          const attempts = this.pushAttempts.get(slot) || 0;
          this.pushAttempts.set(slot, attempts + 1);
          return attempts + 1;
        },
        
        getPushAttempts: function(slot) {
          return this.pushAttempts.get(slot) || 0;
        },
        
        reset: function() {
          this.initializedSlots.clear();
          this.processedElements = new WeakSet();
          this.pushAttempts.clear();
        },
        
        getStatus: function() {
          return {
            slots: Array.from(this.initializedSlots),
            scriptLoaded: this.scriptLoaded,
            scriptLoading: this.scriptLoading,
            pushAttempts: Object.fromEntries(this.pushAttempts)
          };
        }
      };
      
      return window._adSenseHotfix;
    }
    
    // Server-side fallback
    return {
      trackSlot: () => true,
      clearSlot: () => {},
      clearSlots: () => {},
      clearAllSlots: () => {},
      markElementProcessed: () => {},
      isElementProcessed: () => false,
      setScriptLoaded: () => {},
      setScriptLoading: () => {},
      isScriptLoaded: () => false,
      isScriptLoading: () => false,
      trackPushAttempt: () => 1,
      getPushAttempts: () => 0,
      reset: () => {},
      getStatus: () => ({})
    };
  }
}

// Export the class for modern module systems
export default AdSenseHotfix;