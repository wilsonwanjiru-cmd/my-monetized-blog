// routes/robots.js
const express = require('express');
const router = express.Router();

router.get('/robots.txt', (req, res) => {
  const siteUrl = process.env.SITE_URL || 'https://yourblog.com';
  
  const robots = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

# Sitemaps
Sitemap: ${siteUrl}/sitemap.xml
Sitemap: ${siteUrl}/image-sitemap.xml

# Crawl directives
Crawl-delay: 1

# Allow bots to access essential resources
Allow: /css/
Allow: /js/
Allow: /images/

# Disallow unnecessary pages
Disallow: /private/
Disallow: /tmp/
Disallow: /cgi-bin/`;

  res.type('text/plain');
  res.send(robots);
});

module.exports = router;