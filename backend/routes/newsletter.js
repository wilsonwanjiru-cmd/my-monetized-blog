const express = require('express');
const router = express.Router();
const Subscriber = require('../models/Subscriber');
const axios = require('axios');

// POST /api/newsletter/subscribe - Subscribe to newsletter
router.post('/subscribe', async (req, res) => {
  try {
    const { email, name, source = 'website', utm_source, utm_medium, utm_campaign } = req.body;
    
    // Validate required fields
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
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

    // Integrate with email service (SendGrid by default)
    await addToEmailService(email, name);
    
    // Send welcome email
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

// Email Service Integration Functions

/**
 * SendGrid Integration - High deliverability, great for production :cite[2]:cite[7]
 */
async function addToSendGrid(email, name) {
  try {
    const data = {
      personalizations: [{ to: [{ email: email }] }],
      from: { email: process.env.FROM_EMAIL || 'newsletter@yourblog.com', name: 'Your Blog' },
      subject: 'Welcome to Our Newsletter!',
      content: [
        {
          type: 'text/html',
          value: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <title>Welcome to Our Newsletter</title>
            </head>
            <body>
              <h1>Welcome, ${name || 'Subscriber'}!</h1>
              <p>Thank you for subscribing to our newsletter. You'll now receive the latest updates directly in your inbox.</p>
              <p><a href="${process.env.BLOG_URL || 'https://yourblog.com'}">Visit our blog</a></p>
              <hr>
              <p><small><a href="${process.env.BLOG_URL || 'https://yourblog.com'}/unsubscribe">Unsubscribe</a></small></p>
            </body>
            </html>
          `
        }
      ]
    };

    const response = await axios.post(
      'https://api.sendgrid.com/v3/mail/send',
      data,
      {
        headers: {
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('SendGrid email sent successfully');
    return response.data;
  } catch (error) {
    console.error('SendGrid error:', error.response?.data || error.message);
    throw new Error('Failed to send welcome email via SendGrid');
  }
}

/**
 * Mailtrap Integration - Best for testing and development :cite[2]
 */
async function addToMailtrap(email, name) {
  try {
    const nodemailer = require('nodemailer');
    
    const transporter = nodemailer.createTransport({
      host: 'sandbox.smtp.mailtrap.io',
      port: 2525,
      auth: {
        user: process.env.MAILTRAP_USER,
        pass: process.env.MAILTRAP_PASS
      }
    });

    const mailOptions = {
      from: process.env.FROM_EMAIL || 'newsletter@yourblog.com',
      to: email,
      subject: 'Welcome to Our Newsletter!',
      html: `
        <h1>Welcome, ${name || 'Subscriber'}!</h1>
        <p>Thank you for subscribing to our newsletter.</p>
        <p>This email was sent via Mailtrap for testing.</p>
      `,
      category: 'Newsletter'
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Mailtrap email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Mailtrap error:', error);
    throw new Error('Failed to send email via Mailtrap');
  }
}

/**
 * Resend Integration - Great for JavaScript/TypeScript projects :cite[2]
 */
async function addToResend(email, name) {
  try {
    const data = {
      from: process.env.FROM_EMAIL || 'Your Blog <newsletter@yourblog.com>',
      to: email,
      subject: 'Welcome to Our Newsletter!',
      html: `
        <h1>Welcome to our newsletter, ${name || 'there'}!</h1>
        <p>Thanks for subscribing. We're excited to have you on board!</p>
        <p>You'll receive our latest articles and updates directly in your inbox.</p>
      `
    };

    const response = await axios.post(
      'https://api.resend.com/emails',
      data,
      {
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Resend email sent successfully');
    return response.data;
  } catch (error) {
    console.error('Resend error:', error.response?.data || error.message);
    throw new Error('Failed to send email via Resend');
  }
}

/**
 * Main email service router - chooses service based on environment
 */
async function addToEmailService(email, name) {
  const service = process.env.EMAIL_SERVICE || 'sendgrid';
  
  switch (service.toLowerCase()) {
    case 'sendgrid':
      return await addToSendGrid(email, name);
    case 'mailtrap':
      return await addToMailtrap(email, name);
    case 'resend':
      return await addToResend(email, name);
    default:
      console.log(`Email service ${service} not configured, skipping email send`);
      return null;
  }
}

/**
 * Send welcome email using configured service
 */
async function sendWelcomeEmail(email, name) {
  try {
    // Only send welcome email if email service is configured
    if (process.env.SENDGRID_API_KEY || process.env.MAILTRAP_USER || process.env.RESEND_API_KEY) {
      await addToEmailService(email, name);
    } else {
      console.log('No email service configured, skipping welcome email');
    }
  } catch (error) {
    // Log error but don't fail the subscription
    console.error('Welcome email error:', error.message);
  }
}

module.exports = router;