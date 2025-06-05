import React, { Suspense } from 'react';
import Seo from '../components/utils/Seo';

// Dynamic import to avoid loading Excalidraw on initial bundle
const ExcalidrawCanvas = React.lazy(() => import('../components/excalidraw/ExcalidrawCanvas'));

const ExcalidrawDraw = () => {
  return (
    <>
      <Seo 
        title="Excalidraw Draw - SketchyAF"
        description="Create amazing drawings with Excalidraw integration"
      />
      <div className="min-h-screen bg-white">
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading drawing canvas...</p>
            </div>
          </div>
        }>
          <ExcalidrawCanvas />
        </Suspense>
      </div>
    </>
  );
};

export default ExcalidrawDraw; 