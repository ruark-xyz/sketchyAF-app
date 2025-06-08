import React from 'react'; import { Link } from 'react-router-dom';
interface FooterSectionProps {
title: string;
children: React.ReactNode;
}

const FooterSection: React.FC = ({ title, children }) => (

{title}
{children}
);
const Footer: React.FC = () => {
return (

{/* Quick Links */} Home Premium Leaderboard Art Roadmap

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
  </div>
</footer>
);
};

export default Footer;