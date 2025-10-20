const crypto = require('crypto');
const crc32 = require('crc-32');

// Enhanced ETag middleware with multiple generation strategies
const etagMiddleware = (req, res, next) => {
  // Add ETag generation method to response object
  res.generateETag = (data) => {
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    return crypto.createHash('md5').update(str).digest('hex');
  };

  // Add CRC32 ETag generation for backward compatibility
  res.generateWeakETag = (content) => {
    const hash = crc32.str(content).toString(16);
    return `W/"${hash}"`; // Weak ETag
  };

  // Store original send method
  const originalSend = res.send;
  
  // Enhanced send method with ETag support
  res.send = function(body) {
    // Only add ETags for successful GET requests
    if (req.method === 'GET' && res.statusCode === 200 && body) {
      let etag;
      
      // Choose ETag generation strategy based on content type
      if (res.getHeader('Content-Type')?.includes('application/json')) {
        // Use strong ETag for JSON responses
        etag = res.generateETag(typeof body === 'string' ? body : JSON.stringify(body));
      } else {
        // Use weak ETag for other content types (HTML, text, etc.)
        etag = res.generateWeakETag(typeof body === 'string' ? body : String(body));
      }
      
      // Set ETag header
      res.setHeader('ETag', etag);
      
      // Check client ETag for conditional request
      const clientETag = req.headers['if-none-match'];
      if (clientETag) {
        // Handle both strong and weak ETag comparison
        const clientETagClean = clientETag.replace(/^W\//, '').replace(/^"|"$/g, '');
        const serverETagClean = etag.replace(/^W\//, '').replace(/^"|"$/g, '');
        
        if (clientETagClean === serverETagClean) {
          // Content hasn't changed - send 304 Not Modified
          return res.status(304).end();
        }
      }
    }
    
    // Call original send method
    return originalSend.call(this, body);
  };

  // Add helper method to check conditional requests
  res.handleConditionalRequest = (content, lastModified) => {
    if (req.method === 'GET') {
      // Generate ETag for the content
      const etag = res.generateETag(content);
      res.setHeader('ETag', etag);
      
      // Set Last-Modified if provided
      if (lastModified) {
        res.setHeader('Last-Modified', new Date(lastModified).toUTCString());
      }
      
      // Check If-None-Match
      const clientETag = req.headers['if-none-match'];
      if (clientETag === etag) {
        return true; // Indicates 304 should be sent
      }
      
      // Check If-Modified-Since
      if (lastModified) {
        const clientModifiedSince = req.headers['if-modified-since'];
        if (clientModifiedSince) {
          const clientDate = new Date(clientModifiedSince);
          const contentDate = new Date(lastModified);
          if (contentDate <= clientDate) {
            return true; // Indicates 304 should be sent
          }
        }
      }
    }
    return false; // Continue with normal response
  };

  // Add method to set cache headers
  res.setCacheHeaders = (maxAge = 300, isPublic = true) => {
    const cacheControl = `${isPublic ? 'public' : 'private'}, max-age=${maxAge}`;
    res.setHeader('Cache-Control', cacheControl);
    
    // Set Expires header for backward compatibility
    const expires = new Date(Date.now() + maxAge * 1000);
    res.setHeader('Expires', expires.toUTCString());
  };

  // Add method to quickly send 304 for unchanged content
  res.sendNotModified = () => {
    res.status(304).end();
  };

  next();
};

// Utility function for standalone ETag generation
const generateETag = (content, weak = false) => {
  const str = typeof content === 'string' ? content : JSON.stringify(content);
  const hash = crypto.createHash('md5').update(str).digest('hex');
  return weak ? `W/"${hash}"` : `"${hash}"`;
};

// Utility function for CRC32 ETag generation (backward compatibility)
const generateWeakETag = (content) => {
  const hash = crc32.str(content).toString(16);
  return `W/"${hash}"`;
};

// Middleware to handle conditional requests for specific routes
const conditionalMiddleware = (options = {}) => {
  const { maxAge = 300, weak = false } = options;
  
  return (req, res, next) => {
    // Set cache headers
    res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
    
    // Store original json method
    const originalJson = res.json;
    
    res.json = function(data) {
      // Generate ETag for JSON responses
      if (data && res.statusCode === 200) {
        const etag = weak ? generateWeakETag(JSON.stringify(data)) : generateETag(data);
        res.setHeader('ETag', etag);
        
        // Check conditional request
        const clientETag = req.headers['if-none-match'];
        if (clientETag === etag) {
          return res.status(304).end();
        }
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

module.exports = etagMiddleware;
module.exports.generateETag = generateETag;
module.exports.generateWeakETag = generateWeakETag;
module.exports.conditionalMiddleware = conditionalMiddleware;