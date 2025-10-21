// frontend/src/pages/HomePage.js
import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import './HomePage.css'; // Import the CSS file

const HomePage = () => {
  return (
    <Layout>
      <div className="home-container">
        {/* Hero Section */}
        <section className="home-hero">
          <div className="home-hero-content">
            <h1 className="hero-title">
              Welcome to My Tech Blog
            </h1>
            <p className="hero-subtitle">
              Discover insightful articles about web development, programming, and technology trends.
            </p>
            <Link 
              to="/blog" 
              className="cta-button"
            >
              Explore Blog Posts →
            </Link>
          </div>
        </section>
        
        {/* Features Grid */}
        <div className="home-features-grid">
          <div className="feature-card">
            <div className="feature-icon">📚</div>
            <h3 className="feature-title">Latest Articles</h3>
            <p className="feature-description">
              Stay updated with the latest in web development and programming.
            </p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">💻</div>
            <h3 className="feature-title">Tech Tutorials</h3>
            <p className="feature-description">
              Step-by-step guides to help you master new technologies.
            </p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">🔍</div>
            <h3 className="feature-title">Industry Insights</h3>
            <p className="feature-description">
              Analysis and thoughts on current technology trends.
            </p>
          </div>
        </div>

        {/* Additional Call-to-Action */}
        <section className="home-cta">
          <div className="cta-content">
            <h2 className="cta-title">
              Ready to Dive Deeper?
            </h2>
            <p className="cta-subtitle">
              Explore our comprehensive collection of articles, tutorials, and guides 
              designed to help you grow as a developer.
            </p>
            <div className="cta-buttons">
              <Link 
                to="/blog" 
                className="cta-button-primary"
              >
                Browse All Posts
              </Link>
              <Link 
                to="/about" 
                className="cta-button-secondary"
              >
                Learn About Me
              </Link>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default HomePage;