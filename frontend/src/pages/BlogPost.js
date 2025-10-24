// frontend/src/pages/BlogPost.js
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';
import Layout from '../components/Layout';
import NewsletterSignup from '../components/NewsletterSignup';
import RelatedPosts from '../components/RelatedPosts';
import AdSense, { AdUnits } from '../components/AdSense';
import { blogAPI, trackPostView } from '../utils/api';
import { initUTMTracking, trackPageView, trackCustomEvent, addUTMParams, getCurrentSessionId } from '../utils/utmTracker';
import './BlogPost.css';

const BlogPost = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewTracked, setViewTracked] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [tableOfContents, setTableOfContents] = useState([]);
  const [activeHeading, setActiveHeading] = useState('');
  const contentRef = useRef(null);

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

      console.log(`🔄 Fetching post: ${slug}`);
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
        generateTableOfContents();
        initializeReadingProgress();
      }, 100);

      // Track page view after meta tags are set
      setTimeout(() => {
        trackPageView();
        trackPostViewHandler(postData);
      }, 500);

      // Track successful post load
      trackCustomEvent('post_loaded', {
        medium: 'content',
        campaign: 'blog_post',
        content: 'post_loaded',
        metadata: {
          postId: postData._id,
          postSlug: postData.slug,
          postTitle: postData.title,
          category: postData.category,
          readTime: postData.readTime,
          timestamp: new Date().toISOString()
        }
      });

    } catch (err) {
      console.error('❌ Error fetching post:', err);
      const errorMessage = err.message || 'Failed to load blog post. Please try again later.';
      setError(errorMessage);
      
      // Track the error
      trackCustomEvent('post_load_error', {
        medium: 'content',
        campaign: 'blog_post',
        content: 'fetch_error',
        metadata: {
          slug: slug,
          error: errorMessage,
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

  // Generate table of contents from headings
  const generateTableOfContents = () => {
    const contentElement = document.querySelector('.post-content');
    if (!contentElement) return;

    const headings = contentElement.querySelectorAll('h2, h3');
    const toc = [];

    headings.forEach((heading, index) => {
      const id = `section-${index + 1}`;
      heading.id = id;
      
      toc.push({
        id: id,
        text: heading.textContent,
        level: heading.tagName.toLowerCase(),
        element: heading
      });
    });

    setTableOfContents(toc);
  };

  // Initialize reading progress tracking
  const initializeReadingProgress = () => {
    const handleScroll = () => {
      const contentElement = document.querySelector('.post-content');
      if (!contentElement) return;

      const contentHeight = contentElement.offsetHeight;
      const contentTop = contentElement.offsetTop;
      const scrollPosition = window.scrollY;
      const windowHeight = window.innerHeight;

      // Calculate reading progress
      const progress = Math.min(100, Math.max(0, 
        ((scrollPosition + windowHeight - contentTop) / contentHeight) * 100
      ));
      setReadingProgress(progress);

      // Show/hide scroll to top button
      setShowScrollTop(scrollPosition > 500);

      // Update active heading in table of contents
      updateActiveHeading();
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  };

  // Update active heading in table of contents
  const updateActiveHeading = () => {
    const headings = tableOfContents.map(item => item.element);
    const scrollPosition = window.scrollY + 100;

    let currentActive = '';
    
    for (let i = headings.length - 1; i >= 0; i--) {
      if (headings[i].offsetTop <= scrollPosition) {
        currentActive = headings[i].id;
        break;
      }
    }

    setActiveHeading(currentActive);
  };

  // Scroll to section
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 100; // Account for fixed header
      const elementPosition = element.offsetTop - offset;
      
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      });

      trackCustomEvent('toc_click', {
        medium: 'content',
        campaign: 'blog_post',
        content: 'toc_navigation',
        metadata: {
          postId: post?._id,
          sectionId: sectionId,
          sectionText: tableOfContents.find(item => item.id === sectionId)?.text,
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  // Scroll to top
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });

    trackCustomEvent('scroll_to_top', {
      medium: 'content',
      campaign: 'blog_post',
      content: 'scroll_top',
      metadata: {
        postId: post?._id,
        timestamp: new Date().toISOString()
      }
    });
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
      case 'reddit':
        shareUrl = `https://reddit.com/submit?url=${postUrl}&title=${postTitle}`;
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

  // Copy URL to clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      
      // Show feedback
      const button = document.querySelector('.share-button.copy');
      if (button) {
        const originalText = button.innerHTML;
        button.innerHTML = '✅ Copied!';
        setTimeout(() => {
          button.innerHTML = originalText;
        }, 2000);
      }

      trackCustomEvent('url_copied', {
        medium: 'content',
        campaign: 'blog_post',
        content: 'url_copied',
        metadata: {
          postId: post?._id,
          url: window.location.href,
          timestamp: new Date().toISOString()
        }
      });
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  // Print article
  const printArticle = () => {
    window.print();
    
    trackCustomEvent('print_article', {
      medium: 'content',
      campaign: 'blog_post',
      content: 'print',
      metadata: {
        postId: post?._id,
        timestamp: new Date().toISOString()
      }
    });
  };

  // Main useEffect for component lifecycle
  useEffect(() => {
    // Initialize UTM tracking
    initUTMTracking();

    // Fetch post data
    fetchPost();

    // Set up scroll listeners
    const cleanupScroll = initializeReadingProgress();

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
      
      // Cleanup scroll listeners
      if (cleanupScroll) cleanupScroll();
    };
  }, [fetchPost]);

  // Update active heading when table of contents changes
  useEffect(() => {
    updateActiveHeading();
  }, [tableOfContents]);

  // Enhanced loading state with skeleton UI
  if (loading) {
    return (
      <Layout>
        <div className="blog-post-container">
          {/* Reading Progress Skeleton */}
          <div className="reading-progress-skeleton"></div>
          
          {/* Featured Image Skeleton */}
          <div className="featured-image-skeleton skeleton"></div>
          
          {/* Header Skeleton */}
          <div className="post-header-skeleton">
            <div className="skeleton skeleton-title"></div>
            <div className="skeleton skeleton-meta"></div>
            <div className="skeleton skeleton-tags"></div>
          </div>

          {/* Content Skeleton */}
          <div className="post-content-skeleton">
            {[...Array(8)].map((_, index) => (
              <div key={index} className="skeleton skeleton-line"></div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  // Enhanced error state
  if (error) {
    return (
      <Layout>
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h2>Unable to Load Article</h2>
          <p>{error}</p>
          <div className="error-actions">
            <button
              onClick={() => navigate('/')}
              className="retry-button primary"
            >
              🏠 Back to Home
            </button>
            <button
              onClick={() => navigate('/blog')}
              className="retry-button secondary"
            >
              📚 Browse All Articles
            </button>
            <button
              onClick={fetchPost}
              className="retry-button tertiary"
            >
              🔄 Try Again
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // No post found
  if (!post) {
    return (
      <Layout>
        <div className="error-container">
          <div className="error-icon">🔍</div>
          <h2>Article Not Found</h2>
          <p>
            The blog post you're looking for doesn't exist or may have been moved.
          </p>
          <div className="error-actions">
            <button
              onClick={() => navigate('/blog')}
              className="retry-button primary"
            >
              📚 Browse All Articles
            </button>
            <button
              onClick={() => navigate('/')}
              className="retry-button secondary"
            >
              🏠 Go Home
            </button>
          </div>
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
        {/* READING PROGRESS BAR */}
        <div className="reading-progress">
          <div 
            className="reading-progress-bar" 
            style={{ width: `${readingProgress}%` }}
          ></div>
        </div>

        {/* SCROLL TO TOP BUTTON */}
        {showScrollTop && (
          <button 
            className="scroll-to-top"
            onClick={scrollToTop}
            aria-label="Scroll to top"
          >
            ↑
          </button>
        )}

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

        {/* AD AFTER FEATURED IMAGE */}
        <AdSense 
          slot={AdUnits.IN_ARTICLE}
          format="autorelaxed"
          responsive={false}
          className="ad-in-article"
        />

        {/* POST HEADER */}
        <header className="post-header">
          <div className="breadcrumb">
            <Link to="/blog" className="breadcrumb-link">
              ← Back to All Articles
            </Link>
          </div>

          <h1 className="post-title">
            {post.title}
          </h1>

          <div className="post-meta">
            <span className="post-meta-item">
              <span className="meta-icon">👤</span>
              By {post.author || 'Wilson Muita'}
            </span>
            {post.publishedAt && (
              <>
                <span className="meta-separator">•</span>
                <span className="post-meta-item">
                  <span className="meta-icon">📅</span>
                  {new Date(post.publishedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </>
            )}
            <span className="meta-separator">•</span>
            <span className="post-meta-item">
              <span className="meta-icon">⏱️</span>
              {post.readTime || 5} min read
            </span>
            {post.views !== undefined && (
              <>
                <span className="meta-separator">•</span>
                <span className="post-meta-item">
                  <span className="meta-icon">👁️</span>
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
            <span className="share-label">Share this article:</span>
            <button
              onClick={() => handleSocialShare('twitter')}
              className="social-button twitter"
              aria-label="Share on Twitter"
            >
              <span className="social-icon">🐦</span>
              Twitter
            </button>
            <button
              onClick={() => handleSocialShare('linkedin')}
              className="social-button linkedin"
              aria-label="Share on LinkedIn"
            >
              <span className="social-icon">💼</span>
              LinkedIn
            </button>
            <button
              onClick={() => handleSocialShare('facebook')}
              className="social-button facebook"
              aria-label="Share on Facebook"
            >
              <span className="social-icon">📘</span>
              Facebook
            </button>
            <button
              onClick={() => handleSocialShare('reddit')}
              className="social-button reddit"
              aria-label="Share on Reddit"
            >
              <span className="social-icon">🤖</span>
              Reddit
            </button>
            <button
              onClick={copyToClipboard}
              className="social-button copy"
              aria-label="Copy URL to clipboard"
            >
              <span className="social-icon">📋</span>
              Copy URL
            </button>
            <button
              onClick={printArticle}
              className="social-button print"
              aria-label="Print article"
            >
              <span className="social-icon">🖨️</span>
              Print
            </button>
          </div>
        </header>

        {/* TABLE OF CONTENTS */}
        {tableOfContents.length > 0 && (
          <aside className="table-of-contents">
            <h3 className="toc-title">📑 Table of Contents</h3>
            <nav className="toc-nav">
              {tableOfContents.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className={`toc-link ${item.level} ${activeHeading === item.id ? 'active' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection(item.id);
                  }}
                >
                  {item.text}
                </a>
              ))}
            </nav>
          </aside>
        )}

        {/* AD BEFORE CONTENT */}
        <AdSense 
          slot={AdUnits.HEADER}
          format="fluid"
          layout="in-article"
          className="ad-before-content"
        />

        {/* POST CONTENT */}
        <section 
          ref={contentRef}
          className="post-content"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* AD AFTER CONTENT */}
        <AdSense 
          slot={AdUnits.FOOTER}
          format="auto"
          responsive={true}
          className="ad-after-content"
        />

        {/* AUTHOR BIO */}
        <section className="author-bio">
          <div className="author-avatar">
            <img 
              src="/default-og-image.jpg" 
              alt="Wilson Muita"
              onError={(e) => {
                e.target.src = '/default-og-image.jpg';
              }}
            />
          </div>
          <div className="author-info">
            <h3>About Wilson Muita</h3>
            <p>
              Technology enthusiast and web developer passionate about creating amazing digital experiences. 
              I write about React, Node.js, JavaScript, and modern web development practices.
            </p>
            <div className="author-links">
              <Link to="/about" className="author-link">
                Learn More About Me →
              </Link>
            </div>
          </div>
        </section>

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

        {/* AD BEFORE RELATED POSTS */}
        <AdSense 
          slot={AdUnits.BETWEEN_POSTS}
          format="auto"
          responsive={true}
          className="ad-between-sections"
        />

        {/* RELATED POSTS */}
        {post && (
          <RelatedPosts post={post} />
        )}
      </div>
    </Layout>
  );
};

export default BlogPost;