// backend/routes/contact.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Contact = require('../models/Contact'); // Import the updated model

// @route   POST /api/contact
// @desc    Save a contact message with all fields
// @access  Public
router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message, category = 'general' } = req.body;

    // Enhanced validation
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ 
        success: false,
        error: 'All required fields must be filled: name, email, subject, message' 
      });
    }

    // Validate email format
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid email address'
      });
    }

    // Validate category
    const validCategories = ['general', 'technical', 'collaboration', 'guest_posting', 'speaking', 'feedback', 'other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category selected'
      });
    }

    // Validate message length
    if (message.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Message must be at least 10 characters long'
      });
    }

    if (message.length > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Message cannot exceed 1000 characters'
      });
    }

    // Create new contact message with additional metadata
    const newMessage = new Contact({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: subject.trim(),
      message: message.trim(),
      category,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    });

    await newMessage.save();

    // Format response to match frontend expectations
    const responseData = {
      success: true,
      message: 'Message received successfully! I\'ll get back to you within 24-48 hours.',
      contact: {
        _id: newMessage._id,
        name: newMessage.name,
        email: newMessage.email,
        subject: newMessage.subject,
        message: newMessage.message,
        category: newMessage.category,
        status: newMessage.status,
        createdAt: newMessage.createdAt,
        updatedAt: newMessage.updatedAt
      }
    };

    console.log(`✅ New contact message received from: ${name} (${email}) - Category: ${category}`);

    res.status(201).json(responseData);

  } catch (error) {
    console.error('❌ Error saving contact message:', error);

    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: errors.join(', ')
      });
    }

    // Handle duplicate key errors (if any)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'A message with this email already exists recently'
      });
    }

    res.status(500).json({ 
      success: false,
      error: 'Server error, please try again later.' 
    });
  }
});

// @route   GET /api/contact
// @desc    Get all contact messages (Admin route)
// @access  Private (You might want to add authentication)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, category } = req.query;
    
    // Build filter object
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;

    const messages = await Contact.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v'); // Exclude version key

    const total = await Contact.countDocuments(filter);

    res.json({
      success: true,
      messages,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('❌ Error fetching messages:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch messages' 
    });
  }
});

// @route   GET /api/contact/stats
// @desc    Get contact statistics (Admin route)
// @access  Private
router.get('/stats', async (req, res) => {
  try {
    const totalMessages = await Contact.countDocuments();
    const newMessages = await Contact.countDocuments({ status: 'new' });
    
    // Category statistics
    const categoryStats = await Contact.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);

    // Monthly statistics
    const monthlyStats = await Contact.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 6 }
    ]);

    res.json({
      success: true,
      stats: {
        total: totalMessages,
        new: newMessages,
        byCategory: categoryStats,
        monthly: monthlyStats
      }
    });
  } catch (error) {
    console.error('❌ Error fetching contact stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

// @route   PUT /api/contact/:id/status
// @desc    Update message status (Admin route)
// @access  Private
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['new', 'read', 'replied', 'archived'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }

    const updatedMessage = await Contact.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!updatedMessage) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    res.json({
      success: true,
      message: 'Status updated successfully',
      contact: updatedMessage
    });
  } catch (error) {
    console.error('❌ Error updating message status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update status'
    });
  }
});

// @route   DELETE /api/contact/:id
// @desc    Delete a contact message (Admin route)
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deletedMessage = await Contact.findByIdAndDelete(id);

    if (!deletedMessage) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete message'
    });
  }
});

module.exports = router;
