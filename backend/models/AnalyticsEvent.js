// backend/models/AnalyticsEvent.js
const mongoose = require('mongoose');

const AnalyticsEventSchema = new mongoose.Schema({
  eventType: {
    type: String,
    required: true,
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
      'heatmap_data'              // Added for heatmap data collection
    ]
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
  metadata: Object,
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

// Indexes for efficient querying
AnalyticsEventSchema.index({ eventType: 1, timestamp: 1 });
AnalyticsEventSchema.index({ postId: 1, timestamp: 1 });
AnalyticsEventSchema.index({ sessionId: 1 });
AnalyticsEventSchema.index({ utmSource: 1, utmMedium: 1 });
// Compound index for common dashboard queries
AnalyticsEventSchema.index({ eventType: 1, postId: 1, timestamp: -1 });

// Optional: Disable autoIndex in production for better performance
const isProduction = process.env.NODE_ENV === 'production';
AnalyticsEventSchema.set('autoIndex', !isProduction);

module.exports = mongoose.model('AnalyticsEvent', AnalyticsEventSchema);