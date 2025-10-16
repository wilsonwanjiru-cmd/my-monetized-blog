// frontend/src/components/Layout.js
import React from 'react';
import Navbar from './Navbar';
import './Layout.css';

const Layout = ({ children }) => {
  return (
    <div className="layout">
      <Navbar />
      <main className="main-content">
        {children}
      </main>
      <footer className="footer">
        <div className="footer-content">
          <p>&copy; 2025 Wilson Muita. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;