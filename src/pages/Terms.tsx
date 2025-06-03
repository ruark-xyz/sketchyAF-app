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
              <p className="text-sm text-medium-gray mb-6">Last Updated: May 2, 2025</p>
              
              <section className="mb-8">
                <h2 className="font-heading font-semibold text-2xl mb-4">1. Introduction</h2>
                <p className="mb-4">
                  Welcome to SketchyAF! These Terms of Service ("Terms") govern your access to and use of the SketchyAF
                  mobile application, website, and all related services (collectively, the "Service"). By accessing or using
                  our Service, you agree to be bound by these Terms.
                </p>
                <p>
                  Please read these Terms carefully. If you do not agree to these Terms, you may not access or use the Service.
                </p>
              </section>
              
              <section className="mb-8">
                <h2 className="font-heading font-semibold text-2xl mb-4">2. Service Description</h2>
                <p className="mb-4">
                  SketchyAF is a drawing and guessing game that allows users to participate in quick rounds of gameplay,
                  where they create drawings based on prompts and guess others' drawings. The Service includes:
                </p>
                <ul className="list-disc pl-8 mb-4 space-y-2">
                  <li>The SketchyAF mobile application</li>
                  <li>The SketchyAF website</li>
                  <li>User accounts and profiles</li>
                  <li>In-game features, including booster packs and premium content</li>
                  <li>Leaderboards and competitive gameplay</li>
                  <li>Communication features between users</li>
                </ul>
              </section>
              
              <section className="mb-8">
                <h2 className="font-heading font-semibold text-2xl mb-4">3. User Accounts</h2>
                <h3 className="font-heading font-semibold text-xl mb-2">3.1 Account Creation</h3>
                <p className="mb-4">
                  To use certain features of the Service, you may need to create an account. You agree to provide accurate,
                  current, and complete information during the registration process and to update such information to keep it
                  accurate, current, and complete.
                </p>
                
                <h3 className="font-heading font-semibold text-xl mb-2">3.2 Account Responsibilities</h3>
                <p className="mb-4">
                  You are responsible for:
                </p>
                <ul className="list-disc pl-8 mb-4 space-y-2">
                  <li>Maintaining the confidentiality of your account password</li>
                  <li>Restricting access to your account</li>
                  <li>All activities that occur under your account</li>
                </ul>
                <p>
                  You must notify us immediately of any unauthorized use of your account or any other breach of security.
                </p>
              </section>
              
              <section className="mb-8">
                <h2 className="font-heading font-semibold text-2xl mb-4">4. User Conduct</h2>
                <p className="mb-4">
                  You agree not to engage in any of the following prohibited activities:
                </p>
                <ul className="list-disc pl-8 mb-4 space-y-2">
                  <li>Using the Service for any illegal purpose or in violation of any laws</li>
                  <li>Posting or transmitting content that is offensive, abusive, libelous, or violates the rights of others</li>
                  <li>Attempting to interfere with, compromise the system integrity or security, or decipher any transmissions to or from the servers running the Service</li>
                  <li>Taking any action that imposes an unreasonable or disproportionately large load on our infrastructure</li>
                  <li>Uploading invalid data, viruses, worms, or other software agents through the Service</li>
                  <li>Collecting or harvesting any personally identifiable information from the Service</li>
                  <li>Impersonating another person or otherwise misrepresenting your affiliation</li>
                  <li>Using the Service for any commercial solicitation purposes without our consent</li>
                </ul>
              </section>
              
              <section className="mb-8">
                <h2 className="font-heading font-semibold text-2xl mb-4">5. Intellectual Property</h2>
                <h3 className="font-heading font-semibold text-xl mb-2">5.1 Our Intellectual Property</h3>
                <p className="mb-4">
                  The Service and its original content, features, and functionality are and will remain the exclusive property
                  of SketchyAF and its licensors. The Service is protected by copyright, trademark, and other laws of both the
                  United States and foreign countries.
                </p>
                
                <h3 className="font-heading font-semibold text-xl mb-2">5.2 User Content</h3>
                <p className="mb-4">
                  You retain all rights in, and are solely responsible for, the content you post to the Service, including
                  drawings, comments, and other materials ("User Content").
                </p>
                <p className="mb-4">
                  By posting User Content, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce,
                  modify, adapt, publish, translate, distribute, and display such User Content in connection with providing and
                  promoting the Service.
                </p>
              </section>
              
              <section className="mb-8">
                <h2 className="font-heading font-semibold text-2xl mb-4">6. Purchases and Subscriptions</h2>
                <h3 className="font-heading font-semibold text-xl mb-2">6.1 In-App Purchases</h3>
                <p className="mb-4">
                  The Service offers in-app purchases, including booster packs and other virtual items. These purchases are
                  final and non-refundable, except as required by applicable law.
                </p>
                
                <h3 className="font-heading font-semibold text-xl mb-2">6.2 Premium Subscriptions</h3>
                <p className="mb-4">
                  Premium subscriptions will automatically renew unless auto-renew is turned off at least 24 hours before the
                  end of the current period. Your account will be charged for renewal within 24 hours prior to the end of the
                  current period. You can manage your subscriptions and turn off auto-renewal in your account settings.
                </p>
              </section>
              
              <section className="mb-8">
                <h2 className="font-heading font-semibold text-2xl mb-4">7. Disclaimer of Warranties</h2>
                <p className="mb-4">
                  THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
                  INCLUDING, BUT NOT LIMITED TO, IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
                  NON-INFRINGEMENT.
                </p>
                <p>
                  WE DO NOT GUARANTEE THAT THE SERVICE WILL FUNCTION WITHOUT INTERRUPTION OR ERRORS, AND WE DISCLAIM ANY
                  LIABILITY FOR DAMAGES RESULTING FROM YOUR ACCESS TO OR USE OF THE SERVICE.
                </p>
              </section>
              
              <section className="mb-8">
                <h2 className="font-heading font-semibold text-2xl mb-4">8. Limitation of Liability</h2>
                <p>
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL SKETCHYAF, ITS AFFILIATES, OFFICERS, DIRECTORS,
                  EMPLOYEES, AGENTS, SUPPLIERS OR LICENSORS BE LIABLE FOR ANY INDIRECT, PUNITIVE, INCIDENTAL, SPECIAL,
                  CONSEQUENTIAL OR EXEMPLARY DAMAGES, INCLUDING WITHOUT LIMITATION DAMAGES FOR LOSS OF PROFITS, GOODWILL,
                  USE, DATA OR OTHER INTANGIBLE LOSSES, THAT RESULT FROM THE USE OF, OR INABILITY TO USE, THE SERVICE.
                </p>
              </section>
              
              <section className="mb-8">
                <h2 className="font-heading font-semibold text-2xl mb-4">9. Changes to Terms</h2>
                <p>
                  We reserve the right to modify these Terms at any time. If we make changes, we will provide notice of such
                  changes, such as by sending an email notification, providing notice through the Service, or updating the
                  "Last Updated" date at the beginning of these Terms. Your continued use of the Service following notification
                  of changes indicates your acceptance of the updated Terms.
                </p>
              </section>
              
              <section>
                <h2 className="font-heading font-semibold text-2xl mb-4">10. Contact Us</h2>
                <p>
                  If you have any questions about these Terms, please contact us at:
                </p>
                <p className="mt-2">
                  <strong>Email:</strong> <a href="mailto:terms@sketchyaf.com" className="text-primary hover:underline">terms@sketchyaf.com</a>
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