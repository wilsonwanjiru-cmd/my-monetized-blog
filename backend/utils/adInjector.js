// utils/adInjector.js
class AdInjector {
  constructor() {
    this.siteUrl = process.env.SITE_URL || 'https://wilsonmuita.com';
    this.siteName = process.env.SITE_NAME || 'Wilson Muita';
    
    this.adTemplates = {
      // Google AdSense
      adsense: `
        <div class="ad-container ad-adsense" data-type="adsense" data-ad-format="auto">
          <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>
          <ins class="adsbygoogle"
               style="display:block; text-align:center;"
               data-ad-client="${process.env.ADSENSE_CLIENT_ID || 'YOUR-AD-CLIENT-ID'}"
               data-ad-slot="${process.env.ADSENSE_SLOT_ID || 'YOUR-AD-SLOT'}"
               data-ad-format="auto"
               data-full-width-responsive="true"></ins>
          <script>
               (adsbygoogle = window.adsbygoogle || []).push({});
          </script>
          <div class="ad-label">Advertisement</div>
        </div>
      `,

      // Banner Ad
      banner: (size = '728x90') => `
        <div class="ad-container ad-banner" data-type="banner" data-size="${size}">
          <div class="ad-placeholder" style="width: ${size.split('x')[0]}px; height: ${size.split('x')[1]}px; background: #f5f5f5; border: 1px dashed #ddd; display: flex; align-items: center; justify-content: center; color: #666; font-family: Arial, sans-serif;">
            <div style="text-align: center;">
              <div style="font-size: 14px; margin-bottom: 5px;">Advertisement</div>
              <div style="font-size: 12px;">${size} Banner Ad</div>
              <div style="font-size: 10px; margin-top: 5px;">${this.siteName}</div>
            </div>
          </div>
          <div class="ad-label">Sponsored Content</div>
        </div>
      `,

      // In-Article Ad
      inarticle: `
        <div class="ad-container ad-in-article" data-type="in-article">
          <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>
          <ins class="adsbygoogle"
               style="display:block; text-align:center;"
               data-ad-format="fluid"
               data-ad-layout="in-article"
               data-ad-client="${process.env.ADSENSE_CLIENT_ID || 'YOUR-AD-CLIENT-ID'}"
               data-ad-slot="${process.env.ADSENSE_IN_ARTICLE_SLOT || 'YOUR-IN-ARTICLE-SLOT'}"></ins>
          <script>
               (adsbygoogle = window.adsbygoogle || []).push({});
          </script>
          <div class="ad-label">Advertisement</div>
        </div>
      `,

      // Affiliate Banner
      affiliate: (link, product, image = null) => {
        const affiliateLink = this.addUTMParams(link, 'affiliate', product);
        return `
        <div class="ad-container ad-affiliate" data-type="affiliate" data-product="${product}">
          <div class="affiliate-banner" style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; margin: 20px 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
            ${image ? `<img src="${image}" alt="${product}" style="max-width: 100px; float: left; margin-right: 15px; border-radius: 4px;">` : ''}
            <div style="overflow: hidden;">
              <strong style="display: block; margin-bottom: 8px; font-size: 16px;">🚀 Recommended Product</strong>
              <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.4;">${product}</p>
              <a href="${affiliateLink}" 
                 rel="sponsored noopener noreferrer" 
                 target="_blank"
                 style="display: inline-block; background: white; color: #667eea; padding: 8px 16px; border-radius: 4px; text-decoration: none; font-weight: bold; font-size: 14px;">
                Check Price →
              </a>
            </div>
            <div style="clear: both;"></div>
          </div>
          <div class="ad-label">Affiliate Disclosure</div>
        </div>
      `;
      },

      // Native Ad
      native: (title, description, link, image = null) => {
        const nativeLink = this.addUTMParams(link, 'native', title);
        return `
        <div class="ad-container ad-native" data-type="native">
          <div class="native-ad" style="border: 1px solid #e0e0e0; border-radius: 12px; padding: 20px; margin: 20px 0; background: #f8f9fa;">
            <div style="display: flex; align-items: center; gap: 15px;">
              ${image ? `
              <div style="flex-shrink: 0;">
                <img src="${image}" alt="${title}" style="width: 80px; height: 80px; border-radius: 8px; object-fit: cover;">
              </div>
              ` : ''}
              <div style="flex: 1;">
                <div style="font-size: 12px; color: #666; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Sponsored</div>
                <h4 style="margin: 0 0 8px 0; font-size: 18px; color: #333;">${title}</h4>
                <p style="margin: 0 0 12px 0; font-size: 14px; color: #666; line-height: 1.4;">${description}</p>
                <a href="${nativeLink}" 
                   rel="sponsored noopener noreferrer" 
                   target="_blank"
                   style="display: inline-block; background: #007bff; color: white; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500;">
                  Learn More
                </a>
              </div>
            </div>
          </div>
        </div>
      `;
      }
    };

    // Default ad positions and frequencies
    this.defaultConfig = {
      adFrequency: 4, // Inject ad after every 4 paragraphs
      maxAdsPerPost: 3,
      adTypes: ['adsense', 'affiliate', 'native'],
      enableAboveFold: true,
      enableMidContent: true,
      enableBelowFold: true
    };
  }

  /**
   * Inject ads into content based on configuration
   */
  injectAds(content, options = {}) {
    const config = { ...this.defaultConfig, ...options };
    const paragraphs = this.extractParagraphs(content);
    
    if (paragraphs.length <= 3) {
      return { content, adCount: 0, adPositions: [] };
    }

    let injectedContent = '';
    let adCount = 0;
    const adPositions = [];

    paragraphs.forEach((paragraph, index) => {
      injectedContent += paragraph;
      
      // Determine if we should inject an ad at this position
      if (this.shouldInjectAd(index, paragraphs.length, adCount, config)) {
        const adType = this.selectAdType(adCount, config.adTypes);
        const adHtml = this.generateAd(adType, index);
        
        if (adHtml) {
          injectedContent += adHtml;
          adCount++;
          adPositions.push({ position: index, type: adType });
        }
      }
    });

    return {
      content: injectedContent,
      adCount,
      adPositions,
      config
    };
  }

  /**
   * Extract paragraphs from HTML content
   */
  extractParagraphs(content) {
    // Split by closing paragraph tags and filter out empty paragraphs
    return content.split('</p>')
      .filter(p => p.trim().length > 0)
      .map(p => p + '</p>');
  }

  /**
   * Determine if an ad should be injected at the current position
   */
  shouldInjectAd(currentIndex, totalParagraphs, currentAdCount, config) {
    // Don't exceed maximum ads
    if (currentAdCount >= config.maxAdsPerPost) return false;

    // Don't inject in first paragraph
    if (currentIndex === 0) return false;

    // Don't inject in last paragraph
    if (currentIndex === totalParagraphs - 1) return false;

    // Inject based on frequency
    return (currentIndex + 1) % config.adFrequency === 0;
  }

  /**
   * Select appropriate ad type based on position and count
   */
  selectAdType(adCount, availableTypes) {
    const types = availableTypes || this.defaultConfig.adTypes;
    
    // Rotate through available ad types
    return types[adCount % types.length];
  }

  /**
   * Generate ad HTML based on type and position
   */
  generateAd(adType, position) {
    switch (adType) {
      case 'adsense':
        return this.adTemplates.adsense;
      
      case 'banner':
        return this.adTemplates.banner('728x90');
      
      case 'inarticle':
        return this.adTemplates.inarticle;
      
      case 'affiliate':
        // Example affiliate product - in real implementation, this would come from a database or config
        const affiliateProducts = [
          {
            link: 'https://example.com/product1',
            product: 'Premium Web Hosting - Get 50% Off Today',
            image: 'https://via.placeholder.com/100x100/667eea/white?text=Hosting'
          },
          {
            link: 'https://example.com/product2', 
            product: 'Best JavaScript Course for Beginners',
            image: 'https://via.placeholder.com/100x100/764ba2/white?text=Course'
          }
        ];
        const product = affiliateProducts[position % affiliateProducts.length];
        return this.adTemplates.affiliate(product.link, product.product, product.image);
      
      case 'native':
        // Example native ad - in real implementation, this would come from a database or config
        const nativeAds = [
          {
            title: 'Boost Your Web Development Skills',
            description: 'Join 10,000+ developers learning advanced web techniques.',
            link: 'https://example.com/learning',
            image: 'https://via.placeholder.com/80x80/007bff/white?text=Learn'
          },
          {
            title: 'Developer Tools Bundle',
            description: 'Essential tools every developer needs in their toolkit.',
            link: 'https://example.com/tools',
            image: 'https://via.placeholder.com/80x80/28a745/white?text=Tools'
          }
        ];
        const ad = nativeAds[position % nativeAds.length];
        return this.adTemplates.native(ad.title, ad.description, ad.link, ad.image);
      
      default:
        return this.adTemplates.adsense;
    }
  }

  /**
   * Add UTM parameters to URLs for tracking
   */
  addUTMParams(url, source, content = '') {
    try {
      const utmParams = new URLSearchParams({
        utm_source: this.siteUrl.replace('https://', ''),
        utm_medium: 'content',
        utm_campaign: source,
        utm_content: content.substring(0, 50).replace(/[^a-zA-Z0-9]/g, '_'),
        utm_term: new Date().toISOString().split('T')[0]
      });

      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}${utmParams.toString()}`;
    } catch (error) {
      console.error('Error adding UTM parameters:', error);
      return url;
    }
  }

  /**
   * Generate ad CSS styles for the page
   */
  getAdStyles() {
    return `
      <style>
        .ad-container {
          margin: 30px 0;
          text-align: center;
          position: relative;
        }
        
        .ad-label {
          font-size: 11px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 8px;
          text-align: center;
        }
        
        .affiliate-banner {
          transition: transform 0.2s ease;
        }
        
        .affiliate-banner:hover {
          transform: translateY(-2px);
        }
        
        .ad-native {
          transition: box-shadow 0.3s ease;
        }
        
        .ad-native:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        /* Responsive ads */
        @media (max-width: 768px) {
          .ad-banner .ad-placeholder {
            width: 300px !important;
            height: 250px !important;
          }
        }
        
        @media (max-width: 480px) {
          .ad-banner .ad-placeholder {
            width: 300px !important;
            height: 100px !important;
          }
        }
      </style>
    `;
  }

  /**
   * Validate ad configuration
   */
  validateConfig(config) {
    const errors = [];
    
    if (config.adFrequency < 2) {
      errors.push('Ad frequency should be at least 2 paragraphs between ads');
    }
    
    if (config.maxAdsPerPost > 10) {
      errors.push('Maximum ads per post should not exceed 10');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get analytics data for ads
   */
  getAdAnalytics(adPositions) {
    return {
      totalAds: adPositions.length,
      adTypes: adPositions.reduce((acc, pos) => {
        acc[pos.type] = (acc[pos.type] || 0) + 1;
        return acc;
      }, {}),
      averagePosition: adPositions.reduce((acc, pos) => acc + pos.position, 0) / adPositions.length
    };
  }
}

module.exports = AdInjector;