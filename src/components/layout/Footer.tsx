import React from 'react';
import { Link } from 'react-router-dom';
import * as ROUTES from '../../constants/routes';

interface FooterSectionProps {
  title: string;
  children: React.ReactNode;
}

const FooterSection: React.FC<FooterSectionProps> = ({ title, children }) => (
  <div>
    <h3 className="font-heading text-xl font-bold mb-4 text-white transform rotate-[-1deg]">
      {title}
    </h3>
    <div className="space-y-2">
      {children}
    </div>
  </div>
);

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-800 text-white py-12 mt-20">
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Quick Links */}
        <FooterSection title="Quick Links">
          <Link to={ROUTES.ROUTE_HOME} className="block font-body text-lg hover:text-accent transition-colors">
            Home
          </Link>
          <Link to={ROUTES.ROUTE_PREMIUM} className="block font-body text-lg hover:text-accent transition-colors">
            Premium
          </Link>
          <Link to={ROUTES.ROUTE_LEADERBOARD} className="block font-body text-lg hover:text-accent transition-colors">
            Leaderboard
          </Link>
          <Link to={ROUTES.ROUTE_ART} className="block font-body text-lg hover:text-accent transition-colors">
            Art
          </Link>
          <Link to={ROUTES.ROUTE_ROADMAP} className="block font-body text-lg hover:text-accent transition-colors">
            Roadmap
          </Link>
        </FooterSection>

        {/* Legal */}
        <FooterSection title="Legal">
          <Link to={ROUTES.ROUTE_PRIVACY} className="block font-body text-lg hover:text-accent transition-colors">
            Privacy Policy
          </Link>
          <Link to={ROUTES.ROUTE_TERMS} className="block font-body text-lg hover:text-accent transition-colors">
            Terms of Service
          </Link>
        </FooterSection>

        {/* Follow Us */}
        <FooterSection title="Follow Us">
          <a
            href="https://x.com/sketchyaf_app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center font-body text-lg hover:text-accent transition-colors"
            aria-label="Follow SketchyAF on X/Twitter"
          >
            <svg 
              className="w-5 h-5 mr-2" 
              fill="currentColor" 
              viewBox="0 0 24 24" 
              aria-hidden="true"
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            @sketchyaf_app
          </a>
        </FooterSection>

        {/* Powered By Bolt */}
        <FooterSection title="Powered By">
          <a
            href="https://bolt.new/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block hover:opacity-80 transition-opacity"
            aria-label="Powered by Bolt"
          >
            <img 
              src="/white_circle_360x360.png" 
              alt="Bolt Logo" 
              className="w-20 h-20 object-contain"
            />
          </a>
        </FooterSection>
      </div>

      <div className="mt-12 pt-6 border-t border-gray-700 text-center font-body">
        <p className="transform rotate-[-1deg]">&copy; 2025 SketchyAF. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;