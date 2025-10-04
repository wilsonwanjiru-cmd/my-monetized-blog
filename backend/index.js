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

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:3000', // Your React app URL
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Cache middleware for performance optimization
app.use(cacheMiddleware);

// Set view engine for OG tags, AMP, and dynamic sitemaps
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// API Routes
app.use('/api/posts', postsRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/analytics', analyticsRoutes);
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
    features: {
      seo: true,
      analytics: true,
      monetization: true,
      caching: true,
      amp: true
    }
  });
});

// ✅ FIXED: MongoDB connection without deprecated options
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
  // This will be used by the posts controller to inject ads
  res.locals.adInjectionEnabled = true;
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('🔥 Error:', err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!', 
    error: process.env.NODE_ENV === 'production' ? {} : err.message 
  });
});

// ✅ FIXED: 404 handler - CORRECT approach for Express
app.use((req, res) => {
  res.status(404).json({ 
    message: 'Route not found',
    path: req.originalUrl,
    suggestion: 'Check the API documentation for available endpoints',
    availableEndpoints: [
      '/api/health',
      '/api/posts',
      '/api/contact', 
      '/api/newsletter',
      '/sitemap.xml',
      '/robots.txt',
      '/rss.xml'
    ]
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log('✅ All features integrated successfully!');
  console.log('📊 Available features:');
  console.log('   - SEO: Sitemap, Robots, RSS, AMP');
  console.log('   - Analytics: Event tracking, heatmaps');
  console.log('   - Monetization: Ad injection, newsletter');
  console.log('   - Performance: Caching, broken link checker');
  console.log('   - Compliance: GDPR/CCPA consent management');
});