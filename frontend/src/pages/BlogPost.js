// frontend/src/pages/BlogPost.js
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Layout from '../components/Layout';
import NewsletterSignup from '../components/NewsletterSignup';
import RelatedPosts from '../components/RelatedPosts';
import AdSenseFixed, { AdUnits } from '../components/AdSenseFixed';
import { blogAPI } from '../utils/api';
import './BlogPost.css';

const BlogPost = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [readingProgress, setReadingProgress] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [tableOfContents, setTableOfContents] = useState([]);
  const [activeHeading, setActiveHeading] = useState('');
  const [estimatedReadingTime, setEstimatedReadingTime] = useState(5);
  const [socialShareCount, setSocialShareCount] = useState(0);
  const [viewTracked, setViewTracked] = useState(false);
  
  const contentRef = useRef(null);
  const viewTrackedRef = useRef(false);
  const milestonesTrackedRef = useRef({});
  const scrollListenersRef = useRef([]);

  // Check if debug mode is enabled
  const isDebugMode = useMemo(() => {
    return window.location.search.includes('debug=true') || 
           (window.getConfig && window.getConfig('ENVIRONMENT') === 'development');
  }, []);

  // Enhanced post fetching with error handling
  const fetchPost = useCallback(async () => {
    if (!slug) {
      setError('No post slug provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (isDebugMode) {
        console.log(`🔄 Fetching post: ${slug}`);
      }

      const result = await blogAPI.posts.getBySlug(slug);
      const postData = result.post;

      if (!postData) {
        throw new Error('Post not found');
      }

      setPost(postData);

      // Calculate reading time if not provided
      if (postData.content && !postData.readTime) {
        const wordCount = postData.content.replace(/<[^>]*>/g, '').split(/\s+/).length;
        const readingTime = Math.max(1, Math.ceil(wordCount / 200));
        setEstimatedReadingTime(readingTime);
      } else {
        setEstimatedReadingTime(postData.readTime || 5);
      }

      // Process content after a short delay to ensure DOM is updated
      setTimeout(() => {
        processContentImages(postData);
        enhanceContentLinks(postData);
        generateTableOfContents();
        initializeReadingProgress();
      }, 100);

      // Track view after load
      trackPostView(postData);

    } catch (err) {
      console.error('Error fetching post:', err);
      const errorMessage = err.message || 'Failed to load blog post. Please try again later.';
      setError(errorMessage);
      
      // Track the error
      if (window.reportError) {
        window.reportError(err, { 
          context: 'fetch_post', 
          slug: slug 
        });
      }
    } finally {
      setLoading(false);
    }
  }, [slug, isDebugMode]);

  // Track post view
  const trackPostView = async (postData) => {
    if (viewTrackedRef.current || !postData) return;

    try {
      viewTrackedRef.current = true;
      
      // Track view via API
      if (blogAPI.posts.trackView) {
        await blogAPI.posts.trackView(postData._id);
      }
      
      // Use config logging if available
      if (window.logDebug) {
        window.logDebug('Post view tracked', {
          postId: postData._id,
          title: postData.title,
          slug: postData.slug
        });
      }
      
      setViewTracked(true);
    } catch (error) {
      console.warn('Failed to track post view:', error);
      // Even if tracking fails, mark as tracked to avoid multiple attempts
      viewTrackedRef.current = true;
      setViewTracked(true);
    }
  };

  // Generate table of contents from headings
  const generateTableOfContents = () => {
    const contentElement = contentRef.current || document.querySelector('.post-content');
    if (!contentElement) {
      // Retry after a short delay if content isn't ready
      setTimeout(generateTableOfContents, 200);
      return;
    }

    const headings = contentElement.querySelectorAll('h2, h3');
    const toc = [];

    headings.forEach((heading, index) => {
      // Generate a safe ID for the heading
      let id = heading.id;
      if (!id) {
        id = `section-${index + 1}-${Date.now()}`;
        heading.id = id;
      }
      
      toc.push({
        id: id,
        text: heading.textContent || `Section ${index + 1}`,
        level: heading.tagName.toLowerCase(),
        element: heading
      });
    });

    setTableOfContents(toc);
  };

  // Enhanced reading progress tracking
  const initializeReadingProgress = () => {
    const handleScroll = () => {
      const contentElement = contentRef.current || document.querySelector('.post-content');
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

      // Track reading progress milestones
      trackReadingMilestones(progress);
    };

    window.addEventListener('scroll', handleScroll);
    scrollListenersRef.current.push(() => window.removeEventListener('scroll', handleScroll));

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  };

  // Track reading milestones
  const trackReadingMilestones = (progress) => {
    const milestones = [25, 50, 75, 90, 100];
    const currentMilestone = milestones.find(milestone => progress >= milestone);
    
    if (currentMilestone && !milestonesTrackedRef.current[`milestone_${currentMilestone}`]) {
      milestonesTrackedRef.current[`milestone_${currentMilestone}`] = true;
      
      if (window.logDebug) {
        window.logDebug('Reading milestone reached', {
          milestone: currentMilestone,
          progress: Math.round(progress),
          postId: post?._id
        });
      }
    }
  };

  // Update active heading in table of contents
  const updateActiveHeading = () => {
    if (tableOfContents.length === 0) return;

    const headings = tableOfContents.map(item => item.element).filter(Boolean);
    const scrollPosition = window.scrollY + 100;

    let currentActive = '';
    
    for (let i = headings.length - 1; i >= 0; i--) {
      if (headings[i] && headings[i].offsetTop <= scrollPosition) {
        currentActive = headings[i].id;
        break;
      }
    }

    setActiveHeading(currentActive);
  };

  // Enhanced scroll to section
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 100; // Account for fixed header
      const elementPosition = element.offsetTop - offset;
      
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      });

      // Update URL hash without page jump
      window.history.replaceState(null, null, `#${sectionId}`);
    }
  };

  // Enhanced scroll to top
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Enhanced content image processing
  const processContentImages = (postData) => {
    const contentElement = contentRef.current || document.querySelector('.post-content');
    if (!contentElement) {
      setTimeout(() => processContentImages(postData), 200);
      return;
    }

    const contentImages = contentElement.querySelectorAll('img');
    
    contentImages.forEach((img, index) => {
      // Apply robust responsive image CSS
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.style.display = 'block';
      img.style.margin = '20px auto';
      
      // Add CSS class for additional responsive control
      img.classList.add('responsive-image', 'content-image');
      
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

      // Add decoding attribute for better performance
      if (!img.getAttribute('decoding')) {
        img.setAttribute('decoding', 'async');
      }

      // Enhanced image error handling
      img.addEventListener('error', () => {
        console.warn(`Image failed to load: ${img.src}`);
        img.style.opacity = '0.5';
        img.style.filter = 'grayscale(100%)';
        img.alt = 'Image failed to load';
      });
    });
  };

  // Enhanced content links
  const enhanceContentLinks = (postData) => {
    const contentElement = contentRef.current || document.querySelector('.post-content');
    if (!contentElement) {
      setTimeout(() => enhanceContentLinks(postData), 200);
      return;
    }

    const contentLinks = contentElement.querySelectorAll('a[href^="http"]');
    
    contentLinks.forEach(link => {
      const originalHref = link.getAttribute('href');
      const isInternal = originalHref.includes('wilsonmuita.com') || 
                         originalHref.includes(window.location.hostname);

      if (!isInternal) {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      }
    });
  };

  // Social sharing with analytics
  const handleSocialShare = (platform) => {
    if (!post) return;

    const postUrl = encodeURIComponent(window.location.href);
    const postTitle = encodeURIComponent(post.title || '');
    const shareText = encodeURIComponent(`Check out this article: ${post.title}`);

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

    // Update share count
    setSocialShareCount(prev => prev + 1);

    // Open share window
    window.open(shareUrl, '_blank', 'width=600,height=400,menubar=no,toolbar=no,resizable=yes,scrollbars=yes');
  };

  // Copy URL to clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      
      // Show feedback
      const buttons = document.querySelectorAll('.share-button.copy');
      buttons.forEach(button => {
        const originalText = button.innerHTML;
        button.innerHTML = '✅ Copied!';
        button.style.backgroundColor = '#28a745';
        setTimeout(() => {
          button.innerHTML = originalText;
          button.style.backgroundColor = '';
        }, 2000);
      });

    } catch (err) {
      console.error('Failed to copy URL:', err);
      
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = window.location.href;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  // Print article functionality
  const printArticle = () => {
    // Add print-specific styles
    const printStyle = document.createElement('style');
    printStyle.innerHTML = `
      @media print {
        .no-print, .social-sharing, .table-of-contents, .scroll-to-top, .reading-progress,
        .newsletter-section, .post-footer, .related-posts, .ad-container {
          display: none !important;
        }
        body {
          font-size: 12pt;
          line-height: 1.4;
        }
        .post-content {
          max-width: 100% !important;
        }
      }
    `;
    document.head.appendChild(printStyle);
    
    window.print();
    
    // Clean up print styles
    setTimeout(() => {
      if (printStyle.parentNode) {
        document.head.removeChild(printStyle);
      }
    }, 1000);
  };

  // Enhanced cleanup function
  const cleanup = () => {
    // Cleanup scroll listeners
    scrollListenersRef.current.forEach(cleanup => cleanup());
    scrollListenersRef.current = [];
    
    // Reset tracking refs
    viewTrackedRef.current = false;
    milestonesTrackedRef.current = {};
  };

  // Main useEffect for component lifecycle
  useEffect(() => {
    // Reset state when slug changes
    setPost(null);
    setLoading(true);
    setError(null);
    setReadingProgress(0);
    setShowScrollTop(false);
    setTableOfContents([]);
    setActiveHeading('');
    setSocialShareCount(0);
    setViewTracked(false);
    
    // Reset refs to proper initial values
    viewTrackedRef.current = false;
    milestonesTrackedRef.current = {};

    // Fetch post data
    fetchPost();

    // Set up scroll listeners
    initializeReadingProgress();

    // Cleanup function
    return cleanup;
  }, [fetchPost, slug]);

  // Update active heading when table of contents changes
  useEffect(() => {
    if (tableOfContents.length > 0) {
      updateActiveHeading();
    }
  }, [tableOfContents]);

  // Debug logging
  useEffect(() => {
    if (isDebugMode && post) {
      console.log('📊 BlogPost Debug Info:', {
        postId: post._id,
        slug: post.slug,
        title: post.title,
        readingProgress,
        viewTracked,
        estimatedReadingTime
      });
    }
  }, [post, readingProgress, viewTracked, estimatedReadingTime, isDebugMode]);

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

          {/* Table of Contents Skeleton */}
          <div className="toc-skeleton">
            <div className="skeleton skeleton-toc-title"></div>
            {[...Array(4)].map((_, index) => (
              <div key={index} className="skeleton skeleton-toc-item"></div>
            ))}
          </div>

          {/* Content Skeleton */}
          <div className="post-content-skeleton">
            {[...Array(8)].map((_, index) => (
              <div key={index} className="skeleton skeleton-line"></div>
            ))}
          </div>

          {/* Author Bio Skeleton */}
          <div className="author-bio-skeleton">
            <div className="skeleton skeleton-avatar"></div>
            <div className="skeleton skeleton-author-info">
              <div className="skeleton skeleton-author-name"></div>
              <div className="skeleton skeleton-author-bio"></div>
            </div>
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
          <div className="error-help">
            <p>If the problem persists, please <a href="/contact">contact me</a>.</p>
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
          <div className="error-suggestions">
            <h3>Popular Articles:</h3>
            <ul>
              <li><Link to="/blog/top-20-remote-jobs-that-pay-well-in-2025-no-degree-required-how-to-get-hired">Top 20 Remote Jobs That Pay Well in 2025</Link></li>
              <li><Link to="/blog/mastering-react-hooks-complete-guide">Mastering React Hooks: Complete Guide</Link></li>
              <li><Link to="/blog/nodejs-best-practices-2025">Node.js Best Practices for 2025</Link></li>
            </ul>
          </div>
        </div>
      </Layout>
    );
  }

  // Prepare article meta for Layout component
  const articleMeta = {
    title: post.title,
    description: post.metaDescription || post.excerpt,
    image: post.featuredImage,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    tags: post.tags
  };

  return (
    <Layout 
      title={post.title} 
      description={post.metaDescription || post.excerpt}
      articleMeta={articleMeta}
      canonicalUrl={`/blog/${post.slug}`}
      ogImage={post.featuredImage || "https://wilsonmuita.com/default-og-image.jpg"}
      twitterImage={post.featuredImage || "https://wilsonmuita.com/default-og-image.jpg"}
      isBlogPost={true}
    >
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": post.title,
            "description": post.metaDescription || post.excerpt,
            "image": post.featuredImage || "https://wilsonmuita.com/default-og-image.jpg",
            "datePublished": post.publishedAt,
            "dateModified": post.updatedAt || post.publishedAt,
            "author": {
              "@type": "Person",
              "name": post.author || "Wilson Muita",
              "url": "https://wilsonmuita.com/about"
            },
            "publisher": {
              "@type": "Organization",
              "name": "Wilson Muita",
              "logo": {
                "@type": "ImageObject",
                "url": "https://wilsonmuita.com/logo512.png"
              }
            },
            "mainEntityOfPage": {
              "@type": "WebPage",
              "@id": `https://wilsonmuita.com/blog/${post.slug}`
            }
          })}
        </script>
      </Helmet>

      <div className="blog-post-container">
        {/* READING PROGRESS BAR */}
        <div className="reading-progress">
          <div 
            className="reading-progress-bar" 
            style={{ width: `${readingProgress}%` }}
            aria-label={`Reading progress: ${Math.round(readingProgress)}%`}
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

        {/* FEATURED IMAGE */}
        {post.featuredImage && (
          <div className="featured-image-container">
            <img
              src={post.featuredImage}
              alt={post.imageAltText || post.title}
              className="featured-image"
              loading="lazy"
              onError={(e) => {
                e.target.style.display = 'none';
                console.warn('Featured image failed to load:', post.featuredImage);
              }}
            />
            {post.imageCaption && (
              <figcaption className="image-caption">{post.imageCaption}</figcaption>
            )}
          </div>
        )}

        {/* IN-ARTICLE AD (Top) */}
        <div className="in-article-ad-top" data-ad-type="in-article-top">
          <AdSenseFixed 
            slot={AdUnits.IN_ARTICLE}
            format="auto"
            responsive={true}
            className="in-article-ad"
            fullWidthResponsive={true}
            lazyLoad={true}
            debug={isDebugMode}
            adStyle={{ 
              margin: '20px auto',
              maxWidth: '728px'
            }}
          />
        </div>

        {/* POST HEADER */}
        <header className="post-header">
          <div className="breadcrumb">
            <Link to="/blog" className="breadcrumb-link">
              ← Back to All Articles
            </Link>
          </div>

          <h1 className="post-title" itemProp="headline">
            {post.title}
          </h1>

          <div className="post-meta">
            <span className="post-meta-item">
              <span className="meta-icon">👤</span>
              By <span itemProp="author">{post.author || 'Wilson Muita'}</span>
            </span>
            {post.publishedAt && (
              <>
                <span className="meta-separator">•</span>
                <span className="post-meta-item" itemProp="datePublished">
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
              {post.readTime || estimatedReadingTime} min read
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
              <span className="category-tag" itemProp="articleSection">
                {post.category}
              </span>
            )}
            {post.tags && post.tags.map(tag => (
              <span
                key={tag}
                className="tag"
                itemProp="keywords"
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
          {socialShareCount > 0 && (
            <div className="share-count">
              Shared {socialShareCount} time{socialShareCount !== 1 ? 's' : ''}
            </div>
          )}
        </header>

        {/* TABLE OF CONTENTS */}
        {tableOfContents.length > 0 && (
          <aside className="table-of-contents">
            <h3 className="toc-title">📑 Table of Contents</h3>
            <nav className="toc-nav" aria-label="Table of Contents">
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

        {/* POST CONTENT */}
        <article 
          ref={contentRef}
          className="post-content"
          itemProp="articleBody"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* READING PROGRESS SUMMARY */}
        <div className="reading-summary">
          <p>
            You've read {Math.round(readingProgress)}% of this article. 
            {readingProgress >= 90 && " Thanks for reading!"}
          </p>
        </div>

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
              <a href="https://twitter.com/WilsonMuita" className="author-link" target="_blank" rel="noopener noreferrer">
                Follow on Twitter
              </a>
            </div>
          </div>
        </section>

        {/* IN-ARTICLE AD (Bottom) */}
        <div className="in-article-ad-bottom" data-ad-type="in-article-bottom">
          <AdSenseFixed 
            slot={AdUnits.BETWEEN_POSTS}
            format="auto"
            responsive={true}
            className="in-article-ad"
            fullWidthResponsive={true}
            lazyLoad={true}
            debug={isDebugMode}
            adStyle={{ 
              margin: '20px auto',
              maxWidth: '728px'
            }}
          />
        </div>

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

        {/* POST FOOTER ACTIONS */}
        <footer className="post-footer">
          <div className="post-actions">
            <button
              onClick={scrollToTop}
              className="post-action-button"
            >
              ↑ Back to Top
            </button>
            <Link
              to="/blog"
              className="post-action-button"
            >
              📚 Browse More Articles
            </Link>
            <button
              onClick={printArticle}
              className="post-action-button"
            >
              🖨️ Print Article
            </button>
          </div>
          {isDebugMode && (
            <div className="post-debug-info">
              <p>Debug Info: Post ID: {post._id} | Views: {post.views || 0} | Reading Time: {estimatedReadingTime} min</p>
            </div>
          )}
        </footer>
      </div>
    </Layout>
  );
};

export default BlogPost;