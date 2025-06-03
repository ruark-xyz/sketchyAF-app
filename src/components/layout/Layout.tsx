import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import Banner from '../ui/Banner';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isBannerActive, setIsBannerActive] = useState(true);
  const [headerHeight, setHeaderHeight] = useState(0);
  const headerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  
  // Check if current route is an auth page
  const isAuthPage = ['/login', '/signup', '/forgot-password'].includes(location.pathname);
  
  // Initialize banner state based on localStorage
  useEffect(() => {
    const isBannerDismissed = localStorage.getItem('bannerDismissed') === 'true';
    setIsBannerActive(!isBannerDismissed);
  }, []);
  
  // Measure the header height whenever its content changes
  useEffect(() => {
    if (headerRef.current) {
      setHeaderHeight(headerRef.current.offsetHeight);
      
      // Use ResizeObserver to detect height changes
      const resizeObserver = new ResizeObserver(() => {
        setHeaderHeight(headerRef.current?.offsetHeight || 0);
      });
      
      resizeObserver.observe(headerRef.current);
      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [isBannerActive]);
  
  const handleBannerDismiss = () => {
    setIsBannerActive(false);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Fixed header container that wraps both Banner and Navbar */}
      <div 
        ref={headerRef}
        className="fixed top-0 left-0 w-full z-50"
      >
        {isBannerActive && !isAuthPage && (
          <Banner 
            isDismissible={true}
            onDismiss={handleBannerDismiss}
          >
            Enjoying SketchyAF? Help us on the Bolt Hackathon! 
            <a 
              href="https://devpost.com/software/sketchyaf/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="ml-2 underline font-bold hover:text-primary transition-colors"
            >
              Give us a like!
            </a>
          </Banner>
        )}
        
        <Navbar />
      </div>
      
      {/* Content with dynamic padding based on header height */}
      <main 
        className="flex-grow" 
        style={{ paddingTop: isAuthPage ? '0' : `${headerHeight}px` }}
      >
        {children}
      </main>
      
      {!isAuthPage && <Footer />}
    </div>
  );
};

export default Layout;