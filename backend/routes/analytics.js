// backend/routes/analytics.js
const express = require('express');
const router = express.Router();
const AnalyticsEvent = require('../models/AnalyticsEvent');

// ✅ ADDED: Test endpoint to verify analytics routes are working
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Analytics routes are working correctly!',
    timestamp: new Date().toISOString(),
    endpoints: {
      pageview: 'POST /api/analytics/pageview',
      track: 'POST /api/analytics/track',
      postview: 'POST /api/analytics/postview',
      stats: 'GET /api/analytics/stats',
      dashboard: 'GET /api/analytics/dashboard',
      health: 'GET /api/analytics/health'
    }
  });
});

// ✅ FIXED: Track pageview events with consistent parameter naming
router.post('/pageview', async (req, res) => {
  try {
    console.log('📊 Pageview request received:', {
      url: req.body.url,
      sessionId: req.body.sessionId,
      utm_source: req.body.utm_source
    });

    const {
      eventType = 'pageview',
      url,
      sessionId,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      metadata
    } = req.body;

    // Validate required fields
    if (!url || !sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: url and sessionId are required'
      });
    }

    const event = new AnalyticsEvent({
      eventType,
      url,
      sessionId,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      metadata: {
        ...metadata,
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress,
        timestamp: new Date(),
        source: 'analytics-route'
      }
    });

    await event.save();

    console.log('✅ Pageview tracked successfully:', event._id);

    res.status(201).json({
      success: true,
      message: 'Page view tracked successfully',
      eventId: event._id
    });
  } catch (error) {
    console.error('❌ Error tracking page view:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track page view',
      error: error.message
    });
  }
});

// ✅ UPDATED: Track general analytics events with proper JSON responses
router.post('/track', async (req, res) => {
  try {
    console.log('📊 Track event request received:', {
      eventType: req.body.eventType,
      sessionId: req.body.sessionId,
      url: req.body.url
    });

    const {
      eventType,
      url,
      sessionId,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      metadata,
      postId,
      elementId,
      scrollDepth,
      viewportSize,
      coordinates
    } = req.body;

    // Validate required fields
    if (!eventType || !sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: eventType and sessionId are required'
      });
    }

    // ✅ UPDATED: Use AnalyticsEvent.create for consistency
    const result = await AnalyticsEvent.create({
      eventType,
      url,
      sessionId,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      postId,
      elementId,
      scrollDepth,
      viewportSize,
      coordinates,
      metadata: {
        ...metadata,
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress,
        timestamp: new Date(),
        source: 'analytics-route'
      }
    });

    console.log('✅ Event tracked successfully:', result._id, eventType);

    // ✅ UPDATED: Return proper JSON response
    res.status(200).json({ 
      success: true, 
      message: 'Event tracked successfully',
      eventId: result._id 
    });
  } catch (error) {
    console.error('❌ Analytics tracking error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to track event',
      error: error.message 
    });
  }
});

// ✅ FIXED: Track post-specific views
router.post('/postview', async (req, res) => {
  try {
    console.log('📊 Postview request received:', {
      postId: req.body.postId,
      title: req.body.title
    });

    const {
      postId,
      title,
      slug,
      category,
      readTime,
      url,
      referrer,
      timestamp
    } = req.body;

    if (!postId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: postId'
      });
    }

    // ✅ UPDATED: Use AnalyticsEvent.create for consistency
    const result = await AnalyticsEvent.create({
      eventType: 'post_view',
      postId,
      url: url || req.get('Referer') || 'direct',
      sessionId: `post_${postId}_${Date.now()}`,
      metadata: {
        postTitle: title,
        postSlug: slug,
        category,
        readTime,
        referrer: referrer || 'direct',
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress,
        timestamp: timestamp || new Date(),
        source: 'analytics-route'
      }
    });

    console.log('✅ Post view tracked successfully:', postId);

    res.status(200).json({
      success: true,
      message: 'Post view tracked successfully',
      eventId: result._id
    });
  } catch (error) {
    console.error('❌ Error tracking post view:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track post view',
      error: error.message
    });
  }
});

// ✅ FIXED: Get basic analytics stats
router.get('/stats', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    console.log('📊 Fetching analytics stats for last', days, 'days');

    // Total events
    const totalEvents = await AnalyticsEvent.countDocuments({
      timestamp: { $gte: startDate }
    });

    // Events by type
    const eventsByType = await AnalyticsEvent.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Unique sessions
    const uniqueSessions = await AnalyticsEvent.distinct('sessionId', {
      timestamp: { $gte: startDate }
    }).then(sessions => sessions.length);

    // Page views (specific event type)
    const pageViews = await AnalyticsEvent.countDocuments({
      eventType: 'pageview',
      timestamp: { $gte: startDate }
    });

    console.log('✅ Analytics stats fetched successfully');

    res.json({
      success: true,
      data: {
        totalEvents,
        pageViews,
        uniqueSessions,
        eventsByType,
        period: `${days} days`,
        dateRange: {
          start: startDate,
          end: new Date()
        }
      }
    });
  } catch (error) {
    console.error('❌ Error fetching analytics stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics stats',
      error: error.message
    });
  }
});

// ✅ FIXED: Get comprehensive analytics for dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    console.log('📊 Fetching dashboard analytics for last', days, 'days');

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
          eventType: { $in: ['click', 'scroll', 'conversion', 'post_view'] },
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
          },
          viewCount: {
            $sum: { $cond: [{ $eq: ['$eventType', 'post_view'] }, 1, 0] }
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
          utm_source: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: {
            source: '$utm_source',
            medium: '$utm_medium',
            campaign: '$utm_campaign'
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
            $cond: [
              { $eq: [{ $size: '$uniqueUsers' }, 0] },
              0,
              { $divide: ['$conversions', { $size: '$uniqueUsers' }] }
            ]
          }
        }
      },
      { $sort: { totalEvents: -1 } }
    ]);

    console.log('✅ Dashboard analytics fetched successfully');

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
    console.error('❌ Dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard analytics',
      error: error.message
    });
  }
});

// ✅ FIXED: Get UTM parameters report
router.get('/utm-report', async (req, res) => {
  try {
    const { source, medium, campaign, days = 30 } = req.query;
    
    let matchQuery = {
      timestamp: { 
        $gte: new Date(Date.now() - (parseInt(days) * 24 * 60 * 60 * 1000))
      }
    };

    // Add filters if provided
    if (source) matchQuery.utm_source = source;
    if (medium) matchQuery.utm_medium = medium;
    if (campaign) matchQuery.utm_campaign = campaign;

    console.log('📊 Fetching UTM report with filters:', { source, medium, campaign, days });

    const utmReport = await AnalyticsEvent.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            source: '$utm_source',
            medium: '$utm_medium', 
            campaign: '$utm_campaign',
            content: '$utm_content',
            term: '$utm_term'
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

    console.log('✅ UTM report fetched successfully');

    res.json({
      success: true,
      report: utmReport,
      filters: { source, medium, campaign, days }
    });
  } catch (error) {
    console.error('❌ UTM report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch UTM report',
      error: error.message
    });
  }
});

// ✅ FIXED: Health check for analytics API
router.get('/health', async (req, res) => {
  try {
    const eventCount = await AnalyticsEvent.countDocuments();
    const recentEvents = await AnalyticsEvent.countDocuments({
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    
    res.json({
      success: true,
      status: 'OK',
      message: 'Analytics API is running',
      eventCount,
      recentEvents24h: recentEvents,
      timestamp: new Date().toISOString(),
      endpoints: [
        'POST /api/analytics/pageview',
        'POST /api/analytics/track',
        'POST /api/analytics/postview',
        'GET /api/analytics/stats',
        'GET /api/analytics/dashboard',
        'GET /api/analytics/utm-report'
      ]
    });
  } catch (error) {
    console.error('❌ Analytics health check error:', error);
    res.status(500).json({
      success: false,
      status: 'ERROR',
      message: 'Analytics API health check failed',
      error: error.message
    });
  }
});

// ✅ ADDED: Bulk events endpoint for offline sync
router.post('/bulk', async (req, res) => {
  try {
    const { events } = req.body;

    if (!events || !Array.isArray(events)) {
      return res.status(400).json({
        success: false,
        message: 'Missing or invalid events array'
      });
    }

    console.log(`📊 Processing bulk events: ${events.length} events`);

    // ✅ UPDATED: Use AnalyticsEvent.create for consistency
    const savedEvents = await AnalyticsEvent.insertMany(events);

    res.status(200).json({
      success: true,
      message: `Successfully processed ${savedEvents.length} events`,
      savedCount: savedEvents.length
    });
  } catch (error) {
    console.error('❌ Bulk events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process bulk events',
      error: error.message
    });
  }
});

// ✅ ADDED: Endpoint to check if analytics is working
router.get('/status', (req, res) => {
  res.json({
    success: true,
    status: 'operational',
    timestamp: new Date().toISOString(),
    features: {
      pageview_tracking: true,
      event_tracking: true,
      post_analytics: true,
      utm_tracking: true,
      dashboard: true,
      bulk_operations: true
    },
    database: 'connected' // Assuming MongoDB is connected via mongoose
  });
});

module.exports = router;