// backend/index.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import routes
const postsRoutes = require('./routes/posts');
const contactRoutes = require('./routes/contact');
const newsletterRoutes = require('./routes/newsletter'); 
const sitemapRoutes = require('./routes/sitemap');
const robotsRoutes = require('./routes/robots');
const rssRoutes = require('./routes/rss');
const ampRoutes = require('./routes/amp');
const analyticsRoutes = require('./routes/analytics');
const consentRoutes = require('./routes/consent');
const videoSitemapRoutes = require('./routes/videoSitemap');
const privacyRoutes = require('./routes/privacy');

// Import middleware
const etagMiddleware = require('./middleware/etag');

const app = express();

// ✅ ADDED: Trust proxy for Render deployment
app.set('trust proxy', 1);

// ✅ ENHANCED: CORS Configuration with better preflight handling
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'https://wilsonmuita.com',
      'https://www.wilsonmuita.com',
      'https://api.wilsonmuita.com',
      'https://my-monetized-blog-2.onrender.com',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
      'http://localhost:5000' // ✅ ADDED: for backend self-requests
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn('⚠️ CORS Blocked Origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: [
    'Content-Length',
    'Content-Type',
    'Authorization',
    'ETag'
  ],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400 // 24 hours
};

// ✅ CRITICAL: Use CORS middleware globally FIRST
app.use(cors(corsOptions));

// ✅ FIXED: Handle preflight requests with proper regex pattern instead of '*'
app.options(/.*/, cors(corsOptions));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Use ETag middleware for conditional requests
app.use(etagMiddleware);

// ✅ UPDATED: Set view engine for EJS templates
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Route debugging middleware
app.use((req, res, next) => {
  if (req.originalUrl.includes('/api/analytics')) {
    console.log(`🔍 Analytics Route Hit: ${req.method} ${req.originalUrl}`);
  }
  next();
});

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Backend API is running successfully!', 
    timestamp: new Date().toISOString(),
    domain: 'api.wilsonmuita.com',
    status: 'active',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      posts: '/api/posts',
      contact: '/api/contact',
      newsletter: '/api/newsletter',
      analytics: '/api/analytics',
      privacy: '/api/privacy-policy',
      sitemap: '/sitemap.xml',
      robots: '/robots.txt',
      rss: '/rss.xml'
    }
  });
});

// Analytics test endpoint
app.get('/api/analytics/test', (req, res) => {
  res.json({
    success: true,
    message: 'Analytics API is working correctly!',
    timestamp: new Date().toISOString(),
    endpoints: {
      pageview: 'POST /api/analytics/pageview',
      track: 'POST /api/analytics/track',
      stats: 'GET /api/analytics/stats',
      dashboard: 'GET /api/analytics/dashboard',
      privacy: 'GET /api/privacy-policy'
    }
  });
});

// ✅ FIXED: Mount API routes BEFORE the SPA catch-all handler
app.use('/api/posts', postsRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/analytics', analyticsRoutes); // ✅ MAIN ANALYTICS ROUTES
app.use('/api/consent', consentRoutes);
app.use('/api', privacyRoutes);

// ✅ FIXED: Mount SEO routes
app.use('/', sitemapRoutes);
app.use('/', robotsRoutes);  
app.use('/', rssRoutes);
app.use('/', ampRoutes);
app.use('/', videoSitemapRoutes);

// ✅ FIXED: Mount blog routes AFTER API routes but BEFORE SPA handler
app.use('/', postsRoutes); // This handles /blog/:slug and /blog routes

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Blog API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    domain: 'api.wilsonmuita.com',
    cors: {
      allowedOrigins: corsOptions.origin,
      enabled: true,
      methods: corsOptions.methods,
      headers: corsOptions.allowedHeaders
    },
    features: {
      seo: true,
      analytics: true,
      monetization: true,
      caching: true,
      amp: true,
      privacy: true,
      server_rendering: true
    },
    database: {
      status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    },
    routes: {
      analytics: 'active',
      posts: 'active',
      contact: 'active',
      newsletter: 'active',
      consent: 'active',
      privacy: 'active',
      blog_pages: 'active'
    }
  });
});

// ✅ UPDATED: MongoDB connection with deprecated options removed
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/monetized-blog', {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    console.log('💡 Tip: Check your MONGODB_URI in .env file');
  });

// Initialize broken link checker (run daily in production)
if (process.env.NODE_ENV === 'production') {
  const BrokenLinkChecker = require('./utils/brokenLinkChecker');
  const cron = require('node-cron');
  
  const brokenLinkChecker = new BrokenLinkChecker();
  
  // Run broken link check daily at 2 AM
  cron.schedule('0 2 * * *', () => {
    console.log('🔍 Running broken link checker...');
    brokenLinkChecker.scanPostLinks();
  });
} else {
  console.log('⏰ Broken link checker disabled in development');
}

// Ad injection middleware for monetization
app.use('/api/posts', (req, res, next) => {
  res.locals.adInjectionEnabled = true;
  next();
});

// ✅ FIXED: Serve frontend build (React) in production with PROPER route ordering
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../frontend/build');
  
  // Serve static files from React build with optimized settings
  app.use(express.static(frontendPath, {
    index: false,
    maxAge: '1d',
    etag: true,
    lastModified: true
  }));

  // ✅ FIXED: Use proper regex pattern instead of '*' to avoid PathError
  app.get(/^(?!\/api|\/sitemap\.xml|\/robots\.txt|\/rss\.xml|\/video-sitemap\.xml|\/blog|\/image-sitemap\.xml|\/sitemap-index\.xml|\/sitemap-posts\.xml).*$/, (req, res, next) => {
    // This regex matches all routes EXCEPT:
    // - /api/* (API routes)
    // - /sitemap.xml and other sitemap variations
    // - /robots.txt  
    // - /rss.xml
    // - /video-sitemap.xml
    // - /blog/* (Blog routes - handled by Express EJS templates)
    
    console.log(`🔄 SPA Routing: Serving index.html for ${req.originalUrl}`);
    res.sendFile(path.join(frontendPath, 'index.html'), (err) => {
      if (err) {
        console.error(`❌ Error serving SPA route ${req.originalUrl}:`, err);
        next(err);
      }
    });
  });
}

// ✅ UPDATED: Fallback analytics track route (temporary until main routes are confirmed working)
app.post('/api/analytics/track', cors(corsOptions), async (req, res) => {
  try {
    console.log('🔍 Fallback Track Route Hit:', {
      sessionId: req.body.sessionId?.substring(0, 20) + '...',
      eventName: req.body.eventName,
      type: req.body.type
    });
    
    // Import AnalyticsEvent directly for fallback
    const AnalyticsEvent = require('./models/AnalyticsEvent');
    
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
      utmCampaign,
      url,
      title,
      referrer,
      language,
      ...otherFields
    } = req.body;

    // ✅ FIXED: Updated validation to match frontend payload
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: sessionId'
      });
    }

    if (!eventName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: eventName'
      });
    }

    // ✅ FIXED: Normalize language code
    const normalizedLanguage = language && language.includes('-') 
      ? language.split('-')[0] 
      : language || 'en';

    // ✅ FIXED: Create proper event structure that matches AnalyticsEvent model
    const eventPayload = {
      eventType: type, // Use 'type' as eventType
      type: type,
      sessionId: sessionId,
      page: page || url || req.get('Referer') || 'unknown',
      eventName: eventName,
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
        ip: req.ip || req.connection.remoteAddress,
        source: 'fallback-track-route',
        userAgent: req.get('User-Agent'),
        headers: {
          referer: req.get('Referer'),
          origin: req.get('Origin')
        }
      }
    };

    const event = new AnalyticsEvent(eventPayload);
    await event.save();

    // ✅ FIXED: Consistent response format
    res.status(201).json({ 
      success: true,
      message: 'Event tracked successfully',
      eventId: event._id,
      eventName: eventPayload.eventName,
      timestamp: event.timestamp
    });

  } catch (error) {
    console.error('❌ Fallback track error:', error);
    
    // ✅ FIXED: Better error response with consistent format
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Event data validation failed',
        error: error.message
      });
    }
    
    // ✅ FIXED: Always return valid JSON
    res.status(500).json({
      success: false,
      message: 'Failed to track event',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ✅ UPDATED: Debug endpoint to check which analytics routes are active
app.get('/api/analytics/debug', (req, res) => {
  res.json({
    success: true,
    message: 'Analytics routes debug information',
    timestamp: new Date().toISOString(),
    routes: {
      mainPageview: 'POST /api/analytics/pageview (via analyticsRoutes)',
      mainTrack: 'POST /api/analytics/track (via analyticsRoutes)',
      fallbackPageview: 'DISABLED - Using main route',
      fallbackTrack: 'ENABLED - Fallback route active (temporary)'
    },
    status: {
      pageview: '✅ Working (using main routes)',
      track: '🔄 Working (fallback route active - check main routes)'
    },
    recommendation: 'Verify main analytics routes in backend/routes/analytics.js have /track endpoint'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('🔥 Error:', err.stack);
  
  // Check if headers already sent
  if (res.headersSent) {
    return next(err);
  }
  
  // Handle CORS errors specifically
  if (err.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      message: 'CORS policy blocked the request',
      error: err.message,
      allowedOrigins: corsOptions.origin
    });
  }
  
  // ✅ FIXED: Ensure all error responses are valid JSON
  res.status(err.status || 500).json({ 
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong!' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// 404 handler for unknown API routes
app.use((req, res, next) => {
  // Only handle API routes with 404 JSON response
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({ 
      success: false,
      message: 'API route not found',
      path: req.originalUrl,
      suggestion: 'Check the API documentation for available endpoints',
      availableEndpoints: [
        '/api/health',
        '/api/posts',
        '/api/contact', 
        '/api/newsletter',
        '/api/analytics',
        '/api/consent',
        '/api/privacy-policy',
        '/sitemap.xml',
        '/robots.txt',
        '/rss.xml'
      ]
    });
  }
  
  // For non-API routes that reach here, it means the route wasn't handled
  next(); // Let it fall through to the final 404 handler
});

// Final 404 handler for all unhandled routes
app.use((req, res) => {
  if (req.xhr || req.headers.accept.indexOf('json') > -1) {
    // API-like request expecting JSON
    res.status(404).json({ 
      success: false,
      message: 'Route not found',
      path: req.originalUrl
    });
  } else {
    // Regular web request - render 404 EJS template if available
    try {
      res.status(404).render('404', {
        siteName: "Wilson's Blog",
        siteUrl: process.env.SITE_URL || 'https://wilsonmuita.com'
      });
    } catch (e) {
      // Fallback if 404.ejs doesn't exist yet
      res.status(404).send(`
        <html>
          <head>
            <title>404 - Page Not Found</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              h1 { color: #333; }
              a { color: #667eea; text-decoration: none; }
              a:hover { text-decoration: underline; }
            </style>
          </head>
          <body>
            <h1>404 - Page Not Found</h1>
            <p>The page you are looking for does not exist.</p>
            <p><a href="/">Go to Homepage</a></p>
          </body>
        </html>
      `);
    }
  }
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Frontend Domain: https://wilsonmuita.com`);
  console.log(`🔗 Backend Domain: https://api.wilsonmuita.com`);
  console.log(`✅ Health check: https://api.wilsonmuita.com/api/health`);
  console.log(`✅ Root endpoint: https://api.wilsonmuita.com/`);
  console.log(`✅ Analytics test: https://api.wilsonmuita.com/api/analytics/test`);
  console.log(`✅ Analytics debug: https://api.wilsonmuita.com/api/analytics/debug`);
  console.log(`✅ Privacy Policy: https://api.wilsonmuita.com/api/privacy-policy`);
  console.log(`🌐 CORS enabled for: ${corsOptions.origin}`);
  console.log('✅ All features integrated successfully!');
  console.log('📊 Available features:');
  console.log('   - SEO: Sitemap, Robots, RSS, AMP');
  console.log('   - Analytics: Event tracking, heatmaps');
  console.log('   - Monetization: Ad injection, newsletter');
  console.log('   - Performance: ETag support, conditional requests');
  console.log('   - Compliance: GDPR/CCPA consent management, Privacy Policy');
  console.log('   - SPA Routing: Enhanced client-side routing support');
  console.log('   - Server Rendering: EJS templates for blog pages');
  console.log('🔧 Analytics Configuration:');
  console.log('   - ✅ Pageview: Using main analytics routes');
  console.log('   - 🔄 Track: Using fallback route (temporary)');
  console.log('   - ✅ Debug endpoint: /api/analytics/debug');
  console.log('💡 Recommendation: Update backend/routes/analytics.js with proper /track endpoint');
  console.log('🔧 Additional Fixes Applied:');
  console.log('   - ✅ Added localhost:5000 to CORS allowed origins');
  console.log('   - ✅ Removed deprecated MongoDB options');
  console.log('   - ✅ Added trust proxy for Render deployment');
  console.log('🔧 Sitemap Routes:');
  console.log('   - ✅ Main sitemap: /sitemap.xml');
  console.log('   - ✅ Posts sitemap: /sitemap-posts.xml');
  console.log('   - ✅ Image sitemap: /image-sitemap.xml');
  console.log('   - ✅ Sitemap index: /sitemap-index.xml');
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    mongoose.connection.close();
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    mongoose.connection.close();
  });
});

// MongoDB connection event handlers
mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connected successfully');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});

module.exports = app;