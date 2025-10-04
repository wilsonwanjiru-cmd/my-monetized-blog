// backend/routes/contact.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Contact schema
const contactSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true }
}, { timestamps: true });

// Contact model (prevent overwrite in dev hot-reload)
const Contact = mongoose.models.Contact || mongoose.model('Contact', contactSchema);

// @route   POST /api/contact
// @desc    Save a contact message
// @access  Public
router.post('/', async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // Basic validation
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const newMessage = new Contact({ name, email, message });
    await newMessage.save();

    res.status(201).json({
      success: true,
      message: 'Message received successfully!',
      contact: newMessage
    });
  } catch (error) {
    console.error('❌ Error saving contact message:', error);
    res.status(500).json({ error: 'Server error, please try again later.' });
  }
});

// (Optional) Admin route to fetch all messages
router.get('/', async (req, res) => {
  try {
    const messages = await Contact.find().sort({ createdAt: -1 });
    res.json({ success: true, messages });
  } catch (error) {
    console.error('❌ Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

module.exports = router;
