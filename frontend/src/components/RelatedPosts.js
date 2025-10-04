import React, { useEffect, useState } from 'react';

const RelatedPosts = ({ post }) => {
  const [relatedPosts, setRelatedPosts] = useState([]);

  useEffect(() => {
    const fetchRelatedPosts = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/posts/related/${post._id}`);
        const data = await response.json();
        setRelatedPosts(data.relatedPosts);
      } catch (error) {
        console.error('Error fetching related posts:', error);
      }
    };

    fetchRelatedPosts();
  }, [post._id]);

  if (relatedPosts.length === 0) return null;

  return (
    <section className="related-posts">
      <h3>You might also like</h3>
      <div className="related-grid">
        {relatedPosts.map(relatedPost => (
          <article key={relatedPost._id} className="related-card">
            <img 
              src={relatedPost.featuredImage} 
              alt={relatedPost.title}
              loading="lazy"
            />
            <div className="related-content">
              <h4>
                <a href={`/blog/${relatedPost.slug}`}>{relatedPost.title}</a>
              </h4>
              <p>{relatedPost.excerpt}</p>
              <span>{relatedPost.readTime} min read</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default RelatedPosts;