// frontend/src/pages/AboutPage.js
import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import './AboutPage.css'; // Import the CSS file

const AboutPage = () => {
    return (
        <Layout>
            <div className="about-container">
                {/* Hero Section with Professional Photo */}
                <header className="about-hero">
                    <div className="hero-content">
                        <div className="profile-image-container">
                            <img 
                                src="/default-og-image.jpg" 
                                alt="Wilson Muita - Software Engineer & Content Writer"
                                className="profile-image"
                            />
                            <div className="profile-badge">15+ Years Experience</div>
                        </div>
                        <div className="hero-text">
                            <h1 className="about-title">
                                Wilson Muita
                            </h1>
                            <p className="about-subtitle">
                                Senior Software Engineer & Technical Content Writer
                            </p>
                            <p className="hero-description">
                                With over 15 years of experience in software development and technical writing, 
                                I bridge the gap between complex technology and clear, actionable insights for developers worldwide.
                            </p>
                            <div className="hero-stats">
                                <div className="stat">
                                    <span className="stat-number">15+</span>
                                    <span className="stat-label">Years Experience</span>
                                </div>
                                <div className="stat">
                                    <span className="stat-number">100+</span>
                                    <span className="stat-label">Projects Delivered</span>
                                </div>
                                <div className="stat">
                                    <span className="stat-number">50K+</span>
                                    <span className="stat-label">Readers Reached</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <div className="about-content">
                    {/* Professional Journey Section */}
                    <section className="about-section">
                        <div className="section-header">
                            <div className="section-icon">🚀</div>
                            <h2 className="section-title">
                                My Professional Journey
                            </h2>
                        </div>
                        <div className="journey-content">
                            <p className="section-text">
                                For the past 15 years, I've been immersed in the world of software engineering, 
                                working with startups and enterprises to build scalable, maintainable applications. 
                                My journey has taken me from writing my first lines of code to architecting complex 
                                systems and mentoring the next generation of developers.
                            </p>
                            <div className="journey-highlights">
                                <div className="highlight-item">
                                    <span className="highlight-icon">💼</span>
                                    <div className="highlight-content">
                                        <h4>Software Engineering</h4>
                                        <p>Full-stack development, system architecture, and technical leadership</p>
                                    </div>
                                </div>
                                <div className="highlight-item">
                                    <span className="highlight-icon">✍️</span>
                                    <div className="highlight-content">
                                        <h4>Technical Writing</h4>
                                        <p>Creating comprehensive tutorials, documentation, and technical guides</p>
                                    </div>
                                </div>
                                <div className="highlight-item">
                                    <span className="highlight-icon">🎯</span>
                                    <div className="highlight-content">
                                        <h4>Mentorship</h4>
                                        <p>Guiding aspiring developers through code reviews and career advice</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Expertise Section */}
                    <section className="about-section">
                        <div className="section-header">
                            <div className="section-icon">🎯</div>
                            <h2 className="section-title">
                                Areas of Expertise
                            </h2>
                        </div>
                        <div className="expertise-grid">
                            <div className="expertise-category">
                                <h3 className="expertise-title">Software Development</h3>
                                <ul className="expertise-list">
                                    <li>Full-Stack Web Development</li>
                                    <li>System Architecture & Design</li>
                                    <li>API Development & Integration</li>
                                    <li>Database Design & Optimization</li>
                                    <li>DevOps & Cloud Infrastructure</li>
                                </ul>
                            </div>
                            <div className="expertise-category">
                                <h3 className="expertise-title">Technical Writing</h3>
                                <ul className="expertise-list">
                                    <li>Programming Tutorials & Guides</li>
                                    <li>Technical Documentation</li>
                                    <li>Code Review & Best Practices</li>
                                    <li>Developer Tooling & Workflows</li>
                                    <li>Technology Trends & Analysis</li>
                                </ul>
                            </div>
                            <div className="expertise-category">
                                <h3 className="expertise-title">Technologies</h3>
                                <ul className="expertise-list">
                                    <li>JavaScript/TypeScript Ecosystem</li>
                                    <li>React & Node.js Frameworks</li>
                                    <li>Python & Django</li>
                                    <li>MongoDB & PostgreSQL</li>
                                    <li>AWS & Docker</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* Mission Section */}
                    <section className="about-section">
                        <div className="section-header">
                            <div className="section-icon">🌟</div>
                            <h2 className="section-title">
                                My Mission & Philosophy
                            </h2>
                        </div>
                        <div className="mission-content">
                            <p className="section-text">
                                I believe that great software is built through a combination of technical excellence 
                                and clear communication. My mission is to demystify complex technical concepts and 
                                provide practical, real-world solutions that developers can immediately apply to their projects.
                            </p>
                            <div className="philosophy-points">
                                <div className="philosophy-point">
                                    <h4>Clarity Over Complexity</h4>
                                    <p>Breaking down complex topics into understandable, actionable content</p>
                                </div>
                                <div className="philosophy-point">
                                    <h4>Practical Solutions</h4>
                                    <p>Focusing on real-world applications and problem-solving approaches</p>
                                </div>
                                <div className="philosophy-point">
                                    <h4>Community First</h4>
                                    <p>Building a supportive community where developers can learn and grow together</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Content Section */}
                    <section className="about-section">
                        <div className="section-header">
                            <div className="section-icon">📚</div>
                            <h2 className="section-title">
                                What You'll Find Here
                            </h2>
                        </div>
                        <div className="content-grid">
                            <div className="content-card">
                                <div className="content-icon">🔧</div>
                                <h4>In-Depth Tutorials</h4>
                                <p>Step-by-step guides on modern web development technologies and best practices</p>
                            </div>
                            <div className="content-card">
                                <div className="content-icon">🚀</div>
                                <h4>Project Walkthroughs</h4>
                                <p>Real project implementations with complete code explanations and architecture decisions</p>
                            </div>
                            <div className="content-card">
                                <div className="content-icon">💡</div>
                                <h4>Technical Insights</h4>
                                <p>Deep dives into programming concepts, patterns, and industry trends</p>
                            </div>
                            <div className="content-card">
                                <div className="content-icon">🛠️</div>
                                <h4>Tooling & Workflows</h4>
                                <p>Optimizing development workflows with the right tools and methodologies</p>
                            </div>
                        </div>
                    </section>

                    {/* Tech Stack Section */}
                    <section className="about-section">
                        <div className="section-header">
                            <div className="section-icon">💻</div>
                            <h2 className="section-title">
                                My Technology Stack
                            </h2>
                        </div>
                        <div className="tech-stack-container">
                            <p className="tech-stack-text">
                                After 15 years in the industry, I've worked with numerous technologies. Here are the ones 
                                I'm most passionate about and currently use in my projects:
                            </p>
                            <div className="tech-stack-grid">
                                {[
                                    'React', 'Node.js', 'Express', 'MongoDB', 'JavaScript', 
                                    'TypeScript', 'Python', 'Django', 'PostgreSQL', 'AWS',
                                    'Docker', 'Git', 'REST APIs', 'GraphQL', 'Tailwind CSS',
                                    'Next.js', 'Vue.js', 'Redis', 'Linux', 'Nginx'
                                ].map((tech) => (
                                    <span key={tech} className="tech-item">
                                        {tech}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Professional Services Section */}
                    <section className="services-section">
                        <div className="section-header">
                            <div className="section-icon">💼</div>
                            <h2 className="section-title">
                                Professional Services
                            </h2>
                        </div>
                        <div className="services-grid">
                            <div className="service-card">
                                <h4 className="service-title">Technical Consulting</h4>
                                <p className="service-description">
                                    Architecture reviews, technology selection, and development strategy for your projects.
                                </p>
                            </div>
                            <div className="service-card">
                                <h4 className="service-title">Code Review</h4>
                                <p className="service-description">
                                    Comprehensive code analysis and best practices recommendations for your codebase.
                                </p>
                            </div>
                            <div className="service-card">
                                <h4 className="service-title">Technical Writing</h4>
                                <p className="service-description">
                                    High-quality technical content, documentation, and tutorial creation for your products.
                                </p>
                            </div>
                            <div className="service-card">
                                <h4 className="service-title">Mentorship</h4>
                                <p className="service-description">
                                    One-on-one coaching and career guidance for aspiring and junior developers.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Contact Section */}
                    <section className="contact-section">
                        <div className="contact-header">
                            <div className="contact-icon">🤝</div>
                            <h2 className="contact-title">
                                Let's Work Together
                            </h2>
                        </div>
                        <p className="contact-text">
                            Whether you're looking for technical guidance, want to collaborate on a project, 
                            or just have questions about software development, I'd love to hear from you. 
                            Let's create something amazing together!
                        </p>
                        <div className="contact-buttons">
                            <Link to="/contact" className="contact-button primary">
                                Get In Touch
                            </Link>
                            <Link to="/blog" className="contact-button secondary">
                                Read My Blog
                            </Link>
                            <a href="mailto:wilsonmuita41@gmail.com" className="contact-button outline">
                                Email Me
                            </a>
                        </div>
                    </section>
                </div>

                {/* Trust & Credibility Section */}
                <div className="trust-section">
                    <h3 className="trust-title">Why Trust My Content?</h3>
                    <div className="trust-grid">
                        <div className="trust-card">
                            <div className="trust-icon">🎓</div>
                            <h4>15 Years Experience</h4>
                            <p>Proven track record in software engineering and technical leadership</p>
                        </div>
                        <div className="trust-card">
                            <div className="trust-icon">🔍</div>
                            <h4>Real-World Focus</h4>
                            <p>Content based on practical experience and actual project implementations</p>
                        </div>
                        <div className="trust-card">
                            <div className="trust-icon">💯</div>
                            <h4>Quality First</h4>
                            <p>Thoroughly researched and tested content with complete code examples</p>
                        </div>
                        <div className="trust-card">
                            <div className="trust-icon">🔄</div>
                            <h4>Always Updated</h4>
                            <p>Regular content updates to reflect current best practices and technologies</p>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default AboutPage;