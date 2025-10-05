const express = require('express');
const router = express.Router();
const Subscriber = require('../models/Subscriber');
const nodemailer = require('nodemailer');

// POST /api/newsletter/subscribe - Subscribe to newsletter
router.post('/subscribe', async (req, res) => {
  try {
    const { email, name, source = 'website', utm_source, utm_medium, utm_campaign } = req.body;
    
    // Validate required fields
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if already subscribed
    const existingSubscriber = await Subscriber.findOne({ email });
    if (existingSubscriber) {
      return res.status(200).json({ 
        message: 'Already subscribed to newsletter',
        subscriber: existingSubscriber 
      });
    }

    const subscriber = new Subscriber({
      email,
      name,
      source,
      utmSource: utm_source,
      utmMedium: utm_medium,
      utmCampaign: utm_campaign
    });

    await subscriber.save();

    // Send welcome email via Nodemailer + Gmail
    await sendWelcomeEmail(email, name);

    res.status(201).json({
      message: 'Successfully subscribed to newsletter',
      subscriber: { email, name }
    });
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Email already subscribed' });
    }
    res.status(400).json({ error: error.message });
  }
});

// GET /api/newsletter/subscribers - Get all subscribers (admin only)
router.get('/subscribers', async (req, res) => {
  try {
    const subscribers = await Subscriber.find().sort({ createdAt: -1 });
    res.json({ subscribers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/newsletter/unsubscribe - Unsubscribe from newsletter
router.delete('/unsubscribe', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const subscriber = await Subscriber.findOneAndUpdate(
      { email },
      { isActive: false },
      { new: true }
    );

    if (!subscriber) {
      return res.status(404).json({ error: 'Subscriber not found' });
    }

    res.json({ message: 'Successfully unsubscribed', subscriber });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Nodemailer with Gmail Configuration
 * Uses Gmail App Password for authentication :cite[1]:cite[8]
 */
async function sendWelcomeEmail(email, name) {
  // Check if Gmail credentials are configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('Gmail credentials not configured, skipping welcome email.');
    return null;
  }

  try {
    // Create Nodemailer transporter with Gmail SMTP :cite[8]
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // Use STARTTLS
      auth: {
        user: process.env.EMAIL_USER, // Your Gmail address
        pass: process.env.EMAIL_PASS, // Your 16-character App Password
      },
    });

    // Verify transporter configuration
    await transporter.verify();
    console.log('Gmail transporter configured successfully');

    const mailOptions = {
      from: {
        name: process.env.SITE_NAME || "Wilson's Blog",
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: `Welcome to ${process.env.SITE_NAME || "Our Newsletter"}!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to Our Newsletter</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 5px; }
            .content { padding: 20px; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; margin-top: 20px; }
            .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Welcome to ${process.env.SITE_NAME || "Our Newsletter"}! 🎉</h1>
          </div>
          <div class="content">
            <h2>Hello, ${name || 'there'}!</h2>
            <p>Thank you for subscribing to ${process.env.SITE_NAME || "our newsletter"}. You'll now receive:</p>
            <ul>
              <li>Latest blog posts and updates</li>
              <li>Exclusive content and tips</li>
              <li>News about upcoming features</li>
            </ul>
            <p style="text-align: center;">
              <a href="${process.env.BLOG_URL}" class="button">Visit Our Blog</a>
            </p>
          </div>
          <div class="footer">
            <p>
              If you no longer wish to receive these emails, 
              <a href="${process.env.BLOG_URL}/unsubscribe?email=${email}">unsubscribe here</a>.
            </p>
            <p>&copy; ${new Date().getFullYear()} ${process.env.SITE_NAME || "Wilson's Blog"}. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
      text: `Welcome to ${process.env.SITE_NAME || "our newsletter"}, ${name || 'there'}! Thank you for subscribing. You'll receive our latest updates and blog posts. Visit us at: ${process.env.BLOG_URL}`
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent via Gmail: %s', info.messageId);
    return info;
  } catch (error) {
    // Log the error but don't break the subscription process
    console.error('Error sending welcome email with Gmail:', {
      message: error.message,
      code: error.code
    });
    
    // Don't throw error - subscription should succeed even if email fails
    return null;
  }
}

// Remove all the old email service functions (addToSendGrid, addToMailtrap, addToResend, addToEmailService)
// as they're no longer needed

module.exports = router;