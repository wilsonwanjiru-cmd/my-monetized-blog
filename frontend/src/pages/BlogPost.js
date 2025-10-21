// frontend/src/pages/BlogPost.js
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';
import Layout from '../components/Layout';
import NewsletterSignup from '../components/NewsletterSignup';
import RelatedPosts from '../components/RelatedPosts';
import { blogAPI, trackPostView } from '../utils/api';
import { initUTMTracking, trackPageView, trackCustomEvent, addUTMParams, getCurrentSessionId } from '../utils/utmTracker';
import './BlogPost.css'; // Import the CSS file

const BlogPost = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewTracked, setViewTracked] = useState(false);

  // Enhanced post fetching with error handling and analytics
  const fetchPost = useCallback(async () => {
    if (!slug) {
      setError('No post slug provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Use centralized API with proper error handling
      const result = await blogAPI.posts.getBySlug(slug);
      const postData = result.post;

      if (!postData) {
        throw new Error('Post not found');
      }

      setPost(postData);

      // Update document head for SEO
      updateMetaTags(postData);
      
      // Add structured data for rich snippets
      addStructuredData(postData);
      
      // Process content after a short delay to ensure DOM is updated
      setTimeout(() => {
        processContentImages(postData);
        enhanceContentLinks(postData);
      }, 100);

      // Track page view after meta tags are set
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

  // Track post view for analytics
  const trackPostViewHandler = async (postData) => {
    if (viewTracked || !postData) return;

    try {
      // Use the helper function with fallback mechanism
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

  // Enhanced meta tags update
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

  // Helper function to update meta tags
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

  // Add JSON-LD structured data
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

  // Process content images for responsive behavior and better SEO
  const processContentImages = (postData) => {
    const contentImages = document.querySelectorAll('.post-content img');
    
    contentImages.forEach((img, index) => {
      // Apply robust responsive image CSS
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.style.display = 'block';
      
      // Add CSS class for additional responsive control
      img.classList.add('responsive-image');
      
      // Ensure alt text is meaningful
      if (!img.getAttribute('alt') || img.getAttribute('alt') === '') {
        const src = img.getAttribute('src') || '';
        const fileName = src.split('/').pop()?.split('.')[0] || 'blog image';
        img.setAttribute('alt', `${fileName} - ${postData.title}`);
      }

      // Add lazy loading attribute if not already present
      if (!img.getAttribute('loading')) {
        img.setAttribute('loading', 'lazy');
      }

      // Better width/height attributes for layout stability
      if (!img.getAttribute('width') && !img.getAttribute('height')) {
        // Remove any inline styles that might force dimensions
        img.style.width = '';
        img.style.height = '';
      }

      // Handle image container overflow
      const parent = img.parentElement;
      if (parent && parent.style) {
        parent.style.overflow = 'hidden';
        parent.style.borderRadius = '8px';
      }

      // Track image views
      img.addEventListener('load', () => {
        console.log(`✅ Image ${index + 1} loaded successfully`);
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

      // Handle image errors gracefully
      img.addEventListener('error', () => {
        console.warn(`❌ Image failed to load: ${img.src}`);
        img.style.display = 'none';
      });
    });
  };

  // Enhance content links with UTM tracking
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

  // Handle social sharing
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

  // Main useEffect for component lifecycle
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

  // Loading state with enhanced skeleton UI
  if (loading) {
    return (
      <Layout>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading blog post...</p>
        </div>
      </Layout>
    );
  }

  // Error state
  if (error) {
    return (
      <Layout>
        <div className="error-container">
          <h2>Unable to Load Article</h2>
          <p>{error}</p>
          <button
            onClick={() => navigate('/')}
            className="retry-button"
          >
            ← Back to Home
          </button>
        </div>
      </Layout>
    );
  }

  // No post found
  if (!post) {
    return (
      <Layout>
        <div className="error-container">
          <h2>Article Not Found</h2>
          <p>
            The blog post you're looking for doesn't exist or may have been moved.
          </p>
          <button
            onClick={() => navigate('/blog')}
            className="retry-button"
          >
            Browse All Articles
          </button>
        </div>
      </Layout>
    );
  }

  // Main post content with Layout component
  return (
    <Layout 
      title={post.title} 
      description={post.metaDescription || post.excerpt}
    >
      <div className="blog-post-container">
        {/* FEATURED IMAGE with LazyLoadImage */}
        {post.featuredImage && (
          <div className="featured-image-container">
            <LazyLoadImage
              src={post.featuredImage}
              alt={post.imageAltText || post.title}
              effect="blur"
              className="featured-image"
              placeholderSrc="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PC9zdmc+"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
        )}

        {/* POST HEADER */}
        <header className="post-header">
          <h1 className="post-title">
            {post.title}
          </h1>

          <div className="post-meta">
            <span className="post-meta-item">
              <span>👤</span>
              By {post.author || 'Wilson Muita'}
            </span>
            {post.publishedAt && (
              <>
                <span>•</span>
                <span className="post-meta-item">
                  <span>📅</span>
                  {new Date(post.publishedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </>
            )}
            <span>•</span>
            <span className="post-meta-item">
              <span>⏱️</span>
              {post.readTime || 5} min read
            </span>
            {post.views !== undefined && (
              <>
                <span>•</span>
                <span className="post-meta-item">
                  <span>👁️</span>
                  {post.views.toLocaleString()} views
                </span>
              </>
            )}
          </div>

          {/* CATEGORY & TAGS */}
          <div className="post-categories">
            {post.category && (
              <span className="category-tag">
                {post.category}
              </span>
            )}
            {post.tags && post.tags.map(tag => (
              <span
                key={tag}
                className="tag"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* SOCIAL SHARING */}
          <div className="social-sharing">
            <button
              onClick={() => handleSocialShare('twitter')}
              className="social-button twitter"
            >
              <span>🐦</span>
              Twitter
            </button>
            <button
              onClick={() => handleSocialShare('linkedin')}
              className="social-button linkedin"
            >
              <span>💼</span>
              LinkedIn
            </button>
            <button
              onClick={() => handleSocialShare('facebook')}
              className="social-button facebook"
            >
              <span>📘</span>
              Facebook
            </button>
          </div>
        </header>

        {/* POST CONTENT with enhanced responsive styles */}
        <section 
          className="post-content"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* NEWSLETTER SIGNUP SECTION */}
        <section className="newsletter-section">
          <div className="newsletter-header">
            <h2>💌 Stay Updated</h2>
            <p>
              Enjoyed this article? Subscribe to my newsletter to get notified when I publish new content. 
              No spam, unsubscribe anytime.
            </p>
          </div>
          <NewsletterSignup source="blog_post" location="post_bottom" />
        </section>

        {/* RELATED POSTS */}
        {post && (
          <RelatedPosts post={post} />
        )}
      </div>
    </Layout>
  );
};

export default BlogPost;