// frontend/src/components/Navbar.js
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css'; // Added CSS import

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  // Handle scroll effect for navbar
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset;
      if (scrollTop > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const isActiveLink = (path) => {
    return location.pathname === path ? 'nav-link active' : 'nav-link';
  };

  return (
    <nav className={`navbar ${isScrolled ? 'navbar-scrolled' : ''}`}>
      <div className="nav-container">
        {/* Logo/Brand */}
        <div className="nav-brand">
          <Link to="/" className="brand-link">
            <span className="brand-icon">💻</span>
            Wilson's Blog
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button 
          className={`mobile-menu-button ${isMenuOpen ? 'menu-open' : ''}`}
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          <span className="menu-bar"></span>
          <span className="menu-bar"></span>
          <span className="menu-bar"></span>
        </button>

        {/* Navigation Links */}
        <div className={`nav-links-container ${isMenuOpen ? 'nav-links-open' : ''}`}>
          <ul className="nav-links">
            <li className="nav-item">
              <Link to="/" className={isActiveLink('/')}>
                <span className="nav-icon">🏠</span>
                Home
              </Link>
            </li>
            
            <li className="nav-item">
              <Link to="/blog" className={isActiveLink('/blog')}>
                <span className="nav-icon">📝</span>
                Blog
              </Link>
            </li>
            
            <li className="nav-item">
              <Link to="/about" className={isActiveLink('/about')}>
                <span className="nav-icon">👨‍💻</span>
                About
              </Link>
            </li>
            
            <li className="nav-item">
              <Link to="/contact" className={isActiveLink('/contact')}>
                <span className="nav-icon">📞</span>
                Contact
              </Link>
            </li>

            {/* Legal Pages Dropdown */}
            <li className="nav-item dropdown">
              <div className="dropdown-toggle">
                <span className="nav-icon">⚖️</span>
                Legal
                <span className="dropdown-arrow">▼</span>
              </div>
              <div className="dropdown-menu">
                <Link to="/privacy-policy" className="dropdown-link">
                  <span className="dropdown-icon">🔒</span>
                  Privacy Policy
                </Link>
                <Link to="/disclaimer" className="dropdown-link">
                  <span className="dropdown-icon">📄</span>
                  Disclaimer
                </Link>
              </div>
            </li>
          </ul>

          {/* Mobile-specific legal links */}
          <div className="mobile-legal-links">
            <Link to="/privacy-policy" className="mobile-legal-link">
              <span className="nav-icon">🔒</span>
              Privacy Policy
            </Link>
            <Link to="/disclaimer" className="mobile-legal-link">
              <span className="nav-icon">📄</span>
              Disclaimer
            </Link>
          </div>
        </div>

        {/* Overlay for mobile menu */}
        {isMenuOpen && (
          <div 
            className="nav-overlay"
            onClick={() => setIsMenuOpen(false)}
          ></div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;