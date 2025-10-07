// routes/sitemap.js
const express = require('express');
const router = express.Router();
const Post = require('../models/Post');

router.get('/sitemap.xml', async (req, res) => {
  try {
    // Fetch published posts, including featuredImage and imageAltText
    const posts = await Post.find({ isPublished: true })
      .select('slug updatedAt featuredImage imageAltText')
      .sort({ updatedAt: -1 });

    const siteUrl = process.env.SITE_URL || 'https://yourblog.com';

    // Function to generate image sitemap entry for a post
    const generateImageSitemapEntry = (post) => {
      if (!post.featuredImage) return ''; // Skip if no featured image

      return `
    <image:image>
      <image:loc>${post.featuredImage}</image:loc>
    </image:image>`;
    };

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>${siteUrl}/</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${siteUrl}/blog</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${siteUrl}/about</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${siteUrl}/contact</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  ${posts.map(post => `
  <url>
    <loc>${siteUrl}/blog/${post.slug}</loc>
    <lastmod>${new Date(post.updatedAt).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>${generateImageSitemapEntry(post)}
  </url>`).join('')}
</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (error) {
    console.error('Sitemap generation error:', error);
    res.status(500).send('Error generating sitemap');
  }
});

module.exports = router;