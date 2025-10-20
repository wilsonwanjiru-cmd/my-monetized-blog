const NodeCache = require('node-cache');
const Post = require('../models/Post');

// Create cache instance with optimized settings
const cache = new NodeCache({ 
  stdTTL: 300, // 5 minutes default TTL
  checkperiod: 60, // Check for expired keys every 60 seconds
  useClones: false, // Better performance for large objects
  maxKeys: 1000 // Prevent memory issues
});

// ETag generator function
const generateETag = (content) => {
  const crypto = require('crypto');
  return `"${crypto.createHash('md5').update(JSON.stringify(content)).digest('hex')}"`;
};

// Enhanced cache middleware with NodeCache and conditional request support
const cacheMiddleware = async (req, res, next) => {
  // Only cache GET requests
  if (req.method !== 'GET') return next();

  try {
    // Set Cache-Control header for all requests
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes
    
    // Generate cache key based on URL and query parameters
    const cacheKey = req.originalUrl || req.url;
    
    // Check if response is already cached
    const cachedResponse = cache.get(cacheKey);
    
    if (cachedResponse) {
      // Set cache hit header
      res.setHeader('X-Cache', 'HIT');
      
      // For cached responses, still handle conditional requests
      const clientETag = req.headers['if-none-match'];
      const clientModifiedSince = req.headers['if-modified-since'];
      
      if (clientETag && clientETag === cachedResponse.etag) {
        return res.status(304).send();
      }
      
      if (clientModifiedSince && cachedResponse.lastModified) {
        const clientDate = new Date(clientModifiedSince);
        const cachedDate = new Date(cachedResponse.lastModified);
        if (cachedDate <= clientDate) {
          return res.status(304).send();
        }
      }
      
      // Return cached response
      return res.json(cachedResponse.data);
    }
    
    // Set cache miss header
    res.setHeader('X-Cache', 'MISS');
    
    // Store original json method
    const originalJson = res.json;
    let responseData = null;
    
    // Override res.json to capture response data
    res.json = function(data) {
      responseData = data;
      
      // For individual post requests, add ETag and Last-Modified
      if (req.params.id || req.params.slug) {
        // If we have the post data, generate ETag and set headers
        if (data && data.content) {
          const etag = generateETag({
            content: data.content,
            updatedAt: data.updatedAt
          });
          
          res.setHeader('ETag', etag);
          res.setHeader('Last-Modified', new Date(data.updatedAt || Date.now()).toUTCString());
          
          // Cache the response with ETag and timestamp
          cache.set(cacheKey, {
            data: data,
            etag: etag,
            lastModified: data.updatedAt || new Date().toISOString()
          });
        }
      } else {
        // Cache non-post responses
        cache.set(cacheKey, {
          data: data,
          etag: generateETag(data),
          lastModified: new Date().toISOString()
        });
      }
      
      // Call original json method
      return originalJson.call(this, data);
    };
    
    // For individual post requests, handle conditional requests even for cache misses
    if (req.params.id || req.params.slug) {
      try {
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
      } catch (error) {
        // If post lookup fails, continue without conditional request handling
        console.warn('Post lookup failed for conditional request:', error.message);
      }
    }
    
    next();
  } catch (error) {
    // If cache middleware fails, continue without caching
    console.error('Cache middleware error:', error);
    next();
  }
};

// Utility function to clear cache for specific routes
const clearCache = (pattern) => {
  const keys = cache.keys();
  if (pattern) {
    const regex = new RegExp(pattern);
    keys.forEach(key => {
      if (regex.test(key)) {
        cache.del(key);
      }
    });
  } else {
    cache.flushAll();
  }
};

// Utility function to get cache stats
const getCacheStats = () => {
  return cache.getStats();
};

// Middleware to clear cache on POST/PUT/DELETE requests
const cacheInvalidationMiddleware = (req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    // Clear cache for posts-related routes when content changes
    if (req.originalUrl.includes('/api/posts')) {
      clearCache('/api/posts');
      console.log('🔄 Cache cleared for posts');
    }
    
    // Clear entire cache for major changes
    if (req.method === 'DELETE' || req.body?.majorChange) {
      clearCache();
      console.log('🔄 Entire cache cleared');
    }
  }
  next();
};

module.exports = { 
  cacheMiddleware, 
  cache,
  clearCache,
  getCacheStats,
  cacheInvalidationMiddleware 
};