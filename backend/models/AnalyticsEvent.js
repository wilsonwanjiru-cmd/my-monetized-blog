// backend/models/AnalyticsEvent.js
const mongoose = require('mongoose');

const AnalyticsEventSchema = new mongoose.Schema({
  // ✅ FIXED: eventType is now optional with default value
  eventType: {
    type: String,
    required: false,
    default: 'pageview',
    enum: [
      // Core Interaction Events
      'pageview',
      'click',
      'scroll',
      'conversion',
      
      // Monetization & Marketing Events
      'affiliate_click',
      'social_share',
      'newsletter_engagement',
      'outbound_click',
      'external_link_click',
      'ad_click',
      'ad_impression',
      'ad_revenue',
      'affiliate_conversion',
      'premium_content_view',
      'subscription_signup',
      'donation',
      'sponsor_engagement',
      
      // Content Engagement Events
      'related_post_click',
      'related_posts_impression',
      'cta_click',
      'premium_cta_click',
      'content_upgrade',
      'lead_magnet_download',
      
      // Technical & Performance Events
      'javascript_error',
      'promise_rejection',
      'performance_metrics',
      'app_loaded',
      'scroll_milestone',
      'scroll_depth',
      'heatmap_interaction',
      
      // NEWLY ADDED EVENT TYPES (from your frontend)
      'mouse_movements_batch',    // Added for heatmap tracking
      'form_submit',              // Added for form submissions
      'newsletter_signup',        // Added for newsletter tracking
      'session_start',            // Added for session tracking
      'session_end',              // Added for session tracking
      'heatmap_data',             // Added for heatmap data collection
      
      // ✅ ADDED: Additional event types for better compatibility
      'post_view',
      'health_check',
      'custom_event',
      
      // ✅ NEW: GDPR and Consent Events
      'consent_granted',
      'consent_denied',
      'consent_updated',
      'gdpr_banner_shown',
      'cookie_preferences_updated',
      
      // ✅ NEW: E-commerce and Revenue Events
      'product_view',
      'add_to_cart',
      'purchase',
      'refund',
      'revenue_tracked',
      'lifetime_value_update'
    ]
  },
  
  // ✅ ADDED: New fields to match your route requirements
  type: {
    type: String,
    required: false
  },
  eventName: {
    type: String,
    required: false
  },
  page: {
    type: String,
    required: false
  },
  title: {
    type: String,
    required: false
  },
  referrer: {
    type: String,
    required: false
  },
  screenResolution: {
    type: String,
    required: false
  },
  language: {
    type: String,
    required: false,
    set: function(lang) {
      // ✅ FIXED: Normalize language codes to prevent MongoDB errors
      if (lang && lang.includes('-')) {
        return lang.split('-')[0]; // Convert 'en-US' to 'en'
      }
      return lang || 'en';
    }
  },

  // Post reference for blog post analytics
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  },
  
  // UTM parameters for campaign tracking
  utmSource: String,
  utmMedium: String,
  utmCampaign: String,
  utmTerm: String,
  utmContent: String,
  
  // User and session information
  url: String,
  element: String,
  elementId: String,
  userAgent: String,
  ipAddress: String,
  sessionId: String,
  
  // ✅ ADDED: GDPR Consent Information
  gdprConsent: {
    type: Boolean,
    default: false
  },
  consentString: String,
  consentCategories: [String],
  cmpPresent: {
    type: Boolean,
    default: false
  },
  
  // ✅ ADDED: Monetization Metrics
  adRevenue: {
    type: Number,
    default: 0
  },
  adUnit: String,
  adSlot: String,
  adNetwork: String,
  affiliateRevenue: {
    type: Number,
    default: 0
  },
  affiliateId: String,
  productId: String,
  revenue: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  
  // ✅ ADDED: User Tier Information
  userTier: {
    type: String,
    enum: ['free', 'premium', 'pro', 'enterprise'],
    default: 'free'
  },
  
  // ✅ ADDED: Content Monetization
  contentTier: {
    type: String,
    enum: ['free', 'premium', 'sponsored'],
    default: 'free'
  },
  
  // ✅ ADDED: Subscription Information
  subscriptionPlan: String,
  subscriptionValue: Number,
  
  // Additional metadata for flexible data storage
  metadata: {
    type: Object,
    default: {}
  },
  
  // Scroll tracking specific fields
  scrollDepth: Number,
  viewportSize: {
    width: Number,
    height: Number
  },
  
  // Heatmap data
  coordinates: {
    x: Number,
    y: Number
  },
  
  // ✅ ADDED: Engagement Metrics
  timeOnPage: Number,
  engagementScore: Number,
  bounce: {
    type: Boolean,
    default: false
  },
  
  // ✅ ADDED: Device and Browser Info
  deviceType: String,
  browser: String,
  os: String,
  
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // This adds createdAt and updatedAt automatically
});

// ✅ ENHANCED: Indexes for efficient querying
AnalyticsEventSchema.index({ eventType: 1, timestamp: 1 });
AnalyticsEventSchema.index({ type: 1, timestamp: 1 }); // ✅ ADDED: For new type field
AnalyticsEventSchema.index({ postId: 1, timestamp: 1 });
AnalyticsEventSchema.index({ sessionId: 1 });
AnalyticsEventSchema.index({ utmSource: 1, utmMedium: 1 });
AnalyticsEventSchema.index({ eventName: 1, timestamp: 1 }); // ✅ ADDED: For eventName queries
AnalyticsEventSchema.index({ page: 1, timestamp: 1 }); // ✅ ADDED: For page-specific queries

// ✅ ADDED: Monetization Indexes
AnalyticsEventSchema.index({ adRevenue: 1, timestamp: 1 });
AnalyticsEventSchema.index({ affiliateRevenue: 1, timestamp: 1 });
AnalyticsEventSchema.index({ revenue: 1, timestamp: 1 });
AnalyticsEventSchema.index({ userTier: 1, timestamp: 1 });
AnalyticsEventSchema.index({ gdprConsent: 1, timestamp: 1 });

// Compound index for common dashboard queries
AnalyticsEventSchema.index({ eventType: 1, postId: 1, timestamp: -1 });
AnalyticsEventSchema.index({ type: 1, sessionId: 1, timestamp: -1 }); // ✅ ADDED: For session analysis
AnalyticsEventSchema.index({ gdprConsent: 1, eventType: 1, timestamp: -1 }); // ✅ ADDED: For GDPR analytics

// ✅ ADDED: Text indexes for search functionality
AnalyticsEventSchema.index({ 
  title: 'text', 
  page: 'text',
  eventName: 'text'
});

// ✅ ADDED: Virtual for formatted date (useful for reporting)
AnalyticsEventSchema.virtual('date').get(function() {
  return this.timestamp.toISOString().split('T')[0];
});

// ✅ ADDED: Virtual for total revenue
AnalyticsEventSchema.virtual('totalRevenue').get(function() {
  return (this.adRevenue || 0) + (this.affiliateRevenue || 0) + (this.revenue || 0);
});

// ✅ ADDED: Instance method to get event summary
AnalyticsEventSchema.methods.getSummary = function() {
  return {
    id: this._id,
    type: this.type || this.eventType,
    eventName: this.eventName,
    page: this.page,
    sessionId: this.sessionId,
    timestamp: this.timestamp,
    url: this.url,
    revenue: this.totalRevenue,
    gdprConsent: this.gdprConsent
  };
};

// ✅ ADDED: Static method to get events by session
AnalyticsEventSchema.statics.findBySession = function(sessionId, limit = 100) {
  return this.find({ sessionId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .exec();
};

// ✅ ADDED: Static method to get popular pages
AnalyticsEventSchema.statics.getPopularPages = function(days = 30, limit = 20) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate },
        page: { $exists: true, $ne: null }
      }
    },
    {
      $group: {
        _id: '$page',
        views: { $sum: 1 },
        uniqueSessions: { $addToSet: '$sessionId' },
        lastViewed: { $max: '$timestamp' }
      }
    },
    {
      $project: {
        page: '$_id',
        views: 1,
        uniqueVisitors: { $size: '$uniqueSessions' },
        lastViewed: 1
      }
    },
    { $sort: { views: -1 } },
    { $limit: limit }
  ]);
};

// ✅ ADDED: Static method to get revenue metrics
AnalyticsEventSchema.statics.getRevenueMetrics = function(days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate },
        $or: [
          { adRevenue: { $gt: 0 } },
          { affiliateRevenue: { $gt: 0 } },
          { revenue: { $gt: 0 } }
        ]
      }
    },
    {
      $group: {
        _id: null,
        totalAdRevenue: { $sum: '$adRevenue' },
        totalAffiliateRevenue: { $sum: '$affiliateRevenue' },
        totalRevenue: { $sum: '$revenue' },
        revenueEvents: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 0,
        totalAdRevenue: 1,
        totalAffiliateRevenue: 1,
        totalRevenue: 1,
        revenueEvents: 1,
        totalCombinedRevenue: {
          $add: ['$totalAdRevenue', '$totalAffiliateRevenue', '$totalRevenue']
        }
      }
    }
  ]);
};

// ✅ ADDED: Static method to get GDPR consent analytics
AnalyticsEventSchema.statics.getGDPRMetrics = function(days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate },
        eventType: { $in: ['consent_granted', 'consent_denied'] }
      }
    },
    {
      $group: {
        _id: '$eventType',
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$sessionId' }
      }
    },
    {
      $project: {
        consentType: '$_id',
        count: 1,
        uniqueUsers: { $size: '$uniqueUsers' }
      }
    }
  ]);
};

// ✅ ADDED: Static method to get user tier distribution
AnalyticsEventSchema.statics.getUserTierDistribution = function(days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$userTier',
        totalUsers: { $addToSet: '$sessionId' },
        totalRevenue: { $sum: { $add: ['$adRevenue', '$affiliateRevenue', '$revenue'] } }
      }
    },
    {
      $project: {
        userTier: '$_id',
        userCount: { $size: '$totalUsers' },
        totalRevenue: 1
      }
    },
    { $sort: { userCount: -1 } }
  ]);
};

// ✅ ADDED: Pre-save middleware to ensure compatibility
AnalyticsEventSchema.pre('save', function(next) {
  // Ensure eventType has a value if type is provided
  if (!this.eventType && this.type) {
    this.eventType = this.type;
  }
  
  // Ensure type has a value if eventType is provided
  if (!this.type && this.eventType) {
    this.type = this.eventType;
  }
  
  // Set default eventType if both are missing
  if (!this.eventType && !this.type) {
    this.eventType = 'pageview';
    this.type = 'pageview';
  }
  
  // Ensure metadata is always an object
  if (typeof this.metadata !== 'object' || this.metadata === null) {
    this.metadata = {};
  }
  
  // ✅ ADDED: Auto-detect device type from userAgent
  if (this.userAgent && !this.deviceType) {
    const ua = this.userAgent.toLowerCase();
    if (ua.includes('mobile')) {
      this.deviceType = 'mobile';
    } else if (ua.includes('tablet')) {
      this.deviceType = 'tablet';
    } else {
      this.deviceType = 'desktop';
    }
  }
  
  // ✅ ADDED: Auto-detect browser and OS
  if (this.userAgent && (!this.browser || !this.os)) {
    const ua = this.userAgent;
    if (ua.includes('Chrome')) this.browser = 'Chrome';
    else if (ua.includes('Firefox')) this.browser = 'Firefox';
    else if (ua.includes('Safari')) this.browser = 'Safari';
    else if (ua.includes('Edge')) this.browser = 'Edge';
    else this.browser = 'Other';
    
    if (ua.includes('Windows')) this.os = 'Windows';
    else if (ua.includes('Mac')) this.os = 'macOS';
    else if (ua.includes('Linux')) this.os = 'Linux';
    else if (ua.includes('Android')) this.os = 'Android';
    else if (ua.includes('iOS')) this.os = 'iOS';
    else this.os = 'Other';
  }
  
  // ✅ ADDED: Set GDPR consent based on available data
  if (this.gdprConsent === undefined) {
    // If we have consent categories or consent string, assume consent is given
    this.gdprConsent = !!(this.consentString || (this.consentCategories && this.consentCategories.length > 0));
  }
  
  next();
});

// ✅ ADDED: Method to check if event is a pageview
AnalyticsEventSchema.methods.isPageview = function() {
  return (this.type === 'pageview' || this.eventType === 'pageview') && 
         this.eventName === 'page_view';
};

// ✅ ADDED: Method to check if event is a custom event
AnalyticsEventSchema.methods.isCustomEvent = function() {
  return this.type === 'event' || 
         (this.eventType && !['pageview', 'post_view', 'health_check'].includes(this.eventType));
};

// ✅ ADDED: Method to check if event is revenue-generating
AnalyticsEventSchema.methods.isRevenueEvent = function() {
  return this.adRevenue > 0 || this.affiliateRevenue > 0 || this.revenue > 0;
};

// ✅ ADDED: Method to get revenue breakdown
AnalyticsEventSchema.methods.getRevenueBreakdown = function() {
  return {
    adRevenue: this.adRevenue || 0,
    affiliateRevenue: this.affiliateRevenue || 0,
    otherRevenue: this.revenue || 0,
    total: this.totalRevenue
  };
};

// Ensure virtual fields are serialized when converting to JSON
AnalyticsEventSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    // Remove internal fields from JSON output
    delete ret.__v;
    return ret;
  }
});

// ✅ ADDED: Static method to track ad revenue
AnalyticsEventSchema.statics.trackAdRevenue = function(data) {
  const {
    sessionId,
    adUnit,
    adSlot,
    revenue,
    currency = 'USD',
    metadata = {}
  } = data;
  
  return this.create({
    eventType: 'ad_revenue',
    eventName: 'ad_revenue_tracked',
    sessionId,
    adUnit,
    adSlot,
    adRevenue: revenue,
    currency,
    metadata,
    timestamp: new Date()
  });
};

// ✅ ADDED: Static method to track affiliate conversion
AnalyticsEventSchema.statics.trackAffiliateConversion = function(data) {
  const {
    sessionId,
    affiliateId,
    productId,
    revenue,
    currency = 'USD',
    metadata = {}
  } = data;
  
  return this.create({
    eventType: 'affiliate_conversion',
    eventName: 'affiliate_sale',
    sessionId,
    affiliateId,
    productId,
    affiliateRevenue: revenue,
    currency,
    metadata,
    timestamp: new Date()
  });
};

// ✅ ADDED: Static method to track GDPR consent
AnalyticsEventSchema.statics.trackGDPRConsent = function(data) {
  const {
    sessionId,
    consentGranted,
    consentString,
    consentCategories = [],
    cmpPresent = true,
    metadata = {}
  } = data;
  
  return this.create({
    eventType: consentGranted ? 'consent_granted' : 'consent_denied',
    eventName: 'gdpr_consent_updated',
    sessionId,
    gdprConsent: consentGranted,
    consentString,
    consentCategories,
    cmpPresent,
    metadata,
    timestamp: new Date()
  });
};

// Optional: Disable autoIndex in production for better performance
const isProduction = process.env.NODE_ENV === 'production';
AnalyticsEventSchema.set('autoIndex', !isProduction);

module.exports = mongoose.model('AnalyticsEvent', AnalyticsEventSchema);