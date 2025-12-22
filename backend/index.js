// backend/index.js - FULLY FIXED VERSION
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
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

// ✅ Add error handling for uncaught exceptions and rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  console.error('Stack:', reason.stack || reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('Stack:', error.stack);
});

// ✅ SECURITY: Trust proxy for Render deployment
app.set('trust proxy', 1);

// ✅ CRITICAL FIX: Enhanced CORS Configuration
const allowedOrigins = [
  'https://wilsonmuita.com',
  'https://www.wilsonmuita.com',
  'https://api.wilsonmuita.com',
  'https://my-monetized-blog-2.onrender.com',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://localhost:5000'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin in development
    if (!origin && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // In production, be strict about origins
    if (process.env.NODE_ENV === 'production') {
      if (!origin) {
        console.warn('⚠️ Production: Request with no origin blocked');
        return callback(new Error('Origin required in production'), false);
      }
      
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        console.warn('❌ Production CORS Blocked Origin:', origin);
        return callback(new Error(`Origin ${origin} not allowed by CORS`), false);
      }
    } else {
      // Development - more permissive
      if (!origin || allowedOrigins.includes(origin) || origin.includes('localhost')) {
        return callback(null, true);
      }
      console.warn('⚠️ Development CORS Blocked Origin:', origin);
      return callback(new Error('Not allowed by CORS'), false);
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
    'Access-Control-Request-Headers',
    'X-CSRF-Token'
  ],
  exposedHeaders: [
    'Content-Length',
    'Content-Type',
    'Authorization',
    'ETag',
    'X-Request-ID'
  ],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400 // 24 hours
};

// ✅ SECURITY: Use Helmet for security headers (with CSP disabled for easier debugging)
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for now to avoid issues
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// ✅ PERFORMANCE: Compression middleware
app.use(compression());

// ✅ CRITICAL: Apply CORS middleware globally
app.use(cors(corsOptions));

// ✅ FIXED: Handle preflight requests with a regex instead of '*'
app.options(/.*/, (req, res) => {
  // Set CORS headers
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers, X-CSRF-Token');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.status(204).end();
});

// ✅ RATE LIMITING: Protect analytics endpoints
const analyticsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to analytics routes
app.use('/api/analytics', analyticsLimiter);

// ✅ BODY PARSING: Increase limits for analytics payloads
app.use(express.json({ 
  limit: '10mb'
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ ENHANCED: Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const requestId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  
  // Log request details for analytics endpoints
  if (req.originalUrl.includes('/api/analytics')) {
    console.log(`🔍 [${requestId}] Analytics Request:`, {
      method: req.method,
      url: req.originalUrl,
      origin: req.get('origin') || 'no-origin',
      userAgent: req.get('user-agent')?.substring(0, 100) || 'unknown',
      ip: req.ip
    });
    
    // Log request body for debugging (limited to first 500 chars)
    if (req.body && Object.keys(req.body).length > 0) {
      const bodyStr = JSON.stringify(req.body);
      console.log(`📦 [${requestId}] Request Body Preview:`, bodyStr.substring(0, 500));
    }
  }
  
  // Add request ID to response headers
  res.setHeader('X-Request-ID', requestId);
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.originalUrl.includes('/api/analytics')) {
      console.log(`✅ [${requestId}] Analytics Response:`, {
        status: res.statusCode,
        duration: `${duration}ms`,
        contentLength: res.get('Content-Length') || 'unknown'
      });
    }
  });
  
  next();
});

// Use ETag middleware for conditional requests
app.use(etagMiddleware);

// ✅ UPDATED: Set view engine for EJS templates
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ✅ CRITICAL: Root route for health checks
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Backend API is running successfully!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    domain: 'api.wilsonmuita.com',
    cors: {
      enabled: true,
      allowedOrigins: allowedOrigins,
      frontend: 'https://wilsonmuita.com'
    },
    endpoints: {
      health: '/api/health',
      analytics: '/api/analytics/*',
      posts: '/api/posts',
      contact: '/api/contact',
      newsletter: '/api/newsletter',
      privacy: '/api/privacy-policy',
      sitemap: '/sitemap.xml',
      robots: '/robots.txt',
      rss: '/rss.xml'
    }
  });
});

// ✅ ENHANCED: Health check with database status
app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState;
    const dbStatusText = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    }[dbStatus] || 'unknown';

    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: {
        status: dbStatusText,
        readyState: dbStatus
      },
      cors: {
        enabled: true,
        allowedOrigins: allowedOrigins.length,
        frontendConfigured: allowedOrigins.includes('https://wilsonmuita.com')
      },
      endpoints: {
        analytics: 'operational',
        posts: 'operational',
        contact: 'operational',
        newsletter: 'operational'
      }
    });
  } catch (error) {
    console.error('❌ Health check failed:', error);
    res.status(500).json({
      success: false,
      status: 'degraded',
      message: 'Health check failed',
      error: error.message,
      database: {
        status: 'disconnected',
        readyState: mongoose.connection.readyState
      }
    });
  }
});

// ✅ MOUNT ROUTES: Analytics routes FIRST (for proper middleware chain)
app.use('/api/analytics', analyticsRoutes);

// Mount other API routes
app.use('/api/posts', postsRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/consent', consentRoutes);
app.use('/api', privacyRoutes);

// ✅ MOUNT SEO routes
app.use('/', sitemapRoutes);
app.use('/', robotsRoutes);
app.use('/', rssRoutes);
app.use('/', ampRoutes);
app.use('/', videoSitemapRoutes);

// ✅ MOUNT blog routes
app.use('/', postsRoutes);

// ✅ MONGODB Connection with enhanced error handling
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/monetized-blog';

mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  minPoolSize: 2,
}).then(() => {
  console.log('✅ Connected to MongoDB');
  console.log(`📊 Database: ${MONGODB_URI.split('@')[1]?.split('/')[1] || 'local'}`);
}).catch((err) => {
  console.error('❌ MongoDB connection error:', err.message);
  console.log('💡 Tip: Check your MONGODB_URI in Render environment variables');
  
  // Don't crash in development
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// MongoDB event handlers
mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connection established');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});

// ✅ INITIALIZE: Broken link checker in production
if (process.env.NODE_ENV === 'production') {
  try {
    const BrokenLinkChecker = require('./utils/brokenLinkChecker');
    const cron = require('node-cron');
    
    const brokenLinkChecker = new BrokenLinkChecker();
    
    // Run broken link check daily at 2 AM
    cron.schedule('0 2 * * *', () => {
      console.log('🔍 Running broken link checker...');
      brokenLinkChecker.scanPostLinks();
    });
    
    console.log('✅ Broken link checker scheduled');
  } catch (error) {
    console.warn('⚠️ Broken link checker not available:', error.message);
  }
}

// ✅ FALLBACK Analytics endpoints (for emergency debugging)
app.post('/api/analytics/debug-pageview', async (req, res) => {
  try {
    console.log('🛠️ Debug Pageview Request:', {
      headers: req.headers,
      body: req.body,
      ip: req.ip,
      origin: req.get('origin')
    });

    // Minimal validation for debug endpoint
    if (!req.body.sessionId || !req.body.page) {
      return res.status(400).json({
        success: false,
        message: 'Missing sessionId or page',
        received: Object.keys(req.body)
      });
    }

    // Import AnalyticsEvent directly
    const AnalyticsEvent = require('./models/AnalyticsEvent');
    
    const eventData = {
      eventType: 'pageview',
      type: 'pageview',
      eventName: 'page_view',
      sessionId: req.body.sessionId,
      page: req.body.page,
      url: req.body.url || `https://wilsonmuita.com${req.body.page}`,
      title: req.body.title || 'Unknown Page',
      referrer: req.body.referrer || 'direct',
      userAgent: req.body.userAgent || req.get('User-Agent'),
      timestamp: new Date(),
      metadata: {
        source: 'debug-endpoint',
        ip: req.ip,
        debug: true
      }
    };

    const event = new AnalyticsEvent(eventData);
    await event.save();

    res.json({
      success: true,
      message: 'Debug pageview tracked',
      eventId: event._id,
      debug: true
    });
  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Debug endpoint failed',
      error: error.message
    });
  }
});

// ✅ TEST Endpoint for CORS verification
app.get('/api/test-cors', (req, res) => {
  res.json({
    success: true,
    message: 'CORS test successful',
    timestamp: new Date().toISOString(),
    cors: {
      origin: req.get('origin'),
      allowed: allowedOrigins.includes(req.get('origin')),
      headers: {
        'Access-Control-Allow-Origin': req.get('origin') || '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    },
    request: {
      origin: req.get('origin'),
      referer: req.get('referer'),
      userAgent: req.get('user-agent')?.substring(0, 100)
    }
  });
});

// ✅ Serve frontend build in production
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../frontend/build');
  
  // Serve static files from React build
  app.use(express.static(frontendPath, {
    index: false,
    maxAge: '1d',
    etag: true,
    lastModified: true
  }));

  // ✅ FIXED: SPA fallback route - using regex instead of wildcard to avoid path-to-regexp error
  app.get('(.*)', (req, res, next) => {
    // Skip if it's an API route or static file route
    const excludedRoutes = [
      '/api/',
      '/sitemap.xml',
      '/robots.txt',
      '/rss.xml',
      '/video-sitemap.xml',
      '/blog/',
      '/image-sitemap.xml',
      '/sitemap-index.xml',
      '/sitemap-posts.xml',
      '/amp/'
    ];
    
    const isExcluded = excludedRoutes.some(route => {
      if (route.endsWith('/')) {
        return req.originalUrl.startsWith(route);
      }
      return req.originalUrl === route;
    });
    
    // Also skip if it's a file with extension (like .js, .css, .png, etc.)
    const hasExtension = /\.\w+$/.test(req.originalUrl);
    
    if (isExcluded || hasExtension) {
      return next();
    }
    
    // Serve index.html for all other routes (SPA routing)
    console.log(`🔄 SPA Routing: ${req.originalUrl}`);
    res.sendFile(path.join(frontendPath, 'index.html'), (err) => {
      if (err) {
        console.error(`❌ Error serving SPA route ${req.originalUrl}:`, err);
        next(err);
      }
    });
  });
}

// ✅ FIXED: 404 handler for API routes
app.use((req, res, next) => {
  // Check if this is an API route that wasn't handled
  if (req.originalUrl.startsWith('/api/')) {
    // List of valid API route prefixes
    const validApiRoutes = [
      '/api/health',
      '/api/analytics',
      '/api/posts',
      '/api/contact',
      '/api/newsletter',
      '/api/consent',
      '/api/privacy-policy',
      '/api/test-cors'
    ];
    
    // Check if this specific API route was likely handled
    const wasHandled = validApiRoutes.some(route => 
      req.originalUrl.startsWith(route)
    );
    
    // If it's an API route that starts with a valid prefix but wasn't handled, return 404
    if (!wasHandled) {
      return res.status(404).json({
        success: false,
        message: 'API endpoint not found',
        path: req.originalUrl,
        availableEndpoints: [
          '/api/health',
          '/api/analytics/*',
          '/api/posts',
          '/api/contact',
          '/api/newsletter',
          '/api/consent',
          '/api/privacy-policy',
          '/api/test-cors',
          '/api/analytics/debug-pageview'
        ]
      });
    }
  }
  
  next();
});

// ✅ ENHANCED Error handling middleware
app.use((err, req, res, next) => {
  console.error('🔥 Server Error:', {
    message: err.message,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    stack: err.stack
  });

  // Handle CORS errors
  if (err.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      message: 'CORS policy blocked the request',
      error: err.message,
      allowedOrigins: allowedOrigins
    });
  }

  // Handle JSON parse errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON in request body',
      error: 'JSON parse error'
    });
  }

  // Handle path-to-regexp errors
  if (err.message && err.message.includes('Missing parameter name')) {
    console.error('⚠️ Path-to-regexp error detected. Please check route patterns.');
    return res.status(500).json({
      success: false,
      message: 'Server configuration error',
      error: 'Route pattern parsing failed'
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// ✅ Final 404 handler
app.use((req, res) => {
  if (req.xhr || req.headers.accept?.includes('json')) {
    res.status(404).json({
      success: false,
      message: 'Route not found',
      path: req.originalUrl
    });
  } else {
    res.status(404).send(`
      <html>
        <head><title>404 - Page Not Found</title></head>
        <body>
          <h1>404 - Page Not Found</h1>
          <p>The page you are looking for does not exist.</p>
          <p><a href="/">Go to Homepage</a></p>
        </body>
      </html>
    `);
  }
});

// ✅ Start server
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`
🚀 Server started successfully!
📡 Port: ${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
🔗 Frontend: https://wilsonmuita.com
⚙️ Backend: http://localhost:${PORT}

✅ Health Checks:
   • http://localhost:${PORT}/api/health
   • http://localhost:${PORT}/api/test-cors

✅ Analytics Endpoints:
   • POST http://localhost:${PORT}/api/analytics/pageview
   • POST http://localhost:${PORT}/api/analytics/debug-pageview

🔧 CORS Configuration:
   • Allowed Origins: ${allowedOrigins.length} domains
   • Frontend: https://wilsonmuita.com ✓
   • Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH
   • Credentials: Enabled

📊 Database:
   • Status: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Connecting...'}
   • URI: ${MONGODB_URI.split('@')[1] ? 'Configured' : 'Local'}

💡 Next Steps:
   1. Test CORS: Visit http://localhost:${PORT}/api/test-cors
   2. Test Analytics: Run: curl -X POST http://localhost:${PORT}/api/analytics/debug-pageview -H "Content-Type: application/json" -d '{"sessionId":"test123","page":"/test"}'
   3. Check frontend console for 400 error details
  `);
});

// ✅ Graceful shutdown
const shutdown = (signal) => {
  console.log(`\n${signal} received, shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;