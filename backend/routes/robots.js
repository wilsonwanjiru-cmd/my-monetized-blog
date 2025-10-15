// routes/robots.txt
const express = require('express');
const router = express.Router();

router.get('/robots.txt', (req, res) => {
  // ✅ UPDATED: Use environment variable for site URL with fallback
  const siteUrl = process.env.SITE_URL || 'https://wilsonmuita.com';
  
  const robots = `# robots.txt for ${siteUrl}
# Generated automatically - Do not edit manually

User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /private/
Disallow: /tmp/
Disallow: /cgi-bin/

# Allow bots to access essential resources
Allow: /css/
Allow: /js/
Allow: /images/
Allow: /fonts/
Allow: /static/

# Crawl directives
Crawl-delay: 1

# SEO & Sitemap Configuration
Sitemap: ${siteUrl}/sitemap.xml
Sitemap: ${siteUrl}/image-sitemap.xml
Sitemap: ${siteUrl}/video-sitemap.xml

# Search Engine Specific Directives

# Googlebot
User-agent: Googlebot
Allow: /
Crawl-delay: 1
Disallow: /admin/
Disallow: /api/

# Bingbot
User-agent: Bingbot
Allow: /
Crawl-delay: 1
Disallow: /admin/
Disallow: /api/

# Twitterbot
User-agent: Twitterbot
Allow: /

# Facebook External Hit
User-agent: facebookexternalhit
Allow: /

# Allow all social media bots
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

# Block scraping bots
User-agent: MJ12bot
Crawl-delay: 5

User-agent: AhrefsBot
Crawl-delay: 5

User-agent: SemrushBot
Crawl-delay: 5

# Development and staging blocking
User-agent: *
Disallow: /staging/
Disallow: /dev/
Disallow: /test/

# API rate limiting protection
User-agent: *
Disallow: /api/auth/
Disallow: /api/admin/

# Comment and form submission paths (protect from spam)
Disallow: /comments/post/
Disallow: /contact/post/
Disallow: /newsletter/submit/

# Dynamic content that shouldn't be indexed
Disallow: /search?
Disallow: /filter?
Disallow: /sort?
Disallow: /page=

# Allow AMP pages
Allow: /amp/

# Host directive
Host: ${siteUrl.replace('https://', '')}

# Thank you for respecting our robots.txt file!`;

  res.type('text/plain');
  res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
  res.send(robots);
});

module.exports = router;