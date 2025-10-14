// frontend/src/pages/BlogListPage.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API_BASE_URL from '../utils/api'; // Import the centralized API configuration

const BlogListPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);

  const fetchPosts = async (page = 1) => {
    try {
      setLoading(true);
      // ✅ UPDATED: Fetch posts with pagination
      const response = await fetch(`${API_BASE_URL}/posts?page=${page}`);
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      const data = await response.json();
      setPosts(data.posts);
      setCurrentPage(data.currentPage);
      setTotalPages(data.totalPages);
      setTotalPosts(data.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts(currentPage);
  }, [currentPage]);

  // Navigation handlers
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      // Scroll to top when changing pages for better UX
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePageClick = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading posts...</div>;
  if (error) return <div style={{ padding: '2rem', color: 'red', textAlign: 'center' }}>Error: {error}</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>Blog Posts</h1>
        <p style={{ color: '#666', fontSize: '1.1rem' }}>
          Showing {posts.length} of {totalPosts} posts
        </p>
      </div>

      {posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ fontSize: '1.2rem' }}>No posts found.</p>
        </div>
      ) : (
        <>
          {/* Posts List */}
          <div style={{ marginBottom: '3rem' }}>
            {posts.map(post => (
              <div
                key={post._id}
                style={{
                  marginBottom: '2rem',
                  padding: '1.5rem',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  backgroundColor: '#fff',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                }}
              >
                {/* 🖼️ FEATURED IMAGE with lazy loading and improved alt text */}
                {post.featuredImage && (
                  <div style={{ marginBottom: '1rem', borderRadius: '6px', overflow: 'hidden' }}>
                    <img
                      src={post.featuredImage}
                      alt={post.imageAltText || post.title}
                      loading="lazy"
                      style={{
                        width: '100%',
                        height: 'auto',
                        maxHeight: '300px',
                        objectFit: 'cover'
                      }}
                    />
                  </div>
                )}
                
                {/* ✅ UPDATED: Changed from /post/ to /blog/ for consistency */}
                <h2 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>
                  <Link 
                    to={`/blog/${post.slug}`}
                    style={{ 
                      textDecoration: 'none', 
                      color: '#333',
                      transition: 'color 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.color = '#007bff'}
                    onMouseLeave={(e) => e.target.style.color = '#333'}
                  >
                    {post.title}
                  </Link>
                </h2>
                
                <p style={{ 
                  color: '#666', 
                  lineHeight: '1.6',
                  marginBottom: '1rem'
                }}>
                  {post.excerpt}
                </p>
                
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.5rem'
                }}>
                  <small style={{ color: '#888' }}>
                    By {post.author} | {new Date(post.publishedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </small>
                  
                  {/* ✅ UPDATED: Changed from /post/ to /blog/ for consistency */}
                  <Link 
                    to={`/blog/${post.slug}`}
                    style={{
                      textDecoration: 'none',
                      color: '#007bff',
                      fontWeight: '500',
                      transition: 'color 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.color = '#0056b3'}
                    onMouseLeave={(e) => e.target.style.color = '#007bff'}
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
              padding: '2rem 0'
            }}>
              {/* Previous Button */}
              <button 
                onClick={handlePrevPage} 
                disabled={currentPage === 1}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: '1px solid #ddd',
                  backgroundColor: currentPage === 1 ? '#f8f9fa' : '#fff',
                  color: currentPage === 1 ? '#6c757d' : '#333',
                  borderRadius: '6px',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: '1rem'
                }}
                onMouseEnter={(e) => {
                  if (currentPage !== 1) {
                    e.target.style.backgroundColor = '#007bff';
                    e.target.style.color = '#fff';
                    e.target.style.borderColor = '#007bff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentPage !== 1) {
                    e.target.style.backgroundColor = '#fff';
                    e.target.style.color = '#333';
                    e.target.style.borderColor = '#ddd';
                  }
                }}
              >
                Previous
              </button>

              {/* Page Numbers */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => handlePageClick(page)}
                    style={{
                      padding: '0.5rem 1rem',
                      border: '1px solid #ddd',
                      backgroundColor: page === currentPage ? '#007bff' : '#fff',
                      color: page === currentPage ? '#fff' : '#333',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      minWidth: '3rem'
                    }}
                    onMouseEnter={(e) => {
                      if (page !== currentPage) {
                        e.target.style.backgroundColor = '#f8f9fa';
                        e.target.style.borderColor = '#007bff';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (page !== currentPage) {
                        e.target.style.backgroundColor = '#fff';
                        e.target.style.borderColor = '#ddd';
                      }
                    }}
                  >
                    {page}
                  </button>
                ))}
              </div>

              {/* Next Button */}
              <button 
                onClick={handleNextPage} 
                disabled={currentPage === totalPages}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: '1px solid #ddd',
                  backgroundColor: currentPage === totalPages ? '#f8f9fa' : '#fff',
                  color: currentPage === totalPages ? '#6c757d' : '#333',
                  borderRadius: '6px',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: '1rem'
                }}
                onMouseEnter={(e) => {
                  if (currentPage !== totalPages) {
                    e.target.style.backgroundColor = '#007bff';
                    e.target.style.color = '#fff';
                    e.target.style.borderColor = '#007bff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentPage !== totalPages) {
                    e.target.style.backgroundColor = '#fff';
                    e.target.style.color = '#333';
                    e.target.style.borderColor = '#ddd';
                  }
                }}
              >
                Next
              </button>
            </div>
          )}

          {/* Page Info */}
          <div style={{ 
            textAlign: 'center', 
            color: '#666',
            marginTop: '1rem'
          }}>
            <p>
              Page {currentPage} of {totalPages} • {totalPosts} total posts
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default BlogListPage;