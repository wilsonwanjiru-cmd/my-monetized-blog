const express = require('express');
const router = express.Router();
const Post = require('../models/Post');

router.get('/rss.xml', async (req, res) => {
  try {
    const posts = await Post.find({ isPublished: true })
      .sort({ publishedAt: -1 })
      .limit(50); // Increased limit to 50 for better RSS coverage

    // ✅ UPDATED: Use environment variables with fallbacks
    const siteUrl = process.env.SITE_URL || 'https://wilsonmuita.com';
    const blogUrl = process.env.BLOG_URL || 'https://wilsonmuita.com';
    const siteName = process.env.SITE_NAME || 'Wilson Muita';
    const siteDescription = process.env.REACT_APP_SITE_DESCRIPTION || 'Technology, Programming, and Web Development Insights';

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" 
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:dc="http://purl.org/dc/elements/1.1/"
     xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title><![CDATA[${siteName}]]></title>
    <description><![CDATA[${siteDescription}]]></description>
    <link>${siteUrl}</link>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml" />
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <generator>Wilson Muita Blog Platform</generator>
    <webMaster>${process.env.EMAIL_USER || 'wilsonmuita41@gmail.com'} (Wilson Muita)</webMaster>
    <copyright>${new Date().getFullYear()} ${siteName}. All rights reserved.</copyright>
    <docs>https://www.rssboard.org/rss-specification</docs>
    <ttl>60</ttl>
    
    ${posts.map(post => {
      const postUrl = `${blogUrl}/blog/${post.slug}`;
      const pubDate = new Date(post.publishedAt).toUTCString();
      const updatedDate = new Date(post.updatedAt).toUTCString();
      
      return `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <description><![CDATA[${post.excerpt || post.metaDescription || 'Read this article on ' + siteName}]]></description>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <pubDate>${pubDate}</pubDate>
      <dc:creator><![CDATA[${post.author}]]></dc:creator>
      <category><![CDATA[${post.category}]]></category>
      ${post.tags.map(tag => `<category><![CDATA[${tag}]]></category>`).join('')}
      ${post.featuredImage ? `
      <media:content url="${post.featuredImage}" type="image/jpeg" medium="image">
        <media:title type="html"><![CDATA[${post.title}]]></media:title>
        <media:description type="html"><![CDATA[${post.excerpt}]]></media:description>
      </media:content>
      <enclosure url="${post.featuredImage}" type="image/jpeg" />` : ''}
      <content:encoded><![CDATA[
        <!DOCTYPE html>
        <html>
          <head>
            <title>${post.title}</title>
          </head>
          <body>
            ${post.featuredImage ? `<img src="${post.featuredImage}" alt="${post.title}" style="max-width: 100%; height: auto;" />` : ''}
            <h1>${post.title}</h1>
            <p><strong>Published:</strong> ${new Date(post.publishedAt).toLocaleDateString()}</p>
            <p><strong>Author:</strong> ${post.author}</p>
            <p><strong>Read Time:</strong> ${post.readTime || '5'} min read</p>
            <div>${post.content}</div>
            <hr>
            <p><em>This article was originally published on <a href="${siteUrl}">${siteName}</a>. 
            Read the full version at <a href="${postUrl}">${postUrl}</a></em></p>
          </body>
        </html>
      ]]></content:encoded>
    </item>`;
    }).join('')}
  </channel>
</rss>`;

    res.header('Content-Type', 'application/rss+xml; charset=utf-8');
    res.header('Cache-Control', 'public, max-age=900'); // Cache for 15 minutes
    res.send(rss);
  } catch (error) {
    console.error('RSS generation error:', error);
    
    // ✅ IMPROVED: Better error handling with fallback RSS
    const fallbackRss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Wilson Muita</title>
    <description>Technology, Programming, and Web Development Insights</description>
    <link>https://wilsonmuita.com</link>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <item>
      <title>RSS Feed Temporarily Unavailable</title>
      <description>We're experiencing technical difficulties. Please check back later.</description>
      <link>https://wilsonmuita.com</link>
      <pubDate>${new Date().toUTCString()}</pubDate>
    </item>
  </channel>
</rss>`;
    
    res.header('Content-Type', 'application/rss+xml; charset=utf-8');
    res.status(500).send(fallbackRss);
  }
});

// ✅ ADDED: JSON Feed endpoint (modern alternative to RSS)
router.get('/feed.json', async (req, res) => {
  try {
    const posts = await Post.find({ isPublished: true })
      .sort({ publishedAt: -1 })
      .limit(50)
      .select('title excerpt content slug featuredImage author category tags publishedAt readTime');

    const siteUrl = process.env.SITE_URL || 'https://wilsonmuita.com';
    const blogUrl = process.env.BLOG_URL || 'https://wilsonmuita.com';
    const siteName = process.env.SITE_NAME || 'Wilson Muita';

    const jsonFeed = {
      version: "https://jsonfeed.org/version/1.1",
      title: siteName,
      home_page_url: siteUrl,
      feed_url: `${siteUrl}/feed.json`,
      description: "Technology, Programming, and Web Development Insights",
      icon: `${siteUrl}/favicon.ico`,
      favicon: `${siteUrl}/favicon.ico`,
      authors: [
        {
          name: "Wilson Muita",
          url: siteUrl
        }
      ],
      language: "en-us",
      hubs: [
        {
          type: "WebSub",
          url: `${siteUrl}/websub`
        }
      ],
      items: posts.map(post => ({
        id: post._id.toString(),
        url: `${blogUrl}/blog/${post.slug}`,
        title: post.title,
        content_html: post.content,
        summary: post.excerpt,
        image: post.featuredImage,
        date_published: new Date(post.publishedAt).toISOString(),
        date_modified: new Date(post.updatedAt).toISOString(),
        authors: [
          {
            name: post.author
          }
        ],
        tags: post.tags,
        language: "en-us",
        attachments: post.featuredImage ? [
          {
            url: post.featuredImage,
            mime_type: "image/jpeg",
            title: post.title,
            size_in_bytes: 0
          }
        ] : []
      }))
    };

    res.header('Content-Type', 'application/feed+json; charset=utf-8');
    res.header('Cache-Control', 'public, max-age=900');
    res.json(jsonFeed);
  } catch (error) {
    console.error('JSON Feed generation error:', error);
    res.status(500).json({
      version: "https://jsonfeed.org/version/1.1",
      title: "Wilson Muita",
      items: []
    });
  }
});

module.exports = router;