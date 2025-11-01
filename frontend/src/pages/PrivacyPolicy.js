import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';

const PrivacyPolicy = () => {
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('https://api.wilsonmuita.com/api/privacy-policy');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Validate that data has the expected structure
        if (data && data.content) {
          setPolicy(data);
        } else {
          throw new Error('Invalid response format from server');
        }
        
      } catch (error) {
        console.error('Error fetching privacy policy:', error);
        setError(error.message);
        
        // Fallback: Create a basic policy object if API fails - UPDATED EMAIL
        const fallbackPolicy = {
          title: "Privacy Policy - Wilson Muita",
          content: `
            <h1>Privacy Policy</h1>
            <p class="last-updated">Last updated: ${new Date().toISOString().split('T')[0]}</p>
            
            <h2>Privacy Commitment</h2>
            <p>We are committed to protecting your privacy and ensuring transparency about how we handle your data.</p>
            
            <h2>Data Collection</h2>
            <p>We collect minimal data necessary to provide and improve our services, including:</p>
            <ul>
              <li>Email addresses for newsletter subscriptions</li>
              <li>Usage analytics to improve content</li>
              <li>Cookies for personalized advertising via Google AdSense</li>
            </ul>
            
            <h2>Contact</h2>
            <p>For privacy concerns, contact us at: <strong>wilsonmuita41@gmail.com</strong></p>
          `
        };
        setPolicy(fallbackPolicy);
      } finally {
        setLoading(false);
      }
    };

    fetchPolicy();
  }, []);

  if (loading) {
    return (
      <Layout title="Privacy Policy - Loading..." description="Loading privacy policy...">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error && !policy) {
    return (
      <Layout title="Privacy Policy - Error" description="Error loading privacy policy">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-800 mb-2">Error Loading Privacy Policy</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <p className="text-gray-600">
              Please try refreshing the page or contact support if the issue persists.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout 
      title={policy?.title || "Privacy Policy - Wilson Muita"} 
      description="Learn how Wilson Muita's blog collects, uses, and protects your data in compliance with GDPR and AdSense policies."
    >
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <article 
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: policy?.content || '<p>Privacy policy content not available.</p>' }}
        />
        
        {/* Additional information - UPDATED EMAIL */}
        <div className="mt-8 p-6 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">Need More Information?</h3>
          <p className="text-blue-700">
            If you have questions about our privacy practices or want to exercise your data rights, 
            please contact us at <strong>wilsonmuita41@gmail.com</strong>
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default PrivacyPolicy;