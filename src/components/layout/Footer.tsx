import React from 'react';
import { Link } from 'react-router-dom';

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
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Quick Links */}
        <FooterSection title="Quick Links">
          <Link to="/" className="block font-body text-lg hover:text-accent transition-colors">
            Home
          </Link>
          <Link to="/premium" className="block font-body text-lg hover:text-accent transition-colors">
            Premium
          </Link>
          <Link to="/leaderboard" className="block font-body text-lg hover:text-accent transition-colors">
            Leaderboard
          </Link>
          <Link to="/art" className="block font-body text-lg hover:text-accent transition-colors">
            Art
          </Link>
          <Link to="/roadmap" className="block font-body text-lg hover:text-accent transition-colors">
            Roadmap
          </Link>
        </FooterSection>

        {/* Legal */}
        <FooterSection title="Legal">
          <Link to="/privacy" className="block font-body text-lg hover:text-accent transition-colors">
            Privacy Policy
          </Link>
          <Link to="/terms" className="block font-body text-lg hover:text-accent transition-colors">
            Terms of Service
          </Link>
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