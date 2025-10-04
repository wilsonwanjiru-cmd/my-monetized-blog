// frontend/src/pages/AboutPage.js
import React from 'react';

const AboutPage = () => {
    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
            <h1>About Me</h1>
            
            <section style={{ marginBottom: '2rem' }}>
                <h2>Hello, I'm Wilson Muita</h2>
                <p>
                    Welcome to my personal blog! I'm a passionate developer and technology enthusiast 
                    based in Kenya. This space is where I share my journey, insights, and experiences 
                    in web development, programming, and the ever-evolving world of technology.
                </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2>My Mission</h2>
                <p>
                    My goal is to create valuable content that helps aspiring developers and tech 
                    enthusiasts navigate the complex world of programming. I believe in learning 
                    by doing and sharing knowledge that can empower others in their coding journey.
                </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2>What You'll Find Here</h2>
                <ul>
                    <li>Web development tutorials and guides</li>
                    <li>Project walkthroughs and code explanations</li>
                    <li>Technology trends and insights</li>
                    <li>Personal experiences in software development</li>
                    <li>Tips for aspiring developers</li>
                </ul>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2>My Tech Stack</h2>
                <p>
                    I specialize in modern web technologies including React, Node.js, Express, 
                    MongoDB, and various frontend frameworks. I'm constantly learning and 
                    expanding my skill set to stay current with industry trends.
                </p>
            </section>

            <section>
                <h2>Let's Connect</h2>
                <p>
                    I love connecting with fellow developers and readers. Feel free to reach out 
                    through the <a href="/contact">contact page</a> if you have questions, 
                    suggestions, or just want to say hello!
                </p>
            </section>
        </div>
    );
};

export default AboutPage;