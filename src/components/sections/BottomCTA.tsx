import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import * as ROUTES from '../../constants/routes';
import { getJoinGameRoute } from '../../utils/navigationHelpers';

interface BottomCTAProps {
  heading: string;
  subheading?: string;
  buttonText: string;
  buttonLink?: string;
  isExternalLink?: boolean;
  onEmailSignupClick?: () => void;
  useConditionalNavigation?: boolean;
}

const BottomCTA: React.FC<BottomCTAProps> = ({
  heading,
  subheading,
  buttonText,
  buttonLink,
  isExternalLink = false,
  onEmailSignupClick,
  useConditionalNavigation = false
}) => {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  const handleButtonClick = () => {
    if (useConditionalNavigation) {
      const targetRoute = getJoinGameRoute(isLoggedIn);
      navigate(targetRoute);
    } else if (onEmailSignupClick) {
      onEmailSignupClick();
    }
  };

  return (
    <section className="bg-secondary py-16 md:py-24 border-y-2 border-dark">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="bg-white border-2 border-dark p-8 hand-drawn shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]"
        >
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-dark mb-4 transform rotate-[-1deg]">
            {heading}
          </h2>
          
          {subheading && (
            <p className="text-dark text-xl font-body max-w-3xl mx-auto mb-8">
              {subheading}
            </p>
          )}
          
          {/* Conditional rendering based on whether we have an email signup handler or a link */}
          {useConditionalNavigation ? (
            <Button 
              variant="primary" 
              size="lg" 
              onClick={handleButtonClick}
            >
              {buttonText}
            </Button>
          ) : onEmailSignupClick ? (
            <Button 
              variant="primary" 
              size="lg" 
              onClick={onEmailSignupClick}
            >
              {buttonText}
            </Button>
          ) : buttonLink ? (
            isExternalLink ? (
              <Button 
                variant="primary" 
                size="lg" 
                href={buttonLink}
              >
                {buttonText}
              </Button>
            ) : (
              <Button 
                variant="primary" 
                size="lg" 
                to={buttonLink}
              >
                {buttonText}
              </Button>
            )
          ) : null}
        </motion.div>
      </div>
    </section>
  );
};

export default BottomCTA;