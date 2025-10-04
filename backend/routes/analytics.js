const express = require('express');
const router = express.Router();
const AnalyticsEvent = require('../models/AnalyticsEvent');

// Track event
router.post('/track', async (req, res) => {
  try {
    const { eventType, postId, elementId, url, sessionId, metadata } = req.body;
    
    const event = new AnalyticsEvent({
      eventType,
      postId,
      elementId,
      url,
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip,
      sessionId,
      metadata
    });

    await event.save();

    res.status(201).json({ message: 'Event tracked successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get analytics for dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const analytics = await AnalyticsEvent.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 },
          posts: { $addToSet: '$postId' }
        }
      }
    ]);

    const postClicks = await AnalyticsEvent.aggregate([
      {
        $match: {
          eventType: 'click',
          postId: { $exists: true },
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$postId',
          clickCount: { $sum: 1 }
        }
      },
      { $sort: { clickCount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'posts',
          localField: '_id',
          foreignField: '_id',
          as: 'post'
        }
      }
    ]);

    res.json({
      eventSummary: analytics,
      topPosts: postClicks
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;