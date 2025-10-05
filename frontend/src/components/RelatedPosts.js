// frontend/src/components/RelatedPosts.js
import React, { useEffect, useState } from 'react';
import API_BASE_URL from '../utils/api'; // Import the centralized API configuration

const RelatedPosts = ({ post }) => {
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRelatedPosts = async () => {
      try {
        setLoading(true);
        // ✅ UPDATED: Use centralized API configuration
        const response = await fetch(`${API_BASE_URL}/posts/related/${post._id}`);
        
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        
        const data = await response.json();
        setRelatedPosts(data.relatedPosts || []);
        setError(null);
      } catch (error) {
        console.error('Error fetching related posts:', error);
        setError('Failed to load related posts');
        setRelatedPosts([]);
      } finally {
        setLoading(false);
      }
    };

    if (post && post._id) {
      fetchRelatedPosts();
    }
  }, [post._id]);

  if (loading) {
    return (
      <section className="related-posts">
        <h3>You might also like</h3>
        <div className="loading">Loading related posts...</div>
      </section>
    );
  }

  if (error || relatedPosts.length === 0) return null;

  return (
    <section className="related-posts">
      <h3>You might also like</h3>
      <div className="related-grid">
        {relatedPosts.map(relatedPost => (
          <article key={relatedPost._id} className="related-card">
            {relatedPost.featuredImage && (
              <img 
                src={relatedPost.featuredImage} 
                alt={relatedPost.title}
                loading="lazy"
                className="related-image"
              />
            )}
            <div className="related-content">
              <h4>
                <a href={`/blog/${relatedPost.slug}`}>{relatedPost.title}</a>
              </h4>
              <p>{relatedPost.excerpt}</p>
              <span>{relatedPost.readTime} min read</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default RelatedPosts;