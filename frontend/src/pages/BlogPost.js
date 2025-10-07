// frontend/src/pages/BlogPost.js
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import NewsletterSignup from '../components/NewsletterSignup';
import API_BASE_URL from '../utils/api'; // Import the centralized API configuration

const BlogPost = () => {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        // ✅ UPDATED: Use centralized API configuration
        const response = await fetch(`${API_BASE_URL}/posts/slug/${slug}`);
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        const result = await response.json();
        const postData = result.post; // Extract post from response object
        
        setPost(postData);

        // 🔥 DYNAMIC META TAGS - Update document head for SEO
        updateMetaTags(postData);
        // Add structured data for rich snippets
        addStructuredData(postData);
        
        // 🖼️ LAZY LOADING: Process content images after post data is set
        processContentImages();
      } catch (err) {
        setError(err.message);
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    const updateMetaTags = (postData) => {
      const siteUrl = window.location.origin;
      const postUrl = `${siteUrl}/blog/${postData.slug}`;
      
      // Update document title
      document.title = `${postData.title} | Your Blog Name`;

      // Basic meta tags
      updateMetaTag('description', postData.metaDescription || postData.excerpt);
      
      // Open Graph meta tags
      updateMetaTag('og:title', postData.title, 'property');
      updateMetaTag('og:description', postData.metaDescription || postData.excerpt, 'property');
      updateMetaTag('og:image', postData.featuredImage || `${siteUrl}/default-og-image.jpg`, 'property');
      updateMetaTag('og:url', postUrl, 'property');
      updateMetaTag('og:type', 'article', 'property');
      updateMetaTag('og:site_name', 'Your Blog Name', 'property');
      
      // Twitter Card meta tags
      updateMetaTag('twitter:card', 'summary_large_image', 'name');
      updateMetaTag('twitter:title', postData.title, 'name');
      updateMetaTag('twitter:description', postData.metaDescription || postData.excerpt, 'name');
      updateMetaTag('twitter:image', postData.featuredImage || `${siteUrl}/default-og-image.jpg`, 'name');
      updateMetaTag('twitter:url', postUrl, 'name');

      // Article-specific meta tags
      updateMetaTag('article:published_time', new Date(postData.publishedAt).toISOString(), 'property');
      updateMetaTag('article:modified_time', new Date(postData.updatedAt).toISOString(), 'property');
      updateMetaTag('article:author', postData.author, 'property');
      
      if (postData.tags && postData.tags.length > 0) {
        postData.tags.forEach(tag => {
          updateMetaTag('article:tag', tag, 'property');
        });
      }
    };

    const updateMetaTag = (name, content, attribute = 'name') => {
      let metaTag = document.querySelector(`meta[${attribute}="${name}"]`);
      
      if (!metaTag) {
        metaTag = document.createElement('meta');
        metaTag.setAttribute(attribute, name);
        document.head.appendChild(metaTag);
      }
      
      metaTag.setAttribute('content', content);
    };

    // Add JSON-LD structured data
    const addStructuredData = (postData) => {
      // Remove existing structured data
      const existingScript = document.getElementById('blog-post-structured-data');
      if (existingScript) {
        existingScript.remove();
      }

      const structuredData = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": postData.title,
        "description": postData.metaDescription || postData.excerpt,
        "image": postData.featuredImage || `${window.location.origin}/default-og-image.jpg`,
        "author": {
          "@type": "Person",
          "name": postData.author
        },
        "publisher": {
          "@type": "Organization",
          "name": "Your Blog Name",
          "logo": {
            "@type": "ImageObject",
            "url": `${window.location.origin}/logo.png`
          }
        },
        "datePublished": postData.publishedAt,
        "dateModified": postData.updatedAt,
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": `${window.location.origin}/blog/${postData.slug}`
        },
        "wordCount": postData.content ? postData.content.replace(/<[^>]*>/g, '').split(/\s+/).length : 0
      };

      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = 'blog-post-structured-data';
      script.text = JSON.stringify(structuredData);
      document.head.appendChild(script);
    };

    // 🖼️ PROCESS CONTENT IMAGES: Add lazy loading to all images in post content
    const processContentImages = () => {
      // Use setTimeout to ensure this runs after the DOM is updated with post content
      setTimeout(() => {
        const contentImages = document.querySelectorAll('.post-content img');
        contentImages.forEach(img => {
          // Add lazy loading attribute if not already present
          if (!img.getAttribute('loading')) {
            img.setAttribute('loading', 'lazy');
          }
          
          // Ensure alt text is meaningful
          if (!img.getAttribute('alt') || img.getAttribute('alt') === '') {
            // Use image filename or post title as fallback alt text
            const src = img.getAttribute('src') || '';
            const fileName = src.split('/').pop()?.split('.')[0] || 'blog image';
            img.setAttribute('alt', `${fileName} - ${post?.title || 'Blog post'}`);
          }
        });
      }, 100);
    };

    if (slug) {
      fetchPost();
    }
  }, [slug]);

  // Cleanup function to reset meta tags when component unmounts
  useEffect(() => {
    return () => {
      // Reset document title
      document.title = 'Your Blog Name';
    };
  }, []);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>📖 Loading post...</div>;
  if (error) return (
    <div style={{ padding: '2rem', color: 'red', textAlign: 'center' }}>
      ❌ Error: {error}
      <br />
      <small>Unable to load the blog post. Please try again later.</small>
    </div>
  );
  if (!post) return <div style={{ padding: '2rem', textAlign: 'center' }}>Post not found.</div>;

  return (
    <article style={{ padding: '2rem', maxWidth: '800px', margin: 'auto' }}>
      {/* 🖼️ FEATURED IMAGE with lazy loading and improved alt text */}
      {post.featuredImage && (
        <img
          src={post.featuredImage}
          alt={post.imageAltText || post.title} // ✅ Use dynamic alt text if available
          loading="lazy" // ✅ Native lazy loading
          style={{ width: '100%', height: 'auto', marginBottom: '1rem', borderRadius: '5px' }}
        />
      )}
      <h1 style={{ marginBottom: '0.5rem' }}>{post.title}</h1>
      <p style={{ color: '#666', marginBottom: '1rem' }}>
        <em>
          By {post.author} on {new Date(post.publishedAt).toLocaleDateString()} • {post.readTime} min read
          {post.views !== undefined && ` • ${post.views} views`}
        </em>
      </p>
      {post.category && (
        <p style={{ marginBottom: '0.5rem' }}>
          <strong>Category:</strong> {post.category}
        </p>
      )}
      {post.tags && post.tags.length > 0 && (
        <p style={{ marginBottom: '1rem' }}>
          <strong>Tags:</strong> {post.tags.join(', ')}
        </p>
      )}
      {/* 🖼️ POST CONTENT: Images will be processed for lazy loading */}
      <div
        className="post-content" // ✅ Added class for image processing
        style={{ marginTop: '1rem', lineHeight: '1.6' }}
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
      
      {/* 📧 NEWSLETTER SIGNUP SECTION - Added at the end of the blog post */}
      <section style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #e0e0e0' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h2>Enjoyed this article?</h2>
          <p style={{ color: '#666', fontSize: '1.1rem' }}>
            Subscribe to my newsletter to get notified when I publish new content. 
            No spam, unsubscribe anytime.
          </p>
        </div>
        <NewsletterSignup />
      </section>
    </article>
  );
};

export default BlogPost;