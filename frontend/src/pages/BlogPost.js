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

  // ✅ ENHANCED: Process content images for responsive behavior and better SEO
  const processContentImages = (postData) => {
    const contentImages = document.querySelectorAll('.post-content img');
    
    contentImages.forEach((img, index) => {
      // ✅ FIXED: Apply robust responsive image CSS
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.style.display = 'block';
      
      // ✅ ENHANCED: Add CSS class for additional responsive control
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

      // ✅ FIXED: Better width/height attributes for layout stability
      if (!img.getAttribute('width') && !img.getAttribute('height')) {
        // Remove any inline styles that might force dimensions
        img.style.width = '';
        img.style.height = '';
      }

      // ✅ ADDED: Handle image container overflow
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

      // ✅ ADDED: Handle image errors gracefully
      img.addEventListener('error', () => {
        console.warn(`❌ Image failed to load: ${img.src}`);
        img.style.display = 'none';
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

  // ✅ Loading state with enhanced skeleton UI
  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="animate-pulse space-y-6">
            {/* Title skeleton */}
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-8"></div>
            
            {/* Featured image skeleton */}
            <div className="h-64 bg-gray-200 rounded-lg w-full mb-8"></div>
            
            {/* Content skeleton */}
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 rounded w-4/6"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
            
            <div className="space-y-4 mt-6">
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // ✅ Error state
  if (error) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="text-center bg-red-50 border border-red-200 rounded-lg p-8">
            <div className="text-5xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-red-800 mb-4">Unable to Load Article</h1>
            <p className="text-red-600 mb-6">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // ✅ No post found
  if (!post) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="text-center bg-yellow-50 border border-yellow-200 rounded-lg p-8">
            <div className="text-5xl mb-4">🔍</div>
            <h1 className="text-2xl font-bold text-yellow-800 mb-4">Article Not Found</h1>
            <p className="text-yellow-600 mb-6">
              The blog post you're looking for doesn't exist or may have been moved.
            </p>
            <button
              onClick={() => navigate('/blog')}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
            >
              Browse All Articles
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // ✅ Main post content with Layout component
  return (
    <Layout 
      title={post.title} 
      description={post.metaDescription || post.excerpt}
    >
      <article className="container mx-auto px-4 py-8 max-w-4xl">
        {/* 🖼️ FEATURED IMAGE with LazyLoadImage */}
        {post.featuredImage && (
          <div className="mb-8 rounded-xl overflow-hidden">
            <LazyLoadImage
              src={post.featuredImage}
              alt={post.imageAltText || post.title}
              effect="blur"
              className="w-full h-64 md:h-96 object-cover"
              placeholderSrc="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PC9zdmc+"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
        )}

        {/* 📝 POST HEADER */}
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 leading-tight">
            {post.title}
          </h1>

          <div className="flex flex-wrap items-center text-gray-600 space-x-4 mb-4 text-sm md:text-base">
            <span className="flex items-center">
              <span className="mr-2">👤</span>
              By {post.author || 'Wilson Muita'}
            </span>
            <span>•</span>
            {post.publishedAt && (
              <span className="flex items-center">
                <span className="mr-2">📅</span>
                {new Date(post.publishedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            )}
            <span>•</span>
            <span className="flex items-center">
              <span className="mr-2">⏱️</span>
              {post.readTime || 5} min read
            </span>
            {post.views !== undefined && (
              <>
                <span>•</span>
                <span className="flex items-center">
                  <span className="mr-2">👁️</span>
                  {post.views.toLocaleString()} views
                </span>
              </>
            )}
          </div>

          {/* 📍 CATEGORY & TAGS */}
          <div className="flex flex-wrap gap-2 mb-4">
            {post.category && (
              <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-medium">
                {post.category}
              </span>
            )}
            {post.tags && post.tags.map(tag => (
              <span
                key={tag}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* 📱 SOCIAL SHARING */}
          <div className="flex gap-2 mt-6">
            <button
              onClick={() => handleSocialShare('twitter')}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors duration-200 text-sm font-medium"
            >
              <span>🐦</span>
              Twitter
            </button>
            <button
              onClick={() => handleSocialShare('linkedin')}
              className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg transition-colors duration-200 text-sm font-medium"
            >
              <span>💼</span>
              LinkedIn
            </button>
            <button
              onClick={() => handleSocialShare('facebook')}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 text-sm font-medium"
            >
              <span>📘</span>
              Facebook
            </button>
          </div>
        </header>

        {/* 📄 POST CONTENT with enhanced responsive styles */}
        <section 
          className="post-content prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-img:rounded-lg prose-img:shadow-md"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* 📧 NEWSLETTER SIGNUP SECTION */}
        <section className="mt-12 pt-8 border-t border-gray-200">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              💌 Stay Updated
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto leading-relaxed">
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

        {/* ✅ ADDED: Global responsive image styles */}
        <style>{`
          .post-content img {
            max-width: 100% !important;
            height: auto !important;
            display: block;
            border-radius: 8px;
            margin: 1rem 0;
          }
          
          .post-content picture img {
            max-width: 100% !important;
            height: auto !important;
          }
          
          .post-content div {
            max-width: 100%;
            overflow: hidden;
          }
          
          .responsive-image {
            max-width: 100% !important;
            height: auto !important;
          }

          @media (max-width: 768px) {
            .post-content {
              font-size: 1rem;
              line-height: 1.7;
            }
            
            .post-content img {
              margin: 0.75rem 0;
            }
          }
        `}</style>
      </article>
    </Layout>
  );
};

export default BlogPost;