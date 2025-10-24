// frontend/src/pages/BlogListPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';
import { blogAPI } from '../utils/api';
import { trackPageView, trackCustomEvent } from '../utils/utmTracker';
import Layout from '../components/Layout';
import AdSense, { AdUnits } from '../components/AdSense';
import './BlogListPage.css';

const BlogListPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Extract unique categories from posts - FIXED THIS LINE
  const categories = ['all', ...new Set(posts.map(post => post.category).filter(Boolean))];

  // Filter and sort posts
  const filteredAndSortedPosts = posts
    .filter(post => {
      const matchesSearch = post.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           post.excerpt?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           post.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt);
        case 'oldest':
          return new Date(a.publishedAt || a.createdAt) - new Date(b.publishedAt || b.createdAt);
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        default:
          return 0;
      }
    });

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('🔄 Fetching posts from API...');
      const response = await blogAPI.posts.getAll();
      
      // Handle different response structures
      let postsData = [];
      if (Array.isArray(response)) {
        postsData = response;
      } else if (response && response.posts) {
        postsData = response.posts;
      } else if (response && Array.isArray(response.data)) {
        postsData = response.data;
      } else {
        console.warn('Unexpected API response structure:', response);
        postsData = [];
      }
      
      console.log(`✅ Loaded ${postsData.length} posts`);
      setPosts(postsData);
      
      // Track successful page load
      trackCustomEvent('blog_list_loaded', {
        medium: 'content',
        campaign: 'blog_list',
        content: 'page_load',
        metadata: {
          postCount: postsData.length,
          categories: [...new Set(postsData.map(post => post.category).filter(Boolean))],
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (err) {
      console.error('❌ Error fetching posts:', err);
      const errorMessage = err.message || 'Failed to load blog posts. Please try again later.';
      setError(errorMessage);
      
      // Track error
      trackCustomEvent('blog_list_error', {
        medium: 'content',
        campaign: 'blog_list',
        content: 'load_error',
        metadata: {
          error: errorMessage,
          timestamp: new Date().toISOString()
        }
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle search
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    
    if (e.target.value) {
      trackCustomEvent('blog_list_search', {
        medium: 'content',
        campaign: 'blog_list',
        content: 'search_performed',
        metadata: {
          searchTerm: e.target.value,
          resultCount: filteredAndSortedPosts.length,
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  // Handle category filter
  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    
    trackCustomEvent('blog_list_filter', {
      medium: 'content',
      campaign: 'blog_list',
      content: 'category_filter',
      metadata: {
        category: category,
        resultCount: filteredAndSortedPosts.length,
        timestamp: new Date().toISOString()
      }
    });
  };

  // Handle sort change
  const handleSortChange = (sortType) => {
    setSortBy(sortType);
    
    trackCustomEvent('blog_list_sort', {
      medium: 'content',
      campaign: 'blog_list',
      content: 'sort_applied',
      metadata: {
        sortType: sortType,
        timestamp: new Date().toISOString()
      }
    });
  };

  // Handle post click tracking
  const handlePostClick = (post) => {
    trackCustomEvent('blog_post_click', {
      medium: 'content',
      campaign: 'blog_list',
      content: 'post_click',
      metadata: {
        postId: post._id,
        postTitle: post.title,
        postSlug: post.slug,
        category: post.category,
        timestamp: new Date().toISOString()
      }
    });
  };

  useEffect(() => {
    fetchPosts();
    trackPageView();
  }, [fetchPosts]);

  // Enhanced loading state
  if (loading) {
    return (
      <Layout 
        title="Blog Posts - Wilson Muita" 
        description="Browse all blog posts about technology, programming, and web development."
      >
        <div className="blog-list-page">
          <header className="blog-header">
            <div className="skeleton skeleton-title"></div>
            <div className="skeleton skeleton-subtitle"></div>
          </header>

          <div className="posts-grid">
            {[...Array(6)].map((_, index) => (
              <article key={index} className="post-card skeleton-card">
                <div className="post-image skeleton skeleton-image"></div>
                <div className="post-content">
                  <div className="post-meta">
                    <span className="skeleton skeleton-category"></span>
                    <span className="skeleton skeleton-read-time"></span>
                  </div>
                  <div className="skeleton skeleton-post-title"></div>
                  <div className="skeleton skeleton-excerpt"></div>
                  <div className="post-footer">
                    <span className="skeleton skeleton-author"></span>
                    <span className="skeleton skeleton-date"></span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  // Enhanced error state
  if (error) {
    return (
      <Layout 
        title="Error Loading Posts - Wilson Muita" 
        description="Unable to load blog posts at this time."
      >
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h2>Unable to Load Blog Posts</h2>
          <p>{error}</p>
          <div className="error-actions">
            <button 
              onClick={fetchPosts} 
              className="retry-button primary"
            >
              🔄 Try Again
            </button>
            <button 
              onClick={() => window.location.href = '/'} 
              className="retry-button secondary"
            >
              🏠 Go Home
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout 
      title="Blog Posts - Wilson Muita" 
      description="Browse all blog posts about technology, programming, web development, React, Node.js, JavaScript and more."
    >
      <div className="blog-list-page">
        {/* HEADER SECTION */}
        <header className="blog-header">
          <div className="blog-hero">
            <h1 className="blog-title">📚 Technology Blog</h1>
            <p className="blog-subtitle">
              Expert insights on web development, programming tutorials, and technology trends. 
              Learn React, Node.js, JavaScript and more.
            </p>
            {posts.length > 0 && (
              <p className="posts-count">
                {filteredAndSortedPosts.length} of {posts.length} article{posts.length !== 1 ? 's' : ''} found
              </p>
            )}
          </div>

          {/* SEARCH AND FILTERS */}
          <div className="blog-filters">
            <div className="search-container">
              <div className="search-icon">🔍</div>
              <input
                type="text"
                placeholder="Search articles..."
                value={searchTerm}
                onChange={handleSearch}
                className="search-input"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="clear-search"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="filter-controls">
              <div className="category-filter">
                <label>Category:</label>
                <select 
                  value={selectedCategory} 
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="filter-select"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category === 'all' ? 'All Categories' : category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sort-filter">
                <label>Sort by:</label>
                <select 
                  value={sortBy} 
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="filter-select"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="title">Title A-Z</option>
                </select>
              </div>
            </div>
          </div>
        </header>

        {/* HEADER AD */}
        <AdSense 
          slot={AdUnits.HEADER}
          format="auto"
          responsive={true}
          className="ad-break"
        />

        {/* POSTS GRID */}
        <div className="posts-container">
          {filteredAndSortedPosts.length > 0 ? (
            <div className="posts-grid">
              {filteredAndSortedPosts.map((post, index) => (
                <React.Fragment key={post._id}>
                  <article className="post-card">
                    <div className="post-image">
                      <LazyLoadImage
                        src={post.featuredImage || '/default-og-image.jpg'}
                        alt={post.imageAltText || post.title}
                        effect="blur"
                        placeholderSrc="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PC9zdmc+"
                        onError={(e) => {
                          e.target.src = '/default-og-image.jpg';
                        }}
                      />
                      <div className="image-overlay"></div>
                    </div>
                    
                    <div className="post-content">
                      <div className="post-meta">
                        {post.category && (
                          <span className="category-tag">{post.category}</span>
                        )}
                        <span className="read-time">
                          ⏱️ {post.readTime || 5} min read
                        </span>
                      </div>
                      
                      <h2 className="post-title">
                        <Link 
                          to={`/blog/${post.slug}`}
                          onClick={() => handlePostClick(post)}
                        >
                          {post.title}
                        </Link>
                      </h2>
                      
                      <p className="post-excerpt">
                        {post.excerpt || 'Read this insightful article about technology and programming...'}
                      </p>
                      
                      {post.tags && post.tags.length > 0 && (
                        <div className="post-tags">
                          {post.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="tag">#{tag}</span>
                          ))}
                        </div>
                      )}
                      
                      <div className="post-footer">
                        <span className="author">👤 By {post.author || 'Wilson Muita'}</span>
                        <span className="date">
                          📅 {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : 'Recently'}
                        </span>
                      </div>
                    </div>
                  </article>

                  {/* AD AFTER EVERY 3RD POST */}
                  {(index + 1) % 3 === 0 && (
                    <div className="ad-break" style={{ gridColumn: '1 / -1' }}>
                      <AdSense 
                        slot={AdUnits.BETWEEN_POSTS}
                        format="auto"
                        responsive={true}
                      />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          ) : (
            <div className="no-posts">
              <div className="no-posts-icon">🔍</div>
              <h3>No articles found</h3>
              <p>
                {searchTerm || selectedCategory !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'No blog posts available at the moment. Check back soon for new content!'
                }
              </p>
              {(searchTerm || selectedCategory !== 'all') && (
                <button 
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('all');
                  }}
                  className="clear-filters-button"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* BOTTOM AD */}
        <AdSense 
          slot={AdUnits.FOOTER}
          format="auto"
          responsive={true}
          className="ad-break"
        />

        {/* NEWSLETTER CTA */}
        {filteredAndSortedPosts.length > 0 && (
          <section className="newsletter-cta">
            <div className="cta-content">
              <h3>💌 Stay Updated</h3>
              <p>
                Enjoyed these articles? Get notified when I publish new content about 
                web development, programming, and technology trends.
              </p>
              <Link to="/contact" className="cta-button">
                Subscribe to Newsletter
              </Link>
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
};

export default BlogListPage;