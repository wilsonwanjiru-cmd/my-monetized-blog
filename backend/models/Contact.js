// backend/models/Contact.js
const mongoose = require('mongoose');

const ContactSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Name is required'], 
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: { 
    type: String, 
    required: [true, 'Email is required'], 
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  subject: { 
    type: String, 
    required: [true, 'Subject is required'],
    trim: true,
    minlength: [5, 'Subject must be at least 5 characters long'],
    maxlength: [200, 'Subject cannot exceed 200 characters']
  },
  message: { 
    type: String, 
    required: [true, 'Message is required'],
    trim: true,
    minlength: [10, 'Message must be at least 10 characters long'],
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: {
      values: ['general', 'technical', 'collaboration', 'guest_posting', 'speaking', 'feedback', 'other'],
      message: 'Category must be one of: general, technical, collaboration, guest_posting, speaking, feedback, other'
    },
    default: 'general'
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['new', 'read', 'replied', 'archived'],
    default: 'new'
  }
}, { 
  timestamps: true 
});

// Index for better query performance
ContactSchema.index({ email: 1, createdAt: -1 });
ContactSchema.index({ status: 1 });
ContactSchema.index({ category: 1 });

// Virtual for formatted created date
ContactSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

module.exports = mongoose.model('Contact', ContactSchema);