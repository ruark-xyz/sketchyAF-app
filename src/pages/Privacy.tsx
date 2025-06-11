import React from 'react';
import { motion } from 'framer-motion';
import Seo from '../components/utils/Seo';

const Privacy: React.FC = () => {
  return (
    <>
      <Seo 
        title="Privacy Policy"
        description="Learn about how SketchyAF collects, uses, and protects your personal information. Our privacy policy explains our data practices and your rights."
      />
      
      <div className="py-16 md:py-24 bg-off-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="font-heading font-bold text-3xl md:text-4xl text-dark mb-6"
          >
            SketchyAF Privacy Policy
          </motion.h1>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white rounded-lg shadow-md p-6 md:p-8"
          >
            <div className="prose max-w-none">
              <p className="text-sm text-medium-gray mb-6">Last Updated: [Insert Date]</p>
              
              <p className="mb-6">
                SketchyAF ("we", "our", or "us") respects your privacy. This policy outlines how we collect, use, protect, and share your information when you use our website, games, applications, and related services ("Services").
              </p>
              
              <section className="mb-8">
                <h2 className="font-heading font-semibold text-2xl mb-4">1. Information We Collect</h2>
                
                <h3 className="font-heading font-semibold text-xl mb-2">Information You Provide</h3>
                <ul className="list-disc pl-8 mb-4 space-y-2">
                  <li><strong>Account Information:</strong> Username, email, password, profile details.</li>
                  <li><strong>User Content:</strong> Any drawings, images, submissions, or communications you upload or share.</li>
                  <li><strong>Payment Information:</strong> Handled securely through third-party providers (e.g., Paddle). We do not store your full payment details.</li>
                </ul>
                
                <h3 className="font-heading font-semibold text-xl mb-2">Automatically Collected Information</h3>
                <ul className="list-disc pl-8 mb-4 space-y-2">
                  <li><strong>Usage Data:</strong> Your interactions within our app, including gameplay events, performance metrics, and session duration.</li>
                  <li><strong>Device Information:</strong> Browser type, IP address, operating system, and device identifiers.</li>
                </ul>
              </section>
              
              <section className="mb-8">
                <h2 className="font-heading font-semibold text-2xl mb-4">2. Use of Google Analytics</h2>
                <p className="mb-4">
                  We utilize Google Analytics to understand and analyze your interaction with our Services. Google Analytics may collect and process information about your activities, including:
                </p>
                <ul className="list-disc pl-8 mb-4 space-y-2">
                  <li>Pages and features accessed.</li>
                  <li>Actions taken within the application.</li>
                  <li>Interaction frequency and session durations.</li>
                </ul>
                <p className="mb-4">
                  We use this data to improve user experience, enhance our Services, and optimize performance. For more information, visit <a href="https://policies.google.com/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Google's Privacy Policy</a>.
                </p>
                <p>
                  You may opt-out by installing the <a href="https://tools.google.com/dlpage/gaoptout" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Google Analytics Opt-Out Browser Add-on</a>.
                </p>
              </section>
              
              <section className="mb-8">
                <h2 className="font-heading font-semibold text-2xl mb-4">3. How We Use Your Information</h2>
                <p className="mb-4">We use your information to:</p>
                <ul className="list-disc pl-8 mb-4 space-y-2">
                  <li>Operate, maintain, and improve our Services.</li>
                  <li>Provide personalized content and game features.</li>
                  <li>Analyze usage trends and monitor service performance.</li>
                  <li>Communicate with you regarding updates, offers, and service-related announcements.</li>
                  <li>Ensure compliance with our terms of use and protect against fraudulent activities.</li>
                </ul>
              </section>
              
              <section className="mb-8">
                <h2 className="font-heading font-semibold text-2xl mb-4">4. Sharing Your Information</h2>
                <p className="mb-4">We may share your information with:</p>
                <ul className="list-disc pl-8 mb-4 space-y-2">
                  <li><strong>Third-party Service Providers:</strong> Including analytics services (Google Analytics), payment processors (Paddle), hosting providers, and data storage solutions (Supabase).</li>
                  <li><strong>Legal Compliance:</strong> If required by law, or to protect the rights and safety of us, our users, or the public.</li>
                </ul>
                <p>
                  <strong>We never sell your personal data to third parties.</strong>
                </p>
              </section>
              
              <section className="mb-8">
                <h2 className="font-heading font-semibold text-2xl mb-4">5. Cookies and Similar Technologies</h2>
                <p className="mb-4">We use cookies and similar tracking technologies to:</p>
                <ul className="list-disc pl-8 mb-4 space-y-2">
                  <li>Enhance your user experience.</li>
                  <li>Remember preferences and settings.</li>
                  <li>Collect analytical data via Google Analytics.</li>
                </ul>
                <p>
                  You can manage or disable cookies in your browser settings.
                </p>
              </section>
              
              <section className="mb-8">
                <h2 className="font-heading font-semibold text-2xl mb-4">6. Data Security</h2>
                <p>
                  We implement industry-standard security measures to protect your data. However, no internet transmission or electronic storage method is entirely secure. We cannot guarantee absolute security.
                </p>
              </section>
              
              <section className="mb-8">
                <h2 className="font-heading font-semibold text-2xl mb-4">7. Children's Privacy</h2>
                <p>
                  Our Services are not intended for individuals under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware we have collected such data, we will promptly delete it.
                </p>
              </section>
              
              <section className="mb-8">
                <h2 className="font-heading font-semibold text-2xl mb-4">8. Your Rights and Choices</h2>
                <p className="mb-4">You can:</p>
                <ul className="list-disc pl-8 mb-4 space-y-2">
                  <li>Review, update, or delete your account information by logging into your account settings.</li>
                  <li>Opt-out of marketing communications via provided links or by contacting us.</li>
                  <li>Request deletion of your data from our records, subject to legal limitations.</li>
                </ul>
              </section>
              
              <section className="mb-8">
                <h2 className="font-heading font-semibold text-2xl mb-4">9. Changes to This Privacy Policy</h2>
                <p>
                  We may periodically update this policy. Any changes will be communicated through our Services or via email. Your continued use after updates constitutes acceptance of the new terms.
                </p>
              </section>
              
              <section>
                <h2 className="font-heading font-semibold text-2xl mb-4">10. Contact Us</h2>
                <p className="mb-4">
                  If you have questions or concerns regarding your privacy or this policy, please contact us at:
                </p>
                <p>
                  <strong>Email:</strong> <a href="mailto:hello@sketchyaf.app" className="text-primary hover:underline">hello@sketchyaf.app</a>
                </p>
              </section>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default Privacy;