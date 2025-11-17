// backend/routes/analytics.js
const express = require('express');
const router = express.Router();
const AnalyticsEvent = require('../models/AnalyticsEvent');

// ✅ ADDED: Event type mapping function to handle enum validation
function mapEventType(eventType) {
  const eventTypeMap = {
    // Core events
    'pageview': 'pageview',
    'click': 'click',
    'scroll': 'scroll',
    'form_submit': 'form_submit',
    
    // Mouse and interaction events
    'mouse_movements_batch': 'custom',
    'scroll_depth': 'scroll',
    'scroll_milestone': 'scroll',
    
    // Custom events
    'event': 'custom',
    'custom': 'custom',
    'other': 'other',
    
    // Post events
    'post_view': 'post_view',
    
    // Health and system events
    'health_check': 'health_check'
  };
  
  return eventTypeMap[eventType] || 'custom';
}

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

// ✅ ADDED: Database connection check
router.get('/db-status', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const dbState = mongoose.connection.readyState;
    const states = {
      0: 'disconnected',
      1: 'connected', 
      2: 'connecting',
      3: 'disconnecting'
    };

    // Test database operation
    const count = await AnalyticsEvent.countDocuments();
    const recentEvent = await AnalyticsEvent.findOne().sort({ timestamp: -1 });

    return res.json({
      success: true,
      database: {
        state: states[dbState],
        readyState: dbState,
        totalEvents: count,
        lastEvent: recentEvent ? recentEvent.timestamp : null
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Database status check failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// ✅ ENHANCED: Test endpoint to verify analytics routes are working
router.get('/test', (req, res) => {
  try {
    return res.json({
      success: true,
      message: 'Analytics routes are working correctly!',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      endpoints: {
        pageview: 'POST /api/analytics/pageview',
        event: 'POST /api/analytics/event',
        track: 'POST /api/analytics/track',
        stats: 'GET /api/analytics/stats',
        dashboard: 'GET /api/analytics/dashboard',
        health: 'GET /api/analytics/health',
        status: 'GET /api/analytics/status',
        dbStatus: 'GET /api/analytics/db-status'
      }
    });
  } catch (error) {
    console.error('❌ Test endpoint error:', error);
    return res.status(500).json({
      success: false,
      message: 'Test endpoint failed',
      error: error.message
    });
  }
});

// ✅ FIXED: Enhanced pageview tracking with event type mapping
router.post('/pageview', async (req, res) => {
  let analyticsEvent;
  
  try {
    console.log('📊 Pageview request received:', {
      body: req.body,
      headers: {
        'content-type': req.headers['content-type'],
        'user-agent': req.headers['user-agent']
      },
      timestamp: new Date().toISOString()
    });

    const { 
      sessionId, 
      page, 
      url,
      eventType = 'pageview',
      eventName = 'page_view',
      type = 'pageview',
      metadata = {},
      title,
      referrer,
      userAgent,
      timestamp,
      screenResolution,
      language,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      ...otherFields
    } = req.body;

    // ✅ FIXED: Enhanced validation
    if (!sessionId) {
      console.error('❌ Validation failed: Missing sessionId');
      return res.status(400).json({
        success: false,
        message: 'Missing required field: sessionId',
        received: Object.keys(req.body)
      });
    }

    if (!page && !url) {
      console.error('❌ Validation failed: Missing both page and url');
      return res.status(400).json({
        success: false,
        message: 'Missing required field: page or url',
        received: Object.keys(req.body)
      });
    }

    // ✅ FIXED: Smart page extraction
    let extractedPage = page;
    
    if (!extractedPage && url) {
      try {
        const urlObj = new URL(url);
        extractedPage = urlObj.pathname;
        console.log('🔍 Extracted page from URL:', extractedPage);
      } catch (error) {
        console.warn('⚠️ Could not parse URL, using URL as page:', url);
        extractedPage = url;
      }
    }

    // ✅ FIXED: Check if AnalyticsEvent model is properly connected
    if (!AnalyticsEvent || typeof AnalyticsEvent !== 'function') {
      console.error('❌ AnalyticsEvent model not properly initialized');
      return res.status(500).json({
        success: false,
        message: 'Analytics service not properly configured',
        error: 'Database model not available'
      });
    }

    // ✅ FIXED: Normalize language code
    const normalizedLanguage = language && language.includes('-') 
      ? language.split('-')[0] 
      : language || 'en';

    // ✅ FIXED: Use event type mapping to ensure valid enum values
    const finalEventType = mapEventType(eventType || type || 'pageview');
    const finalType = type || eventType || 'pageview';

    const eventData = {
      // Core required fields with proper mapping
      eventType: finalEventType,
      type: finalType,
      eventName: eventName,
      sessionId: sessionId.trim(),
      page: extractedPage.trim(),
      
      // Additional fields with fallbacks
      url: url || `https://wilsonmuita.com${extractedPage}`,
      title: title || metadata.title || 'Unknown Page',
      referrer: referrer || metadata.referrer || 'direct',
      userAgent: userAgent || metadata.userAgent || req.headers['user-agent'],
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      screenResolution: screenResolution || metadata.screenResolution || 'unknown',
      language: normalizedLanguage,
      
      // UTM parameters
      utmSource: utm_source,
      utmMedium: utm_medium,
      utmCampaign: utm_campaign,
      utmContent: utm_content,
      utmTerm: utm_term,
      
      // Metadata
      metadata: {
        ...metadata,
        ip: getClientIP(req),
        source: 'analytics-pageview',
        userAgent: req.headers['user-agent'],
        headers: {
          referer: req.get('Referer'),
          origin: req.get('Origin'),
          host: req.get('Host')
        },
        pageExtraction: {
          originalPage: page,
          fromUrl: !!url,
          finalPage: extractedPage
        }
      }
    };

    console.log('🔧 Creating analytics event with data:', {
      sessionId: eventData.sessionId.substring(0, 20) + '...',
      page: eventData.page,
      eventType: eventData.eventType,
      type: eventData.type,
      language: eventData.language
    });

    // ✅ FIXED: Create and save with better error handling
    analyticsEvent = new AnalyticsEvent(eventData);
    await analyticsEvent.save();
    
    console.log('✅ Pageview tracked successfully:', {
      eventId: analyticsEvent._id,
      sessionId: sessionId.substring(0, 20) + '...',
      page: extractedPage,
      eventType: finalEventType
    });

    return res.status(200).json({ 
      success: true,
      message: 'Pageview tracked successfully',
      eventId: analyticsEvent._id,
      eventType: finalEventType,
      timestamp: analyticsEvent.timestamp
    });

  } catch (error) {
    console.error('❌ Analytics error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
      keyPattern: error.keyPattern,
      keyValue: error.keyValue
    });
    
    // ✅ FIXED: More specific error handling
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Data validation failed',
        error: error.message,
        details: error.errors
      });
    }
    
    if (error.name === 'MongoError' || error.name === 'MongoServerError') {
      return res.status(500).json({
        success: false,
        message: 'Database error',
        error: error.message,
        code: error.code
      });
    }
    
    return res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

// ✅ FIXED: Enhanced event tracking with event type mapping
router.post('/event', async (req, res) => {
  try {
    console.log('📊 Event request received:', {
      eventName: req.body.eventName,
      sessionId: req.body.sessionId?.substring(0, 20) + '...',
      page: req.body.page,
      eventType: req.body.eventType,
      type: req.body.type
    });

    const {
      type = 'event',
      eventType = type,
      sessionId,
      page,
      eventName,
      eventData,
      userAgent,
      timestamp,
      utmSource,
      utmMedium,
      utmCampaign,
      url,
      title,
      referrer,
      language,
      ...otherFields
    } = req.body;

    // ✅ FIXED: Enhanced validation
    if (!sessionId || !eventName) {
      console.warn('⚠️ Event validation failed: Missing sessionId or eventName');
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: sessionId and eventName are required',
        required: ['sessionId', 'eventName'],
        received: Object.keys(req.body)
      });
    }

    // ✅ FIXED: Normalize language code
    const normalizedLanguage = language && language.includes('-') 
      ? language.split('-')[0] 
      : language || 'en';

    // ✅ FIXED: Use event type mapping to ensure valid enum values
    const finalEventType = mapEventType(eventType || type || 'event');
    const finalType = type || eventType || 'event';

    const event = new AnalyticsEvent({
      eventType: finalEventType,
      type: finalType,
      sessionId,
      page: page || req.get('Referer') || 'unknown',
      eventName,
      eventData: eventData || {},
      userAgent: userAgent || req.get('User-Agent'),
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      utmSource,
      utmMedium,
      utmCampaign,
      url: url || req.get('Referer') || 'unknown',
      title: title || 'Custom Event',
      referrer: referrer || req.get('Referer') || 'direct',
      language: normalizedLanguage,
      metadata: {
        ip: getClientIP(req),
        source: 'analytics-event',
        userAgent: req.get('User-Agent'),
        headers: {
          referer: req.get('Referer'),
          origin: req.get('Origin')
        },
        eventData: eventData || {},
        fieldMapping: {
          receivedEventType: eventType,
          receivedType: type,
          finalEventType: finalEventType,
          finalType: finalType
        }
      }
    });

    await event.save();

    console.log('✅ Event tracked successfully:', {
      eventName: eventName,
      eventId: event._id,
      eventType: finalEventType,
      type: finalType
    });

    return res.json({
      success: true,
      message: 'Event tracked successfully',
      eventId: event._id,
      eventName: eventName,
      eventType: finalEventType,
      timestamp: event.timestamp
    });

  } catch (error) {
    console.error('❌ Analytics event tracking error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Event data validation failed',
        error: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Failed to track event',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ✅ FIXED: Enhanced /track endpoint with event type mapping
router.post('/track', async (req, res) => {
  try {
    console.log('📊 Track request received (main route):', {
      eventName: req.body.eventName,
      sessionId: req.body.sessionId?.substring(0, 20) + '...',
      eventType: req.body.eventType,
      type: req.body.type,
      page: req.body.page
    });

    const {
      type = 'event',
      eventType = type,
      sessionId,
      page,
      eventName,
      eventData,
      userAgent,
      timestamp,
      utmSource,
      utmMedium,
      utmCampaign,
      url,
      title,
      referrer,
      language,
      ...otherFields
    } = req.body;

    // ✅ FIXED: Enhanced validation with better error messages
    if (!sessionId) {
      console.warn('⚠️ Track validation failed: Missing sessionId');
      return res.status(400).json({
        success: false,
        message: 'Missing required field: sessionId',
        received: Object.keys(req.body),
        required: ['sessionId', 'eventName']
      });
    }

    // ✅ FIXED: Handle missing eventName by using eventType
    const finalEventName = eventName || eventType;
    if (!finalEventName) {
      console.warn('⚠️ Track validation failed: Missing both eventName and eventType');
      return res.status(400).json({
        success: false,
        message: 'Missing required field: eventName or eventType',
        received: Object.keys(req.body),
        required: ['sessionId', 'eventName']
      });
    }

    // ✅ FIXED: Normalize language code
    const normalizedLanguage = language && language.includes('-') 
      ? language.split('-')[0] 
      : language || 'en';

    // ✅ FIXED: Use event type mapping to ensure valid enum values
    const finalEventType = mapEventType(eventType || type || 'custom');
    const finalType = type || eventType || 'custom';

    const eventPayload = {
      eventType: finalEventType,
      type: finalType,
      sessionId: sessionId,
      page: page || url || req.get('Referer') || 'unknown',
      eventName: finalEventName,
      eventData: eventData || {},
      userAgent: userAgent || req.get('User-Agent'),
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      utmSource: utmSource,
      utmMedium: utmMedium,
      utmCampaign: utmCampaign,
      url: url || req.get('Referer') || 'unknown',
      title: title || 'Custom Event',
      referrer: referrer || req.get('Referer') || 'direct',
      language: normalizedLanguage,
      metadata: {
        ...(eventData || {}),
        ip: getClientIP(req),
        source: 'analytics-track-main',
        userAgent: req.get('User-Agent'),
        headers: {
          referer: req.get('Referer'),
          origin: req.get('Origin')
        },
        fieldMapping: {
          receivedEventType: eventType,
          receivedType: type,
          finalEventType: finalEventType,
          finalType: finalType,
          finalEventName: finalEventName
        }
      }
    };

    console.log('🔧 Track event payload (main route):', {
      sessionId: sessionId?.substring(0, 20) + '...',
      eventName: eventPayload.eventName,
      eventType: finalEventType,
      type: finalType
    });

    const event = new AnalyticsEvent(eventPayload);
    await event.save();

    console.log('✅ Track event processed successfully (main route):', {
      eventName: finalEventName,
      eventId: event._id,
      eventType: finalEventType
    });

    return res.status(201).json({ 
      success: true,
      message: 'Event tracked successfully',
      eventId: event._id,
      eventName: eventPayload.eventName,
      eventType: finalEventType,
      timestamp: event.timestamp
    });

  } catch (error) {
    console.error('❌ Track route error (main):', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Event data validation failed',
        error: error.message,
        details: error.errors
      });
    }
    
    if (error.name === 'MongoError' || error.name === 'MongoServerError') {
      return res.status(500).json({
        success: false,
        message: 'Database error during event tracking',
        error: error.message,
        code: error.code
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Failed to track event',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ✅ FIXED: Enhanced post-specific views with event type mapping
router.post('/postview', async (req, res) => {
  try {
    console.log('📊 Postview request received:', {
      postId: req.body.postId,
      title: req.body.title?.substring(0, 50) + '...',
      eventType: req.body.eventType,
      type: req.body.type
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
      sessionId,
      language,
      eventType = 'post_view',
      type = 'post_view'
    } = req.body;

    if (!postId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: postId'
      });
    }

    // ✅ FIXED: Normalize language code
    const normalizedLanguage = language && language.includes('-') 
      ? language.split('-')[0] 
      : language || 'en';

    // ✅ FIXED: Use event type mapping
    const finalEventType = mapEventType(eventType || type || 'post_view');
    const finalType = type || eventType || 'post_view';

    const event = new AnalyticsEvent({
      eventType: finalEventType,
      type: finalType,
      sessionId: sessionId || `post_${postId}_${Date.now()}`,
      page: url || req.get('Referer') || 'direct',
      eventName: 'post_view',
      title: title || 'Blog Post',
      url: url || req.get('Referer') || 'direct',
      referrer: referrer || 'direct',
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      language: normalizedLanguage,
      metadata: {
        ip: getClientIP(req),
        source: 'analytics-postview',
        userAgent: req.get('User-Agent'),
        postId: postId,
        eventData: {
          postId,
          title,
          slug,
          category,
          readTime,
          referrer: referrer || 'direct'
        },
        fieldMapping: {
          receivedEventType: eventType,
          receivedType: type,
          finalEventType: finalEventType,
          finalType: finalType
        }
      }
    });

    await event.save();

    console.log('✅ Post view tracked successfully:', {
      postId: postId,
      eventId: event._id,
      eventType: finalEventType
    });

    return res.json({
      success: true,
      message: 'Post view tracked successfully',
      eventId: event._id,
      postId: postId,
      eventType: finalEventType
    });

  } catch (error) {
    console.error('❌ Error tracking post view:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to track post view',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ✅ FIXED: Get basic analytics stats
router.get('/stats', async (req, res) => {
  try {
    const { days = 30, type, eventType } = req.query;
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

    const matchQuery = {
      timestamp: { $gte: startDate }
    };

    if (type) {
      matchQuery.type = type;
    }
    if (eventType) {
      matchQuery.eventType = eventType;
    }

    const totalEvents = await AnalyticsEvent.countDocuments(matchQuery);

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
          eventType: '$_id',
          count: 1,
          uniqueSessions: { $size: '$uniqueSessions' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const eventsByEventType = await AnalyticsEvent.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$eventType',
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

    const uniqueSessions = await AnalyticsEvent.distinct('sessionId', matchQuery);
    const uniqueSessionsCount = uniqueSessions.length;

    const pageViews = await AnalyticsEvent.countDocuments({
      ...matchQuery,
      $or: [
        { type: 'pageview' },
        { eventType: 'pageview' }
      ]
    });

    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentActivity = await AnalyticsEvent.countDocuments({
      timestamp: { $gte: last24Hours }
    });

    console.log('✅ Analytics stats fetched successfully');

    return res.json({
      success: true,
      data: {
        totalEvents,
        pageViews,
        uniqueSessions: uniqueSessionsCount,
        eventsByType,
        eventsByEventType,
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
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics stats',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ✅ FIXED: Get comprehensive analytics for dashboard
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

    const eventTypeSummary = await AnalyticsEvent.aggregate([
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
          eventType: '$_id',
          count: 1,
          uniqueSessions: { $size: '$uniqueSessions' }
        }
      },
      { $sort: { count: -1 } }
    ]);

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

    const topPages = await AnalyticsEvent.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate },
          $or: [
            { type: 'pageview' },
            { eventType: 'pageview' }
          ]
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
            $sum: {
              $cond: [
                { $or: [{ $eq: ['$type', 'pageview'] }, { $eq: ['$eventType', 'pageview'] }] },
                1,
                0
              ]
            }
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

    return res.json({
      success: true,
      period: `${days} days`,
      summary: {
        totalEvents: eventSummary.reduce((sum, item) => sum + item.count, 0),
        totalUniqueSessions: [...new Set(eventSummary.flatMap(item => item.uniqueSessions))].length,
        topPagesCount: topPages.length,
        campaignsTracked: campaignPerformance.length
      },
      eventSummary,
      eventTypeSummary,
      dailyTrend,
      topPages,
      campaignPerformance,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Dashboard analytics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ✅ FIXED: Get UTM parameters report
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
            $sum: {
              $cond: [
                { $or: [{ $eq: ['$type', 'pageview'] }, { $eq: ['$eventType', 'pageview'] }] },
                1,
                0
              ]
            }
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

    return res.json({
      success: true,
      report: utmReport,
      filters: { source, medium, campaign, days },
      totalResults: utmReport.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ UTM report error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch UTM report',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
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
    
    const testEvent = new AnalyticsEvent({
      eventType: 'health_check',
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

    return res.json({
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
    return res.status(500).json({
      success: false,
      status: 'unhealthy',
      message: 'Analytics API health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ✅ FIXED: Enhanced bulk events endpoint with event type mapping
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

    const validEvents = [];
    const errors = [];

    events.forEach((event, index) => {
      if (!event.sessionId || (!event.page && !event.eventName)) {
        errors.push(`Event ${index}: Missing required fields (sessionId and eventName or page)`);
      } else {
        if (!event.timestamp) {
          event.timestamp = new Date();
        }
        
        // ✅ FIXED: Use event type mapping for bulk events
        const finalEventType = mapEventType(event.eventType || event.type || 'custom');
        const finalType = event.type || event.eventType || 'custom';
        
        event.eventType = finalEventType;
        event.type = finalType;
        
        if (event.language && event.language.includes('-')) {
          event.language = event.language.split('-')[0];
        }
        
        event.metadata = {
          ...event.metadata,
          source: 'bulk-upload',
          ip: getClientIP(req),
          bulkIndex: index,
          fieldMapping: {
            receivedEventType: event.eventType,
            receivedType: event.type,
            finalEventType: finalEventType,
            finalType: finalType
          }
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

    console.log(`✅ Bulk events processed: ${savedEvents.length} successful`);

    return res.json({
      success: true,
      message: `Successfully processed ${savedEvents.length} events`,
      savedCount: savedEvents.length,
      failedCount: events.length - savedEvents.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('❌ Bulk events error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process bulk events',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ✅ FIXED: Endpoint to check if analytics is working
router.get('/status', async (req, res) => {
  try {
    const eventCount = await AnalyticsEvent.countDocuments();
    const lastEvent = await AnalyticsEvent.findOne().sort({ timestamp: -1 });
    
    return res.json({
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
        track_tracking: true,
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
    return res.status(500).json({
      success: false,
      status: 'degraded',
      message: 'Analytics service status check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ✅ FIXED: Cleanup old events endpoint
router.delete('/cleanup', async (req, res) => {
  try {
    const { authorization } = req.headers;
    if (!authorization || authorization !== `Bearer ${process.env.ADMIN_TOKEN}`) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Admin token required'
      });
    }

    const { days = 365 } = req.query;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    console.log(`🧹 Cleaning up events older than ${days} days (before ${cutoffDate})`);

    const result = await AnalyticsEvent.deleteMany({
      timestamp: { $lt: cutoffDate }
    });

    console.log(`✅ Cleanup completed: Deleted ${result.deletedCount} events`);

    return res.json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} events older than ${days} days`,
      deletedCount: result.deletedCount,
      cutoffDate: cutoffDate
    });

  } catch (error) {
    console.error('❌ Cleanup error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to cleanup old events',
      error: error.message
    });
  }
});

module.exports = router;