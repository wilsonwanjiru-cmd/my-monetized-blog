const express = require('express');
const router = express.Router();

router.get('/robots.txt', (req, res) => {
  const robots = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

Sitemap: https://yourblog.com/sitemap.xml
Sitemap: https://yourblog.com/image-sitemap.xml`;

  res.type('text/plain');
  res.send(robots);
});

module.exports = router;