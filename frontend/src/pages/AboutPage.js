// frontend/src/pages/AboutPage.js
import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import './AboutPage.css'; // Import the CSS file

const AboutPage = () => {
    return (
        <Layout>
            <div className="about-container">
                {/* Header Section */}
                <header className="about-header">
                    <h1 className="about-title">
                        About Me
                    </h1>
                    <div className="about-divider"></div>
                </header>

                {/* Main Content */}
                <div className="about-content">
                    {/* Introduction Section */}
                    <section className="about-section">
                        <div className="section-header">
                            <div className="section-icon">👋</div>
                            <h2 className="section-title">
                                Hello, I'm Wilson Muita
                            </h2>
                        </div>
                        <p className="section-text">
                            Welcome to my personal blog! I'm a passionate developer and technology enthusiast 
                            based in Kenya. This space is where I share my journey, insights, and experiences 
                            in web development, programming, and the ever-evolving world of technology.
                        </p>
                    </section>

                    {/* Mission Section */}
                    <section className="about-section">
                        <div className="section-header">
                            <div className="section-icon">🎯</div>
                            <h2 className="section-title">
                                My Mission
                            </h2>
                        </div>
                        <p className="section-text">
                            My goal is to create valuable content that helps aspiring developers and tech 
                            enthusiasts navigate the complex world of programming. I believe in learning 
                            by doing and sharing knowledge that can empower others in their coding journey.
                        </p>
                    </section>

                    {/* Content Section */}
                    <section className="about-section">
                        <div className="section-header">
                            <div className="section-icon">📚</div>
                            <h2 className="section-title">
                                What You'll Find Here
                            </h2>
                        </div>
                        <div className="about-list">
                            <div className="list-item">
                                <span className="list-item-icon">✓</span>
                                <span className="list-item-text">Web development tutorials and guides</span>
                            </div>
                            <div className="list-item">
                                <span className="list-item-icon">✓</span>
                                <span className="list-item-text">Project walkthroughs and code explanations</span>
                            </div>
                            <div className="list-item">
                                <span className="list-item-icon">✓</span>
                                <span className="list-item-text">Technology trends and insights</span>
                            </div>
                            <div className="list-item">
                                <span className="list-item-icon">✓</span>
                                <span className="list-item-text">Personal experiences in software development</span>
                            </div>
                            <div className="list-item">
                                <span className="list-item-icon">✓</span>
                                <span className="list-item-text">Tips for aspiring developers</span>
                            </div>
                        </div>
                    </section>

                    {/* Tech Stack Section */}
                    <section className="about-section">
                        <div className="section-header">
                            <div className="section-icon">💻</div>
                            <h2 className="section-title">
                                My Tech Stack
                            </h2>
                        </div>
                        <div className="tech-stack-container">
                            <p className="tech-stack-text">
                                I specialize in modern web technologies including React, Node.js, Express, 
                                MongoDB, and various frontend frameworks. I'm constantly learning and 
                                expanding my skill set to stay current with industry trends.
                            </p>
                            <div className="tech-stack-grid">
                                {['React', 'Node.js', 'Express', 'MongoDB', 'JavaScript', 'TypeScript', 'Python', 'Tailwind CSS'].map((tech) => (
                                    <span 
                                        key={tech}
                                        className="tech-item"
                                    >
                                        {tech}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Contact Section */}
                    <section className="contact-section">
                        <div className="contact-header">
                            <div className="contact-icon">🤝</div>
                            <h2 className="contact-title">
                                Let's Connect
                            </h2>
                        </div>
                        <p className="contact-text">
                            I love connecting with fellow developers and readers. Feel free to reach out 
                            through the contact page if you have questions, suggestions, or just want to say hello!
                        </p>
                        <div className="contact-buttons">
                            <Link 
                                to="/contact" 
                                className="contact-button primary"
                            >
                                Get In Touch
                            </Link>
                            <Link 
                                to="/blog" 
                                className="contact-button secondary"
                            >
                                Read My Blog
                            </Link>
                        </div>
                    </section>
                </div>

                {/* Quick Stats Section */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon">🚀</div>
                        <h3 className="stat-title">Always Learning</h3>
                        <p className="stat-description">Continuously exploring new technologies and best practices</p>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">💡</div>
                        <h3 className="stat-title">Problem Solver</h3>
                        <p className="stat-description">Passionate about finding elegant solutions to complex challenges</p>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">🌍</div>
                        <h3 className="stat-title">Community Focused</h3>
                        <p className="stat-description">Committed to sharing knowledge and helping others grow</p>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default AboutPage;