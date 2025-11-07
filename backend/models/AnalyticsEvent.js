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
      
      // Content Engagement Events
      'related_post_click',
      'related_posts_impression',
      'cta_click',
      
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
      'custom_event'
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
    required: false
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

// Compound index for common dashboard queries
AnalyticsEventSchema.index({ eventType: 1, postId: 1, timestamp: -1 });
AnalyticsEventSchema.index({ type: 1, sessionId: 1, timestamp: -1 }); // ✅ ADDED: For session analysis

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

// ✅ ADDED: Instance method to get event summary
AnalyticsEventSchema.methods.getSummary = function() {
  return {
    id: this._id,
    type: this.type || this.eventType,
    eventName: this.eventName,
    page: this.page,
    sessionId: this.sessionId,
    timestamp: this.timestamp,
    url: this.url
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

// Ensure virtual fields are serialized when converting to JSON
AnalyticsEventSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    // Remove internal fields from JSON output
    delete ret.__v;
    return ret;
  }
});

// Optional: Disable autoIndex in production for better performance
const isProduction = process.env.NODE_ENV === 'production';
AnalyticsEventSchema.set('autoIndex', !isProduction);

module.exports = mongoose.model('AnalyticsEvent', AnalyticsEventSchema);