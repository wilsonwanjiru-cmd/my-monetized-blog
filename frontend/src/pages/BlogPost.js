// frontend/src/pages/BlogPost.js
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import NewsletterSignup from '../components/NewsletterSignup';
import RelatedPosts from '../components/RelatedPosts';
import { blogAPI, trackPostView } from '../utils/api';
import { initUTMTracking, trackPageView, trackCustomEvent, addUTMParams, getCurrentSessionId } from '../utils/utmTracker';

const BlogPost = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewTracked, setViewTracked] = useState(false);

  // ✅ Enhanced post fetching with error handling and analytics
  const fetchPost = useCallback(async () => {
    if (!slug) {
      setError('No post slug provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // ✅ Use centralized API with proper error handling
      const result = await blogAPI.posts.getBySlug(slug);
      const postData = result.post;

      if (!postData) {
        throw new Error('Post not found');
      }

      setPost(postData);

      // 🔥 DYNAMIC META TAGS - Update document head for SEO
      updateMetaTags(postData);
      
      // 🔥 Add structured data for rich snippets
      addStructuredData(postData);
      
      // 🖼️ PROCESS CONTENT: Enhance images and links after post data is set
      setTimeout(() => {
        processContentImages(postData);
        enhanceContentLinks(postData);
      }, 100);

      // 📊 Track page view after meta tags are set
      setTimeout(() => {
        trackPageView();
        trackPostViewHandler(postData);
      }, 500);

    } catch (err) {
      console.error('Error fetching post:', err);
      setError(err.message || 'Failed to load blog post');
      
      // Track the error
      trackCustomEvent('post_load_error', {
        medium: 'content',
        campaign: 'blog_post',
        content: 'fetch_error',
        metadata: {
          slug: slug,
          error: err.message,
          url: window.location.href,
          timestamp: new Date().toISOString()
        }
      });
    } finally {
      setLoading(false);
    }
  }, [slug]);

  // ✅ Updated track post view for analytics with fallback
  const trackPostViewHandler = async (postData) => {
    if (viewTracked || !postData) return;

    try {
      // ✅ Use the helper function with fallback mechanism
      await trackPostView(postData._id, {
        title: postData.title,
        slug: postData.slug,
        category: postData.category,
        readTime: postData.readTime
      });
      
      // Track custom event
      await trackCustomEvent('post_view', {
        medium: 'content',
        campaign: 'blog_post',
        content: 'post_view',
        metadata: {
          postId: postData._id,
          postSlug: postData.slug,
          postTitle: postData.title,
          category: postData.category,
          readTime: postData.readTime,
          author: postData.author,
          sessionId: getCurrentSessionId(),
          timestamp: new Date().toISOString()
        }
      });

      setViewTracked(true);
      console.log('✅ Post view tracked successfully');
    } catch (error) {
      console.warn('Failed to track post view:', error);
      // Even if tracking fails, mark as tracked to avoid multiple attempts
      setViewTracked(true);
    }
  };

  // ✅ Enhanced meta tags update
  const updateMetaTags = (postData) => {
    const siteUrl = window.REACT_APP_SITE_URL || 'https://wilsonmuita.com';
    const siteName = window.REACT_APP_SITE_NAME || 'Wilson Muita';
    const postUrl = `${siteUrl}/blog/${postData.slug}`;
    
    // Update document title
    document.title = `${postData.title} | ${siteName}`;

    // Basic meta tags
    updateMetaTag('description', postData.metaDescription || postData.excerpt || postData.title);
    updateMetaTag('keywords', postData.tags?.join(', ') || 'technology, programming, web development');
    updateMetaTag('author', postData.author || siteName);
    
    // Open Graph meta tags
    updateMetaTag('og:title', postData.title, 'property');
    updateMetaTag('og:description', postData.metaDescription || postData.excerpt || postData.title, 'property');
    updateMetaTag('og:image', postData.featuredImage || postData.ogImage || `${siteUrl}/default-og-image.jpg`, 'property');
    updateMetaTag('og:url', postUrl, 'property');
    updateMetaTag('og:type', 'article', 'property');
    updateMetaTag('og:site_name', siteName, 'property');
    updateMetaTag('og:locale', 'en_US', 'property');
    
    // Twitter Card meta tags
    updateMetaTag('twitter:card', 'summary_large_image', 'name');
    updateMetaTag('twitter:title', postData.title, 'name');
    updateMetaTag('twitter:description', postData.metaDescription || postData.excerpt || postData.title, 'name');
    updateMetaTag('twitter:image', postData.twitterImage || postData.featuredImage || `${siteUrl}/default-og-image.jpg`, 'name');
    updateMetaTag('twitter:url', postUrl, 'name');
    updateMetaTag('twitter:creator', window.REACT_APP_TWITTER_HANDLE || '@WilsonMuita', 'name');

    // Article-specific meta tags
    if (postData.publishedAt) {
      updateMetaTag('article:published_time', new Date(postData.publishedAt).toISOString(), 'property');
    }
    if (postData.updatedAt) {
      updateMetaTag('article:modified_time', new Date(postData.updatedAt).toISOString(), 'property');
    }
    updateMetaTag('article:author', postData.author || siteName, 'property');
    if (postData.category) {
      updateMetaTag('article:section', postData.category, 'property');
    }
    
    if (postData.tags && postData.tags.length > 0) {
      postData.tags.forEach(tag => {
        updateMetaTag('article:tag', tag, 'property');
      });
    }

    // Canonical URL
    updateMetaTag('canonical', postData.canonicalUrl || postUrl, 'rel', 'link');
  };

  // ✅ Helper function to update meta tags
  const updateMetaTag = (name, content, attribute = 'name', tagName = 'meta') => {
    let metaTag;
    
    if (tagName === 'link') {
      metaTag = document.querySelector(`link[${attribute}="${name}"]`);
    } else {
      metaTag = document.querySelector(`${tagName}[${attribute}="${name}"]`);
    }
    
    if (!metaTag) {
      metaTag = document.createElement(tagName);
      if (tagName === 'link') {
        metaTag.setAttribute('rel', attribute);
        metaTag.setAttribute('href', content);
      } else {
        metaTag.setAttribute(attribute, name);
        metaTag.setAttribute('content', content);
      }
      document.head.appendChild(metaTag);
    } else {
      if (tagName === 'link') {
        metaTag.setAttribute('href', content);
      } else {
        metaTag.setAttribute('content', content);
      }
    }
  };

  // ✅ Add JSON-LD structured data
  const addStructuredData = (postData) => {
    const siteUrl = window.REACT_APP_SITE_URL || 'https://wilsonmuita.com';
    const siteName = window.REACT_APP_SITE_NAME || 'Wilson Muita';

    // Remove existing structured data
    const existingScript = document.getElementById('blog-post-structured-data');
    if (existingScript) {
      existingScript.remove();
    }

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": postData.title,
      "description": postData.metaDescription || postData.excerpt || postData.title,
      "image": {
        "@type": "ImageObject",
        "url": postData.featuredImage || `${siteUrl}/default-og-image.jpg`,
        "width": "1200",
        "height": "630"
      },
      "author": {
        "@type": "Person",
        "name": postData.author || siteName,
        "url": `${siteUrl}/about`
      },
      "publisher": {
        "@type": "Organization",
        "name": siteName,
        "logo": {
          "@type": "ImageObject",
          "url": `${siteUrl}/logo.png`,
          "width": "180",
          "height": "60"
        }
      },
      "datePublished": postData.publishedAt,
      "dateModified": postData.updatedAt || postData.publishedAt,
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": `${siteUrl}/blog/${postData.slug}`
      },
      "wordCount": postData.content ? postData.content.replace(/<[^>]*>/g, '').split(/\s+/).length : 0,
      "timeRequired": `PT${postData.readTime || 5}M`,
      "articleSection": postData.category || 'Technology',
      "keywords": postData.tags?.join(', ') || '',
      "inLanguage": "en-US"
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'blog-post-structured-data';
    script.text = JSON.stringify(structuredData);
    document.head.appendChild(script);
  };

  // ✅ Process content images for lazy loading and better SEO
  const processContentImages = (postData) => {
    const contentImages = document.querySelectorAll('.post-content img');
    
    contentImages.forEach((img, index) => {
      // Add lazy loading attribute if not already present
      if (!img.getAttribute('loading')) {
        img.setAttribute('loading', 'lazy');
      }
      
      // Ensure alt text is meaningful
      if (!img.getAttribute('alt') || img.getAttribute('alt') === '') {
        const src = img.getAttribute('src') || '';
        const fileName = src.split('/').pop()?.split('.')[0] || 'blog image';
        img.setAttribute('alt', `${fileName} - ${postData.title}`);
      }

      // Add image dimensions if available
      if (!img.getAttribute('width') && !img.getAttribute('height')) {
        img.setAttribute('width', '800');
        img.setAttribute('height', '400');
      }

      // Add CSS for better image display
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.style.borderRadius = '8px';
      img.style.margin = '1rem 0';

      // Track image views
      img.addEventListener('load', () => {
        trackCustomEvent('image_load', {
          medium: 'content',
          campaign: 'blog_post',
          content: 'image_loaded',
          metadata: {
            postId: postData._id,
            imageSrc: img.src,
            imageIndex: index,
            imageAlt: img.alt,
            timestamp: new Date().toISOString()
          }
        });
      });
    });
  };

  // ✅ Enhance content links with UTM tracking
  const enhanceContentLinks = (postData) => {
    const contentLinks = document.querySelectorAll('.post-content a[href^="http"]');
    
    contentLinks.forEach(link => {
      const originalHref = link.getAttribute('href');
      const isInternal = originalHref.includes('wilsonmuita.com') || 
                         originalHref.includes(window.location.hostname);

      if (!isInternal && !originalHref.includes('utm_source')) {
        const trackedUrl = addUTMParams(
          originalHref,
          'wilsonmuita',
          'content',
          'outbound_link',
          `post_${postData.slug}`,
          link.textContent?.substring(0, 50)
        );
        
        link.setAttribute('href', trackedUrl);
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');

        // Add click tracking
        link.addEventListener('click', () => {
          trackCustomEvent('outbound_link_click', {
            medium: 'content',
            campaign: 'outbound_link',
            content: `post_${postData.slug}`,
            metadata: {
              postId: postData._id,
              originalUrl: originalHref,
              trackedUrl: trackedUrl,
              linkText: link.textContent,
              isAffiliate: link.classList.contains('affiliate-link'),
              timestamp: new Date().toISOString()
            }
          });
        });
      }
    });
  };

  // ✅ Handle social sharing
  const handleSocialShare = (platform) => {
    const postUrl = encodeURIComponent(window.location.href);
    const postTitle = encodeURIComponent(post?.title || '');
    const shareText = encodeURIComponent(`Check out this article: ${post?.title}`);

    let shareUrl = '';
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${shareText}&url=${postUrl}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${postUrl}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${postUrl}`;
        break;
      default:
        return;
    }

    // Track the share event
    trackCustomEvent('social_share_attempt', {
      medium: 'social',
      campaign: 'social_share',
      content: platform,
      metadata: {
        postId: post?._id,
        platform: platform,
        url: postUrl,
        timestamp: new Date().toISOString()
      }
    });

    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  // ✅ Main useEffect for component lifecycle
  useEffect(() => {
    // Initialize UTM tracking
    initUTMTracking();

    // Fetch post data
    fetchPost();

    // Cleanup function
    return () => {
      // Reset document title
      const siteName = window.REACT_APP_SITE_NAME || 'Wilson Muita';
      document.title = siteName;
      
      // Remove structured data script
      const existingScript = document.getElementById('blog-post-structured-data');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, [fetchPost]);

  // ✅ Loading state
  if (loading) {
    return (
      <div style={{ 
        padding: '3rem 1rem', 
        textAlign: 'center',
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid #f3f4f6',
            borderTop: '4px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <h2 style={{ 
            color: '#374151',
            margin: 0,
            fontSize: '1.5rem'
          }}>Loading Article</h2>
          <p style={{ 
            color: '#6b7280',
            margin: 0,
            fontSize: '1rem'
          }}>Fetching the latest content for you...</p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // ✅ Error state
  if (error) {
    return (
      <div style={{ 
        padding: '3rem 1rem', 
        textAlign: 'center',
        maxWidth: '600px',
        margin: '0 auto'
      }}>
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          padding: '2rem'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
          <h2 style={{ 
            color: '#dc2626',
            margin: '0 0 1rem 0'
          }}>Unable to Load Article</h2>
          <p style={{ 
            color: '#7f1d1d',
            margin: '0 0 1.5rem 0',
            lineHeight: '1.5'
          }}>
            {error}
          </p>
          <button
            onClick={() => navigate('/')}
            style={{
              background: '#667eea',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '500'
            }}
          >
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  // ✅ No post found
  if (!post) {
    return (
      <div style={{ 
        padding: '3rem 1rem', 
        textAlign: 'center',
        maxWidth: '600px',
        margin: '0 auto'
      }}>
        <div style={{
          background: '#fffbeb',
          border: '1px solid #fcd34d',
          borderRadius: '12px',
          padding: '2rem'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
          <h2 style={{ 
            color: '#d97706',
            margin: '0 0 1rem 0'
          }}>Article Not Found</h2>
          <p style={{ 
            color: '#92400e',
            margin: '0 0 1.5rem 0',
            lineHeight: '1.5'
          }}>
            The blog post you're looking for doesn't exist or may have been moved.
          </p>
          <button
            onClick={() => navigate('/blog')}
            style={{
              background: '#667eea',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '500'
            }}
          >
            Browse All Articles
          </button>
        </div>
      </div>
    );
  }

  // ✅ Main post content
  return (
    <article style={{ 
      maxWidth: '800px', 
      margin: '0 auto',
      padding: '0 1rem 3rem 1rem'
    }}>
      {/* 🖼️ FEATURED IMAGE with enhanced styling */}
      {post.featuredImage && (
        <div style={{ marginBottom: '2rem', borderRadius: '12px', overflow: 'hidden' }}>
          <img
            src={post.featuredImage}
            alt={post.imageAltText || post.title}
            loading="lazy"
            style={{ 
              width: '100%', 
              height: '400px', 
              objectFit: 'cover',
              display: 'block'
            }}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </div>
      )}

      {/* 📝 POST HEADER */}
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ 
          fontSize: '2.5rem',
          fontWeight: '800',
          lineHeight: '1.2',
          color: '#1f2937',
          margin: '0 0 1rem 0',
          fontFamily: 'Inter, sans-serif'
        }}>
          {post.title}
        </h1>

        <div style={{ 
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          color: '#6b7280',
          fontSize: '0.95rem',
          marginBottom: '1rem'
        }}>
          <span>👤 By {post.author || 'Wilson Muita'}</span>
          {post.publishedAt && (
            <span>📅 {new Date(post.publishedAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</span>
          )}
          <span>⏱️ {post.readTime || 5} min read</span>
          {post.views !== undefined && (
            <span>👁️ {post.views.toLocaleString()} views</span>
          )}
        </div>

        {/* 📍 CATEGORY & TAGS */}
        <div style={{ 
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          marginBottom: '1rem'
        }}>
          {post.category && (
            <span style={{
              background: '#667eea',
              color: 'white',
              padding: '0.25rem 0.75rem',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: '500'
            }}>
              {post.category}
            </span>
          )}
          {post.tags && post.tags.map(tag => (
            <span
              key={tag}
              style={{
                background: '#f3f4f6',
                color: '#374151',
                padding: '0.25rem 0.75rem',
                borderRadius: '20px',
                fontSize: '0.8rem'
              }}
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* 📱 SOCIAL SHARING */}
        <div style={{ 
          display: 'flex',
          gap: '0.5rem',
          marginTop: '1.5rem'
        }}>
          <button
            onClick={() => handleSocialShare('twitter')}
            style={{
              background: '#1da1f2',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            🐦 Twitter
          </button>
          <button
            onClick={() => handleSocialShare('linkedin')}
            style={{
              background: '#0077b5',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            💼 LinkedIn
          </button>
          <button
            onClick={() => handleSocialShare('facebook')}
            style={{
              background: '#4267B2',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            📘 Facebook
          </button>
        </div>
      </header>

      {/* 📄 POST CONTENT */}
      <section 
        className="post-content"
        style={{ 
          lineHeight: '1.7',
          fontSize: '1.1rem',
          color: '#374151'
        }}
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      {/* 📧 NEWSLETTER SIGNUP SECTION */}
      <section style={{ 
        marginTop: '4rem', 
        paddingTop: '3rem', 
        borderTop: '1px solid #e5e7eb' 
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ 
            fontSize: '1.75rem',
            margin: '0 0 1rem 0',
            color: '#1f2937'
          }}>💌 Stay Updated</h2>
          <p style={{ 
            color: '#6b7280', 
            fontSize: '1.1rem',
            lineHeight: '1.6',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            Enjoyed this article? Subscribe to my newsletter to get notified when I publish new content. 
            No spam, unsubscribe anytime.
          </p>
        </div>
        <NewsletterSignup source="blog_post" location="post_bottom" />
      </section>

      {/* 🔗 RELATED POSTS */}
      {post && (
        <RelatedPosts post={post} />
      )}
    </article>
  );
};

export default BlogPost;