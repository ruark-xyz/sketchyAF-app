import React from 'react';
import DrawingCanvas from '../components/canvas/DrawingCanvas';
import Seo from '../components/utils/Seo';

const Draw = () => {
  return (
    <>
      <Seo 
        title="Draw - SketchyAF"
        description="Create amazing drawings with our mobile-first canvas drawing tool"
      />
      <div className="min-h-screen bg-white">
        <DrawingCanvas />
      </div>
    </>
  );
};

export default Draw; 