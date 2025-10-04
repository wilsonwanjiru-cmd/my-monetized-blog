// backend/models/Post.js
const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true
  },
  content: {
    type: String,
    required: true
  },
  excerpt: {
    type: String
  },
  featuredImage: {
    type: String,
    default: ''
  },
  author: {
    type: String,
    required: true,
    default: 'Admin'
  },
  tags: [{
    type: String
  }],
  category: {
    type: String,
    required: true,
    default: 'General'
  },
  metaDescription: {
    type: String
  },
  readTime: {
    type: Number,
    default: 5
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  publishedAt: {
    type: Date,
    default: Date.now
  },
  views: {
    type: Number,
    default: 0
  },
  // NEW FIELDS FOR SEO & SOCIAL MEDIA
  ogImage: {
    type: String,
    default: ''
  },
  twitterImage: {
    type: String,
    default: ''
  },
  canonicalUrl: {
    type: String,
    default: ''
  },
  ampHtml: {
    type: String,
    default: ''
  },
  structuredData: {
    type: Object,
    default: {}
  },
  // For image SEO
  imageAltText: {
    type: String,
    default: ''
  },
  // For search engine indexing
  isIndexed: {
    type: Boolean,
    default: true
  },
  // For AMP support
  ampEnabled: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Pre-validate: Generate slug, excerpt, metaDescription
PostSchema.pre('validate', function(next) {
  // Generate clean slug from title
  if (this.title && (!this.slug || this.isModified('title'))) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // remove special characters
      .trim()
      .replace(/\s+/g, '-')         // replace spaces with hyphens
      .replace(/-+/g, '-')          // remove duplicate hyphens
      .substring(0, 100);           // limit slug length
  }

  // Auto-generate excerpt if not provided - using improved HTML stripping
  if (this.content && !this.excerpt) {
    const plainText = this.content.replace(/<[^>]*(>|$)|&nbsp;|&#8203;|&shy;/g, ' ').replace(/\s+/g, ' ').trim();
    this.excerpt = plainText.substring(0, 150).trim() + (plainText.length > 150 ? '...' : '');
  }

  // Auto-generate meta description if not provided - using improved HTML stripping
  if (this.content && !this.metaDescription) {
    const plainText = this.content.replace(/<[^>]*(>|$)|&nbsp;|&#8203;|&shy;/g, ' ').replace(/\s+/g, ' ').trim();
    this.metaDescription = plainText.substring(0, 160).trim();
  }

  next();
});

// Pre-save: Calculate read time more accurately + Generate SEO data
PostSchema.pre('save', function(next) {
  // Calculate read time
  if (this.isModified('content')) {
    const plainText = this.content.replace(/<[^>]*(>|$)|&nbsp;|&#8203;|&shy;/g, ' ').replace(/\s+/g, ' ').trim();
    const wordCount = plainText.split(/\s+/).length;
    
    const wordsPerMinute = 238;
    this.readTime = Math.ceil(wordCount / wordsPerMinute) || 1;
  }

  // Generate OG & Twitter images if not set
  if ((this.isModified('featuredImage') || this.isModified('title') || !this.ogImage) && this.featuredImage) {
    this.ogImage = this.featuredImage;
  }
  
  if ((this.isModified('featuredImage') || this.isModified('title') || !this.twitterImage) && this.featuredImage) {
    this.twitterImage = this.featuredImage;
  }

  // Generate canonical URL if not set
  if (!this.canonicalUrl && this.slug) {
    this.canonicalUrl = `${process.env.SITE_URL || 'https://yourblog.com'}/blog/${this.slug}`;
  }

  // Generate image alt text if not provided
  if (!this.imageAltText && this.title) {
    this.imageAltText = `${this.title} - Featured image`;
  }

  // Generate structured data for rich snippets
  this.structuredData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": this.title,
    "description": this.metaDescription || this.excerpt,
    "image": this.featuredImage ? [this.featuredImage] : [],
    "author": {
      "@type": "Person",
      "name": this.author
    },
    "publisher": {
      "@type": "Organization",
      "name": process.env.SITE_NAME || "Your Blog Name",
      "logo": {
        "@type": "ImageObject",
        "url": `${process.env.SITE_URL || 'https://yourblog.com'}/logo.png`
      }
    },
    "datePublished": this.publishedAt,
    "dateModified": this.updatedAt,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": this.canonicalUrl || `${process.env.SITE_URL || 'https://yourblog.com'}/blog/${this.slug}`
    },
    "wordCount": this.content ? this.content.replace(/<[^>]*(>|$)|&nbsp;|&#8203;|&shy;/g, ' ').replace(/\s+/g, ' ').trim().split(/\s+/).length : 0
  };

  // Generate AMP HTML if AMP is enabled
  if (this.ampEnabled && this.isModified('content')) {
    this.ampHtml = this.generateAMPHtml();
  }

  next();
});

// Instance method to generate AMP HTML
PostSchema.methods.generateAMPHtml = function() {
  // Basic AMP conversion - you might want to use a library like cheerio for more robust conversion
  let ampContent = this.content
    .replace(/<img /g, '<amp-img layout="responsive" ')
    .replace(/<video /g, '<amp-video layout="responsive" ')
    .replace(/<iframe /g, '<amp-iframe layout="responsive" ')
    .replace(/<\/img>/g, '</amp-img>')
    .replace(/<\/video>/g, '</amp-video>')
    .replace(/<\/iframe>/g, '</amp-iframe>');

  return `<!doctype html>
<html ⚡>
<head>
  <meta charset="utf-8">
  <title>${this.title}</title>
  <link rel="canonical" href="${this.canonicalUrl}">
  <meta name="viewport" content="width=device-width,minimum-scale=1,initial-scale=1">
  <style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style><noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}</style></noscript>
  <script async src="https://cdn.ampproject.org/v0.js"></script>
</head>
<body>
  <article>
    <h1>${this.title}</h1>
    ${ampContent}
  </article>
</body>
</html>`;
};

// Static method to ping search engines when a new post is published
PostSchema.statics.pingSearchEngines = async function(postUrl) {
  const searchEngines = [
    `http://www.google.com/ping?sitemap=${encodeURIComponent(`${process.env.SITE_URL}/sitemap.xml`)}`,
    `http://www.bing.com/ping?sitemap=${encodeURIComponent(`${process.env.SITE_URL}/sitemap.xml`)}`
  ];

  try {
    const pingPromises = searchEngines.map(url => 
      fetch(url).catch(err => console.log(`Ping failed for ${url}:`, err.message))
    );
    await Promise.all(pingPromises);
    console.log('✅ Successfully pinged search engines for new post');
  } catch (error) {
    console.error('❌ Error pinging search engines:', error);
  }
};

// Post-save middleware to ping search engines when a new post is published
PostSchema.post('save', async function(doc) {
  if (doc.isPublished && doc.isModified('isPublished')) {
    const postUrl = `${process.env.SITE_URL || 'https://yourblog.com'}/blog/${doc.slug}`;
    
    // Ping search engines after a short delay
    setTimeout(() => {
      mongoose.model('Post').pingSearchEngines(postUrl);
    }, 2000);
  }
});

// Virtual for post URL
PostSchema.virtual('url').get(function() {
  return `/blog/${this.slug}`;
});

// Ensure virtual fields are serialized
PostSchema.set('toJSON', { virtuals: true });
PostSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Post', PostSchema);