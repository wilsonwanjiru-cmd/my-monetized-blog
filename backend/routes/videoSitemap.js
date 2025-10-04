const express = require('express');
const router = express.Router();
const Post = require('../models/Post');

router.get('/video-sitemap.xml', async (req, res) => {
  try {
    const posts = await Post.find({ 
      isPublished: true,
      'video.url': { $exists: true }
    }).select('slug title metaDescription video publishedAt');

    const videoSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="https://yourblog.com/video-sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  ${posts.map(post => `
  <url>
    <loc>https://yourblog.com/blog/${post.slug}</loc>
    <video:video>
      <video:thumbnail_loc>${post.video.thumbnail}</video:thumbnail_loc>
      <video:title><![CDATA[${post.title}]]></video:title>
      <video:description><![CDATA[${post.metaDescription}]]></video:description>
      <video:content_loc>${post.video.url}</video:content_loc>
      <video:duration>${post.video.duration}</video:duration>
      <video:publication_date>${new Date(post.publishedAt).toISOString()}</video:publication_date>
      <video:family_friendly>yes</video:family_friendly>
      <video:requires_subscription>no</video:requires_subscription>
      <video:live>no</video:live>
    </video:video>
  </url>`).join('')}
</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.send(videoSitemap);
  } catch (error) {
    console.error('Video sitemap generation error:', error);
    res.status(500).send('Error generating video sitemap');
  }
});

module.exports = router;