import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, PencilBrush } from 'fabric';
import { Pencil, Eraser, Trash2, Undo2, Redo2 } from 'lucide-react';
import debounce from 'lodash.debounce';

// Maximum number of states to store (from PRD requirements)
const MAX_HISTORY = 10;

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
  
  // History management
  const [historyStack, setHistoryStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [currentStateIndex, setCurrentStateIndex] = useState(-1);

  // Debounced save function to prevent excessive history entries
  const debouncedSaveToHistory = useCallback(
    debounce((fabricCanvas: Canvas) => {
      const canvasState = JSON.stringify(fabricCanvas.toJSON());
      
      setHistoryStack(prevStack => {
        // Remove any states after current index
        const newStack = prevStack.slice(0, currentStateIndex + 1);
        // Add new state
        const updatedStack = [...newStack, canvasState];
        // Keep only the last MAX_HISTORY states
        return updatedStack.slice(-MAX_HISTORY);
      });
      
      setCurrentStateIndex(prevIndex => {
        const newIndex = prevIndex + 1;
        return Math.min(newIndex, MAX_HISTORY - 1);
      });
      
      // Clear redo stack when new action is performed
      setRedoStack([]);
    }, 300),
    [currentStateIndex]
  );

  // Save current state to history
  const saveToHistory = useCallback(() => {
    if (!canvas) return;
    debouncedSaveToHistory(canvas);
  }, [canvas, debouncedSaveToHistory]);

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

    // Set up event listeners for history management
    fabricCanvas.on('path:created', () => saveToHistory());
    fabricCanvas.on('object:added', () => saveToHistory());
    fabricCanvas.on('object:removed', () => saveToHistory());

    setCanvas(fabricCanvas);
    
    // Save initial state
    const initialState = JSON.stringify(fabricCanvas.toJSON());
    setHistoryStack([initialState]);
    setCurrentStateIndex(0);

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, []);

  const toggleDrawEraseMode = () => {
    setIsDrawMode(!isDrawMode);
  };

  const selectColor = (color: string) => {
    setCurrentColor(color);
    setShowColorPalette(false);
  };

  const selectBrushSize = (size: number) => {
    setCurrentBrushSize(size);
    setShowBrushSizes(false);
  };

  const clearCanvas = () => {
    if (canvas) {
      canvas.clear();
      canvas.backgroundColor = '#ffffff';
      canvas.renderAll();
      saveToHistory();
    }
  };

  const handleUndo = () => {
    if (!canvas || currentStateIndex <= 0) return;

    // Provide haptic feedback on mobile
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    const previousState = historyStack[currentStateIndex - 1];
    const currentState = historyStack[currentStateIndex];
    
    // Add current state to redo stack
    setRedoStack(prev => [...prev, currentState]);
    
    // Load previous state
    canvas.loadFromJSON(previousState, () => {
      canvas.renderAll();
      setCurrentStateIndex(prev => prev - 1);
    });
  };

  const handleRedo = () => {
    if (!canvas || redoStack.length === 0) return;

    // Provide haptic feedback on mobile
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    const nextState = redoStack[redoStack.length - 1];
    
    // Load next state
    canvas.loadFromJSON(nextState, () => {
      canvas.renderAll();
      
      // Update history stacks
      setHistoryStack(prev => [...prev, nextState]);
      setRedoStack(prev => prev.slice(0, -1));
      setCurrentStateIndex(prev => prev + 1);
    });
  };

  const toggleColorPalette = () => {
    setShowColorPalette(!showColorPalette);
    if (showBrushSizes) setShowBrushSizes(false);
  };

  const toggleBrushSizes = () => {
    setShowBrushSizes(!showBrushSizes);
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

      {/* Color palette popup */}
      {showColorPalette && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 flex flex-wrap justify-center gap-5 p-6 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg max-w-xs z-50">
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

      {/* Brush size popup */}
      {showBrushSizes && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 flex gap-3 p-4 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg z-50">
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

      {/* Mobile-first toolbar */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-3 px-6 py-4 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg">
        {/* Draw/Erase toggle */}
        <button
          onClick={toggleDrawEraseMode}
          className={`min-w-11 min-h-11 rounded-lg flex items-center justify-center text-lg font-semibold font-montserrat transition-all duration-150 ease-out ${
            isDrawMode 
              ? 'bg-primary text-white shadow-md hover:bg-primary/80 active:bg-primary/90' 
              : 'bg-primary text-white shadow-md hover:bg-primary/80 active:bg-primary/90'
          }`}
          aria-label={isDrawMode ? 'Switch to eraser mode' : 'Switch to drawing mode'}
        >
          {isDrawMode ? (
            <Eraser size={20} className="transform rotate-[-2deg]" />
          ) : (
            <Pencil size={20} className="transform rotate-[3deg]" />
          )}
        </button>

        {/* Undo button */}
        <button
          onClick={handleUndo}
          disabled={currentStateIndex <= 0}
          className={`min-w-11 min-h-11 rounded-lg flex items-center justify-center transition-all duration-150 ease-out ${
            currentStateIndex <= 0
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-primary/10'
          }`}
          aria-label="Undo last action"
        >
          <Undo2 size={20} />
        </button>

        {/* Redo button */}
        <button
          onClick={handleRedo}
          disabled={redoStack.length === 0}
          className={`min-w-11 min-h-11 rounded-lg flex items-center justify-center transition-all duration-150 ease-out ${
            redoStack.length === 0
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-primary/10'
          }`}
          aria-label="Redo last undone action"
        >
          <Redo2 size={20} />
        </button>

        {/* Colors button */}
        <button
          onClick={toggleColorPalette}
          className={`min-w-11 min-h-11 rounded-lg flex items-center justify-center border-2 transition-all duration-150 ease-out ${
            showColorPalette
              ? 'border-primary bg-primary/10 shadow-md'
              : 'border-[#CCCCCC] hover:border-[#666666]'
          }`}
          aria-label="Open color palette"
        >
          <div
            className="w-6 h-6 rounded-full border border-white shadow-sm"
            style={{ backgroundColor: currentColor }}
          />
        </button>

        {/* Brush size button */}
        <button
          onClick={toggleBrushSizes}
          className={`min-w-11 min-h-11 rounded-lg flex items-center justify-center border-2 transition-all duration-150 ease-out ${
            showBrushSizes
              ? 'border-primary bg-primary/10 shadow-md'
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

        {/* Clear button */}
        <button
          onClick={clearCanvas}
          className="min-w-11 min-h-11 rounded-lg flex items-center justify-center text-lg font-semibold font-montserrat transition-all duration-150 ease-out bg-transparent border-2 border-[#666666] text-[#666666] hover:bg-[#66666610] active:bg-[#66666620]"
          aria-label="Clear canvas"
        >
          <Trash2 size={20} className="transform rotate-[1deg]" />
        </button>
      </div>

      {/* Status indicator */}
      <div className="fixed bottom-28 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-white/95 backdrop-blur-md rounded-lg shadow-sm">
        <span className="text-xs font-medium font-poppins text-[#666666]">
          {isDrawMode ? 'Drawing' : 'Erasing'} • {currentBrushSize}px
        </span>
      </div>
    </div>
  );
};

export default DrawingCanvas;