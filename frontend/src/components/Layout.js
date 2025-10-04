// frontend/src/components/Layout.js
import React from 'react';
import Navbar from './Navbar';

const Layout = ({ children }) => {
  return (
    <div className="layout">
      <header>
        <Navbar />
      </header>
      <main className="container fade-in">
        {children}
      </main>
      <footer>
        <div className="footer-content">
          <p>© 2025 Wilson Muita. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;