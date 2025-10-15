// frontend/src/pages/ContactPage.js
import React, { useState, useEffect } from 'react';
import { blogAPI } from '../utils/api'; // Import the centralized API
import { trackPageView, trackCustomEvent, trackEmailClick } from '../utils/utmTracker'; // Import UTM tracking

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

    // Initialize tracking
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
            // ✅ UPDATED: Use centralized blogAPI with better error handling
            const response = await blogAPI.contact.submit(formData);

            if (response.success) {
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
                        responseId: response.contactId
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
                throw new Error(response.error || 'Failed to send message');
            }
        } catch (error) {
            console.error('Error submitting contact form:', error);
            setSubmitStatus('error');
            setStatusMessage(error.message || 'Something went wrong. Please try again later.');
            
            // Track form error
            trackCustomEvent('contact_form_error', {
                medium: 'content',
                campaign: 'contact',
                content: 'form_error',
                metadata: {
                    error: error.message,
                    formData: {
                        name: formData.name,
                        email: formData.email,
                        subject: formData.subject,
                        category: formData.category
                    },
                    timestamp: new Date().toISOString()
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
        <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '2rem',
            minHeight: '100vh'
        }}>
            {/* Header Section */}
            <div style={{
                textAlign: 'center',
                marginBottom: '3rem',
                padding: '2rem 0'
            }}>
                <h1 style={{
                    fontSize: '3rem',
                    fontWeight: '800',
                    marginBottom: '1rem',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                }}>
                    Get In Touch
                </h1>
                <p style={{
                    fontSize: '1.2rem',
                    color: '#718096',
                    maxWidth: '600px',
                    margin: '0 auto',
                    lineHeight: '1.6'
                }}>
                    Have a question, want to collaborate, or just want to say hello? 
                    I'd love to hear from you. Let's start a conversation.
                </p>
            </div>

            {/* Main Content Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '3rem',
                marginBottom: '4rem',
                alignItems: 'start'
            }}>
                {/* Contact Information */}
                <div style={{
                    background: '#f7fafc',
                    padding: '2.5rem',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0'
                }}>
                    <h2 style={{
                        fontSize: '1.75rem',
                        marginBottom: '1.5rem',
                        color: '#2d3748',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        <span>📞</span>
                        Contact Information
                    </h2>
                    
                    <p style={{
                        color: '#718096',
                        marginBottom: '2rem',
                        lineHeight: '1.6'
                    }}>
                        I'm always open to discussing new projects, creative ideas, or 
                        opportunities to be part of your vision.
                    </p>

                    <div style={{ marginBottom: '2rem' }}>
                        <h3 style={{
                            fontSize: '1.1rem',
                            marginBottom: '0.5rem',
                            color: '#4a5568',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <span>📧</span>
                            Email
                        </h3>
                        <p style={{ margin: 0 }}>
                            <a 
                                href="mailto:wilsonmuita41@gmail.com"
                                onClick={handleEmailClick}
                                style={{
                                    color: '#667eea',
                                    textDecoration: 'none',
                                    fontWeight: '500',
                                    transition: 'color 0.2s ease'
                                }}
                                onMouseEnter={(e) => e.target.style.color = '#5a67d8'}
                                onMouseLeave={(e) => e.target.style.color = '#667eea'}
                            >
                                wilsonmuita41@gmail.com
                            </a>
                        </p>
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                        <h3 style={{
                            fontSize: '1.1rem',
                            marginBottom: '0.5rem',
                            color: '#4a5568',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <span>📱</span>
                            Phone
                        </h3>
                        <p style={{ margin: 0 }}>
                            <a 
                                href="tel:+254703538670"
                                onClick={handlePhoneClick}
                                style={{
                                    color: '#667eea',
                                    textDecoration: 'none',
                                    fontWeight: '500',
                                    transition: 'color 0.2s ease'
                                }}
                                onMouseEnter={(e) => e.target.style.color = '#5a67d8'}
                                onMouseLeave={(e) => e.target.style.color = '#667eea'}
                            >
                                +254 703 538 670
                            </a>
                        </p>
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                        <h3 style={{
                            fontSize: '1.1rem',
                            marginBottom: '0.5rem',
                            color: '#4a5568',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <span>⏰</span>
                            Response Time
                        </h3>
                        <p style={{ 
                            margin: 0,
                            color: '#718096'
                        }}>
                            I typically respond to emails within 24-48 hours. 
                            For urgent matters, phone is preferred.
                        </p>
                    </div>

                    <div>
                        <h3 style={{
                            fontSize: '1.1rem',
                            marginBottom: '0.5rem',
                            color: '#4a5568',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <span>💬</span>
                            Preferred Communication
                        </h3>
                        <p style={{ 
                            margin: 0,
                            color: '#718096'
                        }}>
                            Email is the best way to reach me for detailed discussions 
                            or project inquiries. I'm also available on LinkedIn for 
                            professional networking.
                        </p>
                    </div>
                </div>

                {/* Contact Form */}
                <div style={{
                    background: 'white',
                    padding: '2.5rem',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
                }}>
                    <h2 style={{
                        fontSize: '1.75rem',
                        marginBottom: '2rem',
                        color: '#2d3748',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        <span>✉️</span>
                        Send Me a Message
                    </h2>

                    {/* Status Message */}
                    {submitStatus && (
                        <div style={{
                            padding: '1rem',
                            borderRadius: '8px',
                            marginBottom: '2rem',
                            backgroundColor: submitStatus === 'success' ? '#c6f6d5' : '#fed7d7',
                            border: `1px solid ${submitStatus === 'success' ? '#9ae6b4' : '#feb2b2'}`,
                            color: submitStatus === 'success' ? '#22543d' : '#742a2a'
                        }}>
                            {statusMessage}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label htmlFor="name" style={{
                                display: 'block',
                                marginBottom: '0.5rem',
                                fontWeight: '600',
                                color: '#4a5568'
                            }}>
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
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '6px',
                                    fontSize: '1rem',
                                    transition: 'border-color 0.2s ease',
                                    outline: 'none',
                                    backgroundColor: loading ? '#f7fafc' : 'white'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                            />
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label htmlFor="email" style={{
                                display: 'block',
                                marginBottom: '0.5rem',
                                fontWeight: '600',
                                color: '#4a5568'
                            }}>
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
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '6px',
                                    fontSize: '1rem',
                                    transition: 'border-color 0.2s ease',
                                    outline: 'none',
                                    backgroundColor: loading ? '#f7fafc' : 'white'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                            />
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label htmlFor="category" style={{
                                display: 'block',
                                marginBottom: '0.5rem',
                                fontWeight: '600',
                                color: '#4a5568'
                            }}>
                                Inquiry Type
                            </label>
                            <select
                                id="category"
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '6px',
                                    fontSize: '1rem',
                                    transition: 'border-color 0.2s ease',
                                    outline: 'none',
                                    backgroundColor: loading ? '#f7fafc' : 'white'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                            >
                                {contactCategories.map(category => (
                                    <option key={category.value} value={category.value}>
                                        {category.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label htmlFor="subject" style={{
                                display: 'block',
                                marginBottom: '0.5rem',
                                fontWeight: '600',
                                color: '#4a5568'
                            }}>
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
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '6px',
                                    fontSize: '1rem',
                                    transition: 'border-color 0.2s ease',
                                    outline: 'none',
                                    backgroundColor: loading ? '#f7fafc' : 'white'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                            />
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '0.5rem'
                            }}>
                                <label htmlFor="message" style={{
                                    fontWeight: '600',
                                    color: '#4a5568'
                                }}>
                                    Message *
                                </label>
                                <span style={{
                                    fontSize: '0.8rem',
                                    color: charCount > 1000 ? '#e53e3e' : '#718096'
                                }}>
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
                                placeholder="Please provide detailed information about your inquiry..."
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '6px',
                                    fontSize: '1rem',
                                    transition: 'border-color 0.2s ease',
                                    outline: 'none',
                                    resize: 'vertical',
                                    minHeight: '120px',
                                    backgroundColor: loading ? '#f7fafc' : 'white',
                                    fontFamily: 'inherit'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                            ></textarea>
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading || charCount === 0}
                            style={{
                                width: '100%',
                                padding: '1rem 2rem',
                                backgroundColor: loading || charCount === 0 ? '#a0aec0' : '#667eea',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '1.1rem',
                                fontWeight: '600',
                                cursor: loading || charCount === 0 ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem'
                            }}
                            onMouseEnter={(e) => {
                                if (!loading && charCount > 0) {
                                    e.target.style.backgroundColor = '#5a67d8';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!loading && charCount > 0) {
                                    e.target.style.backgroundColor = '#667eea';
                                }
                            }}
                        >
                            {loading ? (
                                <>
                                    <div style={{
                                        width: '16px',
                                        height: '16px',
                                        border: '2px solid transparent',
                                        borderTop: '2px solid white',
                                        borderRadius: '50%',
                                        animation: 'spin 1s linear infinite'
                                    }}></div>
                                    Sending Message...
                                </>
                            ) : (
                                'Send Message'
                            )}
                        </button>
                    </form>
                </div>
            </div>

            {/* Additional Information */}
            <div style={{
                background: '#f7fafc',
                padding: '2.5rem',
                borderRadius: '12px',
                border: '1px solid #e2e8f0'
            }}>
                <h3 style={{
                    fontSize: '1.5rem',
                    marginBottom: '1.5rem',
                    color: '#2d3748',
                    textAlign: 'center'
                }}>
                    What I Can Help You With
                </h3>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '1.5rem'
                }}>
                    <div style={{
                        padding: '1.5rem',
                        background: 'white',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0'
                    }}>
                        <h4 style={{
                            color: '#667eea',
                            marginBottom: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <span>💻</span>
                            Web Development
                        </h4>
                        <p style={{ margin: 0, color: '#718096', lineHeight: '1.5' }}>
                            Full-stack development projects, technical consultations, 
                            and code reviews for your web applications.
                        </p>
                    </div>

                    <div style={{
                        padding: '1.5rem',
                        background: 'white',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0'
                    }}>
                        <h4 style={{
                            color: '#667eea',
                            marginBottom: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <span>📝</span>
                            Technical Questions
                        </h4>
                        <p style={{ margin: 0, color: '#718096', lineHeight: '1.5' }}>
                            Questions about my blog posts, programming concepts, or 
                            specific technical challenges you're facing.
                        </p>
                    </div>

                    <div style={{
                        padding: '1.5rem',
                        background: 'white',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0'
                    }}>
                        <h4 style={{
                            color: '#667eea',
                            marginBottom: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <span>🤝</span>
                            Collaborations
                        </h4>
                        <p style={{ margin: 0, color: '#718096', lineHeight: '1.5' }}>
                            Speaking engagements, guest posting opportunities, 
                            or collaborative projects in the tech space.
                        </p>
                    </div>

                    <div style={{
                        padding: '1.5rem',
                        background: 'white',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0'
                    }}>
                        <h4 style={{
                            color: '#667eea',
                            marginBottom: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <span>💡</span>
                            Feedback & Ideas
                        </h4>
                        <p style={{ margin: 0, color: '#718096', lineHeight: '1.5' }}>
                            Feedback about my content, suggestions for new topics, 
                            or ideas for improving the blog.
                        </p>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                @media (max-width: 768px) {
                    .contact-container {
                        padding: 1rem;
                    }
                    
                    .contact-grid {
                        grid-template-columns: 1fr;
                        gap: 2rem;
                    }
                }
            `}</style>
        </div>
    );
};

export default ContactPage;