// frontend/src/pages/HomePage.js
import React from 'react';
import { Link } from 'react-router-dom';

const HomePage = () => {
  return (
    <div>
      <section className="hero">
        <h1>Welcome to My Tech Blog</h1>
        <p>Discover insightful articles about web development, programming, and technology trends.</p>
        <Link to="/blog" className="cta-button">Explore Blog Posts</Link>
      </section>
      
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        <div className="card">
          <h3>Latest Articles</h3>
          <p>Stay updated with the latest in web development and programming.</p>
        </div>
        <div className="card">
          <h3>Tech Tutorials</h3>
          <p>Step-by-step guides to help you master new technologies.</p>
        </div>
        <div className="card">
          <h3>Industry Insights</h3>
          <p>Analysis and thoughts on current technology trends.</p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;