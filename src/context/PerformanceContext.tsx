import React, { createContext, useContext, useRef, useCallback, useEffect } from 'react';

interface PerformanceMetrics {
  navigationTiming: PerformanceTiming | null;
  resourceTiming: PerformanceResourceTiming[];
  userTiming: PerformanceMeasure[];
  vitals: {
    fcp?: number; // First Contentful Paint
    lcp?: number; // Largest Contentful Paint
    fid?: number; // First Input Delay
    cls?: number; // Cumulative Layout Shift
    ttfb?: number; // Time to First Byte
  };
}

interface PerformanceContextType {
  metrics: PerformanceMetrics;
  startTiming: (name: string) => void;
  endTiming: (name: string) => void;
  recordMetric: (name: string, value: number) => void;
  getPageLoadTime: () => number | null;
  measureComponent: (componentName: string, fn: () => void) => void;
}

const PerformanceContext = createContext<PerformanceContextType | undefined>(undefined);

export const PerformanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const metricsRef = useRef<PerformanceMetrics>({
    navigationTiming: null,
    resourceTiming: [],
    userTiming: [],
    vitals: {},
  });

  const timingMarks = useRef<Map<string, number>>(new Map());

  // Initialize performance monitoring
  useEffect(() => {
    // Capture navigation timing
    if (typeof window !== 'undefined' && window.performance) {
      metricsRef.current.navigationTiming = window.performance.timing;
      
      // Monitor Web Vitals
      if ('PerformanceObserver' in window) {
        try {
          // Largest Contentful Paint
          const lcpObserver = new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            const lastEntry = entries[entries.length - 1] as PerformanceEventTiming;
            metricsRef.current.vitals.lcp = lastEntry.startTime;
          });
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

          // First Input Delay
          const fidObserver = new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            entries.forEach((entry) => {
              metricsRef.current.vitals.fid = entry.processingStart - entry.startTime;
            });
          });
          fidObserver.observe({ entryTypes: ['first-input'] });

          // Cumulative Layout Shift
          const clsObserver = new PerformanceObserver((entryList) => {
            let clsValue = 0;
            entryList.getEntries().forEach((entry) => {
              if (!entry.hadRecentInput) {
                clsValue += entry.value;
              }
            });
            metricsRef.current.vitals.cls = clsValue;
          });
          clsObserver.observe({ entryTypes: ['layout-shift'] });

          // First Contentful Paint
          const paintObserver = new PerformanceObserver((entryList) => {
            entryList.getEntries().forEach((entry) => {
              if (entry.name === 'first-contentful-paint') {
                metricsRef.current.vitals.fcp = entry.startTime;
              }
            });
          });
          paintObserver.observe({ entryTypes: ['paint'] });

        } catch (error) {
          console.warn('Performance Observer not fully supported:', error);
        }
      }

      // Calculate Time to First Byte
      const navigation = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        metricsRef.current.vitals.ttfb = navigation.responseStart - navigation.fetchStart;
      }
    }
  }, []);

  // Start timing measurement
  const startTiming = useCallback((name: string) => {
    if (typeof window !== 'undefined' && window.performance) {
      const markName = `${name}-start`;
      window.performance.mark(markName);
      timingMarks.current.set(name, window.performance.now());
    }
  }, []);

  // End timing measurement
  const endTiming = useCallback((name: string) => {
    if (typeof window !== 'undefined' && window.performance) {
      const startTime = timingMarks.current.get(name);
      if (startTime) {
        const endTime = window.performance.now();
        const duration = endTime - startTime;
        
        const markName = `${name}-end`;
        const measureName = `${name}-duration`;
        
        window.performance.mark(markName);
        window.performance.measure(measureName, `${name}-start`, markName);
        
        // Store the measurement
        const measure = window.performance.getEntriesByName(measureName)[0] as PerformanceMeasure;
        metricsRef.current.userTiming.push(measure);
        
        timingMarks.current.delete(name);
        
        // Log performance data in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`Performance: ${name} took ${duration.toFixed(2)}ms`);
        }
      }
    }
  }, []);

  // Record custom metric
  const recordMetric = useCallback((name: string, value: number) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Performance Metric: ${name} = ${value}`);
    }
    
    // In production, send to analytics service
    // TODO: Integrate with analytics service
  }, []);

  // Get page load time
  const getPageLoadTime = useCallback((): number | null => {
    if (typeof window !== 'undefined' && window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      return timing.loadEventEnd - timing.navigationStart;
    }
    return null;
  }, []);

  // Measure component render time
  const measureComponent = useCallback((componentName: string, fn: () => void) => {
    startTiming(`component-${componentName}`);
    fn();
    endTiming(`component-${componentName}`);
  }, [startTiming, endTiming]);

  const value = {
    metrics: metricsRef.current,
    startTiming,
    endTiming,
    recordMetric,
    getPageLoadTime,
    measureComponent,
  };

  return (
    <PerformanceContext.Provider value={value}>
      {children}
    </PerformanceContext.Provider>
  );
};

export const usePerformance = (): PerformanceContextType => {
  const context = useContext(PerformanceContext);
  if (context === undefined) {
    throw new Error('usePerformance must be used within a PerformanceProvider');
  }
  return context;
};