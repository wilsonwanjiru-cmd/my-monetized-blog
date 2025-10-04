// frontend/src/pages/ContactPage.js
import React, { useState } from 'react';

const ContactPage = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        message: ''
    });

    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch('http://localhost:5000/api/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                alert(data.message || 'Message sent successfully!');
                setFormData({ name: '', email: '', message: '' });
            } else {
                alert(data.error || 'Failed to send message.');
            }
        } catch (error) {
            console.error('Error submitting contact form:', error);
            alert('Something went wrong. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="contact-container">
            <h1 className="contact-title">Get In Touch</h1>
            
            <div className="contact-grid">
                {/* Contact Information */}
                <div className="contact-info">
                    <h2>Contact Information</h2>
                    <p className="contact-description">I'd love to hear from you! Here's how you can reach me:</p>
                    
                    <div className="contact-detail">
                        <h3>Email</h3>
                        <p>
                            <a href="mailto:wilsonmuita41@gmail.com" className="contact-link">
                                wilsonmuita41@gmail.com
                            </a>
                        </p>
                    </div>

                    <div className="contact-detail">
                        <h3>Phone</h3>
                        <p>
                            <a href="tel:+254703538670" className="contact-link">
                                +254 703 538 670
                            </a>
                        </p>
                    </div>

                    <div className="contact-detail">
                        <h3>Response Time</h3>
                        <p>I typically respond to emails within 24-48 hours.</p>
                    </div>

                    <div className="contact-detail">
                        <h3>Preferred Communication</h3>
                        <p>Email is the best way to reach me for detailed discussions or project inquiries.</p>
                    </div>
                </div>

                {/* Contact Form */}
                <div className="contact-form-section">
                    <h2>Send Me a Message</h2>
                    <form onSubmit={handleSubmit} className="contact-form">
                        <div className="form-group">
                            <label htmlFor="name" className="form-label">
                                Full Name *
                            </label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                className="form-input"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="email" className="form-label">
                                Email Address *
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                className="form-input"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="message" className="form-label">
                                Message *
                            </label>
                            <textarea
                                id="message"
                                name="message"
                                value={formData.message}
                                onChange={handleChange}
                                required
                                rows="5"
                                className="form-textarea"
                            ></textarea>
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="submit-button"
                        >
                            {loading ? 'Sending...' : 'Send Message'}
                        </button>
                    </form>
                </div>
            </div>

            {/* Additional Information */}
            <div className="contact-additional">
                <h3>What I Can Help You With</h3>
                <ul className="services-list">
                    <li>Web development projects and collaborations</li>
                    <li>Technical questions about my blog posts</li>
                    <li>Speaking engagements or guest posting opportunities</li>
                    <li>Feedback about my content</li>
                    <li>General inquiries about technology and programming</li>
                </ul>
            </div>
        </div>
    );
};

export default ContactPage;
