const mongoose = require('mongoose');

const subscriberSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  name: String,
  isActive: {
    type: Boolean,
    default: true
  },
  source: String,
  utmSource: String,
  utmMedium: String,
  utmCampaign: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Subscriber', subscriberSchema);