// frontend/src/components/NewsletterSignup.js
import React, { useState } from 'react';
import API_BASE_URL from '../utils/api'; // Import the centralized API configuration

const NewsletterSignup = () => {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    source: 'blog_post'
  });
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      // Get UTM parameters from URL if they exist
      const urlParams = new URLSearchParams(window.location.search);
      
      const payload = {
        ...formData,
        utm_source: urlParams.get('utm_source') || 'direct',
        utm_medium: urlParams.get('utm_medium') || 'organic',
        utm_campaign: urlParams.get('utm_campaign') || 'general'
      };

      // ✅ UPDATED: Use centralized API configuration
      const response = await fetch(`${API_BASE_URL}/newsletter/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage('🎉 Successfully subscribed! Welcome to our newsletter.');
        setFormData({
          email: '',
          name: '',
          source: 'blog_post'
        });
      } else {
        setMessage(data.error || 'Subscription failed. Please try again.');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      setMessage('🔌 Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="newsletter-signup" style={{ 
      padding: '2rem', 
      border: '1px solid #e0e0e0', 
      borderRadius: '8px',
      backgroundColor: '#f9f9f9',
      margin: '2rem 0'
    }}>
      <h3 style={{ marginTop: 0, color: '#333' }}>📬 Stay Updated</h3>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>
        Get the latest posts delivered right to your inbox. No spam, unsubscribe anytime.
      </p>
      
      <form onSubmit={handleSubmit} className="newsletter-form" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input
          type="text"
          name="name"
          placeholder="Your Name"
          value={formData.name}
          onChange={handleChange}
          required
          style={{
            padding: '0.75rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '1rem'
          }}
        />
        <input
          type="email"
          name="email"
          placeholder="Your Email"
          value={formData.email}
          onChange={handleChange}
          required
          style={{
            padding: '0.75rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '1rem'
          }}
        />
        <button 
          type="submit" 
          disabled={isLoading}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: isLoading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '1rem',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s'
          }}
        >
          {isLoading ? 'Subscribing...' : 'Subscribe'}
        </button>
      </form>
      
      {message && (
        <p className="newsletter-message" style={{
          marginTop: '1rem',
          padding: '0.75rem',
          borderRadius: '4px',
          backgroundColor: message.includes('Successfully') ? '#d4edda' : '#f8d7da',
          color: message.includes('Successfully') ? '#155724' : '#721c24',
          border: `1px solid ${message.includes('Successfully') ? '#c3e6cb' : '#f5c6cb'}`
        }}>
          {message}
        </p>
      )}
    </section>
  );
};

export default NewsletterSignup;