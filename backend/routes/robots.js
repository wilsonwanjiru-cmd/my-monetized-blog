// backend/routes/robots.js
const express = require('express');
const router = express.Router();

// Robots.txt route
router.get('/robots.txt', (req, res) => {
  const siteUrl = process.env.SITE_URL || 'https://wilsonmuita.com';
  
  const robotsTxt = `# robots.txt for ${siteUrl}
# Generated automatically - Do not edit manually

User-agent: *
Allow: /

# Essential directories to allow
Allow: /css/
Allow: /js/
Allow: /images/
Allow: /fonts/
Allow: /static/
Allow: /public/

# Directories to disallow
Disallow: /admin/
Disallow: /api/
Disallow: /private/
Disallow: /tmp/
Disallow: /cgi-bin/
Disallow: /backend/
Disallow: /node_modules/

# Crawl directives
Crawl-delay: 1

# Sitemap Configuration
Sitemap: ${siteUrl}/sitemap.xml
Sitemap: ${siteUrl}/sitemap-posts.xml
Sitemap: ${siteUrl}/image-sitemap.xml
Sitemap: ${siteUrl}/sitemap-index.xml

# Search Engine Specific Directives

# Googlebot
User-agent: Googlebot
Allow: /
Crawl-delay: 1

# Bingbot
User-agent: Bingbot
Allow: /
Crawl-delay: 1

# Social media bots
User-agent: Twitterbot
Allow: /

User-agent: facebookexternalhit
Allow: /

User-agent: LinkedInBot
Allow: /

User-agent: Pinterest
Allow: /

# Block AI training bots (optional)
User-agent: ChatGPT-User
Disallow: /

User-agent: GPTBot
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: Anthropic-ai
Disallow: /

# Block aggressive scraping bots
User-agent: MJ12bot
Crawl-delay: 5

User-agent: AhrefsBot
Crawl-delay: 5

User-agent: SemrushBot
Crawl-delay: 5

User-agent: DotBot
Crawl-delay: 5

User-agent: MauiBot
Disallow: /

# Development and staging blocking
User-agent: *
Disallow: /staging/
Disallow: /dev/
Disallow: /test/
Disallow: /localhost/

# API protection
Disallow: /api/auth/
Disallow: /api/admin/
Disallow: /api/analytics/debug

# Form protection
Disallow: /comments/post/
Disallow: /contact/post/
Disallow: /newsletter/submit/

# Dynamic content that shouldn't be indexed
Disallow: /search?
Disallow: /filter?
Disallow: /sort?
Disallow: /page=
Disallow: /?utm_
Disallow: /?ref=

# Allow important pages
Allow: /blog/
Allow: /about/
Allow: /contact/
Allow: /privacy/
Allow: /disclaimer/
Allow: /categories/
Allow: /tags/

# AMP pages
Allow: /amp/

# Thank you for respecting our robots.txt file!`;

  res.type('text/plain');
  res.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
  res.send(robotsTxt);
});

module.exports = router;