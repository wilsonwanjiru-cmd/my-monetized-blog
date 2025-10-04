const axios = require('axios');
const Post = require('../models/Post');

class BrokenLinkChecker {
  constructor() {
    this.results = [];
  }

  async scanPostLinks() {
    try {
      const posts = await Post.find({ isPublished: true });
      
      for (const post of posts) {
        const links = this.extractLinks(post.content);
        for (const link of links) {
          await this.checkLink(link, post._id);
        }
      }
      
      await this.generateReport();
    } catch (error) {
      console.error('Broken link scan error:', error);
    }
  }

  extractLinks(htmlContent) {
    const linkRegex = /<a[^>]+href="([^"]*)"/g;
    const links = [];
    let match;
    
    while ((match = linkRegex.exec(htmlContent)) !== null) {
      if (match[1].startsWith('http')) {
        links.push(match[1]);
      }
    }
    
    return links;
  }

  async checkLink(url, postId) {
    try {
      const response = await axios.head(url, { timeout: 10000 });
      
      if (response.status >= 400) {
        this.results.push({
          url,
          postId,
          status: response.status,
          issue: 'Broken link'
        });
      }
    } catch (error) {
      this.results.push({
        url,
        postId,
        status: error.response?.status || 'Timeout',
        issue: 'Broken link'
      });
    }
  }

  async generateReport() {
    if (this.results.length > 0) {
      console.log('Broken Links Found:');
      this.results.forEach(result => {
        console.log(`- URL: ${result.url}`);
        console.log(`  Post ID: ${result.postId}`);
        console.log(`  Status: ${result.status}`);
        console.log(`  Issue: ${result.issue}`);
      });
      
      // Here you can send an email notification
      // await sendBrokenLinkNotification(this.results);
    }
  }
}

module.exports = BrokenLinkChecker;