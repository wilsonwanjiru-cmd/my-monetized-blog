const mongoose = require('mongoose');

const analyticsEventSchema = new mongoose.Schema({
  eventType: {
    type: String,
    required: true,
    enum: ['pageview', 'click', 'scroll', 'conversion', 'affiliate_click']
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  },
  elementId: String,
  url: String,
  userAgent: String,
  ipAddress: String,
  sessionId: String,
  metadata: Object,
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient querying
analyticsEventSchema.index({ eventType: 1, timestamp: 1 });
analyticsEventSchema.index({ postId: 1, timestamp: 1 });

module.exports = mongoose.model('AnalyticsEvent', analyticsEventSchema);