// routes/sitemap.js
const express = require('express');
const router = express.Router();
const Post = require('../models/Post');

// Main sitemap index
router.get('/sitemap.xml', async (req, res) => {
  try {
    const siteUrl = process.env.SITE_URL || 'https://wilsonmuita.com';
    const blogUrl = process.env.BLOG_URL || 'https://wilsonmuita.com';

    // Get post count for sitemap index
    const postCount = await Post.countDocuments({ isPublished: true });
    const pagesSitemaps = Math.ceil(postCount / 1000); // 1000 URLs per sitemap

    const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
              xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
              xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"
              xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  <!-- Main Pages Sitemap -->
  <sitemap>
    <loc>${siteUrl}/sitemap-pages.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>
  
  <!-- Posts Sitemaps -->
  ${Array.from({ length: pagesSitemaps }, (_, i) => `
  <sitemap>
    <loc>${siteUrl}/sitemap-posts-${i + 1}.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>`).join('')}
  
  <!-- Images Sitemap -->
  <sitemap>
    <loc>${siteUrl}/image-sitemap.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>
  
  <!-- Videos Sitemap -->
  <sitemap>
    <loc>${siteUrl}/video-sitemap.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>
</sitemapindex>`;

    res.header('Content-Type', 'application/xml');
    res.header('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.send(sitemapIndex);
  } catch (error) {
    console.error('Sitemap index generation error:', error);
    res.status(500).send('Error generating sitemap index');
  }
});

// Static pages sitemap
router.get('/sitemap-pages.xml', async (req, res) => {
  try {
    const siteUrl = process.env.SITE_URL || 'https://wilsonmuita.com';
    const blogUrl = process.env.BLOG_URL || 'https://wilsonmuita.com';

    const staticPages = [
      { url: '/', priority: '1.0', changefreq: 'daily' },
      { url: '/blog', priority: '0.9', changefreq: 'daily' },
      { url: '/about', priority: '0.8', changefreq: 'monthly' },
      { url: '/contact', priority: '0.7', changefreq: 'monthly' },
      { url: '/privacy', priority: '0.3', changefreq: 'yearly' },
      { url: '/terms', priority: '0.3', changefreq: 'yearly' },
      { url: '/categories', priority: '0.6', changefreq: 'weekly' },
      { url: '/tags', priority: '0.6', changefreq: 'weekly' },
    ];

    const pagesSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  ${staticPages.map(page => `
  <url>
    <loc>${siteUrl}${page.url}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('')}
</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.header('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.send(pagesSitemap);
  } catch (error) {
    console.error('Pages sitemap generation error:', error);
    res.status(500).send('Error generating pages sitemap');
  }
});

// Posts sitemap with pagination
router.get('/sitemap-posts-:page.xml', async (req, res) => {
  try {
    const page = parseInt(req.params.page) || 1;
    const limit = 1000; // Google's limit per sitemap
    const skip = (page - 1) * limit;

    const siteUrl = process.env.SITE_URL || 'https://wilsonmuita.com';
    const blogUrl = process.env.BLOG_URL || 'https://wilsonmuita.com';

    const posts = await Post.find({ isPublished: true })
      .select('slug updatedAt featuredImage imageAltText title excerpt category tags publishedAt')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    // Function to generate image sitemap entry for a post
    const generateImageSitemapEntry = (post) => {
      if (!post.featuredImage) return '';

      return `
    <image:image>
      <image:loc>${post.featuredImage}</image:loc>
      ${post.imageAltText ? `<image:title><![CDATA[${post.imageAltText}]]></image:title>` : `<image:title><![CDATA[${post.title}]]></image:title>`}
      ${post.imageAltText ? `<image:caption><![CDATA[${post.imageAltText}]]></image:caption>` : `<image:caption><![CDATA[${post.excerpt}]]></image:caption>`}
      <image:license>${siteUrl}/terms</image:license>
    </image:image>`;
    };

    const postsSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  ${posts.map(post => `
  <url>
    <loc>${blogUrl}/blog/${post.slug}</loc>
    <lastmod>${new Date(post.updatedAt).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>${generateImageSitemapEntry(post)}
    <news:news>
      <news:publication>
        <news:name>${process.env.SITE_NAME || 'Wilson Muita'}</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${new Date(post.publishedAt).toISOString().split('T')[0]}</news:publication_date>
      <news:title><![CDATA[${post.title}]]></news:title>
    </news:news>
  </url>`).join('')}
</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.header('Cache-Control', 'public, max-age=43200'); // Cache for 12 hours
    res.send(postsSitemap);
  } catch (error) {
    console.error('Posts sitemap generation error:', error);
    res.status(500).send('Error generating posts sitemap');
  }
});

// Image sitemap
router.get('/image-sitemap.xml', async (req, res) => {
  try {
    const siteUrl = process.env.SITE_URL || 'https://wilsonmuita.com';
    const blogUrl = process.env.BLOG_URL || 'https://wilsonmuita.com';

    // Get posts with featured images
    const posts = await Post.find({ 
      isPublished: true,
      featuredImage: { $exists: true, $ne: '' }
    })
    .select('slug featuredImage imageAltText title excerpt updatedAt')
    .sort({ updatedAt: -1 });

    const imageSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  ${posts.map(post => `
  <url>
    <loc>${blogUrl}/blog/${post.slug}</loc>
    <lastmod>${new Date(post.updatedAt).toISOString()}</lastmod>
    <image:image>
      <image:loc>${post.featuredImage}</image:loc>
      <image:title><![CDATA[${post.imageAltText || post.title}]]></image:title>
      <image:caption><![CDATA[${post.imageAltText || post.excerpt}]]></image:caption>
      <image:license>${siteUrl}/terms</image:license>
    </image:image>
  </url>`).join('')}
</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.header('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.send(imageSitemap);
  } catch (error) {
    console.error('Image sitemap generation error:', error);
    res.status(500).send('Error generating image sitemap');
  }
});

// Legacy single sitemap for backward compatibility
router.get('/sitemap-legacy.xml', async (req, res) => {
  try {
    const posts = await Post.find({ isPublished: true })
      .select('slug updatedAt featuredImage imageAltText title excerpt')
      .sort({ updatedAt: -1 })
      .limit(50000); // Google's maximum limit

    const siteUrl = process.env.SITE_URL || 'https://wilsonmuita.com';
    const blogUrl = process.env.BLOG_URL || 'https://wilsonmuita.com';

    // Function to generate image sitemap entry for a post
    const generateImageSitemapEntry = (post) => {
      if (!post.featuredImage) return '';

      return `
    <image:image>
      <image:loc>${post.featuredImage}</image:loc>
      ${post.imageAltText ? `<image:title><![CDATA[${post.imageAltText}]]></image:title>` : ''}
      ${post.imageAltText ? `<image:caption><![CDATA[${post.imageAltText}]]></image:caption>` : ''}
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
    <loc>${blogUrl}/blog/${post.slug}</loc>
    <lastmod>${new Date(post.updatedAt).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>${generateImageSitemapEntry(post)}
  </url>`).join('')}
</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.header('Cache-Control', 'public, max-age=43200'); // Cache for 12 hours
    res.send(sitemap);
  } catch (error) {
    console.error('Legacy sitemap generation error:', error);
    res.status(500).send('Error generating legacy sitemap');
  }
});

module.exports = router;