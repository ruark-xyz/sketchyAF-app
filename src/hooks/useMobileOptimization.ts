import { useEffect } from 'react';

export const useMobileOptimization = () => {
  useEffect(() => {
    // Prevent default touch behaviors that interfere with drawing
    const preventDefaultTouchEvents = (e: TouchEvent) => {
      // Allow single touch for drawing, prevent multi-touch zoom/scroll
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    const preventScrolling = (e: TouchEvent) => {
      // Prevent scrolling when touching the canvas area
      const target = e.target as HTMLElement;
      if (target.closest('.excalidraw')) {
        e.preventDefault();
      }
    };

    // Add touch optimization
    document.addEventListener('touchstart', preventDefaultTouchEvents, { passive: false });
    document.addEventListener('touchmove', preventScrolling, { passive: false });

    // Optimize viewport for mobile drawing
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (viewportMeta) {
      viewportMeta.setAttribute(
        'content', 
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
      );
    }

    // Cleanup
    return () => {
      document.removeEventListener('touchstart', preventDefaultTouchEvents);
      document.removeEventListener('touchmove', preventScrolling);
      
      // Restore normal viewport behavior
      if (viewportMeta) {
        viewportMeta.setAttribute(
          'content', 
          'width=device-width, initial-scale=1.0'
        );
      }
    };
  }, []);
};

export default useMobileOptimization; 