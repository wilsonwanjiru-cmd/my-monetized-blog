// backend/routes/analytics.js
const express = require('express');
const router = express.Router();
const AnalyticsEvent = require('../models/AnalyticsEvent');

// Track UTM and analytics events
router.post('/track', async (req, res, next) => {
  try {
    const {
      eventType,
      postId,
      elementId,
      url,
      sessionId,
      metadata,
      // UTM parameters
      utmSource,
      utmMedium,
      utmCampaign,
      utmTerm,
      utmContent,
      // Additional tracking data
      scrollDepth,
      viewportSize,
      coordinates
    } = req.body;

    const event = new AnalyticsEvent({
      eventType,
      postId,
      elementId,
      url,
      // UTM parameters
      utmSource,
      utmMedium,
      utmCampaign,
      utmTerm,
      utmContent,
      // Additional tracking data
      scrollDepth,
      viewportSize,
      coordinates,
      // Automatic fields from request
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip || req.connection.remoteAddress,
      sessionId,
      metadata
    });

    await event.save();

    res.status(201).json({ 
      success: true,
      message: 'Event tracked successfully',
      eventId: event._id 
    });
  } catch (error) {
    console.error('Analytics tracking error:', error);
    next(error); // ✅ IMPROVED: Pass to error handler :cite[1]
  }
});

// Get comprehensive analytics for dashboard
router.get('/dashboard', async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Event type summary
    const eventSummary = await AnalyticsEvent.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 },
          uniqueSessions: { $addToSet: '$sessionId' }
        }
      },
      {
        $project: {
          count: 1,
          uniqueSessionCount: { $size: '$uniqueSessions' }
        }
      }
    ]);

    // Top posts by engagement
    const topPosts = await AnalyticsEvent.aggregate([
      {
        $match: {
          eventType: { $in: ['click', 'scroll', 'conversion'] },
          postId: { $exists: true, $ne: null },
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$postId',
          totalEngagements: { $sum: 1 },
          clickCount: {
            $sum: { $cond: [{ $eq: ['$eventType', 'click'] }, 1, 0] }
          },
          scrollCount: {
            $sum: { $cond: [{ $eq: ['$eventType', 'scroll'] }, 1, 0] }
          },
          conversionCount: {
            $sum: { $cond: [{ $eq: ['$eventType', 'conversion'] }, 1, 0] }
          }
        }
      },
      { $sort: { totalEngagements: -1 } },
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

    // UTM campaign performance
    const campaignPerformance = await AnalyticsEvent.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate },
          utmSource: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: {
            source: '$utmSource',
            medium: '$utmMedium',
            campaign: '$utmCampaign'
          },
          totalEvents: { $sum: 1 },
          uniqueUsers: { $addToSet: '$sessionId' },
          conversions: {
            $sum: { $cond: [{ $eq: ['$eventType', 'conversion'] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          totalEvents: 1,
          uniqueUsers: { $size: '$uniqueUsers' },
          conversions: 1,
          conversionRate: {
            $divide: ['$conversions', { $size: '$uniqueUsers' }]
          }
        }
      },
      { $sort: { totalEvents: -1 } }
    ]);

    res.json({
      success: true,
      period: `${days} days`,
      eventSummary,
      topPosts,
      campaignPerformance,
      summary: {
        totalEvents: eventSummary.reduce((sum, item) => sum + item.count, 0),
        totalCampaigns: campaignPerformance.length,
        totalPosts: topPosts.length
      }
    });
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    next(error); // ✅ IMPROVED: Pass to error handler :cite[1]
  }
});

// Get UTM parameters report - ✅ THIS SHOULD NOW BE ACCESSIBLE
router.get('/utm-report', async (req, res, next) => {
  try {
    const { source, medium, campaign, days = 30 } = req.query;
    
    let matchQuery = {
      timestamp: { 
        $gte: new Date(Date.now() - (parseInt(days) * 24 * 60 * 60 * 1000))
      }
    };

    // Add filters if provided
    if (source) matchQuery.utmSource = source;
    if (medium) matchQuery.utmMedium = medium;
    if (campaign) matchQuery.utmCampaign = campaign;

    const utmReport = await AnalyticsEvent.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            source: '$utmSource',
            medium: '$utmMedium', 
            campaign: '$utmCampaign',
            content: '$utmContent',
            term: '$utmTerm'
          },
          firstSeen: { $min: '$timestamp' },
          lastSeen: { $max: '$timestamp' },
          totalEvents: { $sum: 1 },
          uniqueSessions: { $addToSet: '$sessionId' },
          eventTypes: { $addToSet: '$eventType' }
        }
      },
      {
        $project: {
          _id: 1,
          firstSeen: 1,
          lastSeen: 1,
          totalEvents: 1,
          uniqueSessions: { $size: '$uniqueSessions' },
          eventTypes: 1
        }
      },
      { $sort: { totalEvents: -1 } }
    ]);

    res.json({
      success: true,
      report: utmReport,
      filters: { source, medium, campaign, days }
    });
  } catch (error) {
    console.error('UTM report error:', error);
    next(error); // ✅ IMPROVED: Pass to error handler :cite[1]
  }
});

module.exports = router;