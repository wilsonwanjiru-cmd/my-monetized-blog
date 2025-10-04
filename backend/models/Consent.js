const mongoose = require('mongoose');

const consentSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true
  },
  preferences: {
    necessary: { type: Boolean, default: true },
    analytics: { type: Boolean, default: false },
    marketing: { type: Boolean, default: false },
    preferences: { type: Boolean, default: false }
  },
  consentDate: {
    type: Date,
    default: Date.now
  },
  ipAddress: String,
  userAgent: String,
  consentString: String, // IAB TC String
  regulations: [String] // ['GDPR', 'CCPA']
}, {
  timestamps: true
});

module.exports = mongoose.model('Consent', consentSchema);