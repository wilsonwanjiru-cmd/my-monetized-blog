// frontend/src/pages/BlogListPage.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { blogAPI } from '../utils/api';
import './BlogListPage.css'; // Make sure this import is correct

const BlogListPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        setError('');
        
        console.log('🔄 Fetching posts from API...');
        const response = await blogAPI.posts.getAll();
        
        // Handle different response structures
        let postsData = [];
        if (Array.isArray(response)) {
          postsData = response;
        } else if (response && response.posts) {
          postsData = response.posts;
        } else if (response && Array.isArray(response.data)) {
          postsData = response.data;
        } else {
          console.warn('Unexpected API response structure:', response);
          postsData = [];
        }
        
        console.log(`✅ Loaded ${postsData.length} posts`);
        setPosts(postsData);
        
      } catch (err) {
        console.error('❌ Error fetching posts:', err);
        setError(err.message || 'Failed to load blog posts. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading blog posts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Oops! Something went wrong</h2>
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="retry-button"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="blog-list-page">
      <header className="blog-header">
        <h1>Blog Posts</h1>
        <p>Discover the latest articles on passive income and monetization strategies</p>
        {posts.length > 0 && (
          <p className="posts-count">{posts.length} article{posts.length !== 1 ? 's' : ''} found</p>
        )}
      </header>

      <div className="posts-grid">
        {posts.length > 0 ? (
          posts.map((post) => (
            <article key={post._id} className="post-card">
              <div className="post-image">
                <img 
                  src={post.featuredImage} 
                  alt={post.imageAltText || post.title}
                  onError={(e) => {
                    e.target.src = '/default-og-image.jpg';
                  }}
                />
              </div>
              <div className="post-content">
                <div className="post-meta">
                  <span className="category">{post.category}</span>
                  <span className="read-time">{post.readTime || 5} min read</span>
                </div>
                <h2 className="post-title">
                  <Link to={`/blog/${post.slug}`}>{post.title}</Link>
                </h2>
                <p className="post-excerpt">{post.excerpt}</p>
                <div className="post-footer">
                  <span className="author">By {post.author}</span>
                  <span className="date">
                    {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : 'Recently'}
                  </span>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="no-posts">
            <h3>No blog posts found</h3>
            <p>Check back later for new articles!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogListPage;
