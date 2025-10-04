export class HeatmapTracker {
  constructor() {
    this.clicks = [];
    this.scrollDepth = [];
    this.sessionId = this.generateSessionId();
    this.init();
  }

  generateSessionId() {
    return 'session_' + Math.random().toString(36).substr(2, 9);
  }

  init() {
    this.trackClicks();
    this.trackScroll();
    this.trackTime();
  }

  trackClicks() {
    document.addEventListener('click', (e) => {
      const element = e.target;
      const clickData = {
        x: e.clientX,
        y: e.clientY,
        element: element.tagName,
        className: element.className,
        id: element.id,
        text: element.textContent?.substring(0, 100),
        url: window.location.href,
        timestamp: Date.now()
      };

      this.clicks.push(clickData);
      this.sendEvent('click', clickData);
    });
  }

  trackScroll() {
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const scrollDepth = this.getScrollDepth();
        this.scrollDepth.push(scrollDepth);
        this.sendEvent('scroll', { depth: scrollDepth });
      }, 100);
    });
  }

  trackTime() {
    let startTime = Date.now();
    window.addEventListener('beforeunload', () => {
      const timeSpent = Date.now() - startTime;
      this.sendEvent('time_spent', { duration: timeSpent });
    });
  }

  getScrollDepth() {
    const winHeight = window.innerHeight;
    const docHeight = document.documentElement.scrollHeight;
    const scrollTop = window.pageYOffset;
    const trackLength = docHeight - winHeight;
    return Math.floor((scrollTop / trackLength) * 100);
  }

  async sendEvent(eventType, data) {
    try {
      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventType,
          sessionId: this.sessionId,
          url: window.location.href,
          ...data
        })
      });
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
  }
}

// Initialize heatmap tracking
export const initHeatmapTracking = () => {
  if (process.env.NODE_ENV === 'production') {
    return new HeatmapTracker();
  }
  return null;
};