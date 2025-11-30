// backend/routes/sitemap.js
const express = require('express');
const router = express.Router();
const Post = require('../models/Post');

// Main sitemap - simplified and working version
router.get('/sitemap.xml', async (req, res) => {
  try {
    console.log('🔍 Generating main sitemap.xml...');
    
    const siteUrl = process.env.SITE_URL || 'https://wilsonmuita.com';
    const blogUrl = process.env.BLOG_URL || 'https://wilsonmuita.com';

    // Get all published posts
    const posts = await Post.find({ isPublished: true })
      .select('slug updatedAt publishedAt featuredImage imageAltText title excerpt')
      .sort({ updatedAt: -1 });

    console.log(`📝 Found ${posts.length} published posts for sitemap`);

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`;
    xml += ` xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"`;
    xml += ` xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n`;

    // Add static pages
    const staticPages = [
      { url: '/', priority: '1.0', changefreq: 'daily' },
      { url: '/blog', priority: '0.9', changefreq: 'daily' },
      { url: '/about', priority: '0.8', changefreq: 'monthly' },
      { url: '/contact', priority: '0.7', changefreq: 'monthly' },
      { url: '/privacy', priority: '0.3', changefreq: 'yearly' },
      { url: '/disclaimer', priority: '0.3', changefreq: 'yearly' },
    ];

    // Add static pages to sitemap
    staticPages.forEach(page => {
      xml += `  <url>\n`;
      xml += `    <loc>${siteUrl}${page.url}</loc>\n`;
      xml += `    <lastmod>${new Date().toISOString()}</lastmod>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += `  </url>\n`;
    });

    // Add blog posts to sitemap
    posts.forEach(post => {
      const postUrl = `${blogUrl}/blog/${post.slug}`;
      const lastMod = new Date(post.updatedAt).toISOString();
      const pubDate = new Date(post.publishedAt).toISOString().split('T')[0];

      xml += `  <url>\n`;
      xml += `    <loc>${postUrl}</loc>\n`;
      xml += `    <lastmod>${lastMod}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      
      // Add image if exists
      if (post.featuredImage) {
        xml += `    <image:image>\n`;
        xml += `      <image:loc>${post.featuredImage}</image:loc>\n`;
        xml += `      <image:title><![CDATA[${post.imageAltText || post.title}]]></image:title>\n`;
        xml += `      <image:caption><![CDATA[${post.imageAltText || post.excerpt}]]></image:caption>\n`;
        xml += `    </image:image>\n`;
      }

      // Add news sitemap data
      xml += `    <news:news>\n`;
      xml += `      <news:publication>\n`;
      xml += `        <news:name>${process.env.SITE_NAME || 'Wilson Muita'}</news:name>\n`;
      xml += `        <news:language>en</news:language>\n`;
      xml += `      </news:publication>\n`;
      xml += `      <news:publication_date>${pubDate}</news:publication_date>\n`;
      xml += `      <news:title><![CDATA[${post.title}]]></news:title>\n`;
      xml += `    </news:news>\n`;
      
      xml += `  </url>\n`;
    });

    xml += `</urlset>`;

    // Set headers and send response
    res.header('Content-Type', 'application/xml');
    res.header('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    console.log('✅ Sitemap generated successfully');
    res.send(xml);

  } catch (error) {
    console.error('❌ Sitemap generation error:', error);
    res.status(500).send('Error generating sitemap');
  }
});

// Additional sitemaps for larger sites (optional)
router.get('/sitemap-posts.xml', async (req, res) => {
  try {
    const siteUrl = process.env.SITE_URL || 'https://wilsonmuita.com';
    const blogUrl = process.env.BLOG_URL || 'https://wilsonmuita.com';

    const posts = await Post.find({ isPublished: true })
      .select('slug updatedAt publishedAt featuredImage imageAltText title excerpt')
      .sort({ updatedAt: -1 });

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`;
    xml += ` xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

    posts.forEach(post => {
      const postUrl = `${blogUrl}/blog/${post.slug}`;
      const lastMod = new Date(post.updatedAt).toISOString();

      xml += `  <url>\n`;
      xml += `    <loc>${postUrl}</loc>\n`;
      xml += `    <lastmod>${lastMod}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      
      if (post.featuredImage) {
        xml += `    <image:image>\n`;
        xml += `      <image:loc>${post.featuredImage}</image:loc>\n`;
        xml += `      <image:title><![CDATA[${post.imageAltText || post.title}]]></image:title>\n`;
        xml += `    </image:image>\n`;
      }
      
      xml += `  </url>\n`;
    });

    xml += `</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.header('Cache-Control', 'public, max-age=43200'); // Cache for 12 hours
    res.send(xml);

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

    const posts = await Post.find({ 
      isPublished: true,
      featuredImage: { $exists: true, $ne: '' }
    })
    .select('slug featuredImage imageAltText title excerpt updatedAt')
    .sort({ updatedAt: -1 });

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`;
    xml += ` xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

    posts.forEach(post => {
      const postUrl = `${blogUrl}/blog/${post.slug}`;
      const lastMod = new Date(post.updatedAt).toISOString();

      xml += `  <url>\n`;
      xml += `    <loc>${postUrl}</loc>\n`;
      xml += `    <lastmod>${lastMod}</lastmod>\n`;
      xml += `    <image:image>\n`;
      xml += `      <image:loc>${post.featuredImage}</image:loc>\n`;
      xml += `      <image:title><![CDATA[${post.imageAltText || post.title}]]></image:title>\n`;
      xml += `      <image:caption><![CDATA[${post.imageAltText || post.excerpt}]]></image:caption>\n`;
      xml += `    </image:image>\n`;
      xml += `  </url>\n`;
    });

    xml += `</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.header('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.send(xml);

  } catch (error) {
    console.error('Image sitemap generation error:', error);
    res.status(500).send('Error generating image sitemap');
  }
});

// Sitemap index for very large sites (optional)
router.get('/sitemap-index.xml', async (req, res) => {
  try {
    const siteUrl = process.env.SITE_URL || 'https://wilsonmuita.com';
    
    const postCount = await Post.countDocuments({ isPublished: true });
    const needsMultipleSitemaps = postCount > 1000;

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    
    xml += `  <sitemap>\n`;
    xml += `    <loc>${siteUrl}/sitemap.xml</loc>\n`;
    xml += `    <lastmod>${new Date().toISOString()}</lastmod>\n`;
    xml += `  </sitemap>\n`;
    
    if (needsMultipleSitemaps) {
      xml += `  <sitemap>\n`;
      xml += `    <loc>${siteUrl}/sitemap-posts.xml</loc>\n`;
      xml += `    <lastmod>${new Date().toISOString()}</lastmod>\n`;
      xml += `  </sitemap>\n`;
    }
    
    xml += `  <sitemap>\n`;
    xml += `    <loc>${siteUrl}/image-sitemap.xml</loc>\n`;
    xml += `    <lastmod>${new Date().toISOString()}</lastmod>\n`;
    xml += `  </sitemap>\n`;
    
    xml += `</sitemapindex>`;

    res.header('Content-Type', 'application/xml');
    res.header('Cache-Control', 'public, max-age=86400');
    res.send(xml);

  } catch (error) {
    console.error('Sitemap index generation error:', error);
    res.status(500).send('Error generating sitemap index');
  }
});

module.exports = router;