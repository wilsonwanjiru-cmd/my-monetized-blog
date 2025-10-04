const Post = require('../models/Post');

// ETag generator function
const generateETag = (content) => {
  const crypto = require('crypto');
  return `"${crypto.createHash('md5').update(JSON.stringify(content)).digest('hex')}"`;
};

// Cache middleware for posts
const cacheMiddleware = async (req, res, next) => {
  if (req.method !== 'GET') return next();

  try {
    // Set Cache-Control header
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes
    
    // For individual post requests, add ETag and Last-Modified
    if (req.params.id || req.params.slug) {
      const postId = req.params.id || await Post.findOne({ slug: req.params.slug }).select('_id');
      const post = await Post.findById(postId);
      
      if (post) {
        // Set Last-Modified header
        res.setHeader('Last-Modified', new Date(post.updatedAt).toUTCString());
        
        // Set ETag header
        const etag = generateETag({
          content: post.content,
          updatedAt: post.updatedAt
        });
        res.setHeader('ETag', etag);
        
        // Check If-None-Match (ETag)
        const clientETag = req.headers['if-none-match'];
        if (clientETag === etag) {
          return res.status(304).send();
        }
        
        // Check If-Modified-Since
        const clientModifiedSince = req.headers['if-modified-since'];
        if (clientModifiedSince) {
          const clientDate = new Date(clientModifiedSince);
          const postDate = new Date(post.updatedAt);
          if (postDate <= clientDate) {
            return res.status(304).send();
          }
        }
      }
    }
    
    next();
  } catch (error) {
    next();
  }
};

module.exports = cacheMiddleware;