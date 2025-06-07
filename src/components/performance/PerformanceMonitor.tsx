import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Eye, EyeOff, TrendingUp, Clock, Zap } from 'lucide-react';
import { usePerformance } from '../../context/PerformanceContext';
import { enhancedApiService } from '../../services/enhancedApiService';

interface PerformanceData {
  fps: number;
  memoryUsage: number;
  cacheStats: {
    memoryEntries: number;
    localStorageEntries: number;
    totalSize: number;
  };
  vitals: {
    fcp?: number;
    lcp?: number;
    fid?: number;
    cls?: number;
    ttfb?: number;
  };
}

const PerformanceMonitor: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [performanceData, setPerformanceData] = useState<PerformanceData>({
    fps: 0,
    memoryUsage: 0,
    cacheStats: { memoryEntries: 0, localStorageEntries: 0, totalSize: 0 },
    vitals: {},
  });

  const { metrics, getPageLoadTime } = usePerformance();

  // FPS measurement
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationId: number;

    const measureFPS = () => {
      const currentTime = performance.now();
      frameCount++;

      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        setPerformanceData(prev => ({ ...prev, fps }));
        frameCount = 0;
        lastTime = currentTime;
      }

      animationId = requestAnimationFrame(measureFPS);
    };

    measureFPS();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);

  // Update performance data periodically
  useEffect(() => {
    const updateData = () => {
      // Memory usage
      const memoryInfo = (performance as any).memory;
      const memoryUsage = memoryInfo 
        ? Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024) 
        : 0;

      // Cache stats
      const cacheStats = enhancedApiService.getCacheStats();

      setPerformanceData(prev => ({
        ...prev,
        memoryUsage,
        cacheStats,
        vitals: metrics.vitals,
      }));
    };

    const interval = setInterval(updateData, 2000);
    updateData(); // Initial update

    return () => clearInterval(interval);
  }, [metrics.vitals]);

  // Keyboard shortcut to toggle visibility
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        setIsVisible(!isVisible);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isVisible]);

  const formatMs = (ms?: number) => {
    return ms ? `${ms.toFixed(1)}ms` : 'N/A';
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const getFpsColor = (fps: number) => {
    if (fps >= 55) return 'text-green-400';
    if (fps >= 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getVitalColor = (vital: string, value?: number) => {
    if (!value) return 'text-gray-400';
    
    switch (vital) {
      case 'fcp':
        return value < 1800 ? 'text-green-400' : value < 3000 ? 'text-yellow-400' : 'text-red-400';
      case 'lcp':
        return value < 2500 ? 'text-green-400' : value < 4000 ? 'text-yellow-400' : 'text-red-400';
      case 'fid':
        return value < 100 ? 'text-green-400' : value < 300 ? 'text-yellow-400' : 'text-red-400';
      case 'cls':
        return value < 0.1 ? 'text-green-400' : value < 0.25 ? 'text-yellow-400' : 'text-red-400';
      case 'ttfb':
        return value < 800 ? 'text-green-400' : value < 1800 ? 'text-yellow-400' : 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  // Show only in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <>
      {/* Toggle Button */}
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(!isVisible)}
          className="bg-black bg-opacity-70 text-white p-2 rounded-full hover:bg-opacity-90 transition-all"
          title="Toggle Performance Monitor (Ctrl+Shift+P)"
        >
          {isVisible ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>

      {/* Performance Monitor Panel */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed top-4 right-4 z-40 bg-black bg-opacity-90 text-white p-4 rounded-lg text-sm font-mono max-w-sm"
          >
            <div className="flex items-center mb-3">
              <Activity size={16} className="mr-2" />
              <h3 className="font-bold">Performance Monitor</h3>
            </div>

            {/* FPS and Memory */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <div className="flex items-center mb-1">
                  <Zap size={12} className="mr-1" />
                  <span className="text-xs">FPS</span>
                </div>
                <div className={`font-bold ${getFpsColor(performanceData.fps)}`}>
                  {performanceData.fps}
                </div>
              </div>
              
              <div>
                <div className="flex items-center mb-1">
                  <TrendingUp size={12} className="mr-1" />
                  <span className="text-xs">Memory</span>
                </div>
                <div className="text-blue-400 font-bold">
                  {performanceData.memoryUsage}MB
                </div>
              </div>
            </div>

            {/* Web Vitals */}
            <div className="mb-3">
              <h4 className="text-xs font-semibold mb-2 text-yellow-400">Web Vitals</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-400">FCP:</span>
                  <span className={`ml-1 ${getVitalColor('fcp', performanceData.vitals.fcp)}`}>
                    {formatMs(performanceData.vitals.fcp)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">LCP:</span>
                  <span className={`ml-1 ${getVitalColor('lcp', performanceData.vitals.lcp)}`}>
                    {formatMs(performanceData.vitals.lcp)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">FID:</span>
                  <span className={`ml-1 ${getVitalColor('fid', performanceData.vitals.fid)}`}>
                    {formatMs(performanceData.vitals.fid)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">CLS:</span>
                  <span className={`ml-1 ${getVitalColor('cls', performanceData.vitals.cls)}`}>
                    {performanceData.vitals.cls?.toFixed(3) || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">TTFB:</span>
                  <span className={`ml-1 ${getVitalColor('ttfb', performanceData.vitals.ttfb)}`}>
                    {formatMs(performanceData.vitals.ttfb)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Load:</span>
                  <span className="ml-1 text-purple-400">
                    {formatMs(getPageLoadTime() || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Cache Stats */}
            <div className="mb-3">
              <h4 className="text-xs font-semibold mb-2 text-green-400">Cache Stats</h4>
              <div className="text-xs space-y-1">
                <div>
                  <span className="text-gray-400">Memory:</span>
                  <span className="ml-1 text-green-400">
                    {performanceData.cacheStats.memoryEntries} entries
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Storage:</span>
                  <span className="ml-1 text-blue-400">
                    {performanceData.cacheStats.localStorageEntries} entries
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Size:</span>
                  <span className="ml-1 text-yellow-400">
                    {formatBytes(performanceData.cacheStats.totalSize)}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-400 border-t border-gray-600 pt-2">
              <Clock size={10} className="inline mr-1" />
              Press Ctrl+Shift+P to toggle
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default PerformanceMonitor;