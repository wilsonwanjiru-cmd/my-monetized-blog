const express = require('express');
const router = express.Router();
const Post = require('../models/Post');

router.get('/rss.xml', async (req, res) => {
  try {
    const posts = await Post.find({ isPublished: true })
      .sort({ publishedAt: -1 })
      .limit(20);

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Wilson</title>
    <description>Your blog description</description>
    <link>https://yourblog.com</link>
    <atom:link href="https://yourblog.com/rss.xml" rel="self" type="application/rss+xml" />
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    
    ${posts.map(post => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <description><![CDATA[${post.excerpt}]]></description>
      <link>https://yourblog.com/blog/${post.slug}</link>
      <guid isPermaLink="true">https://yourblog.com/blog/${post.slug}</guid>
      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
      <author>${post.author}</author>
      <category><![CDATA[${post.category}]]></category>
      ${post.tags.map(tag => `<category><![CDATA[${tag}]]></category>`).join('')}
    </item>`).join('')}
  </channel>
</rss>`;

    res.header('Content-Type', 'application/rss+xml');
    res.send(rss);
  } catch (error) {
    console.error('RSS generation error:', error);
    res.status(500).send('Error generating RSS feed');
  }
});

module.exports = router;