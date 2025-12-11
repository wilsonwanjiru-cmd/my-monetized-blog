// backend/routes/analytics.js
const express = require('express');
const router = express.Router();
const AnalyticsEvent = require('../models/AnalyticsEvent');

// ✅ UPDATED: Enhanced event type mapping function to handle enum validation
function mapEventType(eventType) {
  const eventTypeMap = {
    // Core events
    'pageview': 'pageview',
    'page_view': 'pageview',
    'click': 'click',
    'scroll': 'scroll',
    'form_submit': 'form_submit',
    'form_submit': 'form_submit',
    
    // Mouse and interaction events
    'mouse_movements_batch': 'custom',
    'mouse_movements': 'custom',
    'scroll_depth': 'scroll',
    'scroll_milestone': 'scroll',
    
    // Custom events
    'event': 'custom',
    'custom': 'custom',
    'other': 'other',
    
    // Engagement events
    'engagement': 'engagement',
    'conversion': 'conversion',
    'social': 'social',
    'error': 'error',
    'performance': 'performance',
    'session': 'session',
    
    // Post events
    'post_view': 'post_view',
    'post': 'post_view',
    
    // Health and system events
    'health_check': 'health_check',
    'health': 'health_check'
  };
  
  if (!eventType) return 'custom';
  
  const normalizedType = eventType.toLowerCase().trim();
  return eventTypeMap[normalizedType] || 'custom';
}

// ✅ UPDATED: Enhanced utility function to get client IP
function getClientIP(req) {
  try {
    return req.ip || 
           req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.connection?.remoteAddress || 
           req.socket?.remoteAddress ||
           (req.connection?.socket ? req.connection.socket.remoteAddress : null) ||
           'unknown';
  } catch (error) {
    return 'unknown';
  }
}

// ✅ UPDATED: Database connection check with more details
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
    const dbStats = await AnalyticsEvent.db.db.stats();

    return res.json({
      success: true,
      database: {
        state: states[dbState],
        readyState: dbState,
        totalEvents: count,
        lastEvent: recentEvent ? recentEvent.timestamp : null,
        collections: dbStats.collections,
        dataSize: `${Math.round(dbStats.dataSize / 1024 / 1024)}MB`,
        indexSize: `${Math.round(dbStats.indexSize / 1024 / 1024)}MB`
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Database status check failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
      version: '1.2.0',
      endpoints: {
        pageview: 'POST /api/analytics/pageview',
        event: 'POST /api/analytics/event',
        track: 'POST /api/analytics/track',
        stats: 'GET /api/analytics/stats',
        dashboard: 'GET /api/analytics/dashboard',
        health: 'GET /api/analytics/health',
        status: 'GET /api/analytics/status',
        dbStatus: 'GET /api/analytics/db-status',
        utmReport: 'GET /api/analytics/utm-report',
        bulk: 'POST /api/analytics/bulk',
        cleanup: 'DELETE /api/analytics/cleanup'
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

// ✅ CRITICAL FIX: Enhanced pageview tracking with BOTH snake_case and camelCase support
router.post('/pageview', async (req, res) => {
  let analyticsEvent;
  
  try {
    console.log('📊 Pageview request received:', {
      bodyKeys: Object.keys(req.body),
      contentType: req.headers['content-type'],
      userAgent: req.headers['user-agent']?.substring(0, 100),
      timestamp: new Date().toISOString()
    });

    // ✅ CRITICAL: Accept BOTH snake_case and camelCase
    const { 
      // Core fields
      sessionId, 
      page, 
      url,
      
      // Event fields - both formats
      eventType = 'pageview',
      event_type = eventType,
      eventName = 'page_view',
      event_name = eventName,
      type = 'pageview',
      
      // Content fields - both formats
      title,
      referrer,
      userAgent,
      user_agent = userAgent,
      timestamp,
      screenResolution,
      screen_resolution = screenResolution,
      language,
      
      // UTM parameters - BOTH FORMATS
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm,
      
      // Metadata
      metadata = {},
      
      ...otherFields
    } = req.body;

    // ✅ ENHANCED: Use camelCase OR snake_case (camelCase takes priority)
    const finalSessionId = sessionId?.trim();
    const finalPage = page?.trim();
    const finalUrl = url;
    const finalEventType = eventType || event_type || 'pageview';
    const finalEventName = eventName || event_name || 'page_view';
    const finalType = type || 'pageview';
    const finalUserAgent = userAgent || user_agent || req.headers['user-agent'];
    const finalScreenResolution = screenResolution || screen_resolution || 'unknown';
    
    // ✅ CRITICAL: UTM parameters - camelCase takes priority, fallback to snake_case
    const finalUtmSource = utmSource || utm_source;
    const finalUtmMedium = utmMedium || utm_medium;
    const finalUtmCampaign = utmCampaign || utm_campaign;
    const finalUtmContent = utmContent || utm_content;
    const finalUtmTerm = utmTerm || utm_term;

    // ✅ ENHANCED: Validation with detailed error messages
    if (!finalSessionId) {
      console.error('❌ Validation failed: Missing sessionId');
      return res.status(400).json({
        success: false,
        message: 'Missing required field: sessionId',
        received: Object.keys(req.body),
        required: ['sessionId', 'page or url'],
        fieldMapping: {
          sessionId: 'sessionId',
          page: 'page',
          url: 'url',
          eventType: 'eventType or event_type',
          eventName: 'eventName or event_name'
        }
      });
    }

    if (!finalPage && !finalUrl) {
      console.error('❌ Validation failed: Missing both page and url');
      return res.status(400).json({
        success: false,
        message: 'Missing required field: page or url',
        received: Object.keys(req.body),
        receivedValues: {
          page: finalPage,
          url: finalUrl
        }
      });
    }

    // ✅ ENHANCED: Smart page extraction
    let extractedPage = finalPage;
    
    if (!extractedPage && finalUrl) {
      try {
        const urlObj = new URL(finalUrl);
        extractedPage = urlObj.pathname;
        console.log('🔍 Extracted page from URL:', extractedPage);
      } catch (error) {
        console.warn('⚠️ Could not parse URL, using URL as page:', finalUrl);
        extractedPage = finalUrl;
      }
    }

    // ✅ FIXED: Normalize language code
    const normalizedLanguage = (language && language.includes('-')) 
      ? language.split('-')[0] 
      : language || 'en';

    // ✅ FIXED: Use event type mapping to ensure valid enum values
    const mappedEventType = mapEventType(finalEventType || finalType || 'pageview');
    const finalMappedEventType = mappedEventType === 'pageview' ? 'pageview' : 'custom';

    // ✅ CRITICAL: Build event data with BOTH camelCase for database
    const eventData = {
      // Core required fields
      eventType: finalMappedEventType,
      type: finalType,
      eventName: finalEventName,
      sessionId: finalSessionId,
      page: extractedPage,
      
      // Additional fields with fallbacks
      url: finalUrl || `https://wilsonmuita.com${extractedPage}`,
      title: title || metadata.title || 'Unknown Page',
      referrer: referrer || metadata.referrer || 'direct',
      userAgent: finalUserAgent,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      screenResolution: finalScreenResolution,
      language: normalizedLanguage,
      
      // UTM parameters - stored in camelCase
      utmSource: finalUtmSource,
      utmMedium: finalUtmMedium,
      utmCampaign: finalUtmCampaign,
      utmContent: finalUtmContent,
      utmTerm: finalUtmTerm,
      
      // Metadata with detailed field mapping info
      metadata: {
        ...metadata,
        ip: getClientIP(req),
        source: 'analytics-pageview',
        userAgent: finalUserAgent,
        headers: {
          referer: req.get('Referer'),
          origin: req.get('Origin'),
          host: req.get('Host')
        },
        pageExtraction: {
          originalPage: finalPage,
          fromUrl: !!finalUrl,
          finalPage: extractedPage
        },
        fieldMapping: {
          sessionId: { received: sessionId, final: finalSessionId },
          page: { received: finalPage, final: extractedPage },
          eventType: { received: finalEventType, mapped: finalMappedEventType },
          eventName: { received: finalEventName },
          utmSource: { snake_case: utm_source, camelCase: utmSource, final: finalUtmSource },
          utmMedium: { snake_case: utm_medium, camelCase: utmMedium, final: finalUtmMedium },
          utmCampaign: { snake_case: utm_campaign, camelCase: utmCampaign, final: finalUtmCampaign },
          timestamp: { received: timestamp, parsed: timestamp ? new Date(timestamp) : new Date() }
        }
      }
    };

    console.log('🔧 Creating analytics event with data:', {
      sessionId: eventData.sessionId.substring(0, 20) + '...',
      page: eventData.page,
      eventType: eventData.eventType,
      type: eventData.type,
      language: eventData.language,
      utmSource: eventData.utmSource,
      utmMedium: eventData.utmMedium
    });

    // ✅ Create and save with better error handling
    analyticsEvent = new AnalyticsEvent(eventData);
    await analyticsEvent.save();
    
    console.log('✅ Pageview tracked successfully:', {
      eventId: analyticsEvent._id,
      sessionId: finalSessionId.substring(0, 20) + '...',
      page: extractedPage,
      eventType: finalMappedEventType,
      timestamp: analyticsEvent.timestamp
    });

    return res.status(200).json({ 
      success: true,
      message: 'Pageview tracked successfully',
      eventId: analyticsEvent._id,
      eventType: finalMappedEventType,
      timestamp: analyticsEvent.timestamp,
      fieldMapping: {
        utmAccepted: {
          snake_case: {
            utm_source: !!utm_source,
            utm_medium: !!utm_medium,
            utm_campaign: !!utm_campaign
          },
          camelCase: {
            utmSource: !!utmSource,
            utmMedium: !!utmMedium,
            utmCampaign: !!utmCampaign
          }
        }
      }
    });

  } catch (error) {
    console.error('❌ Analytics error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      keyPattern: error.keyPattern,
      keyValue: error.keyValue
    });
    
    // ✅ ENHANCED: More specific error handling
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Data validation failed',
        error: error.message,
        details: error.errors,
        validationErrors: Object.keys(error.errors).map(key => ({
          field: key,
          message: error.errors[key].message,
          value: error.errors[key].value
        }))
      });
    }
    
    if (error.name === 'MongoError' || error.name === 'MongoServerError') {
      return res.status(500).json({
        success: false,
        message: 'Database error',
        error: error.message,
        code: error.code,
        operation: 'pageview_save'
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

// ✅ CRITICAL FIX: Enhanced event tracking with BOTH snake_case and camelCase support
router.post('/event', async (req, res) => {
  try {
    console.log('📊 Event request received:', {
      eventName: req.body.eventName || req.body.event_name,
      sessionId: req.body.sessionId?.substring(0, 20) + '...',
      page: req.body.page,
      eventType: req.body.eventType || req.body.event_type,
      type: req.body.type
    });

    // ✅ CRITICAL: Accept BOTH snake_case and camelCase
    const {
      // Core fields - both formats
      type = 'event',
      eventType = type,
      event_type = eventType,
      sessionId,
      page,
      eventName,
      event_name = eventName,
      eventData,
      event_data = eventData,
      
      // Content fields - both formats
      userAgent,
      user_agent = userAgent,
      timestamp,
      
      // UTM parameters - BOTH FORMATS
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm,
      
      // Additional fields
      url,
      title,
      referrer,
      language,
      
      ...otherFields
    } = req.body;

    // ✅ CRITICAL: Use camelCase OR snake_case (camelCase takes priority)
    const finalSessionId = sessionId?.trim();
    const finalPage = page?.trim();
    const finalEventName = eventName || event_name;
    const finalEventData = eventData || event_data || {};
    const finalUserAgent = userAgent || user_agent || req.headers['user-agent'];
    const finalEventType = eventType || event_type || type || 'custom';
    const finalType = type || 'event';
    
    // ✅ CRITICAL: UTM parameters - camelCase takes priority, fallback to snake_case
    const finalUtmSource = utmSource || utm_source;
    const finalUtmMedium = utmMedium || utm_medium;
    const finalUtmCampaign = utmCampaign || utm_campaign;
    const finalUtmContent = utmContent || utm_content;
    const finalUtmTerm = utmTerm || utm_term;

    // ✅ ENHANCED: Validation with better error messages
    if (!finalSessionId || !finalEventName) {
      console.warn('⚠️ Event validation failed: Missing sessionId or eventName');
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: sessionId and eventName are required',
        required: ['sessionId', 'eventName'],
        received: Object.keys(req.body),
        fieldMapping: {
          sessionId: 'sessionId',
          eventName: 'eventName or event_name',
          eventType: 'eventType or event_type or type'
        }
      });
    }

    // ✅ FIXED: Normalize language code
    const normalizedLanguage = (language && language.includes('-')) 
      ? language.split('-')[0] 
      : language || 'en';

    // ✅ FIXED: Use event type mapping to ensure valid enum values
    const mappedEventType = mapEventType(finalEventType || finalType || 'event');
    const finalMappedEventType = mappedEventType === 'event' ? 'custom' : mappedEventType;

    const event = new AnalyticsEvent({
      // Core fields
      eventType: finalMappedEventType,
      type: finalType,
      sessionId: finalSessionId,
      page: finalPage || req.get('Referer') || 'unknown',
      eventName: finalEventName,
      
      // Event data
      eventData: finalEventData,
      
      // Additional fields
      userAgent: finalUserAgent,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      
      // UTM parameters
      utmSource: finalUtmSource,
      utmMedium: finalUtmMedium,
      utmCampaign: finalUtmCampaign,
      utmContent: finalUtmContent,
      utmTerm: finalUtmTerm,
      
      // Optional fields
      url: url || req.get('Referer') || 'unknown',
      title: title || 'Custom Event',
      referrer: referrer || req.get('Referer') || 'direct',
      language: normalizedLanguage,
      
      // Metadata with field mapping info
      metadata: {
        ...finalEventData,
        ip: getClientIP(req),
        source: 'analytics-event',
        userAgent: finalUserAgent,
        headers: {
          referer: req.get('Referer'),
          origin: req.get('Origin')
        },
        fieldMapping: {
          sessionId: { received: sessionId, final: finalSessionId },
          eventName: { received: finalEventName },
          eventType: { 
            received: finalEventType, 
            mapped: finalMappedEventType,
            snake_case: event_type,
            camelCase: eventType
          },
          eventData: { snake_case: !!event_data, camelCase: !!eventData },
          utmSource: { snake_case: utm_source, camelCase: utmSource, final: finalUtmSource },
          utmMedium: { snake_case: utm_medium, camelCase: utmMedium, final: finalUtmMedium }
        }
      }
    });

    await event.save();

    console.log('✅ Event tracked successfully:', {
      eventName: finalEventName,
      eventId: event._id,
      eventType: finalMappedEventType,
      type: finalType
    });

    return res.json({
      success: true,
      message: 'Event tracked successfully',
      eventId: event._id,
      eventName: finalEventName,
      eventType: finalMappedEventType,
      timestamp: event.timestamp
    });

  } catch (error) {
    console.error('❌ Analytics event tracking error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Event data validation failed',
        error: error.message,
        details: error.errors
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Failed to track event',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ✅ CRITICAL FIX: Enhanced /track endpoint with BOTH snake_case and camelCase support
router.post('/track', async (req, res) => {
  try {
    console.log('📊 Track request received (main route):', {
      eventName: req.body.eventName || req.body.event_name,
      sessionId: req.body.sessionId?.substring(0, 20) + '...',
      eventType: req.body.eventType || req.body.event_type,
      type: req.body.type,
      page: req.body.page
    });

    // ✅ CRITICAL: Accept BOTH snake_case and camelCase
    const {
      // Core fields - both formats
      type = 'event',
      eventType = type,
      event_type = eventType,
      sessionId,
      page,
      eventName,
      event_name = eventName,
      eventData,
      event_data = eventData,
      
      // Content fields - both formats
      userAgent,
      user_agent = userAgent,
      timestamp,
      
      // UTM parameters - BOTH FORMATS
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm,
      
      // Additional fields
      url,
      title,
      referrer,
      language,
      
      ...otherFields
    } = req.body;

    // ✅ CRITICAL: Use camelCase OR snake_case (camelCase takes priority)
    const finalSessionId = sessionId?.trim();
    const finalPage = page?.trim();
    const finalEventName = eventName || event_name;
    const finalEventData = eventData || event_data || {};
    const finalUserAgent = userAgent || user_agent || req.headers['user-agent'];
    const finalEventType = eventType || event_type || type || 'custom';
    const finalType = type || 'event';
    
    // ✅ CRITICAL: UTM parameters - camelCase takes priority, fallback to snake_case
    const finalUtmSource = utmSource || utm_source;
    const finalUtmMedium = utmMedium || utm_medium;
    const finalUtmCampaign = utmCampaign || utm_campaign;
    const finalUtmContent = utmContent || utm_content;
    const finalUtmTerm = utmTerm || utm_term;

    // ✅ ENHANCED: Validation with better error messages
    if (!finalSessionId) {
      console.warn('⚠️ Track validation failed: Missing sessionId');
      return res.status(400).json({
        success: false,
        message: 'Missing required field: sessionId',
        received: Object.keys(req.body),
        required: ['sessionId', 'eventName or eventType'],
        fieldMapping: {
          sessionId: 'sessionId',
          eventName: 'eventName or event_name',
          eventType: 'eventType or event_type or type'
        }
      });
    }

    // ✅ FIXED: Handle missing eventName by using eventType
    const finalEventNameOrType = finalEventName || finalEventType;
    if (!finalEventNameOrType) {
      console.warn('⚠️ Track validation failed: Missing both eventName and eventType');
      return res.status(400).json({
        success: false,
        message: 'Missing required field: eventName or eventType',
        received: Object.keys(req.body),
        required: ['sessionId', 'eventName'],
        fieldMapping: {
          eventName: 'eventName or event_name',
          eventType: 'eventType or event_type',
          type: 'type'
        }
      });
    }

    // ✅ FIXED: Normalize language code
    const normalizedLanguage = (language && language.includes('-')) 
      ? language.split('-')[0] 
      : language || 'en';

    // ✅ FIXED: Use event type mapping to ensure valid enum values
    const mappedEventType = mapEventType(finalEventType || finalType || 'custom');
    const finalMappedEventType = mappedEventType === 'event' ? 'custom' : mappedEventType;

    const eventPayload = {
      // Core fields
      eventType: finalMappedEventType,
      type: finalType,
      sessionId: finalSessionId,
      page: finalPage || url || req.get('Referer') || 'unknown',
      eventName: finalEventNameOrType,
      
      // Event data
      eventData: finalEventData,
      
      // Additional fields
      userAgent: finalUserAgent,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      
      // UTM parameters
      utmSource: finalUtmSource,
      utmMedium: finalUtmMedium,
      utmCampaign: finalUtmCampaign,
      utmContent: finalUtmContent,
      utmTerm: finalUtmTerm,
      
      // Optional fields
      url: url || req.get('Referer') || 'unknown',
      title: title || 'Custom Event',
      referrer: referrer || req.get('Referer') || 'direct',
      language: normalizedLanguage,
      
      // Metadata with field mapping info
      metadata: {
        ...finalEventData,
        ip: getClientIP(req),
        source: 'analytics-track-main',
        userAgent: finalUserAgent,
        headers: {
          referer: req.get('Referer'),
          origin: req.get('Origin')
        },
        fieldMapping: {
          sessionId: { received: sessionId, final: finalSessionId },
          eventName: { 
            received: finalEventName, 
            fromEventType: !finalEventName ? finalEventType : null,
            final: finalEventNameOrType 
          },
          eventType: { 
            received: finalEventType, 
            mapped: finalMappedEventType,
            snake_case: event_type,
            camelCase: eventType
          },
          utmSource: { snake_case: utm_source, camelCase: utmSource, final: finalUtmSource },
          utmMedium: { snake_case: utm_medium, camelCase: utmMedium, final: finalUtmMedium },
          utmCampaign: { snake_case: utm_campaign, camelCase: utmCampaign, final: finalUtmCampaign }
        }
      }
    };

    console.log('🔧 Track event payload (main route):', {
      sessionId: finalSessionId?.substring(0, 20) + '...',
      eventName: eventPayload.eventName,
      eventType: finalMappedEventType,
      type: finalType,
      utmSource: eventPayload.utmSource,
      utmMedium: eventPayload.utmMedium
    });

    const event = new AnalyticsEvent(eventPayload);
    await event.save();

    console.log('✅ Track event processed successfully (main route):', {
      eventName: finalEventNameOrType,
      eventId: event._id,
      eventType: finalMappedEventType
    });

    return res.status(201).json({ 
      success: true,
      message: 'Event tracked successfully',
      eventId: event._id,
      eventName: eventPayload.eventName,
      eventType: finalMappedEventType,
      timestamp: event.timestamp,
      fieldMapping: {
        formatsAccepted: {
          snake_case: !!utm_source || !!utm_medium || !!utm_campaign,
          camelCase: !!utmSource || !!utmMedium || !!utmCampaign
        }
      }
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

// ✅ ENHANCED: Post-specific views with BOTH snake_case and camelCase support
router.post('/postview', async (req, res) => {
  try {
    console.log('📊 Postview request received:', {
      postId: req.body.postId,
      title: req.body.title?.substring(0, 50) + '...',
      eventType: req.body.eventType,
      type: req.body.type
    });

    // ✅ CRITICAL: Accept BOTH snake_case and camelCase
    const {
      postId,
      title,
      slug,
      category,
      readTime,
      read_time = readTime,
      url,
      referrer,
      timestamp,
      sessionId,
      language,
      eventType = 'post_view',
      event_type = eventType,
      type = 'post_view'
    } = req.body;

    if (!postId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: postId'
      });
    }

    // ✅ FIXED: Use camelCase OR snake_case
    const finalEventType = eventType || event_type || type || 'post_view';
    const finalType = type || 'post_view';
    const finalReadTime = readTime || read_time;

    // ✅ FIXED: Normalize language code
    const normalizedLanguage = (language && language.includes('-')) 
      ? language.split('-')[0] 
      : language || 'en';

    // ✅ FIXED: Use event type mapping
    const mappedEventType = mapEventType(finalEventType || finalType || 'post_view');
    const finalMappedEventType = mappedEventType === 'post' ? 'post_view' : mappedEventType;

    const event = new AnalyticsEvent({
      eventType: finalMappedEventType,
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
          readTime: finalReadTime,
          referrer: referrer || 'direct'
        },
        fieldMapping: {
          receivedEventType: finalEventType,
          receivedType: finalType,
          mappedEventType: finalMappedEventType,
          readTime: { snake_case: read_time, camelCase: readTime, final: finalReadTime }
        }
      }
    });

    await event.save();

    console.log('✅ Post view tracked successfully:', {
      postId: postId,
      eventId: event._id,
      eventType: finalMappedEventType
    });

    return res.json({
      success: true,
      message: 'Post view tracked successfully',
      eventId: event._id,
      postId: postId,
      eventType: finalMappedEventType
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

// ✅ ENHANCED: Get basic analytics stats
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
          $or: [
            { utmSource: { $exists: true, $ne: null } },
            { utmMedium: { $exists: true, $ne: null } },
            { utmCampaign: { $exists: true, $ne: null } }
          ]
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

// ✅ ENHANCED: Health check for analytics API
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
        ip: getClientIP(req),
        userAgent: req.get('User-Agent')
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
      routes: {
        pageview: 'working',
        event: 'working',
        track: 'working',
        postview: 'working',
        dashboard: 'working',
        utmReport: 'working'
      },
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
      version: '2.0.0'
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

// ✅ ENHANCED: Bulk events endpoint with BOTH snake_case and camelCase support
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
      try {
        // ✅ CRITICAL: Extract BOTH snake_case and camelCase fields
        const sessionId = event.sessionId?.trim();
        const eventName = event.eventName || event.event_name;
        const page = event.page?.trim();
        const eventType = event.eventType || event.event_type || event.type || 'custom';
        const type = event.type || 'event';
        
        // ✅ CRITICAL: UTM parameters - camelCase takes priority, fallback to snake_case
        const utmSource = event.utmSource || event.utm_source;
        const utmMedium = event.utmMedium || event.utm_medium;
        const utmCampaign = event.utmCampaign || event.utm_campaign;
        const utmContent = event.utmContent || event.utm_content;
        const utmTerm = event.utmTerm || event.utm_term;

        if (!sessionId || !eventName) {
          errors.push(`Event ${index}: Missing required fields (sessionId and eventName)`);
          return;
        }

        // ✅ FIXED: Use event type mapping
        const mappedEventType = mapEventType(eventType || type || 'custom');
        const finalEventType = mappedEventType === 'event' ? 'custom' : mappedEventType;

        // Normalize language code
        const language = event.language;
        const normalizedLanguage = (language && language.includes('-')) 
          ? language.split('-')[0] 
          : language || 'en';

        const processedEvent = {
          eventType: finalEventType,
          type: type,
          sessionId: sessionId,
          page: page || 'unknown',
          eventName: eventName,
          eventData: event.eventData || event.event_data || {},
          userAgent: event.userAgent || event.user_agent || req.headers['user-agent'],
          timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
          utmSource: utmSource,
          utmMedium: utmMedium,
          utmCampaign: utmCampaign,
          utmContent: utmContent,
          utmTerm: utmTerm,
          url: event.url || req.get('Referer') || 'unknown',
          title: event.title || 'Custom Event',
          referrer: event.referrer || 'direct',
          language: normalizedLanguage,
          metadata: {
            ...(event.metadata || {}),
            source: 'bulk-upload',
            ip: getClientIP(req),
            bulkIndex: index,
            fieldMapping: {
              sessionId: sessionId?.substring(0, 20) + '...',
              eventName: eventName,
              eventType: {
                received: eventType,
                mapped: finalEventType,
                snake_case: event.event_type,
                camelCase: event.eventType
              },
              utmSource: {
                snake_case: !!event.utm_source,
                camelCase: !!event.utmSource,
                final: utmSource
              }
            }
          }
        };

        validEvents.push(processedEvent);
      } catch (eventError) {
        errors.push(`Event ${index}: ${eventError.message}`);
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

// ✅ ENHANCED: Endpoint to check if analytics is working
router.get('/status', async (req, res) => {
  try {
    const eventCount = await AnalyticsEvent.countDocuments();
    const lastEvent = await AnalyticsEvent.findOne().sort({ timestamp: -1 });
    const last24Hours = await AnalyticsEvent.countDocuments({
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    
    return res.json({
      success: true,
      status: 'operational',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        totalEvents: eventCount,
        events24h: last24Hours,
        lastEvent: lastEvent ? {
          timestamp: lastEvent.timestamp,
          eventType: lastEvent.eventType,
          eventName: lastEvent.eventName
        } : null
      },
      features: {
        pageview_tracking: true,
        event_tracking: true,
        track_tracking: true,
        post_analytics: true,
        utm_tracking: true,
        dashboard: true,
        bulk_operations: true,
        health_checks: true,
        field_formats: ['camelCase', 'snake_case']
      },
      fieldSupport: {
        sessionId: ['sessionId'],
        eventName: ['eventName', 'event_name'],
        eventType: ['eventType', 'event_type', 'type'],
        userAgent: ['userAgent', 'user_agent'],
        utmSource: ['utmSource', 'utm_source'],
        utmMedium: ['utmMedium', 'utm_medium'],
        utmCampaign: ['utmCampaign', 'utm_campaign'],
        eventData: ['eventData', 'event_data']
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

// ✅ ENHANCED: Cleanup old events endpoint
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