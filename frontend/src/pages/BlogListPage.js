// frontend/src/pages/BlogListPage.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API_BASE_URL from '../utils/api'; // Import the centralized API configuration

const BlogListPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        // ✅ UPDATED: Use centralized API configuration
        const response = await fetch(`${API_BASE_URL}/posts`);
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        const data = await response.json();
        setPosts(data.posts); // Adjusted based on your backend output
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  if (loading) return <div style={{ padding: '2rem' }}>Loading posts...</div>;
  if (error) return <div style={{ padding: '2rem', color: 'red' }}>Error: {error}</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Blog Posts</h1>
      {posts.length === 0 ? (
        <p>No posts found.</p>
      ) : (
        posts.map(post => (
          <div
            key={post._id}
            style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '5px' }}
          >
            {/* 🖼️ FEATURED IMAGE with lazy loading and improved alt text */}
            {post.featuredImage && (
              <img
                src={post.featuredImage}
                alt={post.imageAltText || post.title} // ✅ Use dynamic alt text if available
                loading="lazy" // ✅ Native lazy loading
                style={{ maxWidth: '100%', height: 'auto', marginBottom: '1rem' }}
              />
            )}
            {/* ✅ This link already uses the correct /post/ prefix */}
            <h2>
              <Link to={`/post/${post.slug}`}>{post.title}</Link>
            </h2>
            <p>{post.excerpt}</p>
            <small>
              By {post.author} | {new Date(post.publishedAt).toLocaleDateString()}
            </small>
            <br />
            {/* ✅ This link also correctly uses the /post/ prefix */}
            <Link to={`/post/${post.slug}`}>Read More →</Link>
          </div>
        ))
      )}
    </div>
  );
};

export default BlogListPage;