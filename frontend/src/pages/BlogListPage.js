// frontend/src/pages/BlogListPage.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { blogAPI } from '../utils/api'; // Import the centralized API
import { trackPageView, trackCustomEvent, addUTMParams } from '../utils/utmTracker'; // Import UTM tracking

const BlogListPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState([]);

  // Initialize tracking
  useEffect(() => {
    trackPageView();
  }, []);

  const fetchPosts = async (page = 1, search = '', category = '') => {
    try {
      setLoading(true);
      setError(null);
      
      // ✅ UPDATED: Use centralized blogAPI with better error handling
      const params = {
        page,
        limit: 10, // You can make this configurable
        ...(search && { search }),
        ...(category && { category })
      };

      const data = await blogAPI.posts.getAll(params);
      
      setPosts(data.posts || []);
      setCurrentPage(data.currentPage || 1);
      setTotalPages(data.totalPages || 1);
      setTotalPosts(data.total || 0);
      
      // Track successful fetch
      trackCustomEvent('blog_list_loaded', {
        medium: 'content',
        campaign: 'blog_list',
        content: `page_${page}`,
        metadata: {
          page: page,
          totalPosts: data.total || 0,
          searchTerm: search,
          category: category,
          postCount: data.posts?.length || 0
        }
      });

    } catch (err) {
      console.error('Error fetching posts:', err);
      setError(err.message || 'Failed to load blog posts');
      setPosts([]);
      
      // Track the error
      trackCustomEvent('blog_list_error', {
        medium: 'content',
        campaign: 'blog_list',
        content: 'fetch_error',
        metadata: {
          error: err.message,
          page: page,
          searchTerm: search,
          category: category
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await blogAPI.categories.getAll();
      setCategories(data.categories || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
      // Don't set error for categories - it's non-critical
    }
  };

  useEffect(() => {
    fetchPosts(currentPage, searchTerm, categoryFilter);
  }, [currentPage, searchTerm, categoryFilter]);

  useEffect(() => {
    fetchCategories();
  }, []);

  // Navigation handlers
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      
      // Track page change
      trackCustomEvent('blog_list_page_change', {
        medium: 'content',
        campaign: 'blog_list',
        content: 'next_page',
        metadata: {
          fromPage: currentPage,
          toPage: nextPage,
          direction: 'next'
        }
      });
      
      // Scroll to top when changing pages for better UX
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      const prevPage = currentPage - 1;
      setCurrentPage(prevPage);
      
      // Track page change
      trackCustomEvent('blog_list_page_change', {
        medium: 'content',
        campaign: 'blog_list',
        content: 'prev_page',
        metadata: {
          fromPage: currentPage,
          toPage: prevPage,
          direction: 'previous'
        }
      });
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePageClick = (pageNumber) => {
    if (pageNumber !== currentPage) {
      setCurrentPage(pageNumber);
      
      // Track page change
      trackCustomEvent('blog_list_page_change', {
        medium: 'content',
        campaign: 'blog_list',
        content: 'page_click',
        metadata: {
          fromPage: currentPage,
          toPage: pageNumber,
          pageNumber: pageNumber
        }
      });
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page when searching
    fetchPosts(1, searchTerm, categoryFilter);
    
    // Track search
    trackCustomEvent('blog_list_search', {
      medium: 'content',
      campaign: 'blog_list',
      content: 'search',
      metadata: {
        searchTerm: searchTerm,
        category: categoryFilter,
        currentPage: 1
      }
    });
  };

  const handleCategoryChange = (e) => {
    const category = e.target.value;
    setCategoryFilter(category);
    setCurrentPage(1); // Reset to first page when filtering
    
    // Track category filter
    trackCustomEvent('blog_list_filter', {
      medium: 'content',
      campaign: 'blog_list',
      content: 'category_filter',
      metadata: {
        category: category,
        currentPage: 1
      }
    });
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('');
    setCurrentPage(1);
    
    // Track clear filters
    trackCustomEvent('blog_list_filter', {
      medium: 'content',
      campaign: 'blog_list',
      content: 'clear_filters',
      metadata: {
        previousSearch: searchTerm,
        previousCategory: categoryFilter
      }
    });
  };

  const handlePostClick = (post) => {
    // Track post click
    trackCustomEvent('blog_list_post_click', {
      medium: 'content',
      campaign: 'blog_list',
      content: 'post_click',
      metadata: {
        postId: post._id,
        postSlug: post.slug,
        postTitle: post.title,
        position: posts.findIndex(p => p._id === post._id),
        currentPage: currentPage
      }
    });
  };

  // Generate page numbers with ellipsis for better UX
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  if (loading && posts.length === 0) {
    return (
      <div style={{ 
        padding: '2rem', 
        maxWidth: '1200px', 
        margin: '0 auto',
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: '1rem',
          marginBottom: '1rem'
        }}>
          <div className="loading-spinner" style={{
            width: '32px',
            height: '32px',
            border: '4px solid #e2e8f0',
            borderTop: '4px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <span style={{ fontWeight: '500', fontSize: '1.2rem' }}>Loading blog posts...</span>
        </div>
        <p style={{ color: '#718096', textAlign: 'center' }}>
          Fetching the latest content for you
        </p>

        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error && posts.length === 0) {
    return (
      <div style={{ 
        padding: '2rem', 
        maxWidth: '1200px', 
        margin: '0 auto',
        textAlign: 'center'
      }}>
        <div style={{ 
          background: '#fed7d7',
          border: '1px solid #feb2b2',
          borderRadius: '8px',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <h2 style={{ color: '#c53030', marginBottom: '1rem' }}>Error Loading Posts</h2>
          <p style={{ color: '#742a2a', marginBottom: '1.5rem' }}>{error}</p>
          <button 
            onClick={() => fetchPosts(1, searchTerm, categoryFilter)}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '1rem',
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#5a67d8'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#667eea'}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '2rem', 
      maxWidth: '1200px', 
      margin: '0 auto',
      minHeight: '100vh'
    }}>
      {/* Header Section */}
      <div style={{ 
        marginBottom: '3rem',
        textAlign: 'center'
      }}>
        <h1 style={{ 
          marginBottom: '0.5rem',
          fontSize: '2.5rem',
          fontWeight: '800',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          Wilson Muita Blog
        </h1>
        <p style={{ 
          color: '#718096', 
          fontSize: '1.2rem',
          maxWidth: '600px',
          margin: '0 auto 2rem auto'
        }}>
          Insights, tutorials, and thoughts on technology, development, and innovation
        </p>

        {/* Search and Filter Section */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginBottom: '2rem'
        }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              placeholder="Search posts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '0.75rem 1rem',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '1rem',
                minWidth: '250px',
                outline: 'none',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
            <button 
              type="submit"
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '1rem',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#5a67d8'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#667eea'}
            >
              Search
            </button>
          </form>

          <select
            value={categoryFilter}
            onChange={handleCategoryChange}
            style={{
              padding: '0.75rem 1rem',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '1rem',
              minWidth: '200px',
              outline: 'none',
              transition: 'border-color 0.2s ease'
            }}
            onFocus={(e) => e.target.style.borderColor = '#667eea'}
            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category._id} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>

          {(searchTerm || categoryFilter) && (
            <button 
              onClick={handleClearFilters}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#a0aec0',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '1rem',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#718096'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#a0aec0'}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Results Info */}
      <div style={{ 
        marginBottom: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <h2 style={{ 
          margin: 0,
          fontSize: '1.5rem',
          color: '#2d3748'
        }}>
          {searchTerm || categoryFilter ? 'Filtered Results' : 'Latest Posts'}
        </h2>
        <p style={{ 
          color: '#718096', 
          fontSize: '1rem',
          margin: 0
        }}>
          Showing {posts.length} of {totalPosts} posts
          {searchTerm && ` for "${searchTerm}"`}
          {categoryFilter && ` in ${categoryFilter}`}
        </p>
      </div>

      {posts.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '4rem 2rem',
          background: '#f7fafc',
          borderRadius: '12px',
          border: '2px dashed #cbd5e0'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
          <h3 style={{ 
            marginBottom: '1rem',
            color: '#2d3748',
            fontSize: '1.5rem'
          }}>
            No posts found
          </h3>
          <p style={{ 
            color: '#718096',
            marginBottom: '2rem',
            fontSize: '1.1rem'
          }}>
            {searchTerm || categoryFilter 
              ? 'Try adjusting your search or filters to find more content.'
              : 'No blog posts have been published yet. Check back soon!'
            }
          </p>
          {(searchTerm || categoryFilter) && (
            <button 
              onClick={handleClearFilters}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '1rem',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#5a67d8'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#667eea'}
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Posts List */}
          <div style={{ marginBottom: '3rem' }}>
            {posts.map((post, index) => (
              <div
                key={post._id}
                style={{
                  marginBottom: '2rem',
                  padding: '2rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  backgroundColor: '#fff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  transition: 'all 0.3s ease',
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
                {/* 🖼️ FEATURED IMAGE with lazy loading and improved alt text */}
                {post.featuredImage && (
                  <div style={{ 
                    marginBottom: '1.5rem', 
                    borderRadius: '8px', 
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    <img
                      src={post.featuredImage}
                      alt={post.imageAltText || post.title}
                      loading="lazy"
                      style={{
                        width: '100%',
                        height: 'auto',
                        maxHeight: '400px',
                        objectFit: 'cover',
                        display: 'block'
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                
                {/* Category Badge */}
                {post.category && (
                  <span 
                    style={{
                      display: 'inline-block',
                      backgroundColor: '#667eea',
                      color: 'white',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      marginBottom: '1rem'
                    }}
                  >
                    {post.category}
                  </span>
                )}
                
                {/* ✅ UPDATED: Changed from /post/ to /blog/ for consistency */}
                <h2 style={{ 
                  marginBottom: '1rem', 
                  fontSize: '1.75rem',
                  lineHeight: '1.3'
                }}>
                  <Link 
                    to={addUTMParams(
                      `/blog/${post.slug}`,
                      'wilsonmuita',
                      'content',
                      'blog_list',
                      `position_${index + 1}`,
                      post.title
                    )}
                    onClick={() => handlePostClick(post)}
                    style={{ 
                      textDecoration: 'none', 
                      color: '#2d3748',
                      transition: 'color 0.2s ease',
                      display: 'block'
                    }}
                    onMouseEnter={(e) => e.target.style.color = '#667eea'}
                    onMouseLeave={(e) => e.target.style.color = '#2d3748'}
                  >
                    {post.title}
                  </Link>
                </h2>
                
                <p style={{ 
                  color: '#718096', 
                  lineHeight: '1.6',
                  marginBottom: '1.5rem',
                  fontSize: '1.1rem'
                }}>
                  {post.excerpt || 'Read this article to learn more...'}
                </p>
                
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid #f7fafc'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <small style={{ color: '#718096', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span>👤</span>
                      {post.author || 'Wilson Muita'}
                    </small>
                    <small style={{ color: '#718096', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span>📅</span>
                      {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </small>
                    {post.readTime && (
                      <small style={{ color: '#718096', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span>⏱️</span>
                        {post.readTime} min read
                      </small>
                    )}
                  </div>
                  
                  {/* ✅ UPDATED: Changed from /post/ to /blog/ for consistency */}
                  <Link 
                    to={addUTMParams(
                      `/blog/${post.slug}`,
                      'wilsonmuita',
                      'content',
                      'blog_list',
                      `read_more_${index + 1}`,
                      post.title
                    )}
                    onClick={() => handlePostClick(post)}
                    style={{
                      textDecoration: 'none',
                      color: '#667eea',
                      fontWeight: '600',
                      transition: 'all 0.2s ease',
                      padding: '0.5rem 1rem',
                      border: '1px solid #667eea',
                      borderRadius: '6px'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#667eea';
                      e.target.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = 'transparent';
                      e.target.style.color = '#667eea';
                    }}
                  >
                    Read More →
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              gap: '1rem',
              flexWrap: 'wrap',
              padding: '3rem 0 2rem 0'
            }}>
              {/* Previous Button */}
              <button 
                onClick={handlePrevPage} 
                disabled={currentPage === 1}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: '1px solid #e2e8f0',
                  backgroundColor: currentPage === 1 ? '#f7fafc' : '#fff',
                  color: currentPage === 1 ? '#a0aec0' : '#4a5568',
                  borderRadius: '8px',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: '1rem',
                  fontWeight: '500'
                }}
                onMouseEnter={(e) => {
                  if (currentPage !== 1) {
                    e.target.style.backgroundColor = '#667eea';
                    e.target.style.color = '#fff';
                    e.target.style.borderColor = '#667eea';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentPage !== 1) {
                    e.target.style.backgroundColor = '#fff';
                    e.target.style.color = '#4a5568';
                    e.target.style.borderColor = '#e2e8f0';
                  }
                }}
              >
                ← Previous
              </button>

              {/* Page Numbers */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {getPageNumbers().map((page, index) => (
                  page === '...' ? (
                    <span 
                      key={`ellipsis-${index}`}
                      style={{
                        padding: '0.5rem 1rem',
                        color: '#a0aec0'
                      }}
                    >
                      ...
                    </span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => handlePageClick(page)}
                      style={{
                        padding: '0.5rem 1rem',
                        border: '1px solid #e2e8f0',
                        backgroundColor: page === currentPage ? '#667eea' : '#fff',
                        color: page === currentPage ? '#fff' : '#4a5568',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        minWidth: '3rem',
                        fontWeight: page === currentPage ? '600' : '400'
                      }}
                      onMouseEnter={(e) => {
                        if (page !== currentPage) {
                          e.target.style.backgroundColor = '#f7fafc';
                          e.target.style.borderColor = '#667eea';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (page !== currentPage) {
                          e.target.style.backgroundColor = '#fff';
                          e.target.style.borderColor = '#e2e8f0';
                        }
                      }}
                    >
                      {page}
                    </button>
                  )
                ))}
              </div>

              {/* Next Button */}
              <button 
                onClick={handleNextPage} 
                disabled={currentPage === totalPages}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: '1px solid #e2e8f0',
                  backgroundColor: currentPage === totalPages ? '#f7fafc' : '#fff',
                  color: currentPage === totalPages ? '#a0aec0' : '#4a5568',
                  borderRadius: '8px',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: '1rem',
                  fontWeight: '500'
                }}
                onMouseEnter={(e) => {
                  if (currentPage !== totalPages) {
                    e.target.style.backgroundColor = '#667eea';
                    e.target.style.color = '#fff';
                    e.target.style.borderColor = '#667eea';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentPage !== totalPages) {
                    e.target.style.backgroundColor = '#fff';
                    e.target.style.color = '#4a5568';
                    e.target.style.borderColor = '#e2e8f0';
                  }
                }}
              >
                Next →
              </button>
            </div>
          )}

          {/* Page Info */}
          <div style={{ 
            textAlign: 'center', 
            color: '#718096',
            marginTop: '1rem',
            padding: '1rem'
          }}>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              Page {currentPage} of {totalPages} • {totalPosts} total posts
              {searchTerm && ` • Searching for: "${searchTerm}"`}
              {categoryFilter && ` • Category: ${categoryFilter}`}
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default BlogListPage;