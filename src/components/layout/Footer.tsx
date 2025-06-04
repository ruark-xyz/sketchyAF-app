import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Youtube } from 'lucide-react';

interface FooterSectionProps {
  title: string;
  children: React.ReactNode;
}

const FooterSection: React.FC<FooterSectionProps> = ({ title, children }) => (
  <div className="mb-6 md:mb-0">
    <h3 className="font-heading font-bold text-xl mb-4 transform rotate-[-2deg]">{title}</h3>
    <div className="space-y-3">{children}</div>
  </div>
);

const Footer: React.FC = () => {
  return (
    <footer className="bg-dark text-white py-12 border-t-2 border-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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

          {/* Connect */}
          <FooterSection title="Connect">
            <div className="flex space-x-4">
              <a
                href="#"
                className="hover:text-accent transition-transform hover:scale-110"
                aria-label="Facebook"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Facebook size={24} />
              </a>
              <a
                href="#"
                className="hover:text-accent transition-transform hover:scale-110"
                aria-label="Twitter"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Twitter size={24} />
              </a>
              <a
                href="#"
                className="hover:text-accent transition-transform hover:scale-110"
                aria-label="Instagram"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Instagram size={24} />
              </a>
              <a
                href="#"
                className="hover:text-accent transition-transform hover:scale-110"
                aria-label="YouTube"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Youtube size={24} />
              </a>
            </div>
          </FooterSection>
        </div>

        <div className="mt-12 pt-6 border-t border-gray-700 text-center font-body">
          <p className="transform rotate-[-1deg]">&copy; 2025 SketchyAF. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;