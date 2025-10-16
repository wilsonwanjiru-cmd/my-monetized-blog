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

// Import middleware
const cacheMiddleware = require('./middleware/cache');
const etagMiddleware = require('./middleware/etag');

const app = express();

// ✅ UPDATED: CORS Configuration for production domains
const corsOptions = {
  origin: [
    'https://wilsonmuita.com',
    'https://www.wilsonmuita.com',
    'https://api.wilsonmuita.com',
    'https://my-monetized-blog-2.onrender.com',
    'http://localhost:3000',
    'http://localhost:3001'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// ✅ FIXED: Use CORS middleware globally
app.use(cors(corsOptions));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Cache middleware for performance optimization
app.use(cacheMiddleware);
app.use(etagMiddleware);

// Set view engine for OG tags, AMP, and dynamic sitemaps
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ✅ ADDED: Root route to fix 404 error
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
      sitemap: '/sitemap.xml',
      robots: '/robots.txt',
      rss: '/rss.xml'
    }
  });
});

// API Routes
app.use('/api/posts', postsRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/consent', consentRoutes);

// SEO Routes
app.use('/', sitemapRoutes);
app.use('/', robotsRoutes);  
app.use('/', rssRoutes);
app.use('/', ampRoutes);
app.use('/', videoSitemapRoutes);

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
      enabled: true
    },
    features: {
      seo: true,
      analytics: true,
      monetization: true,
      caching: true,
      amp: true
    },
    database: {
      status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    }
  });
});

// ✅ MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/monetized-blog')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

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

// ✅ FIXED: Serve frontend build (React) after API routes with CORRECT SPA routing
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../frontend/build');
  
  // Serve static files from React build with optimized settings
  app.use(express.static(frontendPath, {
    index: false,
    maxAge: '1d',
    etag: true,
    lastModified: true
  }));

  // ✅ FIXED: Enhanced catch-all handler for SPA routing - CORRECT WILDCARD SYNTAX
  // Use regex pattern or parameterized wildcard instead of plain '*'
  app.get(/^\/(?!api|sitemap|robots|rss|video-sitemap).*$/, (req, res, next) => {
    // This regex matches all routes EXCEPT:
    // - /api/* (API routes)
    // - /sitemap.xml
    // - /robots.txt  
    // - /rss.xml
    // - /video-sitemap.xml
    
    console.log(`🔄 SPA Routing: Serving index.html for ${req.originalUrl}`);
    res.sendFile(path.join(frontendPath, 'index.html'), (err) => {
      if (err) {
        console.error(`❌ Error serving SPA route ${req.originalUrl}:`, err);
        next(err);
      }
    });
  });

  // ✅ ALTERNATIVE FIX: You can also use this approach with parameterized wildcard
  // app.get('*', (req, res, next) => {
  //   // Skip API and SEO routes
  //   if (req.originalUrl.startsWith('/api/') || 
  //       req.originalUrl.includes('.xml') || 
  //       req.originalUrl.includes('.txt') ||
  //       req.originalUrl === '/sitemap' ||
  //       req.originalUrl === '/robots' ||
  //       req.originalUrl === '/rss' ||
  //       req.originalUrl === '/video-sitemap') {
  //     return next();
  //   }
    
  //   console.log(`🔄 SPA Routing: Serving index.html for ${req.originalUrl}`);
  //   res.sendFile(path.join(frontendPath, 'index.html'), (err) => {
  //     if (err) {
  //       console.error(`❌ Error serving SPA route ${req.originalUrl}:`, err);
  //       next(err);
  //     }
  //   });
  // });
}

// Error handling middleware - ✅ IMPROVED: Better error handling
app.use((err, req, res, next) => {
  console.error('🔥 Error:', err.stack);
  
  // Check if headers already sent
  if (res.headersSent) {
    return next(err);
  }
  
  res.status(err.status || 500).json({ 
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong!' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// ✅ FIXED: 404 handler for unknown API routes - MOVED AFTER SPA ROUTING
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
        '/sitemap.xml',
        '/robots.txt',
        '/rss.xml'
      ]
    });
  }
  
  // For non-API routes that reach here, it means the route wasn't handled
  next(); // Let it fall through to the final 404 handler
});

// ✅ ADDED: Final 404 handler for all unhandled routes
app.use((req, res) => {
  if (req.xhr || req.headers.accept.indexOf('json') > -1) {
    // API-like request expecting JSON
    res.status(404).json({ 
      success: false,
      message: 'Route not found',
      path: req.originalUrl
    });
  } else {
    // Regular web request
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
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Frontend Domain: https://wilsonmuita.com`);
  console.log(`🔗 Backend Domain: https://api.wilsonmuita.com`);
  console.log(`✅ Health check: https://api.wilsonmuita.com/api/health`);
  console.log(`✅ Root endpoint: https://api.wilsonmuita.com/`);
  console.log(`🌐 CORS enabled for: ${corsOptions.origin.join(', ')}`);
  console.log('✅ All features integrated successfully!');
  console.log('📊 Available features:');
  console.log('   - SEO: Sitemap, Robots, RSS, AMP');
  console.log('   - Analytics: Event tracking, heatmaps');
  console.log('   - Monetization: Ad injection, newsletter');
  console.log('   - Performance: Caching, broken link checker');
  console.log('   - Compliance: GDPR/CCPA consent management');
  console.log('   - SPA Routing: Enhanced client-side routing support');
});

// ✅ ADDED: Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});