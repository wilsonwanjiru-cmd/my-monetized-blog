class AdInjector {
  constructor() {
    this.adTemplates = {
      adsense: `
        <div class="ad-container" data-type="adsense">
          <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>
          <ins class="adsbygoogle"
               style="display:block"
               data-ad-client="YOUR-AD-CLIENT-ID"
               data-ad-slot="YOUR-AD-SLOT"
               data-ad-format="auto"></ins>
          <script>
               (adsbygoogle = window.adsbygoogle || []).push({});
          </script>
        </div>
      `,
      affiliate: (link, product) => `
        <div class="affiliate-banner" data-product="${product}">
          <a href="${this.addUTMParams(link, 'affiliate')}" 
             rel="sponsored noopener" 
             class="affiliate-link">
            <strong>Recommended:</strong> ${product}
          </a>
        </div>
      `
    };
  }

  injectAds(content, options = {}) {
    const { adFrequency = 3, adType = 'adsense' } = options;
    const paragraphs = content.split('</p>');
    let injectedContent = '';
    let adCount = 0;

    paragraphs.forEach((paragraph, index) => {
      injectedContent += paragraph + '</p>';
      
      // Inject ad after every N paragraphs
      if ((index + 1) % adFrequency === 0 && index !== paragraphs.length - 1) {
        injectedContent += this.adTemplates[adType];
        adCount++;
      }
    });

    return {
      content: injectedContent,
      adCount
    };
  }

  addUTMParams(url, source) {
    const utmParams = new URLSearchParams({
      utm_source: 'yourblog',
      utm_medium: 'affiliate',
      utm_campaign: source,
      utm_content: new Date().toISOString().split('T')[0]
    });

    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}${utmParams.toString()}`;
  }
}

module.exports = AdInjector;