import React, { useState, useEffect } from 'react';

interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  renderTime: number;
}

const PerformanceMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    memoryUsage: 0,
    renderTime: 0,
  });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let lastFrameTime = performance.now();

    const measurePerformance = () => {
      const currentTime = performance.now();
      const deltaTime = currentTime - lastTime;
      frameCount++;

      // Calculate FPS every second
      if (deltaTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / deltaTime);
        
        // Get memory usage if available
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const memoryInfo = (performance as any).memory;
        const memoryUsage = memoryInfo 
          ? Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024) 
          : 0;

        // Calculate render time
        const renderTime = Math.round(currentTime - lastFrameTime);

        setMetrics({
          fps,
          memoryUsage,
          renderTime,
        });

        frameCount = 0;
        lastTime = currentTime;
      }

      lastFrameTime = currentTime;
      requestAnimationFrame(measurePerformance);
    };

    measurePerformance();
  }, []);

  // Toggle visibility with keyboard shortcut
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'p') {
        setIsVisible(!isVisible);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isVisible]);

  if (!isVisible) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs"
        >
          Show FPS
        </button>
      </div>
    );
  }

  const getFpsColor = () => {
    if (metrics.fps >= 55) return 'text-green-400';
    if (metrics.fps >= 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="fixed top-4 right-4 z-50 bg-black bg-opacity-80 text-white p-3 rounded-lg text-sm font-mono">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xs font-bold">Performance</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-xs opacity-70 hover:opacity-100"
        >
          ×
        </button>
      </div>
      
      <div className="space-y-1">
        <div className={`${getFpsColor()}`}>
          FPS: {metrics.fps}
        </div>
        <div className="text-blue-400">
          Memory: {metrics.memoryUsage}MB
        </div>
        <div className="text-purple-400">
          Render: {metrics.renderTime}ms
        </div>
      </div>
      
      <div className="text-xs opacity-50 mt-2">
        Ctrl+P to toggle
      </div>
    </div>
  );
};

export default PerformanceMonitor; 