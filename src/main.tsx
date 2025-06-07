import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.tsx';
import './index.css';

// Register service worker for offline support
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
        
        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60000); // Check every minute
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

// Performance monitoring for Core Web Vitals
if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
  // Monitor Largest Contentful Paint
  new PerformanceObserver((entryList) => {
    const entries = entryList.getEntries();
    const lastEntry = entries[entries.length - 1];
    
    // Send to analytics in production
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to analytics service
      console.log('LCP:', lastEntry.startTime);
    }
  }).observe({ entryTypes: ['largest-contentful-paint'] });

  // Monitor First Input Delay
  new PerformanceObserver((entryList) => {
    const entries = entryList.getEntries();
    entries.forEach((entry) => {
      const fid = entry.processingStart - entry.startTime;
      
      // Send to analytics in production
      if (process.env.NODE_ENV === 'production') {
        // TODO: Send to analytics service
        console.log('FID:', fid);
      }
    });
  }).observe({ entryTypes: ['first-input'] });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>
);