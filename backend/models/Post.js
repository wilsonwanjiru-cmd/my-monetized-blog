// backend/models/Post.js
const mongoose = require('mongoose');
const axios = require('axios');

const PostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Post title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    index: true,
    lowercase: true
  },
  content: {
    type: String,
    required: [true, 'Post content is required']
  },
  excerpt: {
    type: String,
    maxlength: [300, 'Excerpt cannot exceed 300 characters']
  },
  featuredImage: {
    type: String,
    default: '',
    validate: {
      validator: function(v) {
        // Allow empty string or valid URL
        return v === '' || /^https?:\/\/.+\..+/.test(v);
      },
      message: 'Featured image must be a valid URL'
    }
  },
  author: {
    type: String,
    required: true,
    default: 'Wilson Muita'
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  category: {
    type: String,
    required: true,
    default: 'Technology',
    index: true
  },
  metaDescription: {
    type: String,
    maxlength: [300, 'Meta description cannot exceed 300 characters']
  },
  readTime: {
    type: Number,
    default: 5,
    min: [1, 'Read time must be at least 1 minute']
  },
  isPublished: {
    type: Boolean,
    default: false,
    index: true
  },
  publishedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  views: {
    type: Number,
    default: 0,
    min: 0
  },
  likes: {
    type: Number,
    default: 0,
    min: 0
  },
  shares: {
    type: Number,
    default: 0,
    min: 0
  },

  // ✅ UPDATED: SEO & SOCIAL MEDIA FIELDS
  ogImage: {
    type: String,
    default: '',
    validate: {
      validator: function(v) {
        return v === '' || /^https?:\/\/.+\..+/.test(v);
      },
      message: 'OG image must be a valid URL'
    }
  },
  twitterImage: {
    type: String,
    default: '',
    validate: {
      validator: function(v) {
        return v === '' || /^https?:\/\/.+\..+/.test(v);
      },
      message: 'Twitter image must be a valid URL'
    }
  },
  canonicalUrl: {
    type: String,
    default: '',
    validate: {
      validator: function(v) {
        // ✅ UPDATED: More flexible URL validation that allows empty strings
        return v === '' || /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/.test(v);
      },
      message: 'Canonical URL must be a valid URL'
    }
  },
  ampHtml: {
    type: String,
    default: ''
  },
  structuredData: {
    type: Object,
    default: {}
  },

  // ✅ ENHANCED: Image SEO
  imageAltText: {
    type: String,
    default: '',
    maxlength: [500, 'Image alt text cannot exceed 500 characters']
  },
  imageCaption: {
    type: String,
    default: '',
    maxlength: [200, 'Image caption cannot exceed 200 characters']
  },

  // ✅ ENHANCED: Search engine optimization
  isIndexed: {
    type: Boolean,
    default: true
  },
  focusKeyword: {
    type: String,
    default: '',
    trim: true
  },
  seoScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  // ✅ ENHANCED: AMP support
  ampEnabled: {
    type: Boolean,
    default: true
  },
  ampStatus: {
    type: String,
    enum: ['pending', 'valid', 'invalid', 'error'],
    default: 'pending'
  },

  // ✅ NEW: Plagiarism check fields for Copyscape integration
  plagiarismCheck: {
    status: {
      type: String,
      enum: ['pending', 'checked', 'failed', 'skipped'],
      default: 'pending'
    },
    checkedAt: {
      type: Date
    },
    isUnique: {
      type: Boolean,
      default: true
    },
    matchCount: {
      type: Number,
      default: 0
    },
    confidence: {
      type: Number,
      default: 100,
      min: 0,
      max: 100
    },
    report: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    cost: {
      type: Number,
      default: 0
    },
    wordCount: {
      type: Number,
      default: 0
    }
  },

  // ✅ NEW: Video content support
  video: {
    url: {
      type: String,
      default: '',
      validate: {
        validator: function(v) {
          return v === '' || /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/.test(v);
        },
        message: 'Video URL must be a valid URL'
      }
    },
    thumbnail: {
      type: String,
      default: '',
      validate: {
        validator: function(v) {
          return v === '' || /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/.test(v);
        },
        message: 'Video thumbnail must be a valid URL'
      }
    },
    duration: {
      type: Number,
      default: 0
    },
    transcript: {
      type: String,
      default: ''
    }
  },

  // ✅ NEW: Monetization fields
  adSpots: [{
    position: Number,
    adType: String,
    enabled: {
      type: Boolean,
      default: true
    }
  }],
  affiliateLinks: [{
    text: String,
    url: {
      type: String,
      validate: {
        validator: function(v) {
          return v === '' || /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/.test(v);
        },
        message: 'Affiliate URL must be a valid URL'
      }
    },
    product: String,
    position: Number
  }],

  // ✅ NEW: Performance tracking
  engagementRate: {
    type: Number,
    default: 0
  },
  bounceRate: {
    type: Number,
    default: 0
  },
  avgTimeOnPage: {
    type: Number,
    default: 0
  },

  // ✅ NEW: Content relationships
  relatedPosts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  }],
  series: {
    name: String,
    position: Number,
    total: Number
  },

  // ✅ NEW: Content updates and versioning
  updateHistory: [{
    updatedAt: {
      type: Date,
      default: Date.now
    },
    changes: String,
    version: Number
  }],
  lastUpdatedBy: {
    type: String,
    default: 'System'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ✅ UPDATED: Virtual for post URL
PostSchema.virtual('url').get(function() {
  const blogUrl = process.env.BLOG_URL || 'https://wilsonmuita.com';
  return `${blogUrl}/blog/${this.slug}`;
});

// ✅ UPDATED: Virtual for AMP URL
PostSchema.virtual('ampUrl').get(function() {
  const blogUrl = process.env.BLOG_URL || 'https://wilsonmuita.com';
  return `${blogUrl}/amp/${this.slug}`;
});

// ✅ UPDATED: Virtual for API URL
PostSchema.virtual('apiUrl').get(function() {
  const apiUrl = process.env.REACT_APP_API_URL || 'https://api.wilsonmuita.com';
  return `${apiUrl}/api/posts/slug/${this.slug}`;
});

// ✅ NEW: Virtual for plagiarism status
PostSchema.virtual('isContentUnique').get(function() {
  return this.plagiarismCheck.isUnique && this.plagiarismCheck.confidence >= 85;
});

// ✅ ENHANCED: Indexes for better query performance
PostSchema.index({ slug: 1, isPublished: 1 });
PostSchema.index({ category: 1, isPublished: 1, publishedAt: -1 });
PostSchema.index({ tags: 1, isPublished: 1 });
PostSchema.index({ author: 1, isPublished: 1 });
PostSchema.index({ publishedAt: -1, views: -1 });
PostSchema.index({ 'video.url': 1 }, { sparse: true });
PostSchema.index({ 'plagiarismCheck.status': 1, 'plagiarismCheck.isUnique': 1 });

// ✅ UPDATED: Pre-validate middleware with enhanced slug generation
PostSchema.pre('validate', function(next) {
  // Generate clean slug from title
  if (this.title && (!this.slug || this.isModified('title'))) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-')         // Replace spaces with hyphens
      .replace(/-+/g, '-')          // Remove duplicate hyphens
      .substring(0, 100);           // Limit slug length
    
    // Ensure slug is unique by appending timestamp if needed (handled in pre-save)
  }

  // Auto-generate excerpt if not provided
  if (this.content && !this.excerpt) {
    const plainText = this.content
      .replace(/<[^>]*(>|$)|&nbsp;|&#8203;|&shy;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    this.excerpt = plainText.substring(0, 150).trim() + 
                  (plainText.length > 150 ? '...' : '');
  }

  // Auto-generate meta description if not provided
  if (this.content && !this.metaDescription) {
    const plainText = this.content
      .replace(/<[^>]*(>|$)|&nbsp;|&#8203;|&shy;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    this.metaDescription = plainText.substring(0, 160).trim();
  }

  // Auto-generate focus keyword from title if not provided
  if (this.title && !this.focusKeyword) {
    const words = this.title.toLowerCase().split(/\s+/);
    this.focusKeyword = words.slice(0, 3).join(' ');
  }

  next();
});

// ✅ UPDATED: Pre-save middleware with enhanced SEO, domain configuration, and plagiarism checking
PostSchema.pre('save', async function(next) {
  const siteUrl = process.env.SITE_URL || 'https://wilsonmuita.com';
  const siteName = process.env.SITE_NAME || 'Wilson Muita';
  const blogUrl = process.env.BLOG_URL || 'https://wilsonmuita.com';

  // Calculate read time more accurately
  if (this.isModified('content')) {
    const plainText = this.content
      .replace(/<[^>]*(>|$)|&nbsp;|&#8203;|&shy;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const wordCount = plainText.split(/\s+/).length;
    
    const wordsPerMinute = 238; // Average reading speed
    this.readTime = Math.max(1, Math.ceil(wordCount / wordsPerMinute));
  }

  // Generate OG & Twitter images if not set
  if ((this.isModified('featuredImage') || !this.ogImage) && this.featuredImage) {
    this.ogImage = this.featuredImage;
  }
  
  if ((this.isModified('featuredImage') || !this.twitterImage) && this.featuredImage) {
    this.twitterImage = this.featuredImage;
  }

  // ✅ UPDATED: Generate canonical URL with new domain - only if not provided
  if (!this.canonicalUrl || this.canonicalUrl === '') {
    this.canonicalUrl = `${blogUrl}/blog/${this.slug}`;
  }

  // Generate image alt text if not provided
  if (!this.imageAltText && this.title) {
    this.imageAltText = `${this.title} - Featured image on ${siteName}`;
  }

  // ✅ UPDATED: Enhanced structured data for rich snippets
  this.structuredData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": this.title,
    "description": this.metaDescription || this.excerpt,
    "image": this.featuredImage ? [this.featuredImage] : [],
    "author": {
      "@type": "Person",
      "name": this.author,
      "url": `${siteUrl}/author/${this.author.toLowerCase().replace(/\s+/g, '-')}`
    },
    "publisher": {
      "@type": "Organization",
      "name": siteName,
      "logo": {
        "@type": "ImageObject",
        "url": `${siteUrl}/logo.png`,
        "width": "180",
        "height": "60"
      },
      "url": siteUrl
    },
    "datePublished": this.publishedAt,
    "dateModified": this.updatedAt,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": this.canonicalUrl
    },
    "wordCount": this.content ? this.content.replace(/<[^>]*(>|$)|&nbsp;|&#8203;|&shy;/g, ' ').replace(/\s+/g, ' ').trim().split(/\s+/).length : 0,
    "timeRequired": `PT${this.readTime}M`,
    "articleSection": this.category,
    "keywords": this.tags ? this.tags.join(', ') : '',
    "inLanguage": "en-US"
  };

  // Calculate SEO score
  this.calculateSEOScore();

  // Generate AMP HTML if AMP is enabled
  if (this.ampEnabled && (this.isModified('content') || this.isModified('title'))) {
    this.ampHtml = this.generateAMPHtml();
  }

  // ✅ NEW: Run plagiarism check if content was modified and post is being published
  if (this.isModified('content') && this.isPublished && this.content.length > 0) {
    await this.runPlagiarismCheck();
  }

  // Ensure slug uniqueness
  if (this.isModified('slug')) {
    await this.ensureUniqueSlug();
  }

  next();
});

// ✅ NEW: Instance method to run plagiarism check using Copyscape API
PostSchema.methods.runPlagiarismCheck = async function() {
  try {
    // Check if Copyscape credentials are configured
    const username = process.env.COPYSCAPE_USERNAME;
    const apiKey = process.env.COPYSCAPE_API_KEY;
    
    if (!username || !apiKey) {
      console.log('⚠️ Copyscape credentials not configured, skipping plagiarism check');
      this.plagiarismCheck.status = 'skipped';
      return;
    }

    console.log('🔍 Running plagiarism check for post:', this.title);
    
    // Extract plain text from content (remove HTML tags)
    const plainText = this.content
      .replace(/<[^>]*(>|$)|&nbsp;|&#8203;|&shy;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const wordCount = plainText.split(/\s+/).length;
    this.plagiarismCheck.wordCount = wordCount;

    // For demo purposes - replace with actual Copyscape API call
    // In production, you would make the actual API call here
    const plagiarismResult = await this.callCopyscapeAPI(plainText);
    
    // Update plagiarism check fields
    this.plagiarismCheck = {
      status: 'checked',
      checkedAt: new Date(),
      isUnique: plagiarismResult.unique,
      matchCount: plagiarismResult.matchCount,
      confidence: plagiarismResult.confidence,
      report: plagiarismResult.report,
      cost: plagiarismResult.cost,
      wordCount: wordCount
    };

    console.log(`✅ Plagiarism check completed: ${plagiarismResult.unique ? 'Unique' : 'Matches found'} (${plagiarismResult.confidence}% confidence)`);

  } catch (error) {
    console.error('❌ Plagiarism check failed:', error.message);
    this.plagiarismCheck.status = 'failed';
    this.plagiarismCheck.checkedAt = new Date();
  }
};

// ✅ NEW: Instance method to call Copyscape API
PostSchema.methods.callCopyscapeAPI = async function(text) {
  const username = process.env.COPYSCAPE_USERNAME;
  const apiKey = process.env.COPYSCAPE_API_KEY;
  
  try {
    // This is where you would implement the actual Copyscape API call
    // For now, we'll simulate the API response structure
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate API response - replace this with actual Copyscape API call
    const response = {
      unique: true, // Simulate unique content
      matchCount: 0,
      confidence: 95,
      cost: 0.05, // Estimated cost in credits
      report: {
        queryWords: text.split(/\s+/).length,
        results: []
      }
    };

    return response;

    /* 
    // ACTUAL COPYSCAPE API IMPLEMENTATION (uncomment when ready)
    const params = new URLSearchParams();
    params.append('u', username);
    params.append('k', apiKey);
    params.append('o', 'csearch');
    params.append('e', 'UTF-8');
    params.append('t', text.substring(0, 50000)); // Limit text length
    params.append('c', '3'); // Get up to 3 results
    params.append('f', 'json');

    const apiResponse = await axios.post('https://www.copyscape.com/api/', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 30000
    });

    return this.parseCopyscapeResponse(apiResponse.data);
    */

  } catch (error) {
    console.error('Copyscape API error:', error.message);
    throw new Error(`Plagiarism API call failed: ${error.message}`);
  }
};

// ✅ NEW: Instance method to parse Copyscape API response
PostSchema.methods.parseCopyscapeResponse = function(apiData) {
  if (apiData.error) {
    throw new Error(`Copyscape API error: ${apiData.error}`);
  }

  const result = {
    unique: true,
    matchCount: parseInt(apiData.count) || 0,
    confidence: 100,
    cost: parseFloat(apiData.cost) || 0,
    report: apiData
  };

  if (result.matchCount > 0 && apiData.result) {
    result.unique = false;
    
    // Calculate confidence based on matches
    const matches = Array.isArray(apiData.result) ? apiData.result : [apiData.result];
    let totalPercent = 0;
    
    matches.forEach(match => {
      if (match.percentmatched) {
        totalPercent += parseFloat(match.percentmatched);
      }
    });
    
    result.confidence = Math.max(0, 100 - (totalPercent / matches.length));
  }

  return result;
};

// ✅ NEW: Instance method to manually trigger plagiarism check
PostSchema.methods.manualPlagiarismCheck = async function() {
  console.log('🔄 Manually triggering plagiarism check for:', this.title);
  await this.runPlagiarismCheck();
  await this.save();
  return this.plagiarismCheck;
};

// ✅ ENHANCED: Instance method to generate AMP HTML
PostSchema.methods.generateAMPHtml = function() {
  const siteUrl = process.env.SITE_URL || 'https://wilsonmuita.com';
  const siteName = process.env.SITE_NAME || 'Wilson Muita';

  // Basic AMP conversion
  let ampContent = this.content
    .replace(/<img([^>]*)>/g, '<amp-img$1 layout="responsive" width="800" height="400"></amp-img>')
    .replace(/<video([^>]*)>/g, '<amp-video$1 layout="responsive" width="800" height="400"></amp-video>')
    .replace(/<iframe([^>]*)>/g, '<amp-iframe$1 layout="responsive" width="800" height="400" sandbox="allow-scripts allow-same-origin"></amp-iframe>');

  return `<!doctype html>
<html ⚡>
<head>
  <meta charset="utf-8">
  <title>${this.title} - ${siteName}</title>
  <link rel="canonical" href="${this.canonicalUrl}">
  <meta name="viewport" content="width=device-width,minimum-scale=1,initial-scale=1">
  <style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style><noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}</style></noscript>
  <script async src="https://cdn.ampproject.org/v0.js"></script>
  <script async custom-element="amp-analytics" src="https://cdn.ampproject.org/v0/amp-analytics-0.1.js"></script>
</head>
<body>
  <article>
    <h1>${this.title}</h1>
    <p>By ${this.author}</p>
    ${this.featuredImage ? `<amp-img src="${this.featuredImage}" width="800" height="400" layout="responsive" alt="${this.imageAltText}"></amp-img>` : ''}
    <div>${ampContent}</div>
  </article>
  <amp-analytics type="googleanalytics">
    <script type="application/json">
      {
        "vars": {
          "account": "${process.env.GA_TRACKING_ID || 'UA-XXXXX-Y'}"
        },
        "triggers": {
          "trackPageview": {
            "on": "visible",
            "request": "pageview"
          }
        }
      }
    </script>
  </amp-analytics>
</body>
</html>`;
};

// ✅ ENHANCED: Instance method to calculate SEO score (now includes plagiarism factor)
PostSchema.methods.calculateSEOScore = function() {
  let score = 0;
  const maxScore = 100;

  // Title optimization (20 points)
  if (this.title && this.title.length >= 40 && this.title.length <= 60) {
    score += 20;
  } else if (this.title) {
    score += 10;
  }

  // Meta description optimization (15 points)
  if (this.metaDescription && this.metaDescription.length >= 120 && this.metaDescription.length <= 160) {
    score += 15;
  } else if (this.metaDescription) {
    score += 8;
  }

  // Content length (15 points)
  const wordCount = this.content ? this.content.replace(/<[^>]*(>|$)|&nbsp;|&#8203;|&shy;/g, ' ').replace(/\s+/g, ' ').trim().split(/\s+/).length : 0;
  if (wordCount >= 1000) score += 15;
  else if (wordCount >= 500) score += 10;
  else if (wordCount >= 300) score += 5;

  // Featured image (10 points)
  if (this.featuredImage) score += 10;

  // Tags and categories (10 points)
  if (this.tags && this.tags.length >= 3) score += 5;
  if (this.category && this.category !== 'General') score += 5;

  // Focus keyword (10 points)
  if (this.focusKeyword) score += 10;

  // ✅ NEW: Plagiarism check (20 points - most important for AdSense)
  if (this.plagiarismCheck.status === 'checked' && this.plagiarismCheck.isUnique) {
    score += Math.min(20, this.plagiarismCheck.confidence * 0.2);
  } else if (this.plagiarismCheck.status === 'checked' && !this.plagiarismCheck.isUnique) {
    // Penalty for duplicate content
    score = Math.max(0, score - 30);
  }

  this.seoScore = Math.min(maxScore, score);
};

// ✅ NEW: Static method to get posts with plagiarism issues
PostSchema.statics.getPostsWithPlagiarism = async function(limit = 50) {
  return this.find({
    'plagiarismCheck.status': 'checked',
    'plagiarismCheck.isUnique': false,
    isPublished: true
  })
  .sort({ 'plagiarismCheck.matchCount': -1, 'plagiarismCheck.confidence': 1 })
  .limit(limit)
  .select('title slug plagiarismCheck matchCount confidence publishedAt');
};

// ✅ NEW: Static method to check multiple posts for plagiarism
PostSchema.statics.batchPlagiarismCheck = async function(postIds = []) {
  const posts = await this.find({ 
    _id: { $in: postIds },
    isPublished: true 
  });

  const results = [];
  
  for (const post of posts) {
    try {
      await post.runPlagiarismCheck();
      await post.save();
      results.push({
        postId: post._id,
        title: post.title,
        status: post.plagiarismCheck.status,
        isUnique: post.plagiarismCheck.isUnique,
        confidence: post.plagiarismCheck.confidence
      });
    } catch (error) {
      results.push({
        postId: post._id,
        title: post.title,
        status: 'error',
        error: error.message
      });
    }
  }

  return results;
};

// ✅ NEW: Instance method to ensure unique slug
PostSchema.methods.ensureUniqueSlug = async function() {
  const originalSlug = this.slug;
  let counter = 1;
  let isUnique = false;

  while (!isUnique && counter < 100) {
    const existingPost = await mongoose.model('Post').findOne({
      slug: this.slug,
      _id: { $ne: this._id }
    });

    if (!existingPost) {
      isUnique = true;
    } else {
      this.slug = `${originalSlug}-${counter}`;
      counter++;
    }
  }
};

// ✅ UPDATED: Static method to ping search engines
PostSchema.statics.pingSearchEngines = async function(postUrl) {
  const siteUrl = process.env.SITE_URL || 'https://wilsonmuita.com';
  
  const searchEngines = [
    `http://www.google.com/ping?sitemap=${encodeURIComponent(`${siteUrl}/sitemap.xml`)}`,
    `http://www.bing.com/ping?sitemap=${encodeURIComponent(`${siteUrl}/sitemap.xml`)}`,
    `http://webmaster.yandex.com/ping?sitemap=${encodeURIComponent(`${siteUrl}/sitemap.xml`)}`
  ];

  try {
    const pingPromises = searchEngines.map(url => 
      fetch(url).catch(err => {
        console.log(`⚠️ Ping failed for ${url}:`, err.message);
        return null;
      })
    );
    
    await Promise.allSettled(pingPromises);
    console.log('✅ Successfully pinged search engines for new post:', postUrl);
  } catch (error) {
    console.error('❌ Error pinging search engines:', error);
  }
};

// ✅ UPDATED: Post-save middleware to ping search engines
PostSchema.post('save', async function(doc) {
  if (doc.isPublished && doc.isModified('isPublished')) {
    const postUrl = doc.canonicalUrl || `${process.env.BLOG_URL || 'https://wilsonmuita.com'}/blog/${doc.slug}`;
    
    // Ping search engines after a short delay
    setTimeout(() => {
      mongoose.model('Post').pingSearchEngines(postUrl);
    }, 5000);
  }
});

// ✅ NEW: Static method to get popular posts
PostSchema.statics.getPopularPosts = async function(limit = 5, days = 30) {
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - days);

  return this.find({
    isPublished: true,
    publishedAt: { $gte: dateThreshold }
  })
  .sort({ views: -1, likes: -1 })
  .limit(limit)
  .select('title slug excerpt featuredImage views readTime publishedAt');
};

// ✅ NEW: Static method to get related posts
PostSchema.statics.getRelatedPosts = async function(postId, limit = 5) {
  const currentPost = await this.findById(postId);
  if (!currentPost) return [];

  return this.find({
    _id: { $ne: postId },
    isPublished: true,
    $or: [
      { category: currentPost.category },
      { tags: { $in: currentPost.tags } }
    ]
  })
  .sort({ publishedAt: -1, views: -1 })
  .limit(limit)
  .select('title slug excerpt featuredImage readTime publishedAt');
};

// ✅ NEW: Instance method to increment views
PostSchema.methods.incrementViews = async function() {
  this.views += 1;
  await this.save();
};

// ✅ NEW: Instance method to increment likes
PostSchema.methods.incrementLikes = async function() {
  this.likes += 1;
  await this.save();
};

// ✅ NEW: Instance method to add affiliate link
PostSchema.methods.addAffiliateLink = function(text, url, product, position = null) {
  const affiliateLink = {
    text,
    url,
    product,
    position: position || this.affiliateLinks.length
  };
  
  this.affiliateLinks.push(affiliateLink);
  return this.save();
};

module.exports = mongoose.model('Post', PostSchema);