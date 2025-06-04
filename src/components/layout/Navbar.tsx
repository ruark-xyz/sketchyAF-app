import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Pencil, UserCircle, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavItem } from '../../types';
import Button from '../ui/Button';
import { useAuth } from '../../context/AuthContext';

const navItems: NavItem[] = [
  { label: 'Home', path: '/' },
  { label: 'Premium', path: '/premium' },
  { label: 'Leaderboard', path: '/leaderboard' },
  { label: 'Art', path: '/art' },
  { label: 'Roadmap', path: '/roadmap' },
];

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoggedIn, currentUser, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  return (
    <nav 
      className={`w-full transition-all duration-300 ${
        scrolled || isMenuOpen ? 'bg-cream border-b-2 border-dark shadow-md' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 text-primary">
            <Pencil size={32} className="transform rotate-12" />
            <span className="font-heading font-bold text-2xl rotate-[-2deg]">SketchyAF</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center">
            <div className="flex space-x-8 mr-6">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`font-heading font-bold text-lg transition-transform hover:rotate-[-2deg] ${
                    location.pathname === item.path
                      ? 'text-primary transform rotate-[-2deg]'
                      : 'text-dark-gray hover:text-primary'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Conditional Profile/Signup Section */}
            {isLoggedIn ? (
              <div className="flex items-center gap-4">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className="cursor-pointer flex items-center gap-2"
                  onClick={() => navigate('/profile')} // Would go to profile page if we had one
                >
                  {currentUser?.avatar ? (
                    <img 
                      src={currentUser.avatar} 
                      alt={currentUser.username} 
                      className="w-8 h-8 rounded-full border-2 border-primary"
                    />
                  ) : (
                    <UserCircle size={32} className="text-primary" />
                  )}
                  <span className="font-heading font-bold text-primary hidden lg:block">
                    {currentUser?.username}
                  </span>
                </motion.div>
                
                <Button 
                  variant="tertiary" 
                  size="sm" 
                  onClick={handleLogout}
                >
                  <LogOut size={20} />
                  <span className="ml-1 hidden sm:inline">Logout</span>
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Button 
                  variant="tertiary" 
                  size="sm" 
                  to="/login"
                >
                  Log In
                </Button>
                <Button 
                  variant="primary" 
                  size="sm" 
                  to="/signup"
                >
                  Sign Up
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-dark-gray focus:outline-none"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden bg-cream border-b-2 border-dark"
          >
            <div className="px-4 pt-2 pb-6 space-y-4">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`block py-2 font-heading font-bold text-xl ${
                    location.pathname === item.path
                      ? 'text-primary transform rotate-[-2deg]'
                      : 'text-dark-gray'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              
              {/* User info in mobile menu */}
              {isLoggedIn && (
                <div className="flex items-center space-x-2 py-2">
                  {currentUser?.avatar ? (
                    <img 
                      src={currentUser.avatar} 
                      alt={currentUser.username} 
                      className="w-8 h-8 rounded-full border-2 border-primary"
                    />
                  ) : (
                    <UserCircle size={24} className="text-primary" />
                  )}
                  <span className="font-heading font-bold text-primary">
                    {currentUser?.username}
                  </span>
                </div>
              )}
              
              {/* Footer links in mobile menu */}
              <div className="pt-4 border-t border-gray-200 mt-4">
                <Link
                  to="/privacy"
                  className="block py-2 font-heading text-lg text-dark-gray"
                >
                  Privacy Policy
                </Link>
                <Link
                  to="/terms"
                  className="block py-2 font-heading text-lg text-dark-gray"
                >
                  Terms of Service
                </Link>
              </div>
              
              {/* Auth buttons in mobile menu */}
              <div className="pt-4 flex justify-center">
                {isLoggedIn ? (
                   <Button 
                     variant="primary" 
                     size="sm" 
                     onClick={handleLogout}
                   >
                     <LogOut size={20} className="mr-1" />
                     Logout
                   </Button>
                ) : (
                  <div className="flex flex-col w-full space-y-2">
                    <Button 
                      variant="primary" 
                      size="sm" 
                      to="/signup"
                      className="w-full"
                    >
                      Sign Up
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      to="/login"
                      className="w-full"
                    >
                      Log In
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;