// routes/videoSitemap.js
const express = require('express');
const router = express.Router();
const Post = require('../models/Post');

// Main video sitemap
router.get('/video-sitemap.xml', async (req, res) => {
  try {
    const siteUrl = process.env.SITE_URL || 'https://wilsonmuita.com';
    const blogUrl = process.env.BLOG_URL || 'https://wilsonmuita.com';

    // Find posts with video content
    const posts = await Post.find({ 
      isPublished: true,
      'video.url': { $exists: true, $ne: '' }
    }).select('slug title metaDescription excerpt video publishedAt updatedAt featuredImage category tags');

    const videoSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="${siteUrl}/sitemap-xsl/video-sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  ${posts.map(post => {
    const video = post.video || {};
    const postUrl = `${blogUrl}/blog/${post.slug}`;
    const publicationDate = new Date(post.publishedAt).toISOString();
    const updateDate = new Date(post.updatedAt).toISOString();
    
    return `
  <url>
    <loc>${postUrl}</loc>
    <lastmod>${updateDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
    <video:video>
      <video:thumbnail_loc>${video.thumbnail || post.featuredImage || `${siteUrl}/default-video-thumbnail.jpg`}</video:thumbnail_loc>
      <video:title><![CDATA[${post.title}]]></video:title>
      <video:description><![CDATA[${video.description || post.metaDescription || post.excerpt || post.title}]]></video:description>
      <video:content_loc>${video.url}</video:content_loc>
      ${video.duration ? `<video:duration>${video.duration}</video:duration>` : ''}
      <video:publication_date>${publicationDate}</video:publication_date>
      <video:expiration_date>${video.expirationDate || ''}</video:expiration_date>
      <video:rating>${video.rating || 4.5}</video:rating>
      <video:view_count>${video.viewCount || 0}</video:view_count>
      <video:family_friendly>${video.familyFriendly !== undefined ? video.familyFriendly : 'yes'}</video:family_friendly>
      <video:requires_subscription>${video.requiresSubscription || 'no'}</video:requires_subscription>
      <video:live>${video.live || 'no'}</video:live>
      ${video.tags && video.tags.length > 0 ? video.tags.map(tag => `<video:tag><![CDATA[${tag}]]></video:tag>`).join('') : ''}
      ${video.category ? `<video:category><![CDATA[${video.category}]]></video:category>` : `<video:category><![CDATA[${post.category}]]></video:category>`}
      <video:uploader info="${siteUrl}/about">${video.uploader || post.author || 'Wilson Muita'}</video:uploader>
      <video:platform relationship="allow">web</video:platform>
      ${video.restrictions ? `<video:restriction relationship="deny">${video.restrictions}</video:restriction>` : ''}
      ${video.galleryLoc ? `<video:gallery_loc title="${post.title} Gallery">${video.galleryLoc}</video:gallery_loc>` : ''}
      ${video.price ? `<video:price currency="${video.price.currency || 'USD'}">${video.price.amount}</video:price>` : ''}
      <video:player_loc allow_embed="yes" autoplay="ap=1">${postUrl}</video:player_loc>
    </video:video>
    ${post.featuredImage ? `
    <image:image>
      <image:loc>${post.featuredImage}</image:loc>
      <image:title><![CDATA[${post.title}]]></image:title>
      <image:caption><![CDATA[${post.metaDescription || post.excerpt}]]></image:caption>
    </image:image>` : ''}
  </url>`;
  }).join('')}
</urlset>`;

    res.header('Content-Type', 'application/xml; charset=utf-8');
    res.header('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.send(videoSitemap);
  } catch (error) {
    console.error('Video sitemap generation error:', error);
    
    // Fallback empty video sitemap
    const fallbackSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
</urlset>`;
    
    res.header('Content-Type', 'application/xml; charset=utf-8');
    res.status(500).send(fallbackSitemap);
  }
});

// Video sitemap index (if you have multiple video sitemaps)
router.get('/video-sitemap-index.xml', async (req, res) => {
  try {
    const siteUrl = process.env.SITE_URL || 'https://wilsonmuita.com';
    
    // Count videos for pagination
    const videoCount = await Post.countDocuments({ 
      isPublished: true,
      'video.url': { $exists: true, $ne: '' }
    });
    
    const sitemapCount = Math.ceil(videoCount / 1000); // 1000 videos per sitemap

    const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${siteUrl}/video-sitemap.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>
  ${Array.from({ length: sitemapCount - 1 }, (_, i) => `
  <sitemap>
    <loc>${siteUrl}/video-sitemap-${i + 2}.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>`).join('')}
</sitemapindex>`;

    res.header('Content-Type', 'application/xml; charset=utf-8');
    res.header('Cache-Control', 'public, max-age=86400');
    res.send(sitemapIndex);
  } catch (error) {
    console.error('Video sitemap index generation error:', error);
    res.status(500).send('Error generating video sitemap index');
  }
});

// Paginated video sitemaps
router.get('/video-sitemap-:page.xml', async (req, res) => {
  try {
    const page = parseInt(req.params.page) || 1;
    const limit = 1000; // Google's limit per sitemap
    const skip = (page - 1) * limit;

    const siteUrl = process.env.SITE_URL || 'https://wilsonmuita.com';
    const blogUrl = process.env.BLOG_URL || 'https://wilsonmuita.com';

    const posts = await Post.find({ 
      isPublished: true,
      'video.url': { $exists: true, $ne: '' }
    })
    .select('slug title metaDescription excerpt video publishedAt updatedAt featuredImage category tags author')
    .sort({ publishedAt: -1 })
    .skip(skip)
    .limit(limit);

    const videoSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  ${posts.map(post => {
    const video = post.video || {};
    
    return `
  <url>
    <loc>${blogUrl}/blog/${post.slug}</loc>
    <lastmod>${new Date(post.updatedAt).toISOString()}</lastmod>
    <video:video>
      <video:thumbnail_loc>${video.thumbnail || post.featuredImage || `${siteUrl}/default-video-thumbnail.jpg`}</video:thumbnail_loc>
      <video:title><![CDATA[${post.title}]]></video:title>
      <video:description><![CDATA[${video.description || post.metaDescription || post.excerpt}]]></video:description>
      <video:content_loc>${video.url}</video:content_loc>
      ${video.duration ? `<video:duration>${video.duration}</video:duration>` : ''}
      <video:publication_date>${new Date(post.publishedAt).toISOString()}</video:publication_date>
      <video:family_friendly>${video.familyFriendly !== undefined ? video.familyFriendly : 'yes'}</video:family_friendly>
      <video:requires_subscription>${video.requiresSubscription || 'no'}</video:requires_subscription>
      <video:live>${video.live || 'no'}</video:live>
      ${video.category ? `<video:category><![CDATA[${video.category}]]></video:category>` : `<video:category><![CDATA[${post.category}]]></video:category>`}
      <video:uploader info="${siteUrl}/about">${video.uploader || post.author || 'Wilson Muita'}</video:uploader>
    </video:video>
  </url>`;
  }).join('')}
</urlset>`;

    res.header('Content-Type', 'application/xml; charset=utf-8');
    res.header('Cache-Control', 'public, max-age=86400');
    res.send(videoSitemap);
  } catch (error) {
    console.error('Paginated video sitemap generation error:', error);
    res.status(500).send('Error generating paginated video sitemap');
  }
});

// Video RSS feed (alternative format)
router.get('/video-rss.xml', async (req, res) => {
  try {
    const siteUrl = process.env.SITE_URL || 'https://wilsonmuita.com';
    const blogUrl = process.env.BLOG_URL || 'https://wilsonmuita.com';

    const posts = await Post.find({ 
      isPublished: true,
      'video.url': { $exists: true, $ne: '' }
    })
    .select('slug title metaDescription excerpt video publishedAt featuredImage')
    .sort({ publishedAt: -1 })
    .limit(100);

    const videoRss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Video Content - Wilson Muita</title>
    <description>Latest video posts from Wilson Muita</description>
    <link>${siteUrl}</link>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    
    ${posts.map(post => {
      const video = post.video || {};
      return `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <description><![CDATA[${post.metaDescription || post.excerpt}]]></description>
      <link>${blogUrl}/blog/${post.slug}</link>
      <guid>${blogUrl}/blog/${post.slug}</guid>
      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
      <media:content url="${video.url}" type="video/mp4" medium="video">
        <media:title>${post.title}</media:title>
        <media:description>${post.metaDescription || post.excerpt}</media:description>
        <media:thumbnail url="${video.thumbnail || post.featuredImage}" />
        ${video.duration ? `<media:duration>${video.duration}</media:duration>` : ''}
      </media:content>
    </item>`;
    }).join('')}
  </channel>
</rss>`;

    res.header('Content-Type', 'application/rss+xml; charset=utf-8');
    res.header('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.send(videoRss);
  } catch (error) {
    console.error('Video RSS generation error:', error);
    res.status(500).send('Error generating video RSS feed');
  }
});

module.exports = router;