const express = require('express');
const router = express.Router();
const Post = require('../models/Post');

router.get('/amp/blog/:slug', async (req, res) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug, isPublished: true });
    if (!post) {
      return res.status(404).send('Post not found');
    }
    res.render('amp', { post });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

module.exports = router;