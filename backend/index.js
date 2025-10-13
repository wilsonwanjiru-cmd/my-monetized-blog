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
const analyticsRoutes = require('./routes/analytics'); // Make sure this path is correct
const consentRoutes = require('./routes/consent');
const videoSitemapRoutes = require('./routes/videoSitemap');

// Import middleware
const cacheMiddleware = require('./middleware/cache');
const etagMiddleware = require('./middleware/etag');

const app = express();

// ✅ UPDATED: CORS Configuration for production and development
const corsOptions = {
  origin: [
    'https://my-monetized-blog-2.onrender.com', // Your live frontend URL
    'http://localhost:3000', // Local development frontend
    'http://localhost:3001' // Alternative local port
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// ✅ FIXED: Use CORS middleware globally. This automatically handles preflight for all routes.
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

// API Routes - ✅ CRITICAL: Make sure analyticsRoutes is properly mounted
app.use('/api/posts', postsRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/analytics', analyticsRoutes); // This should mount all analytics routes
app.use('/api/consent', consentRoutes);

// SEO Routes
app.use('/', sitemapRoutes);        // Handles /sitemap.xml
app.use('/', robotsRoutes);         // Handles /robots.txt  
app.use('/', rssRoutes);            // Handles /rss.xml
app.use('/', ampRoutes);            // Handles AMP routes
app.use('/', videoSitemapRoutes);   // Handles /video-sitemap.xml

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Blog API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
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

// ✅ ENHANCED: Serve frontend build (React) after API routes with improved SPA routing
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../frontend/build');
  
  // Serve static files from React build with optimized settings
  app.use(express.static(frontendPath, {
    index: false, // Don't serve index.html for directory requests
    maxAge: '1d', // Cache static assets for 1 day
    etag: true, // Enable ETag for cache validation
    lastModified: true // Enable last-modified headers
  }));

  // Enhanced catch-all handler for SPA routing
  app.get('*', (req, res, next) => {
    // Skip API routes - let them be handled by API routes or 404 handler
    if (req.originalUrl.startsWith('/api/')) {
      return next();
    }
    
    // Skip SEO and known file routes that should be handled by specific routes
    if (req.originalUrl.includes('.xml') || 
        req.originalUrl.includes('.txt') ||
        req.originalUrl.includes('sitemap') ||
        req.originalUrl.includes('robots') ||
        req.originalUrl.includes('rss')) {
      return next();
    }
    
    // Serve index.html for all other routes (SPA fallback)
    console.log(`🔄 SPA Routing: Serving index.html for ${req.originalUrl}`);
    res.sendFile(path.join(frontendPath, 'index.html'), (err) => {
      if (err) {
        console.error(`❌ Error serving SPA route ${req.originalUrl}:`, err);
        next(err);
      }
    });
  });
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

// ✅ 404 handler for unknown API routes (only if not handled above)
app.use((req, res) => {
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
  
  // For non-API routes that reach here, it means the SPA routing didn't work
  // This should not happen in production with the enhanced SPA configuration
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
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
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