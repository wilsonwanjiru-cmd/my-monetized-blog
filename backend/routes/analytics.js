// backend/routes/analytics.js
// backend/routes/analytics.js
const express = require('express');
const router = express.Router();
const AnalyticsEvent = require('../models/AnalyticsEvent');

// ✅ ENHANCED: Test endpoint to verify analytics routes are working
router.get('/test', (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Analytics routes are working correctly!',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      endpoints: {
        pageview: 'POST /api/analytics/pageview',
        event: 'POST /api/analytics/event',
        stats: 'GET /api/analytics/stats',
        dashboard: 'GET /api/analytics/dashboard',
        health: 'GET /api/analytics/health',
        status: 'GET /api/analytics/status'
      }
    });
  } catch (error) {
    console.error('❌ Test endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Test endpoint failed',
      error: error.message
    });
  }
});

// ✅ ENHANCED: Track pageview events with comprehensive error handling
router.post('/pageview', async (req, res) => {
  try {
    console.log('📊 Pageview request received:', {
      page: req.body.page,
      sessionId: req.body.sessionId?.substring(0, 20) + '...', // Log partial session ID
      timestamp: req.body.timestamp
    });

    const {
      type = 'pageview',
      sessionId,
      page,
      title,
      referrer,
      userAgent,
      timestamp,
      screenResolution,
      language,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm
    } = req.body;

    // Validate required fields
    if (!sessionId || !page) {
      console.warn('⚠️ Pageview validation failed: Missing sessionId or page');
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: sessionId and page are required',
        required: ['sessionId', 'page'],
        received: Object.keys(req.body)
      });
    }

    // Validate sessionId format
    if (!sessionId.startsWith('session_')) {
      console.warn('⚠️ Invalid session ID format:', sessionId);
    }

    const event = new AnalyticsEvent({
      type,
      sessionId,
      page,
      title,
      referrer: referrer || '',
      userAgent: userAgent || req.get('User-Agent'),
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      screenResolution,
      language,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm,
      metadata: {
        ip: getClientIP(req),
        source: 'analytics-pageview',
        userAgent: req.get('User-Agent'),
        headers: {
          referer: req.get('Referer'),
          origin: req.get('Origin'),
          host: req.get('Host')
        }
      }
    });

    await event.save();

    console.log('✅ Pageview tracked successfully:', event._id);

    // Always return valid JSON response
    res.status(201).json({
      success: true,
      message: 'Page view tracked successfully',
      eventId: event._id,
      timestamp: event.timestamp
    });

  } catch (error) {
    console.error('❌ Error tracking page view:', error);
    
    // Return proper JSON even on error
    res.status(500).json({
      success: false,
      message: 'Failed to track page view',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
});

// ✅ ENHANCED: Track general analytics events with robust error handling
router.post('/event', async (req, res) => {
  try {
    console.log('📊 Event request received:', {
      eventName: req.body.eventName,
      sessionId: req.body.sessionId?.substring(0, 20) + '...',
      page: req.body.page
    });

    const {
      type = 'event',
      sessionId,
      page,
      eventName,
      eventData,
      userAgent,
      timestamp,
      utmSource,
      utmMedium,
      utmCampaign
    } = req.body;

    // Validate required fields
    if (!sessionId || !eventName) {
      console.warn('⚠️ Event validation failed: Missing sessionId or eventName');
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: sessionId and eventName are required',
        required: ['sessionId', 'eventName'],
        received: Object.keys(req.body)
      });
    }

    const event = new AnalyticsEvent({
      type,
      sessionId,
      page: page || req.get('Referer') || 'unknown',
      eventName,
      eventData: eventData || {},
      userAgent: userAgent || req.get('User-Agent'),
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      utmSource,
      utmMedium,
      utmCampaign,
      metadata: {
        ip: getClientIP(req),
        source: 'analytics-event',
        userAgent: req.get('User-Agent'),
        headers: {
          referer: req.get('Referer'),
          origin: req.get('Origin')
        }
      }
    });

    await event.save();

    console.log('✅ Event tracked successfully:', eventName, event._id);

    // Always return valid JSON
    res.json({
      success: true,
      message: 'Event tracked successfully',
      eventId: event._id,
      eventName: eventName,
      timestamp: event.timestamp
    });

  } catch (error) {
    console.error('❌ Analytics event tracking error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to track event',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
});

// ✅ ENHANCED: Track post-specific views with improved validation
router.post('/postview', async (req, res) => {
  try {
    console.log('📊 Postview request received:', {
      postId: req.body.postId,
      title: req.body.title?.substring(0, 50) + '...'
    });

    const {
      postId,
      title,
      slug,
      category,
      readTime,
      url,
      referrer,
      timestamp,
      sessionId
    } = req.body;

    if (!postId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: postId'
      });
    }

    const event = new AnalyticsEvent({
      type: 'post_view',
      sessionId: sessionId || `post_${postId}_${Date.now()}`,
      page: url || req.get('Referer') || 'direct',
      eventName: 'post_view',
      eventData: {
        postId,
        title,
        slug,
        category,
        readTime,
        referrer: referrer || 'direct'
      },
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      metadata: {
        ip: getClientIP(req),
        source: 'analytics-postview',
        userAgent: req.get('User-Agent'),
        postId: postId
      }
    });

    await event.save();

    console.log('✅ Post view tracked successfully:', postId);

    res.json({
      success: true,
      message: 'Post view tracked successfully',
      eventId: event._id,
      postId: postId
    });

  } catch (error) {
    console.error('❌ Error tracking post view:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track post view',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
});

// ✅ ENHANCED: Get basic analytics stats with error handling
router.get('/stats', async (req, res) => {
  try {
    const { days = 30, type } = req.query;
    const daysInt = parseInt(days);
    
    if (isNaN(daysInt) || daysInt < 1 || daysInt > 365) {
      return res.status(400).json({
        success: false,
        message: 'Invalid days parameter. Must be between 1 and 365.'
      });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysInt);
    startDate.setHours(0, 0, 0, 0);

    console.log('📊 Fetching analytics stats for last', days, 'days');

    // Build match query
    const matchQuery = {
      timestamp: { $gte: startDate }
    };

    if (type) {
      matchQuery.type = type;
    }

    // Total events
    const totalEvents = await AnalyticsEvent.countDocuments(matchQuery);

    // Events by type
    const eventsByType = await AnalyticsEvent.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          uniqueSessions: { $addToSet: '$sessionId' }
        }
      },
      {
        $project: {
          count: 1,
          uniqueSessions: { $size: '$uniqueSessions' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Unique sessions
    const uniqueSessions = await AnalyticsEvent.distinct('sessionId', matchQuery);
    const uniqueSessionsCount = uniqueSessions.length;

    // Page views (specific type)
    const pageViews = await AnalyticsEvent.countDocuments({
      ...matchQuery,
      type: 'pageview'
    });

    // Recent activity (last 24 hours)
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentActivity = await AnalyticsEvent.countDocuments({
      timestamp: { $gte: last24Hours }
    });

    console.log('✅ Analytics stats fetched successfully');

    res.json({
      success: true,
      data: {
        totalEvents,
        pageViews,
        uniqueSessions: uniqueSessionsCount,
        eventsByType,
        recentActivity24h: recentActivity,
        period: `${days} days`,
        dateRange: {
          start: startDate,
          end: new Date()
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching analytics stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics stats',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
});

// ✅ ENHANCED: Get comprehensive analytics for dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysInt = parseInt(days);
    
    if (isNaN(daysInt) || daysInt < 1 || daysInt > 365) {
      return res.status(400).json({
        success: false,
        message: 'Invalid days parameter. Must be between 1 and 365.'
      });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysInt);
    startDate.setHours(0, 0, 0, 0);

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
          _id: '$type',
          count: { $sum: 1 },
          uniqueSessions: { $addToSet: '$sessionId' }
        }
      },
      {
        $project: {
          eventType: '$_id',
          count: 1,
          uniqueSessions: { $size: '$uniqueSessions' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Daily trend
    const dailyTrend = await AnalyticsEvent.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$timestamp'
            }
          },
          count: { $sum: 1 },
          uniqueSessions: { $addToSet: '$sessionId' }
        }
      },
      {
        $project: {
          date: '$_id',
          count: 1,
          uniqueSessions: { $size: '$uniqueSessions' }
        }
      },
      { $sort: { date: 1 } }
    ]);

    // Top pages
    const topPages = await AnalyticsEvent.aggregate([
      {
        $match: {
          type: 'pageview',
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$page',
          count: { $sum: 1 },
          uniqueSessions: { $addToSet: '$sessionId' }
        }
      },
      {
        $project: {
          page: '$_id',
          views: '$count',
          uniqueVisitors: { $size: '$uniqueSessions' }
        }
      },
      { $sort: { views: -1 } },
      { $limit: 10 }
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
          uniqueSessions: { $addToSet: '$sessionId' },
          pageViews: {
            $sum: { $cond: [{ $eq: ['$type', 'pageview'] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          source: '$_id.source',
          medium: '$_id.medium',
          campaign: '$_id.campaign',
          totalEvents: 1,
          uniqueSessions: { $size: '$uniqueSessions' },
          pageViews: 1
        }
      },
      { $sort: { totalEvents: -1 } },
      { $limit: 20 }
    ]);

    console.log('✅ Dashboard analytics fetched successfully');

    res.json({
      success: true,
      period: `${days} days`,
      summary: {
        totalEvents: eventSummary.reduce((sum, item) => sum + item.count, 0),
        totalUniqueSessions: [...new Set(eventSummary.flatMap(item => item.uniqueSessions))].length,
        topPagesCount: topPages.length,
        campaignsTracked: campaignPerformance.length
      },
      eventSummary,
      dailyTrend,
      topPages,
      campaignPerformance,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard analytics',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
});

// ✅ ENHANCED: Get UTM parameters report
router.get('/utm-report', async (req, res) => {
  try {
    const { source, medium, campaign, days = 30 } = req.query;
    const daysInt = parseInt(days);
    
    if (isNaN(daysInt) || daysInt < 1 || daysInt > 365) {
      return res.status(400).json({
        success: false,
        message: 'Invalid days parameter. Must be between 1 and 365.'
      });
    }

    const startDate = new Date(Date.now() - (daysInt * 24 * 60 * 60 * 1000));

    let matchQuery = {
      timestamp: { $gte: startDate },
      $or: [
        { utmSource: { $exists: true, $ne: null } },
        { utmMedium: { $exists: true, $ne: null } },
        { utmCampaign: { $exists: true, $ne: null } }
      ]
    };

    // Add filters if provided
    if (source) matchQuery.utmSource = source;
    if (medium) matchQuery.utmMedium = medium;
    if (campaign) matchQuery.utmCampaign = campaign;

    console.log('📊 Fetching UTM report with filters:', { source, medium, campaign, days });

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
          pageViews: {
            $sum: { $cond: [{ $eq: ['$type', 'pageview'] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          source: '$_id.source',
          medium: '$_id.medium',
          campaign: '$_id.campaign',
          content: '$_id.content',
          term: '$_id.term',
          firstSeen: 1,
          lastSeen: 1,
          totalEvents: 1,
          uniqueSessions: { $size: '$uniqueSessions' },
          pageViews: 1
        }
      },
      { $sort: { totalEvents: -1 } },
      { $limit: 100 }
    ]);

    console.log('✅ UTM report fetched successfully');

    res.json({
      success: true,
      report: utmReport,
      filters: { source, medium, campaign, days },
      totalResults: utmReport.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ UTM report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch UTM report',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
});

// ✅ ENHANCED: Health check for analytics API
router.get('/health', async (req, res) => {
  try {
    // Test database connection
    const eventCount = await AnalyticsEvent.countDocuments();
    const recentEvents = await AnalyticsEvent.countDocuments({
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    
    // Test database write capability
    const testEvent = new AnalyticsEvent({
      type: 'health_check',
      sessionId: 'health_check_' + Date.now(),
      page: '/api/analytics/health',
      eventName: 'health_check',
      timestamp: new Date(),
      metadata: {
        source: 'health-check',
        ip: getClientIP(req)
      }
    });
    
    await testEvent.save();
    await AnalyticsEvent.deleteOne({ _id: testEvent._id });

    res.json({
      success: true,
      status: 'healthy',
      message: 'Analytics API is running correctly',
      database: {
        connected: true,
        totalEvents: eventCount,
        recentEvents24h: recentEvents
      },
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: '1.0.0'
    });

  } catch (error) {
    console.error('❌ Analytics health check error:', error);
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      message: 'Analytics API health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ✅ ENHANCED: Bulk events endpoint for offline sync
router.post('/bulk', async (req, res) => {
  try {
    const { events } = req.body;

    if (!events || !Array.isArray(events)) {
      return res.status(400).json({
        success: false,
        message: 'Missing or invalid events array'
      });
    }

    if (events.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Too many events in bulk request. Maximum 1000 events allowed.'
      });
    }

    console.log(`📊 Processing bulk events: ${events.length} events`);

    // Validate each event
    const validEvents = [];
    const errors = [];

    events.forEach((event, index) => {
      if (!event.sessionId || (!event.page && !event.eventName)) {
        errors.push(`Event ${index}: Missing required fields`);
      } else {
        // Add timestamp if not provided
        if (!event.timestamp) {
          event.timestamp = new Date();
        }
        // Add metadata
        event.metadata = {
          ...event.metadata,
          source: 'bulk-upload',
          ip: getClientIP(req),
          bulkIndex: index
        };
        validEvents.push(event);
      }
    });

    if (errors.length > 0 && validEvents.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'All events failed validation',
        errors: errors
      });
    }

    const savedEvents = await AnalyticsEvent.insertMany(validEvents, { ordered: false });

    res.json({
      success: true,
      message: `Successfully processed ${savedEvents.length} events`,
      savedCount: savedEvents.length,
      failedCount: events.length - savedEvents.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('❌ Bulk events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process bulk events',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
});

// ✅ ENHANCED: Endpoint to check if analytics is working
router.get('/status', async (req, res) => {
  try {
    const eventCount = await AnalyticsEvent.countDocuments();
    const lastEvent = await AnalyticsEvent.findOne().sort({ timestamp: -1 });
    
    res.json({
      success: true,
      status: 'operational',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        totalEvents: eventCount,
        lastEvent: lastEvent ? lastEvent.timestamp : null
      },
      features: {
        pageview_tracking: true,
        event_tracking: true,
        post_analytics: true,
        utm_tracking: true,
        dashboard: true,
        bulk_operations: true,
        health_checks: true
      },
      system: {
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime()
      }
    });
  } catch (error) {
    console.error('❌ Status endpoint error:', error);
    res.status(500).json({
      success: false,
      status: 'degraded',
      message: 'Analytics service status check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ✅ ADDED: Utility function to get client IP
function getClientIP(req) {
  try {
    return req.ip || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
           'unknown';
  } catch (error) {
    return 'unknown';
  }
}

// ✅ ADDED: Cleanup old events endpoint (admin only)
router.delete('/cleanup', async (req, res) => {
  try {
    // Simple authentication check (you might want to enhance this)
    const { authorization } = req.headers;
    if (!authorization || authorization !== `Bearer ${process.env.ADMIN_TOKEN}`) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Admin token required'
      });
    }

    const { days = 365 } = req.query; // Default keep 1 year
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    console.log(`🧹 Cleaning up events older than ${days} days (before ${cutoffDate})`);

    const result = await AnalyticsEvent.deleteMany({
      timestamp: { $lt: cutoffDate }
    });

    console.log(`✅ Cleanup completed: Deleted ${result.deletedCount} events`);

    res.json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} events older than ${days} days`,
      deletedCount: result.deletedCount,
      cutoffDate: cutoffDate
    });

  } catch (error) {
    console.error('❌ Cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup old events',
      error: error.message
    });
  }
});

module.exports = router;