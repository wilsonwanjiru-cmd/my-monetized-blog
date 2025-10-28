import React from 'react';
import Layout from '../components/Layout';

const Disclaimer = () => {
    return (
        <Layout>
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <header className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">Disclaimer</h1>
                    <div className="w-20 h-1 bg-blue-600"></div>
                </header>

                <div className="prose prose-lg max-w-none">
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Website Disclaimer</h2>
                        <p className="text-gray-700 mb-4">
                            The information provided on Wilson Muita's blog (https://wilsonmuita.com) is for general informational and educational purposes only. All information on the site is provided in good faith, however, I make no representation or warranty of any kind, express or implied, regarding the accuracy, adequacy, validity, reliability, availability, or completeness of any information on the site.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Professional Disclaimer</h2>
                        <p className="text-gray-700 mb-4">
                            The content on this blog is not intended to be a substitute for professional advice. Under no circumstance shall I have any liability to you for any loss or damage of any kind incurred as a result of the use of the site or reliance on any information provided on the site. Your use of the site and your reliance on any information on the site is solely at your own risk.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">External Links Disclaimer</h2>
                        <p className="text-gray-700 mb-4">
                            The site may contain (or you may be sent through the site) links to other websites or content belonging to or originating from third parties. Such external links are not investigated, monitored, or checked for accuracy, adequacy, validity, reliability, availability, or completeness by me.
                        </p>
                        <p className="text-gray-700 mb-4">
                            I do not warrant, endorse, guarantee, or assume responsibility for the accuracy or reliability of any information offered by third-party websites linked through the site or any website or feature linked in any banner or other advertising. I will not be a party to or in any way be responsible for monitoring any transaction between you and third-party providers of products or services.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Affiliate Disclaimer</h2>
                        <p className="text-gray-700 mb-4">
                            This blog may contain links to affiliate websites, and I receive an affiliate commission for any purchases made by you on the affiliate website using such links. I am a participant in various affiliate advertising programs designed to provide a means for me to earn fees by linking to affiliate websites.
                        </p>
                        <p className="text-gray-700 mb-4">
                            I will only recommend products and services that I believe will provide value to my readers. Your purchase through my affiliate links helps support the maintenance and development of this blog.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Testimonials Disclaimer</h2>
                        <p className="text-gray-700 mb-4">
                            The site may contain testimonials by users of my products and/or services. These testimonials reflect the real-life experiences and opinions of such users. However, the experiences are personal to those particular users, and may not necessarily be representative of all users of my products and/or services. I do not claim, and you should not assume, that all users will have the same experiences.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">AdSense & Advertising Disclaimer</h2>
                        <p className="text-gray-700 mb-4">
                            This blog uses Google AdSense and other advertising programs to display advertisements. The presence of these advertisements does not constitute an endorsement, recommendation, or sponsorship of the advertised products, services, or companies by Wilson Muita.
                        </p>
                        <p className="text-gray-700 mb-4">
                            I am not responsible for the content of external advertisements, the actions of advertisers, or the quality of products/services advertised. Users should exercise their own judgment and due diligence before purchasing any advertised products or services.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Contact Information</h2>
                        <p className="text-gray-700">
                            If you have any questions about this Disclaimer, please contact me at: <strong>wilson@wilsonmuita.com</strong>
                        </p>
                    </section>
                </div>
            </div>
        </Layout>
    );
};

export default Disclaimer;