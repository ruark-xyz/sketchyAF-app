import React from 'react';
import { motion } from 'framer-motion';
import Seo from '../components/utils/Seo';

const Terms: React.FC = () => {
  return (
    <>
      <Seo 
        title="Terms of Service"
        description="Read our terms of service to understand the rules and guidelines for using SketchyAF. Learn about your rights and responsibilities as a user."
      />
      
      <div className="py-16 md:py-24 bg-off-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="font-heading font-bold text-3xl md:text-4xl text-dark mb-6"
          >
            Terms of Service
          </motion.h1>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white rounded-lg shadow-md p-6 md:p-8"
          >
            <div className="prose max-w-none">
              <p className="text-sm text-medium-gray mb-6">Effective Date: June 11, 2025</p>
              
              <p className="mb-6">
                Welcome to SketchyAF ("we," "us," or "our"). By accessing or using our website, app, games, and related services ("Services"), you ("User," "you") agree to these Terms of Service ("Terms").
              </p>
              
              <section className="mb-8">
                <h2 className="font-heading font-semibold text-2xl mb-4">1. Acceptance of Terms</h2>
                <p>
                  By accessing and using our Services, you agree to be bound by these Terms and any future modifications. If you do not agree, do not use our Services.
                </p>
              </section>
              
              <section className="mb-8">
                <h2 className="font-heading font-semibold text-2xl mb-4">2. User Account</h2>
                <p className="mb-4">
                  You must create an account to access certain features of our Services. You agree to:
                </p>
                <ul className="list-disc pl-8 mb-4 space-y-2">
                  <li>Provide accurate and current information.</li>
                  <li>Maintain the confidentiality of your account details.</li>
                  <li>Notify us promptly of unauthorized account access.</li>
                </ul>
              </section>
              
              <section className="mb-8">
                <h2 className="font-heading font-semibold text-2xl mb-4">3. Ownership and Use of User-Generated Content</h2>
                <p className="mb-4">
                  Any drawings, artwork, images, designs, or other content ("User Content") you create or upload to our platform <strong>becomes the property of SketchyAF</strong>. By submitting User Content, you:
                </p>
                <ul className="list-disc pl-8 mb-4 space-y-2">
                  <li>Grant SketchyAF a worldwide, perpetual, irrevocable, royalty-free, fully-paid, transferable, and sublicensable license to use, copy, modify, distribute, display, reproduce, and create derivative works from your User Content for any purpose.</li>
                  <li>Waive any claims against SketchyAF related to the use or commercialization of your User Content.</li>
                  <li>Acknowledge that SketchyAF may feature your User Content in promotional materials, advertisements, social media, or other public displays.</li>
                </ul>
              </section>
              
              <section className="mb-8">
                <h2 className="font-heading font-semibold text-2xl mb-4">4. Intellectual Property Rights</h2>
                <p>
                  All content provided by SketchyAF, including graphics, text, designs, logos, user interface elements, and software, is owned or licensed by us and is protected by intellectual property laws. You agree not to reproduce, distribute, modify, or create derivative works from our content without express written permission.
                </p>
              </section>
              
              <section className="mb-8">
                <h2 className="font-heading font-semibold text-2xl mb-4">5. User Conduct</h2>
                <p className="mb-4">
                  You agree to use the Services responsibly and not to:
                </p>
                <ul className="list-disc pl-8 mb-4 space-y-2">
                  <li>Upload or share inappropriate, offensive, harmful, or illegal content.</li>
                  <li>Engage in harassment or bullying.</li>
                  <li>Attempt to disrupt or interfere with our Services.</li>
                  <li>Impersonate another person or entity.</li>
                  <li>Use bots or automated methods to manipulate gameplay.</li>
                </ul>
              </section>
              
              <section className="mb-8">
                <h2 className="font-heading font-semibold text-2xl mb-4">6. Termination and Account Suspension</h2>
                <p>
                  We reserve the right to suspend or terminate your account and access to our Services at our discretion for violations of these Terms or other harmful behaviors.
                </p>
              </section>
              
              <section className="mb-8">
                <h2 className="font-heading font-semibold text-2xl mb-4">7. Disclaimer and Limitation of Liability</h2>
                <p className="mb-4">
                  Our Services are provided "as is" without warranty of any kind. We do not guarantee uninterrupted or error-free service.
                </p>
                <p>
                  SketchyAF will not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use or inability to use the Services.
                </p>
              </section>
              
              <section className="mb-8">
                <h2 className="font-heading font-semibold text-2xl mb-4">8. Indemnification</h2>
                <p>
                  You agree to indemnify and hold harmless SketchyAF, its affiliates, officers, directors, employees, and agents from any claims, damages, liabilities, costs, and expenses arising from your violation of these Terms or misuse of the Services.
                </p>
              </section>
              
              <section className="mb-8">
                <h2 className="font-heading font-semibold text-2xl mb-4">9. Modifications to the Terms</h2>
                <p>
                  We reserve the right to modify these Terms at any time. Updates will be announced through the Services or via email. Continued use of the Services after changes indicates your acceptance of the updated Terms.
                </p>
              </section>
              
              <section className="mb-8">
                <h2 className="font-heading font-semibold text-2xl mb-4">10. Governing Law</h2>
                <p>
                  These Terms shall be governed by and interpreted in accordance with the laws of [Jurisdiction]. Any disputes arising under these Terms will be handled by the appropriate courts within [Jurisdiction].
                </p>
              </section>
              
              <section>
                <h2 className="font-heading font-semibold text-2xl mb-4">11. Contact Information</h2>
                <p className="mb-4">
                  For questions or concerns regarding these Terms, please contact us at:
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

export default Terms;