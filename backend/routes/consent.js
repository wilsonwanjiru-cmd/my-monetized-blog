const express = require('express');
const router = express.Router();
const Consent = require('../models/Consent');

// Get consent status
router.get('/status', async (req, res) => {
  try {
    const { sessionId } = req.query;
    
    const consent = await Consent.findOne({ sessionId })
      .sort({ createdAt: -1 });

    res.json({ 
      consent: consent || { preferences: { necessary: true } }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save consent preferences
router.post('/preferences', async (req, res) => {
  try {
    const { sessionId, preferences, consentString, regulations } = req.body;
    
    const consent = new Consent({
      sessionId,
      preferences,
      consentString,
      regulations,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    await consent.save();

    res.status(201).json({ 
      message: 'Consent preferences saved successfully',
      consent 
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Withdraw consent
router.delete('/withdraw', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    await Consent.findOneAndUpdate(
      { sessionId },
      { 
        'preferences.analytics': false,
        'preferences.marketing': false,
        'preferences.preferences': false
      },
      { sort: { createdAt: -1 } }
    );

    res.json({ message: 'Consent withdrawn successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Export consent data (GDPR Right to Access)
router.get('/export/:sessionId', async (req, res) => {
  try {
    const consents = await Consent.find({ 
      sessionId: req.params.sessionId 
    });

    res.json({ consents });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete consent data (GDPR Right to Be Forgotten)
router.delete('/data/:sessionId', async (req, res) => {
  try {
    await Consent.deleteMany({ sessionId: req.params.sessionId });

    res.json({ message: 'Consent data deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;