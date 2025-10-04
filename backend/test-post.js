const mongoose = require('mongoose');
const Post = require('./models/Post');

// Test data
const testPost = {
  title: "My First Blog Post",
  content: "This is the full content of my first blog post. It contains enough text to demonstrate the functionality and ensure everything is working properly.",
  excerpt: "This is a short excerpt about my first blog post.",
  featuredImage: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=500",
  author: "Wilson",
  tags: ["React", "Node", "MongoDB", "Blog"],
  category: "Technology",
  metaDescription: "This is my first blog post about creating a monetized blog with React, Node.js and MongoDB",
  readTime: 3,
  isPublished: true
};

async function testCreatePost() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/monetized-blog', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Create and save post
    const post = new Post(testPost);
    const savedPost = await post.save();
    
    console.log('✅ Post created successfully!');
    console.log('📝 Post details:', {
      id: savedPost._id,
      title: savedPost.title,
      slug: savedPost.slug,
      author: savedPost.author,
      createdAt: savedPost.createdAt
    });
    
  } catch (error) {
    console.error('❌ Error creating post:', error.message);
    console.error('🔍 Error details:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔗 MongoDB connection closed');
  }
}

testCreatePost();