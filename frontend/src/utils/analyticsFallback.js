// frontend/src/utils/analyticsFallback.js
class AnalyticsFallback {
  constructor() {
    this.pendingEvents = [];
    this.isOnline = true;
  }

  async trackEvent(eventData) {
    if (!this.isOnline) {
      this.storeEvent(eventData);
      return { success: false, reason: 'offline' };
    }

    try {
      const response = await fetch('https://api.wilsonmuita.com/api/analytics/event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData)
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      return await response.json();
    } catch (error) {
      this.isOnline = false;
      this.storeEvent(eventData);
      console.warn('Analytics fallback: storing event offline', error);
      return { success: false, reason: 'network_error' };
    }
  }

  async trackPageView(pageData) {
    if (!this.isOnline) {
      this.storeEvent({ ...pageData, eventType: 'pageview' });
      return { success: false, reason: 'offline' };
    }

    try {
      const response = await fetch('https://api.wilsonmuita.com/api/analytics/pageview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pageData)
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      return await response.json();
    } catch (error) {
      this.isOnline = false;
      this.storeEvent({ ...pageData, eventType: 'pageview' });
      console.warn('Analytics fallback: storing pageview offline', error);
      return { success: false, reason: 'network_error' };
    }
  }

  storeEvent(event) {
    this.pendingEvents.push({
      ...event,
      timestamp: new Date().toISOString(),
      retryCount: 0
    });
    
    // Keep only last 100 events
    if (this.pendingEvents.length > 100) {
      this.pendingEvents = this.pendingEvents.slice(-100);
    }
    
    // Store in localStorage for persistence
    try {
      localStorage.setItem('analytics_fallback_queue', JSON.stringify(this.pendingEvents));
    } catch (e) {
      console.warn('Cannot store analytics events in localStorage');
    }
  }

  async retryPendingEvents() {
    const eventsToRetry = [...this.pendingEvents];
    this.pendingEvents = [];
    
    let successCount = 0;
    let failCount = 0;
    
    for (const event of eventsToRetry) {
      try {
        if (event.eventType === 'pageview') {
          await this.trackPageView(event);
        } else {
          await this.trackEvent(event);
        }
        successCount++;
      } catch (error) {
        failCount++;
        // Put failed events back in queue if retry count < 3
        if (event.retryCount < 3) {
          event.retryCount++;
          this.pendingEvents.push(event);
        }
      }
    }
    
    console.log(`🔄 Retried ${successCount} analytics events, ${failCount} failed`);
    return { successCount, failCount };
  }
}

export default new AnalyticsFallback();