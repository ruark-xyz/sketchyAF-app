import React, { useRef, useEffect, useCallback } from 'react';
import { Canvas, PencilBrush } from 'fabric';
import { Pencil, Eraser, Trash2, Undo2, Redo2 } from 'lucide-react';
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// History stack configuration
const MAX_HISTORY_DESKTOP = 10;
const MAX_HISTORY_MOBILE = 5;
const DEBOUNCE_DELAY = 300;

// Device detection atom
export const isMobileAtom = atom(() => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || window.innerWidth < 768;
});

// Dynamic max history based on device
export const maxHistoryAtom = atom((get) => 
  get(isMobileAtom) ? MAX_HISTORY_MOBILE : MAX_HISTORY_DESKTOP
);

// Core canvas atoms
const canvasAtom = atom<Canvas | null>(null);
const isInitializedAtom = atom(false);

// Drawing mode atoms
const isDrawModeAtom = atom(true);
const currentColorAtom = atomWithStorage('sketchy-color', '#121212');
const currentBrushSizeAtom = atomWithStorage('sketchy-brush-size', 5);

// UI state atoms
const showColorPaletteAtom = atom(false);
const showBrushSizesAtom = atom(false);

// Core history atoms
export const historyStackAtom = atom<string[]>([]);
export const redoStackAtom = atom<string[]>([]);
export const currentStateIndexAtom = atom(-1);
export const isUndoingAtom = atom(false);
export const isRedoingAtom = atom(false);

// History management derived atoms
export const canUndoAtom = atom((get) => {
  const currentIndex = get(currentStateIndexAtom);
  const isUndoing = get(isUndoingAtom);
  return currentIndex > 0 && !isUndoing;
});

export const canRedoAtom = atom((get) => {
  const redoStack = get(redoStackAtom);
  const isRedoing = get(isRedoingAtom);
  return redoStack.length > 0 && !isRedoing;
});

// Brush configuration atom
const brushConfigAtom = atom((get) => ({
  width: get(currentBrushSizeAtom),
  color: get(currentColorAtom),
  strokeLineCap: 'round' as const,
  strokeLineJoin: 'round' as const,
  decimate: get(isMobileAtom) ? 2 : 1 // Mobile optimization
}));

// Timeout storage for debouncing
let debouncedSaveTimeout: number | null = null;

// Debounced history save atom
export const debouncedSaveHistoryAtom = atom(
  null,
  (get, set, canvas: Canvas) => {
    // Don't save history during undo/redo operations
    if (get(isUndoingAtom) || get(isRedoingAtom)) {
      console.log('🚫 [HISTORY] Skipping debounced save - undo/redo in progress');
      return;
    }
    
    console.log('🔄 [HISTORY] Debounced save triggered');
    
    // Clear any existing timeout
    if (debouncedSaveTimeout) {
      console.log('⏰ [HISTORY] Clearing existing debounced timeout');
      clearTimeout(debouncedSaveTimeout);
    }

    // Set new timeout for debounced save
    debouncedSaveTimeout = setTimeout(() => {
      // Double-check we're not in undo/redo when timeout executes
      if (get(isUndoingAtom) || get(isRedoingAtom)) {
        console.log('🚫 [HISTORY] Skipping debounced save execution - undo/redo in progress');
        return;
      }
      
      console.log('💾 [HISTORY] Executing debounced save');
      
      const canvasState = JSON.stringify(canvas.toJSON());
      const currentIndex = get(currentStateIndexAtom);
      const maxHistory = get(maxHistoryAtom);
      const historyStackBefore = get(historyStackAtom);
      
      console.log('📊 [HISTORY] Before save:', {
        currentIndex,
        maxHistory,
        historyLength: historyStackBefore.length,
        canvasObjectCount: canvas.getObjects().length
      });
      
      set(historyStackAtom, (prevStack) => {
        // Remove any states after current index (for new branches)
        const newStack = prevStack.slice(0, currentIndex + 1);
        // Add new state
        const updatedStack = [...newStack, canvasState];
        // Keep only the last maxHistory states
        const finalStack = updatedStack.slice(-maxHistory);
        
        console.log('📚 [HISTORY] Stack updated:', {
          beforeLength: prevStack.length,
          afterSlice: newStack.length,
          afterAdd: updatedStack.length,
          finalLength: finalStack.length,
          newStateObjectCount: JSON.parse(canvasState).objects?.length || 0
        });
        
        return finalStack;
      });
      
      set(currentStateIndexAtom, (prevIndex) => {
        const newIndex = prevIndex + 1;
        const finalIndex = Math.min(newIndex, maxHistory - 1);
        
        console.log('🎯 [HISTORY] Index updated:', {
          prevIndex,
          newIndex,
          finalIndex
        });
        
        return finalIndex;
      });
      
      // Clear redo stack when new action is performed
      set(redoStackAtom, (prevRedo) => {
        console.log('🗑️ [HISTORY] Clearing redo stack, had:', prevRedo.length, 'states');
        return [];
      });
      
      // Trigger haptic feedback on mobile
      if (get(isMobileAtom) && navigator.vibrate) {
        navigator.vibrate(25);
        console.log('📳 [MOBILE] Haptic feedback triggered');
      }
      
      console.log('✅ [HISTORY] Debounced save completed');
    }, DEBOUNCE_DELAY);
    
    console.log(`⏱️ [HISTORY] Debounced save scheduled for ${DEBOUNCE_DELAY}ms`);
  }
);

// Immediate history save atom (for critical actions)
export const immediateHistorySaveAtom = atom(
  null,
  (get, set, canvas: Canvas) => {
    // Don't save history during undo/redo operations
    if (get(isUndoingAtom) || get(isRedoingAtom)) {
      console.log('🚫 [HISTORY] Skipping immediate save - undo/redo in progress');
      return;
    }
    
    console.log('⚡ [HISTORY] Immediate save triggered');
    
    // Cancel any pending debounced save
    if (debouncedSaveTimeout) {
      console.log('⏰ [HISTORY] Cancelling pending debounced save for immediate save');
      clearTimeout(debouncedSaveTimeout);
    }
    
    const canvasState = JSON.stringify(canvas.toJSON());
    const currentIndex = get(currentStateIndexAtom);
    const maxHistory = get(maxHistoryAtom);
    const historyStackBefore = get(historyStackAtom);
    
    console.log('📊 [HISTORY] Immediate save state:', {
      currentIndex,
      maxHistory,
      historyLength: historyStackBefore.length,
      canvasObjectCount: canvas.getObjects().length
    });
    
    set(historyStackAtom, (prevStack) => {
      const newStack = prevStack.slice(0, currentIndex + 1);
      const updatedStack = [...newStack, canvasState];
      const finalStack = updatedStack.slice(-maxHistory);
      
      console.log('📚 [HISTORY] Immediate stack update:', {
        beforeLength: prevStack.length,
        finalLength: finalStack.length
      });
      
      return finalStack;
    });
    
    set(currentStateIndexAtom, (prevIndex) => {
      const newIndex = Math.min(prevIndex + 1, maxHistory - 1);
      console.log('🎯 [HISTORY] Immediate index update:', prevIndex, '->', newIndex);
      return newIndex;
    });
    
    set(redoStackAtom, []);
    console.log('✅ [HISTORY] Immediate save completed');
  }
);

// Undo action atom with enhanced error handling
export const undoActionAtom = atom(
  null,
  async (get, set, canvas: Canvas) => {
    console.log('↶ [UNDO] Undo action initiated');
    
    const canUndo = get(canUndoAtom);
    const currentIndex = get(currentStateIndexAtom);
    const historyStack = get(historyStackAtom);
    const redoStackBefore = get(redoStackAtom);
    
    console.log('📊 [UNDO] Current state:', {
      canUndo,
      currentIndex,
      historyLength: historyStack.length,
      redoLength: redoStackBefore.length,
      currentCanvasObjects: canvas.getObjects().length
    });
    
    if (!canUndo || !canvas) {
      console.log('❌ [UNDO] Cannot undo - conditions not met');
      return false;
    }
    
    try {
      set(isUndoingAtom, true);
      console.log('🔄 [UNDO] Setting undoing state to true');
      
      // Provide haptic feedback on mobile
      if (get(isMobileAtom) && navigator.vibrate) {
        navigator.vibrate(50);
        console.log('📳 [UNDO] Mobile haptic feedback triggered');
      }
      
      const previousState = historyStack[currentIndex - 1];
      const currentState = historyStack[currentIndex];
      
      if (!previousState) {
        console.error('❌ [UNDO] No previous state found at index:', currentIndex - 1);
        return false;
      }
      
      console.log('📄 [UNDO] States:', {
        previousStateObjects: JSON.parse(previousState).objects?.length || 0,
        currentStateObjects: JSON.parse(currentState).objects?.length || 0,
        targetIndex: currentIndex - 1
      });
      
      // Add current state to redo stack
      set(redoStackAtom, (prev) => {
        const newRedo = [...prev, currentState];
        console.log('➕ [UNDO] Added to redo stack, new length:', newRedo.length);
        return newRedo;
      });
      
      // Load previous state
      console.log('🔄 [UNDO] Loading previous state...');
      await new Promise<void>((resolve) => {
        canvas.loadFromJSON(previousState, () => {
          console.log('✅ [UNDO] Canvas loaded from JSON');
          canvas.renderAll();
          console.log('🎨 [UNDO] Canvas rendered, new object count:', canvas.getObjects().length);
          
          set(currentStateIndexAtom, (prev) => {
            const newIndex = prev - 1;
            console.log('🎯 [UNDO] Index decremented:', prev, '->', newIndex);
            return newIndex;
          });
          
          resolve();
        });
      });
      
      console.log('✅ [UNDO] Undo completed successfully');
      return true;
    } catch (error) {
      console.error('❌ [UNDO] Undo failed with error:', error);
      return false;
    } finally {
      set(isUndoingAtom, false);
      console.log('🔄 [UNDO] Setting undoing state to false');
    }
  }
);

// Redo action atom with enhanced error handling
export const redoActionAtom = atom(
  null,
  async (get, set, canvas: Canvas) => {
    console.log('↷ [REDO] Redo action initiated');
    
    const canRedo = get(canRedoAtom);
    const redoStack = get(redoStackAtom);
    const currentIndex = get(currentStateIndexAtom);
    
    console.log('📊 [REDO] Current state:', {
      canRedo,
      currentIndex,
      redoLength: redoStack.length,
      currentCanvasObjects: canvas.getObjects().length
    });
    
    if (!canRedo || !canvas) {
      console.log('❌ [REDO] Cannot redo - conditions not met');
      return false;
    }
    
    try {
      set(isRedoingAtom, true);
      console.log('🔄 [REDO] Setting redoing state to true');
      
      // Provide haptic feedback on mobile
      if (get(isMobileAtom) && navigator.vibrate) {
        navigator.vibrate(50);
        console.log('📳 [REDO] Mobile haptic feedback triggered');
      }
      
      const nextState = redoStack[redoStack.length - 1];
      console.log('📄 [REDO] Next state objects:', JSON.parse(nextState).objects?.length || 0);
      
      // Load next state
      console.log('🔄 [REDO] Loading next state...');
      await new Promise<void>((resolve) => {
        canvas.loadFromJSON(nextState, () => {
          console.log('✅ [REDO] Canvas loaded from JSON');
          canvas.renderAll();
          console.log('🎨 [REDO] Canvas rendered, new object count:', canvas.getObjects().length);
          
          // Update history stacks
          set(historyStackAtom, (prev) => {
            const newHistory = [...prev, nextState];
            console.log('📚 [REDO] History stack updated, new length:', newHistory.length);
            return newHistory;
          });
          
          set(redoStackAtom, (prev) => {
            const newRedo = prev.slice(0, -1);
            console.log('📚 [REDO] Redo stack updated, new length:', newRedo.length);
            return newRedo;
          });
          
          set(currentStateIndexAtom, (prev) => {
            const newIndex = prev + 1;
            console.log('🎯 [REDO] Index incremented:', prev, '->', newIndex);
            return newIndex;
          });
          
          resolve();
        });
      });
      
      console.log('✅ [REDO] Redo completed successfully');
      return true;
    } catch (error) {
      console.error('❌ [REDO] Redo failed with error:', error);
      return false;
    } finally {
      set(isRedoingAtom, false);
      console.log('🔄 [REDO] Setting redoing state to false');
    }
  }
);

// Canvas initialization atom
const initializeCanvasAtom = atom(
  null,
  (get, set, canvasElement: HTMLCanvasElement) => {
    if (get(isInitializedAtom)) return get(canvasAtom);

    const fabricCanvas = new Canvas(canvasElement, {
      isDrawingMode: true,
      backgroundColor: '#ffffff',
      selection: false,
      allowTouchScrolling: false,
      containerClass: 'canvas-container',
      // Mobile optimizations
      renderOnAddRemove: false,
      skipOffscreen: true,
      enableRetinaScaling: true,
    });

    // Mobile optimizations
    fabricCanvas.freeDrawingBrush = new PencilBrush(fabricCanvas);
    const brushConfig = get(brushConfigAtom);
    Object.assign(fabricCanvas.freeDrawingBrush, brushConfig);

    // Set up canvas sizing
    const resizeCanvas = () => {
      fabricCanvas.setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Set up event listeners for history management
    const debouncedSave = () => {
      console.log('🎨 [CANVAS] Triggering debounced save');
      set(debouncedSaveHistoryAtom, fabricCanvas);
    };
    const immediateSave = () => {
      console.log('🎨 [CANVAS] Triggering immediate save');
      set(immediateHistorySaveAtom, fabricCanvas);
    };

    fabricCanvas.on('path:created', (e) => {
      const path = e.path;
      console.log('✏️ [CANVAS] Path created:', {
        pathType: path.type,
        totalObjects: fabricCanvas.getObjects().length
      });
      
      path.set({
        strokeLineCap: 'round',
        strokeLineJoin: 'round'
      });
      
      debouncedSave();
    });
    
    fabricCanvas.on('object:added', (e) => {
      console.log('➕ [CANVAS] Object added:', {
        objectType: e.target?.type,
        totalObjects: fabricCanvas.getObjects().length
      });
      immediateSave();
    });
    
    fabricCanvas.on('object:removed', (e) => {
      console.log('➖ [CANVAS] Object removed:', {
        objectType: e.target?.type,
        totalObjects: fabricCanvas.getObjects().length
      });
      immediateSave();
    });

    set(canvasAtom, fabricCanvas);
    set(isInitializedAtom, true);
    
    // Save initial state
    const initialState = JSON.stringify(fabricCanvas.toJSON());
    console.log('🆕 [INIT] Saving initial canvas state:', {
      objectCount: fabricCanvas.getObjects().length
    });
    
    set(historyStackAtom, [initialState]);
    set(currentStateIndexAtom, 0);
    
    console.log('✅ [INIT] Canvas initialization completed');
    
    return fabricCanvas;
  }
);

// Toggle eraser mode atom (using white color for erasing effect)
const toggleEraserAtom = atom(
  (get) => get(isDrawModeAtom),
  (get, set, canvas: Canvas) => {
    const isDrawMode = !get(isDrawModeAtom);
    set(isDrawModeAtom, isDrawMode);
    
    const brush = new PencilBrush(canvas);
    brush.width = get(currentBrushSizeAtom);
    brush.strokeLineCap = 'round';
    brush.strokeLineJoin = 'round';
    brush.decimate = get(isMobileAtom) ? 2 : 1;
    
    if (isDrawMode) {
      brush.color = get(currentColorAtom);
    } else {
      // Use white color for erasing effect
      brush.color = '#ffffff';
    }
    
    canvas.freeDrawingBrush = brush;
    
    // Save state change
    set(immediateHistorySaveAtom, canvas);
  }
);

// Color selection atom
const selectColorAtom = atom(
  null,
  (get, set, color: string) => {
    set(currentColorAtom, color);
    set(showColorPaletteAtom, false);
    
    // Update brush color if in drawing mode
    const canvas = get(canvasAtom);
    if (canvas && canvas.freeDrawingBrush && get(isDrawModeAtom)) {
      canvas.freeDrawingBrush.color = color;
    }
  }
);

// Brush size selection atom
const selectBrushSizeAtom = atom(
  null,
  (get, set, size: number) => {
    set(currentBrushSizeAtom, size);
    set(showBrushSizesAtom, false);
    
    // Update current brush size
    const canvas = get(canvasAtom);
    if (canvas && canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.width = size;
    }
  }
);

// Clear canvas atom
const clearCanvasAtom = atom(
  null,
  (get, set, canvas: Canvas) => {
    canvas.clear();
    canvas.backgroundColor = '#ffffff';
    canvas.renderAll();
    set(immediateHistorySaveAtom, canvas);
  }
);

// Custom hook for undo/redo functionality
export const useUndoRedo = (canvas: Canvas | null) => {
  const [, undo] = useAtom(undoActionAtom);
  const [, redo] = useAtom(redoActionAtom);
  
  const canUndo = useAtomValue(canUndoAtom);
  const canRedo = useAtomValue(canRedoAtom);
  const isUndoing = useAtomValue(isUndoingAtom);
  const isRedoing = useAtomValue(isRedoingAtom);
  
  const handleUndo = useCallback(async () => {
    if (canvas && canUndo) {
      return await undo(canvas);
    }
    return false;
  }, [canvas, canUndo, undo]);
  
  const handleRedo = useCallback(async () => {
    if (canvas && canRedo) {
      return await redo(canvas);
    }
    return false;
  }, [canvas, canRedo, redo]);
  
  return {
    undo: handleUndo,
    redo: handleRedo,
    canUndo,
    canRedo,
    isUndoing,
    isRedoing
  };
};

// Phase 1 color palette - using design system colors
const colorPalette = [
  '#121212', // Black (design system)
  '#FF3366', // Primary brand color
  '#33CCFF', // Secondary brand color
  '#FFCC00', // Accent brand color
  '#22C55E', // Success green
  '#EF4444', // Error red
  '#F59E0B', // Warning orange
  '#666666', // Medium gray
];

// Brush sizes for Phase 1
const brushSizes = [2, 5, 10, 15];

const DrawingCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Jotai state hooks
  const canvas = useAtomValue(canvasAtom);
  const [, initializeCanvas] = useAtom(initializeCanvasAtom);
  const isDrawMode = useAtomValue(isDrawModeAtom);
  const currentColor = useAtomValue(currentColorAtom);
  const currentBrushSize = useAtomValue(currentBrushSizeAtom);
  const showColorPalette = useAtomValue(showColorPaletteAtom);
  const showBrushSizes = useAtomValue(showBrushSizesAtom);
  const isMobile = useAtomValue(isMobileAtom);
  
  // Action atoms
  const [, toggleEraser] = useAtom(toggleEraserAtom);
  const [, selectColor] = useAtom(selectColorAtom);
  const [, selectBrushSize] = useAtom(selectBrushSizeAtom);
  const [, clearCanvas] = useAtom(clearCanvasAtom);
  const setShowColorPalette = useSetAtom(showColorPaletteAtom);
  const setShowBrushSizes = useSetAtom(showBrushSizesAtom);
  
  // Undo/redo functionality
  const { undo, redo, canUndo, canRedo, isUndoing, isRedoing } = useUndoRedo(canvas);

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    initializeCanvas(canvasRef.current);
  }, [initializeCanvas]);

  // Update brush when settings change
  useEffect(() => {
    if (!canvas || !canvas.freeDrawingBrush) return;

    const brush = new PencilBrush(canvas);
    brush.width = currentBrushSize;
    brush.strokeLineCap = 'round';
    brush.strokeLineJoin = 'round';
    brush.decimate = isMobile ? 2 : 1;
    
    if (isDrawMode) {
      brush.color = currentColor;
    } else {
      // Use white color for erasing effect
      brush.color = '#ffffff';
    }
    
    canvas.freeDrawingBrush = brush;
    canvas.isDrawingMode = true;
  }, [canvas, isDrawMode, currentColor, currentBrushSize, isMobile]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = async (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        await undo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Z')
      ) {
        e.preventDefault();
        await redo();
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [undo, redo]);

  const handleToggleDrawEraseMode = () => {
    if (canvas) {
      toggleEraser(canvas);
    }
  };

  const handleSelectColor = (color: string) => {
    selectColor(color);
  };

  const handleSelectBrushSize = (size: number) => {
    selectBrushSize(size);
  };

  const handleClearCanvas = () => {
    if (canvas) {
      clearCanvas(canvas);
    }
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
        style={{ 
          touchAction: 'none',
          WebkitTapHighlightColor: 'transparent'
        }}
      />

      {/* Color palette popup */}
      {showColorPalette && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 flex flex-wrap justify-center gap-5 p-6 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg max-w-xs z-50">
          {colorPalette.map((color) => (
            <button
              key={color}
              onClick={() => handleSelectColor(color)}
              className={`w-11 h-11 rounded-full border-2 transition-all duration-150 ease-out ${
                currentColor === color 
                  ? 'border-[#FF3366] scale-110 shadow-md ring-2 ring-[#FF3366]/30' 
                  : 'border-[#CCCCCC] hover:border-[#666666] hover:scale-105'
              }`}
              style={{ 
                backgroundColor: color,
                touchAction: 'manipulation'
              }}
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
              onClick={() => handleSelectBrushSize(size)}
              className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-150 ease-out ${
                currentBrushSize === size 
                  ? 'bg-[#FF3366]/10 ring-2 ring-[#FF3366]' 
                  : 'hover:bg-[#F8F8F8] active:scale-95'
              }`}
              style={{ touchAction: 'manipulation' }}
              aria-label={`Select brush size ${size}px`}
            >
              <div
                className={`rounded-full ${currentBrushSize === size ? 'bg-[#FF3366]' : 'bg-[#121212]'}`}
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
          onClick={handleToggleDrawEraseMode}
          className={`min-w-11 min-h-11 rounded-lg flex items-center justify-center text-lg font-semibold font-montserrat transition-all duration-150 ease-out ${
            isDrawMode 
              ? 'bg-primary text-white shadow-md hover:bg-primary/80 active:scale-95' 
              : 'bg-primary text-white shadow-md hover:bg-primary/80 active:scale-95'
          }`}
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          aria-label={isDrawMode ? 'Switch to eraser mode' : 'Switch to drawing mode'}
        >
          {isDrawMode ? (
            <Pencil size={isMobile ? 22 : 20} className="transform rotate-[3deg]" />
          ) : (
            <Eraser size={isMobile ? 22 : 20} className="transform rotate-[-2deg]" />
          )}
        </button>

        {/* Undo button */}
        <button
          onClick={undo}
          disabled={!canUndo || isUndoing}
          className={`min-w-11 min-h-11 rounded-lg flex items-center justify-center transition-all duration-150 ease-out ${
            !canUndo || isUndoing
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-primary/10 active:scale-95'
          }`}
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          aria-label="Undo last action"
        >
          <Undo2 
            size={isMobile ? 22 : 20} 
            className={isUndoing ? 'animate-spin' : ''}
          />
        </button>

        {/* Redo button */}
        <button
          onClick={redo}
          disabled={!canRedo || isRedoing}
          className={`min-w-11 min-h-11 rounded-lg flex items-center justify-center transition-all duration-150 ease-out ${
            !canRedo || isRedoing
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-primary/10 active:scale-95'
          }`}
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          aria-label="Redo last undone action"
        >
          <Redo2 
            size={isMobile ? 22 : 20} 
            className={isRedoing ? 'animate-spin' : ''}
          />
        </button>

        {/* Colors button */}
        <button
          onClick={toggleColorPalette}
          className={`min-w-11 min-h-11 rounded-lg flex items-center justify-center border-2 transition-all duration-150 ease-out ${
            showColorPalette
              ? 'border-primary bg-primary/10 shadow-md'
              : 'border-[#CCCCCC] hover:border-[#666666] active:scale-95'
          }`}
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
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
              : 'border-[#CCCCCC] hover:border-[#666666] active:scale-95'
          }`}
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
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
          onClick={handleClearCanvas}
          className="min-w-11 min-h-11 rounded-lg flex items-center justify-center text-lg font-semibold font-montserrat transition-all duration-150 ease-out bg-transparent border-2 border-[#666666] text-[#666666] hover:bg-[#66666610] active:bg-[#66666620] active:scale-95"
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          aria-label="Clear canvas"
        >
          <Trash2 size={isMobile ? 22 : 20} className="transform rotate-[1deg]" />
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