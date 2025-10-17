// frontend/src/components/RelatedPosts.js
import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { blogAPI, fetchRelatedPosts } from '../utils/api'; // Import the centralized API
import { trackCustomEvent, getCurrentSessionId, addUTMParams } from '../utils/utmTracker'; // Import UTM tracking

const RelatedPosts = ({ post, maxPosts = 3, position = 'below_content' }) => {
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasBeenViewed, setHasBeenViewed] = useState(false);
  const [hoverStates, setHoverStates] = useState({});
  const sectionRef = useRef(null);

  useEffect(() => {
    const fetchRelatedPostsData = async () => {
      try {
        setLoading(true);
        
        // ✅ UPDATED: Use the centralized blogAPI with better error handling
        let posts = [];
        
        if (post._id) {
          // Use the new getRelated method with post ID
          const response = await blogAPI.posts.getRelated(post._id, { limit: maxPosts });
          posts = response.posts || response.relatedPosts || [];
        } else if (post.slug) {
          // Fallback: Get post by slug first, then get related posts
          try {
            const postResponse = await blogAPI.posts.getBySlug(post.slug);
            if (postResponse.post && postResponse.post._id) {
              const relatedResponse = await blogAPI.posts.getRelated(postResponse.post._id, { limit: maxPosts });
              posts = relatedResponse.posts || relatedResponse.relatedPosts || [];
            } else {
              throw new Error('Could not find post ID from slug');
            }
          } catch (slugError) {
            console.warn('Failed to get post by slug, using alternative method:', slugError);
            // Alternative: Use the helper function
            posts = await fetchRelatedPosts(post.slug, { limit: maxPosts });
          }
        } else {
          throw new Error('Post must have either _id or slug');
        }
        
        // Limit to maxPosts and ensure we have valid posts
        const limitedPosts = posts.slice(0, maxPosts).filter(p => p && (p._id || p.slug));
        setRelatedPosts(limitedPosts);
        setError(null);

        // 📊 Track related posts impression when fetched
        if (limitedPosts.length > 0) {
          trackRelatedPostsImpression(limitedPosts, 'fetched');
        } else {
          console.warn('No related posts found for:', post.title || post.slug);
        }
      } catch (error) {
        console.error('Error fetching related posts:', error);
        setError('Failed to load related posts');
        setRelatedPosts([]);
        
        // Track the error
        trackCustomEvent('related_posts_error', {
          medium: 'content',
          campaign: 'related_posts',
          content: 'fetch_error',
          metadata: {
            postId: post._id,
            postSlug: post.slug,
            error: error.message,
            position: position,
            timestamp: new Date().toISOString()
          }
        });
      } finally {
        setLoading(false);
      }
    };

    if (post && (post._id || post.slug)) {
      fetchRelatedPostsData();
    } else {
      console.warn('RelatedPosts: No post ID or slug provided');
      setLoading(false);
      setError('No post data provided');
    }
  }, [post._id, post.slug, maxPosts, position]);

  // Intersection Observer for view tracking
  useEffect(() => {
    if (!sectionRef.current || relatedPosts.length === 0 || hasBeenViewed) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !hasBeenViewed) {
            setHasBeenViewed(true);
            trackRelatedPostsImpression(relatedPosts, 'viewed');
          }
        });
      },
      { 
        threshold: 0.3, // Reduced threshold for better detection
        rootMargin: '0px 0px -100px 0px' // Trigger when 100px from bottom of viewport
      }
    );

    observer.observe(sectionRef.current);

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, [relatedPosts, hasBeenViewed]);

  /**
   * Track when related posts are displayed to user
   */
  const trackRelatedPostsImpression = async (posts, trigger = 'fetched') => {
    if (posts.length === 0) return;

    try {
      await trackCustomEvent('related_posts_impression', {
        medium: 'content',
        campaign: 'related_posts',
        content: trigger,
        metadata: {
          postId: post._id,
          postSlug: post.slug,
          postTitle: post.title,
          relatedPostCount: posts.length,
          relatedPostIds: posts.map(p => p._id).filter(Boolean),
          relatedPostTitles: posts.map(p => p.title).filter(Boolean),
          sourcePost: post.title,
          position: position,
          trigger: trigger,
          sessionId: getCurrentSessionId(),
          timestamp: new Date().toISOString()
        }
      });

      if (process.env.NODE_ENV !== 'production') {
        console.log('📊 Related Posts Impression:', {
          trigger,
          postCount: posts.length,
          position,
          sourcePost: post.title
        });
      }
    } catch (error) {
      console.warn('Related posts impression tracking failed:', error);
    }
  };

  /**
   * Track when user clicks on a related post
   */
  const trackRelatedPostClick = async (clickedPost, positionIndex) => {
    try {
      await trackCustomEvent('related_post_click', {
        medium: 'content',
        campaign: 'related_posts',
        content: `position_${positionIndex + 1}`,
        metadata: {
          sourcePostId: post._id,
          sourcePostSlug: post.slug,
          sourcePostTitle: post.title,
          clickedPostId: clickedPost._id,
          clickedPostSlug: clickedPost.slug,
          clickedPostTitle: clickedPost.title,
          position: positionIndex,
          relevanceScore: clickedPost.relevanceScore || 0,
          clickOrder: positionIndex + 1,
          totalRelated: relatedPosts.length,
          sessionId: getCurrentSessionId(),
          timestamp: new Date().toISOString()
        }
      });

      if (process.env.NODE_ENV !== 'production') {
        console.log('🔗 Related Post Click:', {
          source: post.title,
          clicked: clickedPost.title,
          position: positionIndex
        });
      }
    } catch (error) {
      console.warn('Related post click tracking failed:', error);
    }
  };

  /**
   * Track when user hovers over a related post
   */
  const trackRelatedPostHover = async (hoveredPost, positionIndex, hoverDuration = 0) => {
    try {
      await trackCustomEvent('related_post_hover', {
        medium: 'content',
        campaign: 'related_posts',
        content: `hover_position_${positionIndex + 1}`,
        metadata: {
          sourcePostId: post._id,
          hoveredPostId: hoveredPost._id,
          hoveredPostTitle: hoveredPost.title,
          position: positionIndex,
          hoverDuration: hoverDuration,
          sessionId: getCurrentSessionId(),
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.warn('Related post hover tracking failed:', error);
    }
  };

  /**
   * Handle related post link click with comprehensive tracking
   */
  const handleRelatedPostClick = (relatedPost, index) => {
    // Track the click event
    trackRelatedPostClick(relatedPost, index);
    
    // Additional UTM tracking for the outbound click
    const trackedUrl = addUTMParams(
      `/blog/${relatedPost.slug}`,
      'wilsonmuita',
      'content',
      'related_posts',
      `position_${index + 1}`,
      relatedPost.title
    );

    // Update the link to include UTM parameters
    setTimeout(() => {
      window.location.href = trackedUrl;
    }, 100);
  };

  /**
   * Handle related post hover start
   */
  const handleHoverStart = (relatedPost, index) => {
    const hoverStartTime = Date.now();
    setHoverStates(prev => ({
      ...prev,
      [relatedPost._id]: hoverStartTime
    }));
  };

  /**
   * Handle related post hover end
   */
  const handleHoverEnd = (relatedPost, index) => {
    const hoverStartTime = hoverStates[relatedPost._id];
    if (hoverStartTime) {
      const hoverDuration = Date.now() - hoverStartTime;
      if (hoverDuration > 500) { // Only track hovers longer than 500ms
        trackRelatedPostHover(relatedPost, index, hoverDuration);
      }
      setHoverStates(prev => {
        const newState = { ...prev };
        delete newState[relatedPost._id];
        return newState;
      });
    }
  };

  /**
   * Handle link hover effects
   */
  const handleLinkHover = (e, isHovering) => {
    if (isHovering) {
      e.target.style.color = '#667eea';
    } else {
      e.target.style.color = '#2d3748';
    }
  };

  // Render loading state
  if (loading) {
    return (
      <section 
        className="related-posts loading" 
        style={{ 
          marginTop: '3rem', 
          paddingTop: '2rem', 
          borderTop: '1px solid #eaeaea' 
        }}
        ref={sectionRef}
      >
        <h3 style={{ 
          marginBottom: '1.5rem', 
          fontSize: '1.5rem', 
          color: '#2d3748',
          fontWeight: '700',
          fontFamily: 'Inter, sans-serif'
        }}>
          📚 You Might Also Like
        </h3>
        <div className="loading-state" style={{ 
          padding: '2rem', 
          textAlign: 'center', 
          color: '#718096',
          background: '#f7fafc',
          borderRadius: '12px',
          border: '1px dashed #cbd5e0'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            <div className="loading-spinner" style={{
              width: '24px',
              height: '24px',
              border: '3px solid #e2e8f0',
              borderTop: '3px solid #667eea',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <span style={{ fontWeight: '500' }}>Loading related articles...</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.7 }}>
            Finding the most relevant content for you
          </p>
        </div>

        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </section>
    );
  }

  // Render error state or empty state
  if (error || relatedPosts.length === 0) {
    if (error && process.env.NODE_ENV !== 'production') {
      console.warn('RelatedPosts component error:', error);
    }
    
    // Don't show anything if no related posts found
    if (relatedPosts.length === 0) {
      return null;
    }
    
    // Only show error in development
    if (process.env.NODE_ENV === 'development' && error) {
      return (
        <section 
          className="related-posts error" 
          style={{ 
            marginTop: '3rem', 
            paddingTop: '2rem', 
            borderTop: '1px solid #eaeaea' 
          }}
        >
          <div style={{ 
            padding: '1rem', 
            background: '#fed7d7', 
            border: '1px solid #feb2b2',
            borderRadius: '8px',
            color: '#742a2a'
          }}>
            <strong>Related Posts Error:</strong> {error}
          </div>
        </section>
      );
    }
    
    return null;
  }

  // Main render with related posts
  return (
    <section 
      className="related-posts" 
      style={{ 
        marginTop: '3rem', 
        paddingTop: '2rem', 
        borderTop: '1px solid #eaeaea' 
      }}
      ref={sectionRef}
    >
      <h3 style={{ 
        marginBottom: '1.5rem', 
        fontSize: '1.5rem', 
        color: '#2d3748',
        fontWeight: '700',
        fontFamily: 'Inter, sans-serif',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <span role="img" aria-label="books">📚</span>
        You Might Also Like
      </h3>
      
      <div 
        className="related-grid" 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '1.5rem',
          marginTop: '1rem'
        }}
      >
        {relatedPosts.map((relatedPost, index) => (
          <article 
            key={relatedPost._id || relatedPost.slug || index} 
            id={`related-post-${relatedPost._id || index}`}
            className="related-card"
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              overflow: 'hidden',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              background: 'white',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)';
              e.currentTarget.style.borderColor = '#667eea';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
          >
            {relatedPost.featuredImage && (
              <div className="related-image-container" style={{ position: 'relative' }}>
                <img 
                  src={relatedPost.featuredImage} 
                  alt={relatedPost.imageAltText || relatedPost.title}
                  loading="lazy"
                  className="related-image"
                  style={{
                    width: '100%',
                    height: '180px',
                    objectFit: 'cover',
                    display: 'block'
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                <div 
                  className="image-overlay"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.3) 100%)',
                    opacity: 0,
                    transition: 'opacity 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.opacity = '0';
                  }}
                />
              </div>
            )}
            
            <div 
              className="related-content"
              style={{ padding: '1.5rem' }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                marginBottom: '0.75rem',
                gap: '1rem'
              }}>
                <h4 style={{ 
                  margin: 0, 
                  fontSize: '1.1rem', 
                  lineHeight: '1.4',
                  fontWeight: '600',
                  color: '#2d3748',
                  flex: 1
                }}>
                  <Link 
                    to={addUTMParams(
                      `/blog/${relatedPost.slug}`,
                      'wilsonmuita',
                      'content',
                      'related_posts',
                      `position_${index + 1}`,
                      relatedPost.title
                    )}
                    onClick={(e) => {
                      e.preventDefault();
                      handleRelatedPostClick(relatedPost, index);
                    }}
                    onMouseEnter={(e) => {
                      handleHoverStart(relatedPost, index);
                      handleLinkHover(e, true);
                    }}
                    onMouseLeave={(e) => {
                      handleHoverEnd(relatedPost, index);
                      handleLinkHover(e, false);
                    }}
                    style={{
                      color: 'inherit',
                      textDecoration: 'none',
                      display: 'block',
                      transition: 'color 0.2s ease'
                    }}
                  >
                    {relatedPost.title}
                  </Link>
                </h4>
                
                {relatedPost.relevanceScore && (
                  <span 
                    className="relevance-badge"
                    style={{ 
                      backgroundColor: '#667eea',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '0.7rem',
                      fontWeight: '600',
                      whiteSpace: 'nowrap',
                      flexShrink: 0
                    }}
                    title="Relevance score based on tags and category matching"
                  >
                    {Math.round(relatedPost.relevanceScore * 100)}% match
                  </span>
                )}
              </div>
              
              <p style={{ 
                margin: '0 0 1rem 0', 
                color: '#718096', 
                fontSize: '0.9rem',
                lineHeight: '1.5',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                minHeight: '2.7rem'
              }}>
                {relatedPost.excerpt || relatedPost.description || 'Discover more insights in this related article.'}
              </p>
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                fontSize: '0.8rem',
                color: '#a0aec0',
                borderTop: '1px solid #f7fafc',
                paddingTop: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>⏱️ {relatedPost.readTime || 5} min read</span>
                  {relatedPost.views > 0 && (
                    <span>👁️ {relatedPost.views.toLocaleString()} views</span>
                  )}
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.25rem',
                  fontSize: '0.75rem'
                }}>
                  <span role="img" aria-label="calendar">📅</span>
                  {relatedPost.publishedAt && (
                    <span>
                      {new Date(relatedPost.publishedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* 📊 Performance tracking */}
      {relatedPosts.length > 0 && (
        <div style={{ 
          marginTop: '2rem',
          padding: '1rem',
          background: '#f7fafc',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          fontSize: '0.8rem',
          color: '#718096',
          textAlign: 'center'
        }}>
          <p style={{ margin: 0 }}>
            <strong>💡 Pro Tip:</strong> These articles were selected based on their relevance to your current read. 
            {relatedPosts.some(p => p.relevanceScore > 0.8) && 
              " We found some highly relevant content you might love!"
            }
          </p>
        </div>
      )}
    </section>
  );
};

export default RelatedPosts;