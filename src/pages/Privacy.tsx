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
            Privacy Policy
          </motion.h1>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white rounded-lg shadow-md p-6 md:p-8"
          >
            <div className="prose max-w-none">
              <p className="text-sm text-medium-gray mb-6">Last Updated: May 2, 2025</p>
              
              <section className="mb-8">
                <h2 className="font-heading font-semibold text-2xl mb-4">1. Introduction</h2>
                <p className="mb-4">
                  Welcome to SketchyAF ("we," "our," or "us"). We are committed to protecting your privacy and ensuring
                  you have a positive experience when using our mobile game and website.
                </p>
                <p>
                  This Privacy Policy explains how we collect, use, and disclose information about you when you use our
                  mobile application, website, and related services (collectively, the "Services"). By using our Services,
                  you agree to the collection and use of information in accordance with this policy.
                </p>
              </section>
              
              <section className="mb-8">
                <h2 className="font-heading font-semibold text-2xl mb-4">2. Information We Collect</h2>
                <h3 className="font-heading font-semibold text-xl mb-2">2.1 Information You Provide</h3>
                <p className="mb-4">
                  We collect information you provide directly to us, such as:
                </p>
                <ul className="list-disc pl-8 mb-4 space-y-2">
                  <li>Account information (username, email address, password)</li>
                  <li>Profile information (profile picture, bio)</li>
                  <li>User-generated content (drawings, comments, messages)</li>
                  <li>Payment information when you make purchases</li>
                  <li>Information you provide when contacting customer support</li>
                  <li>Survey responses and feedback</li>
                </ul>
                
                <h3 className="font-heading font-semibold text-xl mb-2">2.2 Information We Collect Automatically</h3>
                <p className="mb-4">
                  When you use our Services, we automatically collect certain information, including:
                </p>
                <ul className="list-disc pl-8 mb-4 space-y-2">
                  <li>Device information (device model, operating system, unique device identifiers)</li>
                  <li>Log information (IP address, browser type, pages visited, time spent)</li>
                  <li>Game play information (scores, achievements, in-game purchases)</li>
                  <li>Location information (general location based on IP address)</li>
                </ul>
              </section>
              
              <section className="mb-8">
                <h2 className="font-heading font-semibold text-2xl mb-4">3. How We Use Your Information</h2>
                <p className="mb-4">We use the information we collect to:</p>
                <ul className="list-disc pl-8 mb-4 space-y-2">
                  <li>Provide, maintain, and improve our Services</li>
                  <li>Create and maintain your account</li>
                  <li>Process transactions and send related information</li>
                  <li>Send technical notices, updates, security alerts, and support messages</li>
                  <li>Respond to your comments, questions, and customer service requests</li>
                  <li>Monitor and analyze trends, usage, and activities</li>
                  <li>Detect, investigate, and prevent fraudulent transactions and other illegal activities</li>
                  <li>Personalize your experience and deliver content and product features</li>
                  <li>Facilitate contests, sweepstakes, and promotions</li>
                </ul>
              </section>
              
              <section className="mb-8">
                <h2 className="font-heading font-semibold text-2xl mb-4">4. Sharing of Information</h2>
                <p className="mb-4">
                  We may share information about you as follows:
                </p>
                <ul className="list-disc pl-8 mb-4 space-y-2">
                  <li>With other users (your username, profile picture, drawings, scores)</li>
                  <li>With vendors, consultants, and service providers who need access to perform work for us</li>
                  <li>In response to a legal request if we believe disclosure is required by law</li>
                  <li>To protect the rights, property, and safety of our users and others</li>
                  <li>In connection with a merger, sale, or acquisition of all or a portion of our company</li>
                </ul>
              </section>
              
              <section className="mb-8">
                <h2 className="font-heading font-semibold text-2xl mb-4">5. Your Rights and Choices</h2>
                <p className="mb-4">
                  Depending on your location, you may have certain rights regarding your personal information, including:
                </p>
                <ul className="list-disc pl-8 mb-4 space-y-2">
                  <li>Accessing, correcting, or deleting your personal information</li>
                  <li>Withdrawing your consent to our processing of your information</li>
                  <li>Requesting restriction of processing of your personal information</li>
                  <li>Requesting portability of your personal information</li>
                  <li>Opting out of marketing communications</li>
                </ul>
                <p>
                  To exercise these rights, please contact us using the information provided in the "Contact Us" section below.
                </p>
              </section>
              
              <section className="mb-8">
                <h2 className="font-heading font-semibold text-2xl mb-4">6. Data Retention</h2>
                <p>
                  We store the information we collect about you for as long as is necessary for the purposes for which
                  we collected it, or for other legitimate business purposes, including to meet our legal, regulatory,
                  or other compliance obligations.
                </p>
              </section>
              
              <section className="mb-8">
                <h2 className="font-heading font-semibold text-2xl mb-4">7. Children's Privacy</h2>
                <p>
                  Our Services are not directed to children under 13, and we do not knowingly collect personal information
                  from children under 13. If we learn we have collected or received personal information from a child under
                  13 without verification of parental consent, we will delete that information.
                </p>
              </section>
              
              <section className="mb-8">
                <h2 className="font-heading font-semibold text-2xl mb-4">8. Changes to This Privacy Policy</h2>
                <p>
                  We may update this privacy policy from time to time. If we make material changes, we will notify you
                  by email or through the Services prior to the change becoming effective.
                </p>
              </section>
              
              <section>
                <h2 className="font-heading font-semibold text-2xl mb-4">9. Contact Us</h2>
                <p>
                  If you have any questions about this Privacy Policy, please contact us at:
                </p>
                <p className="mt-2">
                  <strong>Email:</strong> <a href="mailto:privacy@sketchyaf.com" className="text-primary hover:underline">privacy@sketchyaf.com</a>
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