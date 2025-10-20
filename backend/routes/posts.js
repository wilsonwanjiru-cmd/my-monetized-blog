const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const axios = require('axios');

// =============================================================================
// HTML RENDERING ROUTES (NEW - THESE FIX THE DUPLICATE ISSUE)
// =============================================================================

// GET blog post page (HTML) - MAIN FIX
router.get('/blog/:slug', async (req, res) => {
  try {
    const post = await Post.findOne({ 
      slug: req.params.slug, 
      isPublished: true 
    });

    if (!post) {
      return res.status(404).render('404', {
        siteName: "Wilson's Blog",
        siteUrl: process.env.SITE_URL || 'https://wilsonmuita.com'
      });
    }

    // Increment views
    post.views += 1;
    await post.save();

    // ✅ UPDATED: Use environment variables
    const siteUrl = process.env.SITE_URL || 'https://wilsonmuita.com';
    const blogUrl = process.env.BLOG_URL || 'https://wilsonmuita.com';
    const siteName = process.env.SITE_NAME || "Wilson's Blog";

    // Get related posts
    const relatedPosts = await Post.find({
      _id: { $ne: post._id },
      isPublished: true,
      $or: [
        { tags: { $in: post.tags } },
        { category: post.category }
      ]
    })
    .sort({ views: -1, publishedAt: -1 })
    .limit(3)
    .select('title slug excerpt featuredImage readTime publishedAt');

    // Render the blog post template
    res.render('blog-post', {
      title: post.title,
      description: post.metaDescription || post.excerpt,
      post: post,
      relatedPosts: relatedPosts,
      siteName: siteName,
      siteUrl: siteUrl,
      blogUrl: blogUrl,
      twitterHandle: process.env.TWITTER_HANDLE || '@wilsonmuita',
      fbAppId: process.env.FB_APP_ID || '1234567890',
      url: `${blogUrl}/blog/${post.slug}`,
      image: post.featuredImage || `${siteUrl}/default-og-image.jpg`
    });

  } catch (error) {
    console.error('Error rendering blog post:', error);
    res.status(500).render('error', {
      siteName: "Wilson's Blog",
      message: 'Error loading post'
    });
  }
});

// GET blog homepage (HTML)
router.get('/blog', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find({ isPublished: true })
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-content');

    const total = await Post.countDocuments({ isPublished: true });

    const siteUrl = process.env.SITE_URL || 'https://wilsonmuita.com';
    const siteName = process.env.SITE_NAME || "Wilson's Blog";

    res.render('blog-list', {
      title: 'Blog - ' + siteName,
      description: 'Latest articles and insights from ' + siteName,
      posts: posts,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      siteName: siteName,
      siteUrl: siteUrl,
      blogUrl: process.env.BLOG_URL || 'https://wilsonmuita.com'
    });

  } catch (error) {
    console.error('Error rendering blog list:', error);
    res.status(500).render('error', {
      siteName: "Wilson's Blog",
      message: 'Error loading blog posts'
    });
  }
});

// GET social media preview (keep using your existing post.ejs)
router.get('/preview/:slug', async (req, res) => {
  try {
    const post = await Post.findOne({ 
      slug: req.params.slug, 
      isPublished: true 
    });

    if (!post) {
      return res.status(404).send('Post not found');
    }

    const siteUrl = process.env.SITE_URL || 'https://wilsonmuita.com';
    const siteName = process.env.SITE_NAME || "Wilson's Blog";

    res.render('post', {
      title: post.title,
      description: post.metaDescription || post.excerpt,
      post: post,
      siteName: siteName,
      siteUrl: siteUrl,
      blogUrl: process.env.BLOG_URL || 'https://wilsonmuita.com',
      twitterHandle: process.env.TWITTER_HANDLE || '@wilsonmuita',
      fbAppId: process.env.FB_APP_ID || '1234567890',
      url: `${siteUrl}/blog/${post.slug}`,
      image: post.featuredImage || `${siteUrl}/default-og-image.jpg`
    });

  } catch (error) {
    console.error('Error rendering preview:', error);
    res.status(500).send('Error generating preview');
  }
});

// =============================================================================
// API ROUTES (YOUR EXISTING ROUTES - KEEP THESE)
// =============================================================================

// GET all published posts with advanced filtering
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50; 
    const skip = (page - 1) * limit;
    const category = req.query.category;
    const tag = req.query.tag;
    const author = req.query.author;
    const search = req.query.search;

    // Build query object
    let query = { isPublished: true };

    // Add filters if provided
    if (category) query.category = category;
    if (tag) query.tags = { $in: [tag] };
    if (author) query.author = author;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const posts = await Post.find(query)
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-content'); // Exclude content for list view

    const total = await Post.countDocuments(query);

    res.json({
      posts,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET single post by slug with enhanced tracking (API)
router.get('/slug/:slug', async (req, res) => {
  try {
    const post = await Post.findOne({ 
      slug: req.params.slug, 
      isPublished: true 
    });

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Increment views
    post.views += 1;
    await post.save();

    const siteUrl = process.env.SITE_URL || 'https://wilsonmuita.com';
    const blogUrl = process.env.BLOG_URL || 'https://wilsonmuita.com';

    // Add structured data for SEO
    const postWithStructuredData = post.toObject();
    postWithStructuredData.structuredData = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": post.title,
      "description": post.metaDescription,
      "image": post.featuredImage,
      "author": {
        "@type": "Person",
        "name": post.author
      },
      "publisher": {
        "@type": "Organization",
        "name": process.env.SITE_NAME || "Wilson Muita",
        "logo": {
          "@type": "ImageObject",
          "url": `${siteUrl}/logo.png`
        }
      },
      "datePublished": post.publishedAt,
      "dateModified": post.updatedAt,
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": `${blogUrl}/blog/${post.slug}`
      }
    };

    res.json({
      post: postWithStructuredData,
      message: 'Post retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET single post by ID (API)
router.get('/id/:id', async (req, res) => {
  try {
    const post = await Post.findOne({ 
      _id: req.params.id, 
      isPublished: true 
    });

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.json({ post });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET posts by category (API)
router.get('/category/:category', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find({ 
      category: req.params.category,
      isPublished: true 
    })
    .sort({ publishedAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('-content');

    const total = await Post.countDocuments({ 
      category: req.params.category,
      isPublished: true 
    });

    res.json({
      posts,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      category: req.params.category
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET posts by tag (API)
router.get('/tag/:tag', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find({ 
      tags: { $in: [req.params.tag] },
      isPublished: true 
    })
    .sort({ publishedAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('-content');

    const total = await Post.countDocuments({ 
      tags: { $in: [req.params.tag] },
      isPublished: true 
    });

    res.json({
      posts,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      tag: req.params.tag
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET popular posts (API)
router.get('/popular/posts', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const timeRange = req.query.range || 'all'; // all, week, month

    let dateFilter = {};
    if (timeRange === 'week') {
      dateFilter.publishedAt = { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
    } else if (timeRange === 'month') {
      dateFilter.publishedAt = { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
    }

    const posts = await Post.find({ 
      isPublished: true,
      ...dateFilter
    })
    .sort({ views: -1, publishedAt: -1 })
    .limit(limit)
    .select('title slug excerpt featuredImage views readTime publishedAt');

    res.json({ posts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET related posts by postId (API)
router.get('/related/:postId', async (req, res) => {
  try {
    const currentPost = await Post.findById(req.params.postId);
    
    if (!currentPost) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const relatedPosts = await Post.aggregate([
      {
        $match: {
          _id: { $ne: currentPost._id },
          isPublished: true,
          $or: [
            { tags: { $in: currentPost.tags } },
            { category: currentPost.category }
          ]
        }
      },
      {
        $addFields: {
          tagScore: {
            $size: {
              $setIntersection: [currentPost.tags, "$tags"]
            }
          },
          categoryMatch: {
            $cond: [{ $eq: ["$category", currentPost.category] }, 1, 0]
          }
        }
      },
      {
        $addFields: {
          relevanceScore: {
            $add: [
              { $multiply: ["$tagScore", 2] },
              "$categoryMatch",
              { $cond: [{ $eq: ["$author", currentPost.author] }, 1, 0] }
            ]
          }
        }
      },
      { $sort: { relevanceScore: -1, publishedAt: -1 } },
      { $limit: 5 },
      {
        $project: {
          title: 1,
          slug: 1,
          excerpt: 1,
          featuredImage: 1,
          readTime: 1,
          publishedAt: 1,
          relevanceScore: 1
        }
      }
    ]);

    res.json({ 
      relatedPosts,
      currentPost: {
        title: currentPost.title,
        tags: currentPost.tags,
        category: currentPost.category
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET related posts by slug (API)
router.get('/related/slug/:slug', async (req, res) => {
  try {
    const currentPost = await Post.findOne({ slug: req.params.slug });
    
    if (!currentPost) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const relatedPosts = await Post.aggregate([
      {
        $match: {
          _id: { $ne: currentPost._id },
          isPublished: true,
          $or: [
            { tags: { $in: currentPost.tags } },
            { category: currentPost.category }
          ]
        }
      },
      {
        $addFields: {
          tagScore: {
            $size: {
              $setIntersection: [currentPost.tags, "$tags"]
            }
          },
          categoryMatch: {
            $cond: [{ $eq: ["$category", currentPost.category] }, 1, 0]
          }
        }
      },
      {
        $addFields: {
          relevanceScore: {
            $add: [
              { $multiply: ["$tagScore", 2] },
              "$categoryMatch",
              { $cond: [{ $eq: ["$author", currentPost.author] }, 1, 0] }
            ]
          }
        }
      },
      { $sort: { relevanceScore: -1, publishedAt: -1 } },
      { $limit: 5 },
      {
        $project: {
          title: 1,
          slug: 1,
          excerpt: 1,
          featuredImage: 1,
          readTime: 1,
          publishedAt: 1,
          relevanceScore: 1
        }
      }
    ]);

    res.json({ relatedPosts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE new post with enhanced features (API)
router.post('/', async (req, res) => {
  try {
    const { 
      title, 
      content, 
      excerpt, 
      featuredImage, 
      author, 
      tags, 
      category, 
      metaDescription, 
      readTime, 
      isPublished,
      canonicalUrl,
      ogImage,
      twitterImage
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({ 
        message: 'Title and content are required' 
      });
    }

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    // Check for existing slug
    const existingPost = await Post.findOne({ slug });
    if (existingPost) {
      return res.status(400).json({ 
        message: 'A post with this title already exists. Please choose a different title.' 
      });
    }

    // Calculate read time if not provided
    const calculatedReadTime = readTime || Math.max(1, Math.round(content.split(/\s+/).length / 200));

    const siteUrl = process.env.SITE_URL || 'https://wilsonmuita.com';
    const blogUrl = process.env.BLOG_URL || 'https://wilsonmuita.com';

    const postData = {
      title,
      content,
      excerpt: excerpt || content.substring(0, 150) + '...',
      featuredImage: featuredImage || '',
      author: author || 'Admin',
      tags: tags || [],
      category: category || 'General',
      metaDescription: metaDescription || content.substring(0, 160),
      readTime: calculatedReadTime,
      isPublished: isPublished !== undefined ? isPublished : false,
      slug,
      canonicalUrl: canonicalUrl || `${blogUrl}/blog/${slug}`,
      ogImage: ogImage || featuredImage,
      twitterImage: twitterImage || featuredImage,
      publishedAt: isPublished ? new Date() : null
    };

    const post = new Post(postData);
    const savedPost = await post.save();

    // Ping search engines if post is published
    if (savedPost.isPublished) {
      await pingSearchEngines(savedPost.slug);
    }

    res.status(201).json({
      message: 'Post created successfully',
      post: savedPost
    });
  } catch (error) {
    console.error('Error creating post:', error);

    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'A post with similar title already exists' 
      });
    }

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors 
      });
    }

    res.status(500).json({ 
      message: 'Server error while creating post',
      error: error.message 
    });
  }
});

// UPDATE post (API)
router.put('/:id', async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Ping search engines if post was published or updated
    if (post.isPublished) {
      await pingSearchEngines(post.slug);
    }

    res.json({
      message: 'Post updated successfully',
      post
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE post (API)
router.delete('/:id', async (req, res) => {
  try {
    const post = await Post.findByIdAndDelete(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// TRACK post view (API)
router.post('/:id/view', async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.json({ 
      message: 'View counted successfully',
      views: post.views 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// SEARCH posts (API)
router.get('/search/:query', async (req, res) => {
  try {
    const query = req.params.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find({
      isPublished: true,
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { excerpt: { $regex: query, $options: 'i' } },
        { content: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } }
      ]
    })
    .sort({ publishedAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('-content');

    const total = await Post.countDocuments({
      isPublished: true,
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { excerpt: { $regex: query, $options: 'i' } },
        { content: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } }
      ]
    });

    res.json({
      posts,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      query
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PING search engines function
async function pingSearchEngines(slug) {
  try {
    const siteUrl = process.env.SITE_URL || 'https://wilsonmuita.com';
    const blogUrl = process.env.BLOG_URL || 'https://wilsonmuita.com';
    const sitemapUrl = `${siteUrl}/sitemap.xml`;
    const postUrl = `${blogUrl}/blog/${slug}`;

    const engines = [
      `http://www.google.com/ping?sitemap=${sitemapUrl}`,
      `http://www.bing.com/ping?sitemap=${sitemapUrl}`
    ];

    // Ping all search engines
    await Promise.allSettled(
      engines.map(url => axios.get(url).catch(err => {
        console.warn(`Failed to ping ${url}:`, err.message);
      }))
    );

    console.log(`✅ Search engines notified about: ${postUrl}`);
  } catch (error) {
    console.error('❌ Error pinging search engines:', error.message);
  }
}

module.exports = router;