// frontend/src/utils/heatmapTracker.js
export class HeatmapTracker {
  constructor() {
    this.clicks = [];
    this.mouseMovements = [];
    this.scrollDepth = [];
    this.sessionId = this.generateSessionId();
    this.maxScrollDepth = 0;
    this.scrollThresholds = [25, 50, 75, 90];
    this.trackedThresholds = new Set();
    this.config = {
      clickTracking: true,
      scrollTracking: true,
      movementTracking: true,
      batchInterval: 5000, // Batch events every 5 seconds
      movementThrottle: 100 // Throttle mouse movements
    };
  }

  generateSessionId() {
    let sessionId = sessionStorage.getItem('heatmap_session_id');
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('heatmap_session_id', sessionId);
    }
    return sessionId;
  }

  init(options = {}) {
    this.config = { ...this.config, ...options };
    
    if (this.config.clickTracking) this.trackClicks();
    if (this.config.scrollTracking) this.trackScrollDepth();
    if (this.config.movementTracking) this.trackMouseMovements();
    
    this.initBatchProcessing();
    
    // Initialize third-party tools if in production
    if (process.env.NODE_ENV === 'production') {
      this.initThirdPartyTools();
    }
  }

  trackClicks() {
    document.addEventListener('click', (e) => {
      const element = e.target;
      const rect = element.getBoundingClientRect();
      
      const clickData = {
        x: e.clientX,
        y: e.clientY,
        element: element.tagName,
        className: element.className,
        id: element.id,
        text: element.textContent?.substring(0, 100),
        url: window.location.href,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        elementPosition: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        },
        timestamp: new Date().toISOString()
      };

      this.clicks.push(clickData);
      this.sendEvent('click', clickData);
    });
  }

  trackScrollDepth() {
    let scrollTimeout;
    
    const trackScroll = () => {
      const scrollPercent = this.getScrollDepth();
      
      // Track maximum scroll depth
      if (scrollPercent > this.maxScrollDepth) {
        this.maxScrollDepth = scrollPercent;
        
        // Check for milestone thresholds
        this.scrollThresholds.forEach(threshold => {
          if (scrollPercent >= threshold && !this.trackedThresholds.has(threshold)) {
            this.trackedThresholds.add(threshold);
            this.sendEvent('scroll_milestone', {
              depth: threshold,
              max_depth: scrollPercent,
              page_url: window.location.href,
              page_title: document.title
            });
          }
        });
      }
    };

    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(trackScroll, 100);
    }, { passive: true });

    // Track initial scroll position
    trackScroll();
  }

  trackMouseMovements() {
    let movementTimeout;
    
    const throttleMovement = (e) => {
      if (!movementTimeout) {
        movementTimeout = setTimeout(() => {
          const movementData = {
            x: e.clientX,
            y: e.clientY,
            url: window.location.href,
            viewport: {
              width: window.innerWidth,
              height: window.innerHeight
            },
            timestamp: new Date().toISOString()
          };

          this.mouseMovements.push(movementData);
          movementTimeout = null;
        }, this.config.movementThrottle);
      }
    };

    document.addEventListener('mousemove', throttleMovement, { passive: true });
  }

  getScrollDepth() {
    const winHeight = window.innerHeight;
    const docHeight = document.documentElement.scrollHeight;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    if (docHeight <= winHeight) return 100;
    
    const trackLength = docHeight - winHeight;
    const scrollPercent = (scrollTop / trackLength) * 100;
    
    return Math.min(Math.floor(scrollPercent), 100);
  }

  initBatchProcessing() {
    // Batch process mouse movements every interval
    setInterval(() => {
      if (this.mouseMovements.length > 0) {
        this.sendEvent('mouse_movements_batch', {
          movements: [...this.mouseMovements],
          movement_count: this.mouseMovements.length
        });
        this.mouseMovements = [];
      }
    }, this.config.batchInterval);
  }

  initThirdPartyTools() {
    // Hotjar Integration
    if (process.env.REACT_APP_HOTJAR_ID) {
      (function(h, o, t, j, a, r) {
        h.hj = h.hj || function() { (h.hj.q = h.hj.q || []).push(arguments) };
        h._hjSettings = { 
          hjid: process.env.REACT_APP_HOTJAR_ID, 
          hjsv: parseInt(process.env.REACT_APP_HOTJAR_SV || 6) 
        };
        a = o.getElementsByTagName('head')[0];
        r = o.createElement('script'); 
        r.async = 1;
        r.src = t + h._hjSettings.hjid + j + h._hjSettings.hjsv;
        a.appendChild(r);
      })(window, document, 'https://static.hotjar.com/c/hotjar-', '.js?sv=');
    }

    // Microsoft Clarity Integration
    if (process.env.REACT_APP_CLARITY_ID) {
      (function(c, l, a, r, i, t, y) {
        c[a] = c[a] || function() { (c[a].q = c[a].q || []).push(arguments) };
        t = l.createElement(r);
        t.async = 1;
        t.src = "https://www.clarity.ms/tag/" + i;
        y = l.getElementsByTagName(r)[0];
        y.parentNode.insertBefore(t, y);
      })(window, document, "clarity", "script", process.env.REACT_APP_CLARITY_ID);
    }
  }

  async sendEvent(eventType, data) {
    const eventData = {
      eventType,
      sessionId: this.sessionId,
      url: window.location.href,
      pageTitle: document.title,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      ...data
    };

    try {
      // Send to your backend API
      const response = await fetch('/api/analytics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (process.env.NODE_ENV !== 'production') {
        console.log('Heatmap event tracked:', eventType, eventData);
      }
    } catch (error) {
      console.error('Heatmap tracking error:', error);
      // Optional: Implement retry logic or fallback storage
    }
  }

  // Method to get current session data
  getSessionData() {
    return {
      sessionId: this.sessionId,
      totalClicks: this.clicks.length,
      totalMovements: this.mouseMovements.length,
      maxScrollDepth: this.maxScrollDepth,
      trackedThresholds: Array.from(this.trackedThresholds)
    };
  }

  // Method to reset session (useful for testing)
  resetSession() {
    this.clicks = [];
    this.mouseMovements = [];
    this.scrollDepth = [];
    this.maxScrollDepth = 0;
    this.trackedThresholds.clear();
    this.sessionId = this.generateSessionId();
  }
}

// Singleton instance
const heatmapTracker = new HeatmapTracker();

// Initialize heatmap tracking
export const initHeatmapTracking = (options = {}) => {
  // Only initialize in production or if explicitly enabled in development
  if (process.env.NODE_ENV === 'production' || process.env.REACT_APP_HEATMAP_DEV === 'true') {
    heatmapTracker.init(options);
    return heatmapTracker;
  }
  
  if (process.env.NODE_ENV !== 'production') {
    console.log('Heatmap tracking disabled in development');
  }
  return null;
};

// Export the class and instance
export default heatmapTracker;