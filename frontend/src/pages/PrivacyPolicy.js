import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';

const PrivacyPolicy = () => {
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        const response = await fetch('https://api.wilsonmuita.com/api/privacy-policy');
        const data = await response.json();
        setPolicy(data);
      } catch (error) {
        console.error('Error fetching privacy policy:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPolicy();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6 mb-2"></div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <article 
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: policy.content }}
        />
      </div>
    </Layout>
  );
};

export default PrivacyPolicy;