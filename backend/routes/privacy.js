const express = require('express');
const router = express.Router();

router.get('/privacy-policy', (req, res) => {
  res.json({
    title: 'Privacy Policy',
    content: `
      <h1>Privacy Policy</h1>
      <p>Last updated: ${new Date().toISOString().split('T')[0]}</p>
      
      <h2>1. Information We Collect</h2>
      <h3>Personal Information</h3>
      <ul>
        <li>Email address (when you subscribe to our newsletter)</li>
        <li>Name (optional, when you contact us)</li>
        <li>IP address and browser information</li>
      </ul>
      
      <h3>Automatically Collected Information</h3>
      <ul>
        <li>Usage data and analytics</li>
        <li>Cookies and tracking technologies</li>
        <li>Device information</li>
      </ul>
      
      <h2>2. How We Use Your Information</h2>
      <ul>
        <li>To provide and maintain our blog</li>
        <li>To send newsletters and updates</li>
        <li>To display personalized advertisements via Google AdSense</li>
        <li>To analyze reader behavior and improve content</li>
        <li>To prevent abuse and ensure security</li>
      </ul>
      
      <h2>3. Google AdSense</h2>
      <p>We use Google AdSense to display advertisements. Google uses cookies to serve ads based on your prior visits to our website or other websites.</p>
      <p>You may opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank">Google Ads Settings</a>.</p>
      
      <h2>4. Cookies and Tracking</h2>
      <p>We use cookies for:</p>
      <ul>
        <li>Google Analytics to understand user behavior</li>
        <li>Google AdSense to display relevant ads</li>
        <li>Newsletter preferences and consent management</li>
        <li>Site functionality and performance</li>
      </ul>
      
      <h2>5. Data Sharing</h2>
      <p>We may share information with:</p>
      <ul>
        <li>Google AdSense and Analytics</li>
        <li>Email marketing providers</li>
        <li>Legal authorities when required by law</li>
      </ul>
      
      <h2>6. Your Rights</h2>
      <ul>
        <li>Right to access your personal data</li>
        <li>Right to rectification</li>
        <li>Right to erasure</li>
        <li>Right to restrict processing</li>
        <li>Right to data portability</li>
        <li>Right to object to processing</li>
      </ul>
      
      <h2>7. Data Security</h2>
      <p>We implement appropriate security measures to protect your personal information.</p>
      
      <h2>8. Contact Information</h2>
      <p>For privacy-related questions, contact us at: wilson@wilsonmuita.com</p>
      
      <h2>9. Changes to This Policy</h2>
      <p>We may update this privacy policy periodically. We will notify you of any changes by posting the new policy on this page.</p>
    `
  });
});

module.exports = router;