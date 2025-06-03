import React, { useRef, useEffect, useState } from 'react';
import { Canvas, PencilBrush } from 'fabric';

// Phase 1 color palette - using design system colors
const colorPalette = [
  '#121212', // Black
  '#FF3366', // Primary 
  '#33CCFF', // Secondary
  '#FFCC00', // Accent
  '#22C55E', // Success
  '#EF4444', // Error
  '#F59E0B', // Warning
  '#666666', // Medium Gray
];

// Brush sizes for Phase 1
const brushSizes = [2, 5, 10, 15];

const DrawingCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const [isDrawMode, setIsDrawMode] = useState(true);
  const [currentColor, setCurrentColor] = useState('#121212');
  const [currentBrushSize, setCurrentBrushSize] = useState(5);
  const [showColorPalette, setShowColorPalette] = useState(false);
  const [showBrushSizes, setShowBrushSizes] = useState(false);

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const fabricCanvas = new Canvas(canvasRef.current, {
      isDrawingMode: true,
      backgroundColor: '#ffffff',
      selection: false,
    });

    // Set up pencil brush with default settings
    const brush = new PencilBrush(fabricCanvas);
    brush.width = currentBrushSize;
    brush.color = currentColor;
    fabricCanvas.freeDrawingBrush = brush;

    // Set canvas size to full viewport
    const resizeCanvas = () => {
      fabricCanvas.setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    setCanvas(fabricCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      fabricCanvas.dispose();
    };
  }, []);

  // Update brush when settings change
  useEffect(() => {
    if (!canvas || !canvas.freeDrawingBrush) return;

    const brush = new PencilBrush(canvas);
    brush.width = currentBrushSize;
    brush.color = isDrawMode ? currentColor : '#ffffff'; // Use white for erasing
    canvas.freeDrawingBrush = brush;
    canvas.isDrawingMode = true;
  }, [canvas, isDrawMode, currentColor, currentBrushSize]);

  const toggleDrawEraseMode = () => {
    setIsDrawMode(!isDrawMode);
  };

  const selectColor = (color: string) => {
    setCurrentColor(color);
    setShowColorPalette(false); // Dismiss palette after selection
  };

  const selectBrushSize = (size: number) => {
    setCurrentBrushSize(size);
    setShowBrushSizes(false); // Dismiss brush sizes after selection
  };

  const clearCanvas = () => {
    if (canvas) {
      canvas.clear();
      canvas.backgroundColor = '#ffffff';
      canvas.renderAll();
    }
  };

  const toggleColorPalette = () => {
    setShowColorPalette(!showColorPalette);
    // Close brush sizes if open
    if (showBrushSizes) setShowBrushSizes(false);
  };

  const toggleBrushSizes = () => {
    setShowBrushSizes(!showBrushSizes);
    // Close color palette if open
    if (showColorPalette) setShowColorPalette(false);
  };

  return (
    <div className="relative w-full h-screen bg-gray-50">
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ touchAction: 'none' }}
      />

      {/* Color palette popup - shows above toolbar when active */}
      {showColorPalette && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 flex flex-wrap justify-center gap-5 p-6 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg max-w-xs">
          {colorPalette.map((color) => (
            <button
              key={color}
              onClick={() => selectColor(color)}
              className={`w-11 h-11 rounded-full border-2 transition-all duration-150 ease-out ${
                currentColor === color 
                  ? 'border-[#333333] scale-110 shadow-md' 
                  : 'border-[#CCCCCC] hover:border-[#666666]'
              }`}
              style={{ backgroundColor: color }}
              aria-label={`Select ${color} color`}
            />
          ))}
        </div>
      )}

      {/* Brush size popup - shows above toolbar when active */}
      {showBrushSizes && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 flex gap-3 p-4 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg">
          {brushSizes.map((size) => (
            <button
              key={size}
              onClick={() => selectBrushSize(size)}
              className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-150 ease-out ${
                currentBrushSize === size 
                  ? 'bg-[#FF336610] ring-2 ring-[#FF3366]' 
                  : 'hover:bg-[#F8F8F8]'
              }`}
              aria-label={`Select brush size ${size}px`}
            >
              <div
                className="bg-[#121212] rounded-full"
                style={{
                  width: `${Math.min(size + 2, 16)}px`,
                  height: `${Math.min(size + 2, 16)}px`,
                }}
              />
            </button>
          ))}
        </div>
      )}

      {/* Mobile-first toolbar - using design system spacing and shadows */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-3 px-6 py-4 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg">
        {/* Draw/Erase toggle - shows what you'll switch TO */}
        <button
          onClick={toggleDrawEraseMode}
          className={`min-w-11 min-h-11 rounded-lg flex items-center justify-center text-lg font-semibold font-montserrat transition-all duration-150 ease-out ${
            isDrawMode 
              ? 'bg-[#EF4444] text-white shadow-md hover:bg-[#DC2626] active:bg-[#B91C1C]' 
              : 'bg-[#FF3366] text-white shadow-md hover:bg-[#E62E5A] active:bg-[#CC2951]'
          }`}
          aria-label={isDrawMode ? 'Switch to eraser mode' : 'Switch to drawing mode'}
        >
          {isDrawMode ? '🧽' : '✏️'}
        </button>

        {/* Colors button - shows current color and opens palette */}
        <button
          onClick={toggleColorPalette}
          className={`min-w-11 min-h-11 rounded-lg flex items-center justify-center border-2 transition-all duration-150 ease-out ${
            showColorPalette
              ? 'border-[#FF3366] bg-[#FF336610] shadow-md'
              : 'border-[#CCCCCC] hover:border-[#666666]'
          }`}
          aria-label="Open color palette"
        >
          <div
            className="w-6 h-6 rounded-full border border-white shadow-sm"
            style={{ backgroundColor: currentColor }}
          />
        </button>

        {/* Brush size button - shows current size and opens brush sizes */}
        <button
          onClick={toggleBrushSizes}
          className={`min-w-11 min-h-11 rounded-lg flex items-center justify-center border-2 transition-all duration-150 ease-out ${
            showBrushSizes
              ? 'border-[#FF3366] bg-[#FF336610] shadow-md'
              : 'border-[#CCCCCC] hover:border-[#666666]'
          }`}
          aria-label="Open brush size selector"
        >
          <div
            className="bg-[#121212] rounded-full"
            style={{
              width: `${Math.min(currentBrushSize + 2, 16)}px`,
              height: `${Math.min(currentBrushSize + 2, 16)}px`,
            }}
          />
        </button>

        {/* Clear button - using design system secondary button style */}
        <button
          onClick={clearCanvas}
          className="min-w-11 min-h-11 rounded-lg flex items-center justify-center text-lg font-semibold font-montserrat transition-all duration-150 ease-out bg-transparent border-2 border-[#666666] text-[#666666] hover:bg-[#66666610] active:bg-[#66666620]"
          aria-label="Clear canvas"
        >
          🗑️
        </button>
      </div>

      {/* Status indicator - using design system typography and colors */}
      <div className="fixed top-6 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-white/95 backdrop-blur-md rounded-lg shadow-sm">
        <span className="text-sm font-medium font-poppins text-[#666666]">
          {isDrawMode ? 'Drawing' : 'Erasing'} • {currentBrushSize}px
        </span>
      </div>
    </div>
  );
};

export default DrawingCanvas; 