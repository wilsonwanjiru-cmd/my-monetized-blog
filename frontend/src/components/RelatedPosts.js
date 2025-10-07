// frontend/src/components/RelatedPosts.js
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API_BASE_URL from '../utils/api'; // Import the centralized API configuration
import utmTracker from '../utils/utmTracker'; // Import UTM tracking

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

        // 📊 Track related posts impression
        trackRelatedPostsImpression(data.relatedPosts || []);
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

  /**
   * Track when related posts are displayed to user
   */
  const trackRelatedPostsImpression = async (posts) => {
    if (posts.length === 0) return;

    try {
      const impressionData = {
        eventType: 'related_posts_impression',
        postId: post._id,
        sessionId: utmTracker.getCurrentSessionId(),
        metadata: {
          relatedPostCount: posts.length,
          relatedPostIds: posts.map(p => p._id),
          sourcePost: post.title,
          position: 'below_content'
        }
      };

      await fetch(`${API_BASE_URL}/analytics/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(impressionData)
      });

      if (process.env.NODE_ENV !== 'production') {
        console.log('📊 Related Posts Impression:', impressionData);
      }
    } catch (error) {
      console.warn('Related posts impression tracking failed:', error);
    }
  };

  /**
   * Track when user clicks on a related post
   */
  const trackRelatedPostClick = async (clickedPost, position) => {
    try {
      const clickData = {
        eventType: 'related_post_click',
        postId: post._id, // Source post
        elementId: `related-post-${clickedPost._id}`,
        url: `/blog/${clickedPost.slug}`,
        sessionId: utmTracker.getCurrentSessionId(),
        metadata: {
          sourcePost: post.title,
          clickedPost: clickedPost.title,
          position: position,
          relevanceScore: clickedPost.relevanceScore || 0,
          clickOrder: position + 1
        }
      };

      await fetch(`${API_BASE_URL}/analytics/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clickData)
      });

      if (process.env.NODE_ENV !== 'production') {
        console.log('🔗 Related Post Click:', clickData);
      }
    } catch (error) {
      console.warn('Related post click tracking failed:', error);
    }
  };

  /**
   * Handle related post link click with tracking
   */
  const handleRelatedPostClick = (relatedPost, index) => {
    // Track the click event
    trackRelatedPostClick(relatedPost, index);
    
    // Additional UTM tracking for the outbound click
    utmTracker.trackOutboundClick({
      originalUrl: `/blog/${relatedPost.slug}`,
      trackedUrl: utmTracker.addUTMParams(
        `/blog/${relatedPost.slug}`,
        'yourblog',
        'content',
        'related_posts',
        `position_${index + 1}`,
        relatedPost.title
      ),
      utmSource: 'yourblog',
      utmMedium: 'content',
      campaign: 'related_posts',
      content: `position_${index + 1}`,
      element: 'related_post_link',
      text: relatedPost.title,
      isAffiliate: false
    });
  };

  if (loading) {
    return (
      <section className="related-posts" style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #e0e0e0' }}>
        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', color: '#333' }}>You might also like</h3>
        <div className="loading" style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
          Loading related posts...
        </div>
      </section>
    );
  }

  if (error || relatedPosts.length === 0) return null;

  return (
    <section 
      className="related-posts" 
      style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #e0e0e0' }}
    >
      <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', color: '#333' }}>
        You might also like
      </h3>
      
      <div 
        className="related-grid" 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: '1.5rem',
          marginTop: '1rem'
        }}
      >
        {relatedPosts.map((relatedPost, index) => (
          <article 
            key={relatedPost._id} 
            className="related-card"
            style={{
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              overflow: 'hidden',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {relatedPost.featuredImage && (
              <img 
                src={relatedPost.featuredImage} 
                alt={relatedPost.imageAltText || relatedPost.title}
                loading="lazy"
                className="related-image"
                style={{
                  width: '100%',
                  height: '160px',
                  objectFit: 'cover',
                  display: 'block'
                }}
              />
            )}
            
            <div 
              className="related-content"
              style={{ padding: '1.25rem' }}
            >
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '1.1rem', lineHeight: '1.4' }}>
                <Link 
                  to={`/blog/${relatedPost.slug}`}
                  onClick={() => handleRelatedPostClick(relatedPost, index)}
                  style={{
                    color: '#2c5aa0',
                    textDecoration: 'none',
                    fontWeight: '600'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.color = '#1e3a8a';
                    e.target.style.textDecoration = 'underline';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = '#2c5aa0';
                    e.target.style.textDecoration = 'none';
                  }}
                >
                  {relatedPost.title}
                </Link>
              </h4>
              
              <p style={{ 
                margin: '0 0 0.75rem 0', 
                color: '#666', 
                fontSize: '0.9rem',
                lineHeight: '1.5',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}>
                {relatedPost.excerpt}
              </p>
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                fontSize: '0.8rem',
                color: '#888'
              }}>
                <span>{relatedPost.readTime || 5} min read</span>
                {relatedPost.relevanceScore && (
                  <span style={{ 
                    backgroundColor: '#f0f0f0',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '0.7rem'
                  }}>
                    {Math.round(relatedPost.relevanceScore * 100)}% match
                  </span>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* 📊 Hidden analytics for scroll tracking */}
      <div 
        style={{ 
          height: '1px', 
          width: '100%', 
          background: 'transparent',
          marginTop: '2rem'
        }}
        ref={(el) => {
          if (el) {
            // Simple intersection observer for scroll tracking
            const observer = new IntersectionObserver((entries) => {
              entries.forEach(entry => {
                if (entry.isIntersecting) {
                  // Track when related posts section comes into view
                  trackRelatedPostsImpression(relatedPosts);
                  observer.disconnect();
                }
              });
            }, { threshold: 0.5 });

            observer.observe(el);
          }
        }}
      />
    </section>
  );
};

export default RelatedPosts;