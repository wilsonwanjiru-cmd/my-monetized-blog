const express = require('express');
const router = express.Router();

// GET privacy policy as JSON for React frontend
router.get('/privacy-policy', (req, res) => {
  const currentDate = new Date().toISOString().split('T')[0];
  
  const privacyPolicy = {
    title: "Privacy Policy - Wilson Muita",
    description: "Privacy Policy for Wilson Muita's blog. Learn how we collect, use, and protect your data.",
    content: `
      <h1>Privacy Policy</h1>
      <p class="last-updated">Last updated: ${currentDate}</p>
      
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
      
      <h2>3. Google AdSense & Third-Party Advertising</h2>
      <p><strong>Critical AdSense Compliance Section:</strong></p>
      <ul>
          <li>Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to your website or other websites</li>
          <li>Google's use of advertising cookies enables it and its partners to serve ads to your users based on their visit to your sites and/or other sites on the Internet</li>
          <li>Users may opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank">Google Ads Settings</a> or <a href="https://www.aboutads.info" target="_blank">www.aboutads.info</a></li>
          <li>We may use Google AdSense advertising and other third-party advertising networks that comply with Google's policies</li>
      </ul>
      
      <h2>4. Cookies and Tracking Technologies</h2>
      <p>We use cookies for:</p>
      <ul>
          <li>Google Analytics to understand user behavior</li>
          <li>Google AdSense to display relevant ads</li>
          <li>Newsletter preferences and consent management</li>
          <li>Site functionality and performance</li>
      </ul>
      
      <h2>5. Data Sharing and Disclosure</h2>
      <p>We may share information with:</p>
      <ul>
          <li>Google AdSense and Analytics</li>
          <li>Email marketing providers</li>
          <li>Legal authorities when required by law</li>
      </ul>
      
      <h2>6. Your Rights (GDPR/CCPA Compliance)</h2>
      <ul>
          <li>Right to access your personal data</li>
          <li>Right to rectification</li>
          <li>Right to erasure (Right to be Forgotten)</li>
          <li>Right to restrict processing</li>
          <li>Right to data portability</li>
          <li>Right to object to processing</li>
          <li>Right to opt-out of data sales (CCPA)</li>
      </ul>
      
      <h2>7. Data Security</h2>
      <p>We implement appropriate security measures to protect your personal information. However, no method of transmission over the Internet is 100% secure.</p>
      
      <h2>8. Children's Privacy</h2>
      <p>Our service does not address anyone under the age of 13. We do not knowingly collect personally identifiable information from children under 13.</p>
      
      <h2>9. Contact Information</h2>
      <div class="contact-info">
          <p>For privacy-related questions, contact us at: <strong>wilsonmuita41@gmail.com</strong></p>
      </div>
      
      <h2>10. Changes to This Policy</h2>
      <p>We may update this privacy policy periodically. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.</p>
    `,
    lastUpdated: currentDate
  };

  // Set proper headers for JSON response
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  res.json(privacyPolicy);
});

// GET privacy policy as HTML for direct browser access (optional)
router.get('/privacy-policy/html', (req, res) => {
  const currentDate = new Date().toISOString().split('T')[0];
  
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Privacy Policy - Wilson Muita</title>
        <meta name="description" content="Privacy Policy for Wilson Muita's blog. Learn how we collect, use, and protect your data.">
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                color: #333;
            }
            h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
            h2 { color: #34495e; margin-top: 30px; }
            h3 { color: #7f8c8d; }
            ul { padding-left: 20px; }
            li { margin-bottom: 8px; }
            a { color: #3498db; text-decoration: none; }
            a:hover { text-decoration: underline; }
            .last-updated { color: #7f8c8d; font-style: italic; }
            .contact-info { background: #f8f9fa; padding: 15px; border-radius: 5px; }
        </style>
    </head>
    <body>
        <h1>Privacy Policy</h1>
        <p class="last-updated">Last updated: ${currentDate}</p>
        
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
        
        <h2>3. Google AdSense & Third-Party Advertising</h2>
        <p><strong>Critical AdSense Compliance Section:</strong></p>
        <ul>
            <li>Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to your website or other websites</li>
            <li>Google's use of advertising cookies enables it and its partners to serve ads to your users based on their visit to your sites and/or other sites on the Internet</li>
            <li>Users may opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank">Google Ads Settings</a> or <a href="https://www.aboutads.info" target="_blank">www.aboutads.info</a></li>
            <li>We may use Google AdSense advertising and other third-party advertising networks that comply with Google's policies</li>
        </ul>
        
        <h2>4. Cookies and Tracking Technologies</h2>
        <p>We use cookies for:</p>
        <ul>
            <li>Google Analytics to understand user behavior</li>
            <li>Google AdSense to display relevant ads</li>
            <li>Newsletter preferences and consent management</li>
            <li>Site functionality and performance</li>
        </ul>
        
        <h2>5. Data Sharing and Disclosure</h2>
        <p>We may share information with:</p>
        <ul>
            <li>Google AdSense and Analytics</li>
            <li>Email marketing providers</li>
            <li>Legal authorities when required by law</li>
        </ul>
        
        <h2>6. Your Rights (GDPR/CCPA Compliance)</h2>
        <ul>
            <li>Right to access your personal data</li>
            <li>Right to rectification</li>
            <li>Right to erasure (Right to be Forgotten)</li>
            <li>Right to restrict processing</li>
            <li>Right to data portability</li>
            <li>Right to object to processing</li>
            <li>Right to opt-out of data sales (CCPA)</li>
        </ul>
        
        <h2>7. Data Security</h2>
        <p>We implement appropriate security measures to protect your personal information. However, no method of transmission over the Internet is 100% secure.</p>
        
        <h2>8. Children's Privacy</h2>
        <p>Our service does not address anyone under the age of 13. We do not knowingly collect personally identifiable information from children under 13.</p>
        
        <h2>9. Contact Information</h2>
        <div class="contact-info">
            <p>For privacy-related questions, contact us at: <strong>wilsonmuita41@gmail.com</strong></p>
        </div>
        
        <h2>10. Changes to This Policy</h2>
        <p>We may update this privacy policy periodically. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.</p>
    </body>
    </html>
  `);
});

module.exports = router;