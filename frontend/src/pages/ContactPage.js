// frontend/src/pages/ContactPage.js
import React, { useState, useEffect } from 'react';
import { blogAPI, apiUtils } from '../utils/api'; // Import the centralized API
import { trackPageView, trackCustomEvent, trackEmailClick } from '../utils/utmTracker'; // Import UTM tracking
import './ContactPage.css'; // Import the CSS file

const ContactPage = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: '',
        category: 'general'
    });

    const [loading, setLoading] = useState(false);
    const [submitStatus, setSubmitStatus] = useState(null); // 'success', 'error', null
    const [statusMessage, setStatusMessage] = useState('');
    const [charCount, setCharCount] = useState(0);
    const [apiConnected, setApiConnected] = useState(false);

    // Initialize tracking and test API connection
    useEffect(() => {
        trackPageView();
        
        // Track contact page view
        trackCustomEvent('contact_page_view', {
            medium: 'content',
            campaign: 'contact',
            content: 'page_view',
            metadata: {
                timestamp: new Date().toISOString(),
                referrer: document.referrer
            }
        });

        // Test API connection on component mount
        const testAPIConnection = async () => {
            console.log('🔍 Testing API connection for Contact Page...');
            
            try {
                // Test general connection
                const connectionTest = await apiUtils.testConnection();
                console.log('🌐 API Connection Test:', connectionTest);
                setApiConnected(connectionTest.connected);
                
                if (connectionTest.connected) {
                    // Test contact endpoint specifically
                    const contactTest = await apiUtils.testContactEndpoint();
                    console.log('📞 Contact Endpoint Test:', contactTest);
                }
            } catch (error) {
                console.error('❌ API Connection Test Failed:', error);
                setApiConnected(false);
            }
        };
        
        testAPIConnection();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });

        // Track character count for message
        if (name === 'message') {
            setCharCount(value.length);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setSubmitStatus(null);
        setStatusMessage('');

        // Validate form data before submission
        if (!formData.name || !formData.email || !formData.subject || !formData.message) {
            setSubmitStatus('error');
            setStatusMessage('Please fill in all required fields.');
            setLoading(false);
            return;
        }

        if (formData.message.length < 10) {
            setSubmitStatus('error');
            setStatusMessage('Message must be at least 10 characters long.');
            setLoading(false);
            return;
        }

        // Track form submission attempt
        trackCustomEvent('contact_form_submit_attempt', {
            medium: 'content',
            campaign: 'contact',
            content: 'form_submit',
            metadata: {
                formData: {
                    name: formData.name,
                    email: formData.email,
                    subject: formData.subject,
                    category: formData.category,
                    messageLength: formData.message.length
                },
                timestamp: new Date().toISOString()
            }
        });

        try {
            console.log('📤 Submitting contact form:', formData);
            
            // ✅ Use centralized blogAPI with better error handling
            const response = await blogAPI.contact.submit(formData);
            console.log('✅ Contact form response:', response);

            // ✅ Handle both 201 and 202 status codes from backend
            if (response && response.success) {
                setSubmitStatus('success');
                setStatusMessage(response.message || 'Message sent successfully! I\'ll get back to you within 24-48 hours.');
                
                // Track successful submission
                trackCustomEvent('contact_form_success', {
                    medium: 'content',
                    campaign: 'contact',
                    content: 'form_success',
                    metadata: {
                        formData: {
                            name: formData.name,
                            email: formData.email,
                            subject: formData.subject,
                            category: formData.category
                        },
                        timestamp: new Date().toISOString(),
                        responseId: response.contact?._id || response.contactId
                    }
                });

                // Reset form
                setFormData({
                    name: '',
                    email: '',
                    subject: '',
                    message: '',
                    category: 'general'
                });
                setCharCount(0);
            } else {
                // Handle cases where response exists but success is false
                const errorMessage = response?.error || response?.message || 'Failed to send message. Please try again.';
                throw new Error(errorMessage);
            }
        } catch (error) {
            console.error('❌ Error submitting contact form:', error);
            setSubmitStatus('error');
            
            // ✅ Enhanced error message handling for different error structures
            let errorMessage = 'Something went wrong. Please try again later.';
            
            if (error.message) {
                errorMessage = error.message;
            } else if (error.data?.message) {
                errorMessage = error.data.message;
            } else if (typeof error === 'string') {
                errorMessage = error;
            }
            
            // Handle specific error cases
            if (errorMessage.includes('Network error') || errorMessage.includes('Failed to fetch')) {
                errorMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
            } else if (errorMessage.includes('email') && errorMessage.includes('valid')) {
                errorMessage = 'Please enter a valid email address.';
            } else if (errorMessage.includes('required')) {
                errorMessage = 'Please fill in all required fields.';
            }
            
            setStatusMessage(errorMessage);
            
            // Track form error
            trackCustomEvent('contact_form_error', {
                medium: 'content',
                campaign: 'contact',
                content: 'form_error',
                metadata: {
                    error: errorMessage,
                    formData: {
                        name: formData.name,
                        email: formData.email,
                        subject: formData.subject,
                        category: formData.category
                    },
                    timestamp: new Date().toISOString(),
                    errorDetails: {
                        code: error.code,
                        status: error.status
                    }
                }
            });
        } finally {
            setLoading(false);
        }
    };

    const handleEmailClick = () => {
        trackEmailClick({
            url: 'mailto:wilsonmuita41@gmail.com',
            campaign: 'contact_page',
            content: 'email_link',
            emailType: 'contact',
            subject: 'Inquiry from Wilson Muita Blog'
        });
    };

    const handlePhoneClick = () => {
        trackCustomEvent('contact_phone_click', {
            medium: 'content',
            campaign: 'contact',
            content: 'phone_click',
            metadata: {
                phoneNumber: '+254703538670',
                timestamp: new Date().toISOString()
            }
        });
    };

    const contactCategories = [
        { value: 'general', label: 'General Inquiry' },
        { value: 'technical', label: 'Technical Question' },
        { value: 'collaboration', label: 'Collaboration' },
        { value: 'guest_posting', label: 'Guest Posting' },
        { value: 'speaking', label: 'Speaking Engagement' },
        { value: 'feedback', label: 'Content Feedback' },
        { value: 'other', label: 'Other' }
    ];

    return (
        <div className="contact-container">
            {/* Header Section */}
            <div className="contact-header">
                <h1 className="contact-title">
                    Get In Touch
                </h1>
                <p className="contact-subtitle">
                    Have a question, want to collaborate, or just want to say hello? 
                    I'd love to hear from you. Let's start a conversation.
                </p>
                
                {/* API Connection Status */}
                {!apiConnected && (
                    <div className="api-status-warning">
                        <span className="status-icon">⚠️</span>
                        <span>Unable to connect to server. Form submissions may not work.</span>
                    </div>
                )}
            </div>

            {/* Main Content Grid */}
            <div className="contact-grid">
                {/* Contact Information */}
                <div className="contact-info-card">
                    <h2 className="contact-info-title">
                        <span className="contact-icon">📞</span>
                        Contact Information
                    </h2>
                    
                    <p className="contact-info-description">
                        I'm always open to discussing new projects, creative ideas, or 
                        opportunities to be part of your vision.
                    </p>

                    <div className="contact-info-section">
                        <h3 className="contact-info-section-title">
                            <span className="contact-icon">📧</span>
                            Email
                        </h3>
                        <p className="contact-info-text">
                            <a 
                                href="mailto:wilsonmuita41@gmail.com"
                                onClick={handleEmailClick}
                                className="contact-link"
                            >
                                wilsonmuita41@gmail.com
                            </a>
                        </p>
                    </div>

                    <div className="contact-info-section">
                        <h3 className="contact-info-section-title">
                            <span className="contact-icon">📱</span>
                            Phone
                        </h3>
                        <p className="contact-info-text">
                            <a 
                                href="tel:+254703538670"
                                onClick={handlePhoneClick}
                                className="contact-link"
                            >
                                +254 703 538 670
                            </a>
                        </p>
                    </div>

                    <div className="contact-info-section">
                        <h3 className="contact-info-section-title">
                            <span className="contact-icon">⏰</span>
                            Response Time
                        </h3>
                        <p className="contact-info-text muted">
                            I typically respond to emails within 24-48 hours. 
                            For urgent matters, phone is preferred.
                        </p>
                    </div>

                    <div className="contact-info-section">
                        <h3 className="contact-info-section-title">
                            <span className="contact-icon">💬</span>
                            Preferred Communication
                        </h3>
                        <p className="contact-info-text muted">
                            Email is the best way to reach me for detailed discussions 
                            or project inquiries. I'm also available on LinkedIn for 
                            professional networking.
                        </p>
                    </div>
                </div>

                {/* Contact Form */}
                <div className="contact-form-card">
                    <h2 className="contact-form-title">
                        <span className="contact-icon">✉️</span>
                        Send Me a Message
                    </h2>

                    {/* Status Message */}
                    {submitStatus && (
                        <div className={`status-message ${submitStatus}`}>
                            {statusMessage}
                        </div>
                    )}

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
                                disabled={loading}
                                className="form-input"
                                placeholder="Enter your full name"
                                minLength="2"
                                maxLength="100"
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
                                disabled={loading}
                                className="form-input"
                                placeholder="Enter your email address"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="category" className="form-label">
                                Inquiry Type
                            </label>
                            <select
                                id="category"
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                disabled={loading}
                                className="form-select"
                            >
                                {contactCategories.map(category => (
                                    <option key={category.value} value={category.value}>
                                        {category.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="subject" className="form-label">
                                Subject *
                            </label>
                            <input
                                type="text"
                                id="subject"
                                name="subject"
                                value={formData.subject}
                                onChange={handleChange}
                                required
                                disabled={loading}
                                placeholder="Brief description of your inquiry"
                                className="form-input"
                                minLength="5"
                                maxLength="200"
                            />
                        </div>

                        <div className="form-group">
                            <div className="textarea-header">
                                <label htmlFor="message" className="form-label">
                                    Message *
                                </label>
                                <span className={`char-count ${charCount > 1000 ? 'error' : ''}`}>
                                    {charCount}/1000 characters
                                </span>
                            </div>
                            <textarea
                                id="message"
                                name="message"
                                value={formData.message}
                                onChange={handleChange}
                                required
                                rows="6"
                                disabled={loading}
                                maxLength="1000"
                                minLength="10"
                                placeholder="Please provide detailed information about your inquiry (minimum 10 characters)..."
                                className="form-textarea"
                            ></textarea>
                            <div className="textarea-hint">
                                Minimum 10 characters required
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading || charCount === 0 || charCount < 10}
                            className="submit-button"
                            title={charCount < 10 ? "Message must be at least 10 characters long" : "Send your message"}
                        >
                            {loading ? (
                                <>
                                    <div className="loading-spinner"></div>
                                    Sending Message...
                                </>
                            ) : (
                                'Send Message'
                            )}
                        </button>
                        
                        {/* Form submission hint */}
                        <div className="form-hint">
                            {!apiConnected && (
                                <span className="hint-warning">
                                    ⚠️ Offline mode: Form data will be saved locally.
                                </span>
                            )}
                        </div>
                    </form>
                </div>
            </div>

            {/* Additional Information */}
            <div className="additional-info">
                <h3 className="additional-info-title">
                    What I Can Help You With
                </h3>
                <div className="services-grid">
                    <div className="service-card">
                        <h4 className="service-title">
                            <span className="service-icon">💻</span>
                            Web Development
                        </h4>
                        <p className="service-description">
                            Full-stack development projects, technical consultations, 
                            and code reviews for your web applications.
                        </p>
                    </div>

                    <div className="service-card">
                        <h4 className="service-title">
                            <span className="service-icon">📝</span>
                            Technical Questions
                        </h4>
                        <p className="service-description">
                            Questions about my blog posts, programming concepts, or 
                            specific technical challenges you're facing.
                        </p>
                    </div>

                    <div className="service-card">
                        <h4 className="service-title">
                            <span className="service-icon">🤝</span>
                            Collaborations
                        </h4>
                        <p className="service-description">
                            Speaking engagements, guest posting opportunities, 
                            or collaborative projects in the tech space.
                        </p>
                    </div>

                    <div className="service-card">
                        <h4 className="service-title">
                            <span className="service-icon">💡</span>
                            Feedback & Ideas
                        </h4>
                        <p className="service-description">
                            Feedback about my content, suggestions for new topics, 
                            or ideas for improving the blog.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContactPage;