const crc32 = require('crc-32');

function generateETag(content) {
  // Use content hash for strong validation
  const hash = crc32.str(content).toString(16);
  return `"${hash}"`;
}

function etagMiddleware(req, res, next) {
  const originalSend = res.send;
  
  res.send = function(body) {
    // Only cache successful GET requests
    if (req.method === 'GET' && res.statusCode === 200) {
      const etag = generateETag(typeof body === 'string' ? body : JSON.stringify(body));
      res.setHeader('ETag', etag);
      
      // Check client ETag
      const clientETag = req.headers['if-none-match'];
      if (clientETag === etag) {
        return res.status(304).end(); // Not Modified
      }
    }
    
    originalSend.call(this, body);
  };
  
  next();
}

module.exports = etagMiddleware;