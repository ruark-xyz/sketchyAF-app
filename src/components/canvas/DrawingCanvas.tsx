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
const isMobileAtom = atom(() => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || window.innerWidth < 768;
});

// Dynamic max history based on device
const maxHistoryAtom = atom((get) => 
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
const historyStackAtom = atom<string[]>([]);
const redoStackAtom = atom<string[]>([]);
const currentStateIndexAtom = atom(-1);
const isUndoingAtom = atom(false);
const isRedoingAtom = atom(false);

// History management derived atoms
const canUndoAtom = atom((get) => {
  const currentIndex = get(currentStateIndexAtom);
  const isUndoing = get(isUndoingAtom);
  return currentIndex > 0 && !isUndoing;
});

const canRedoAtom = atom((get) => {
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

// Define proper types for fabric.js events
interface FabricPathEvent {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  path: any;
}

// Debounced history save atom
const debouncedSaveHistoryAtom = atom(
  null,
  (get, set, canvas: Canvas) => {
    // Don't save history during undo/redo operations
    if (get(isUndoingAtom) || get(isRedoingAtom)) {
      return;
    }
    
    // Clear any existing timeout
    if (debouncedSaveTimeout) {
      clearTimeout(debouncedSaveTimeout);
    }

    // Set new timeout for debounced save
    debouncedSaveTimeout = setTimeout(() => {
      // Double-check we're not in undo/redo when timeout executes
      if (get(isUndoingAtom) || get(isRedoingAtom)) {
        return;
      }
      
      const canvasState = JSON.stringify(canvas.toJSON());
      const currentIndex = get(currentStateIndexAtom);
      const maxHistory = get(maxHistoryAtom);
      const historyStackBefore = get(historyStackAtom);
      
      // Check for duplicate state (prevent saving if state hasn't changed)
      if (historyStackBefore.length > 0) {
        const lastSavedState = historyStackBefore[historyStackBefore.length - 1];
        if (canvasState === lastSavedState) {
          return;
        }
      }
      
      set(historyStackAtom, (prevStack) => {
        // Remove any states after current index (for new branches)
        const newStack = prevStack.slice(0, currentIndex + 1);
        // Add new state
        const updatedStack = [...newStack, canvasState];
        // Keep only the last maxHistory states
        return updatedStack.slice(-maxHistory);
      });
      
      set(currentStateIndexAtom, (prevIndex) => {
        const newIndex = prevIndex + 1;
        return Math.min(newIndex, maxHistory - 1);
      });
      
      // Clear redo stack when new action is performed
      set(redoStackAtom, []);
      
      // Trigger haptic feedback on mobile
      if (get(isMobileAtom) && navigator.vibrate) {
        navigator.vibrate(25);
      }
    }, DEBOUNCE_DELAY);
  }
);

// Immediate history save atom (for critical actions)
const immediateHistorySaveAtom = atom(
  null,
  (get, set, canvas: Canvas) => {
    // Don't save history during undo/redo operations
    if (get(isUndoingAtom) || get(isRedoingAtom)) {
      return;
    }
    
    // Cancel any pending debounced save
    if (debouncedSaveTimeout) {
      clearTimeout(debouncedSaveTimeout);
    }
    
    const canvasState = JSON.stringify(canvas.toJSON());
    const currentIndex = get(currentStateIndexAtom);
    const maxHistory = get(maxHistoryAtom);
    const historyStackBefore = get(historyStackAtom);
    
    // Check for duplicate state (prevent saving if state hasn't changed)
    if (historyStackBefore.length > 0) {
      const lastSavedState = historyStackBefore[historyStackBefore.length - 1];
      if (canvasState === lastSavedState) {
        return;
      }
    }
    
    set(historyStackAtom, (prevStack) => {
      const newStack = prevStack.slice(0, currentIndex + 1);
      const updatedStack = [...newStack, canvasState];
      return updatedStack.slice(-maxHistory);
    });
    
    set(currentStateIndexAtom, (prevIndex) => 
      Math.min(prevIndex + 1, maxHistory - 1)
    );
    
    set(redoStackAtom, []);
  }
);

// Store event handler references for enabling/disabling
let canvasEventHandlers: {
  debouncedSave?: () => void;
  immediateSave?: () => void;
  pathCreated?: (e: FabricPathEvent) => void;
  objectAdded?: () => void;
  objectRemoved?: () => void;
} = {};

// Helper atom to disable/enable canvas event listeners
const toggleCanvasEventsAtom = atom(
  null,
  (get, set, { canvas, enabled }: { canvas: Canvas; enabled: boolean }) => {
    if (!canvas || !canvasEventHandlers.debouncedSave) return;
    
    if (enabled) {
      // Re-enable event listeners
      canvas.on('path:created', canvasEventHandlers.pathCreated!);
      canvas.on('object:added', canvasEventHandlers.objectAdded!);
      canvas.on('object:removed', canvasEventHandlers.objectRemoved!);
    } else {
      // Disable event listeners
      canvas.off('path:created', canvasEventHandlers.pathCreated!);
      canvas.off('object:added', canvasEventHandlers.objectAdded!);
      canvas.off('object:removed', canvasEventHandlers.objectRemoved!);
    }
  }
);

// Undo action atom with enhanced error handling
const undoActionAtom = atom(
  null,
  async (get, set, canvas: Canvas) => {
    const canUndo = get(canUndoAtom);
    const currentIndex = get(currentStateIndexAtom);
    const historyStack = get(historyStackAtom);
    
    if (!canUndo || !canvas) {
      return false;
    }
    
    try {
      set(isUndoingAtom, true);
      
      // Disable canvas event listeners to prevent history corruption
      set(toggleCanvasEventsAtom, { canvas, enabled: false });
      
      // Provide haptic feedback on mobile
      if (get(isMobileAtom) && navigator.vibrate) {
        navigator.vibrate(50);
      }
      
      const previousState = historyStack[currentIndex - 1];
      const currentState = historyStack[currentIndex];
      
      if (!previousState) {
        return false;
      }
      
      // Add current state to redo stack
      set(redoStackAtom, (prev) => [...prev, currentState]);
      
      // Clear canvas before loading previous state
      canvas.clear();
      canvas.backgroundColor = '#ffffff';
      
      // Load previous state
      let resolved = false;
      await new Promise<void>((resolve, reject) => {
        const handleSuccess = () => {
          if (resolved) return;
          resolved = true;
          
          canvas.renderAll();
          set(currentStateIndexAtom, (prev) => prev - 1);
          resolve();
        };
        
        // Add timeout fallback for when fabric.js doesn't call the callback
        const timeoutId = setTimeout(() => {
          if (!resolved) {
            handleSuccess();
          }
        }, 200);
        
        try {
          // Parse and validate the state first
          try {
            JSON.parse(previousState);
          } catch {
            clearTimeout(timeoutId);
            reject(new Error('Invalid canvas state'));
            return;
          }
          
          canvas.loadFromJSON(previousState, () => {
            clearTimeout(timeoutId);
            setTimeout(handleSuccess, 50);
          });
        } catch (error) {
          clearTimeout(timeoutId);
          if (!resolved) {
            resolved = true;
            reject(error);
          }
        }
      });
      
      return true;
    } catch {
      return false;
    } finally {
      // Re-enable canvas event listeners after a small delay to let fabric.js finish
      setTimeout(() => {
        set(toggleCanvasEventsAtom, { canvas, enabled: true });
      }, 10);
      
      set(isUndoingAtom, false);
    }
  }
);

// Redo action atom with enhanced error handling
const redoActionAtom = atom(
  null,
  async (get, set, canvas: Canvas) => {
    const canRedo = get(canRedoAtom);
    const redoStack = get(redoStackAtom);
    
    if (!canRedo || !canvas) {
      return false;
    }
    
    try {
      set(isRedoingAtom, true);
      
      // Disable canvas event listeners to prevent history corruption
      set(toggleCanvasEventsAtom, { canvas, enabled: false });
      
      // Provide haptic feedback on mobile
      if (get(isMobileAtom) && navigator.vibrate) {
        navigator.vibrate(50);
      }
      
      const nextState = redoStack[redoStack.length - 1];
      
      // Clear canvas before loading next state
      canvas.clear();
      canvas.backgroundColor = '#ffffff';
      
      // Load next state
      let resolved = false;
      await new Promise<void>((resolve, reject) => {
        const handleSuccess = () => {
          if (resolved) return;
          resolved = true;
          
          canvas.renderAll();
          
          // Update history stacks
          set(historyStackAtom, (prev) => [...prev, nextState]);
          set(redoStackAtom, (prev) => prev.slice(0, -1));
          set(currentStateIndexAtom, (prev) => prev + 1);
          
          resolve();
        };
        
        // Add timeout fallback for when fabric.js doesn't call the callback
        const timeoutId = setTimeout(() => {
          if (!resolved) {
            handleSuccess();
          }
        }, 200);
        
        try {
          // Parse and validate the state first
          try {
            JSON.parse(nextState);
          } catch {
            clearTimeout(timeoutId);
            reject(new Error('Invalid canvas state'));
            return;
          }
          
          canvas.loadFromJSON(nextState, () => {
            clearTimeout(timeoutId);
            setTimeout(handleSuccess, 100);
          });
        } catch (error) {
          clearTimeout(timeoutId);
          if (!resolved) {
            resolved = true;
            reject(error);
          }
        }
      });
      
      return true;
    } catch {
      return false;
    } finally {
      // Re-enable canvas event listeners after a small delay to let fabric.js finish
      setTimeout(() => {
        set(toggleCanvasEventsAtom, { canvas, enabled: true });
      }, 10);
      
      set(isRedoingAtom, false);
    }
  }
);

// Canvas initialization atom with proper cleanup
const initializeCanvasAtom = atom(
  null,
  (get, set, canvasElement: HTMLCanvasElement) => {
    // Check if we already have a canvas and it's the same element
    const existingCanvas = get(canvasAtom);
    const isInitialized = get(isInitializedAtom);
    
    if (isInitialized && existingCanvas && existingCanvas.getElement() === canvasElement) {
      return existingCanvas;
    }
    
    // Dispose of existing canvas if it exists
    if (existingCanvas) {
      try {
        existingCanvas.dispose();
      } catch (error) {
        console.warn('Error disposing existing canvas:', error);
      }
    }

    // Reset states
    set(isInitializedAtom, false);
    set(canvasAtom, null);

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
      set(debouncedSaveHistoryAtom, fabricCanvas);
    };
    const immediateSave = () => {
      set(immediateHistorySaveAtom, fabricCanvas);
    };

    const pathCreatedHandler = (e: FabricPathEvent) => {
      const path = e.path;
      path.set({
        strokeLineCap: 'round',
        strokeLineJoin: 'round'
      });
      debouncedSave();
    };
    
    const objectAddedHandler = () => {
      immediateSave();
    };
    
    const objectRemovedHandler = () => {
      immediateSave();
    };

    // Store event handler references for later use
    canvasEventHandlers = {
      debouncedSave,
      immediateSave,
      pathCreated: pathCreatedHandler,
      objectAdded: objectAddedHandler,
      objectRemoved: objectRemovedHandler
    };

    // Attach event listeners
    fabricCanvas.on('path:created', pathCreatedHandler);
    fabricCanvas.on('object:added', objectAddedHandler);
    fabricCanvas.on('object:removed', objectRemovedHandler);

    set(canvasAtom, fabricCanvas);
    set(isInitializedAtom, true);
    
    // Save initial state
    const initialState = JSON.stringify(fabricCanvas.toJSON());
    set(historyStackAtom, [initialState]);
    set(currentStateIndexAtom, 0);
    
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
const useUndoRedo = (canvas: Canvas | null) => {
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

// Add cleanup atom
const cleanupCanvasAtom = atom(
  null,
  (get, set) => {
    const canvas = get(canvasAtom);
    if (canvas) {
      try {
        // Clear any pending timeouts
        if (debouncedSaveTimeout) {
          clearTimeout(debouncedSaveTimeout);
          debouncedSaveTimeout = null;
        }
        
        // Remove event listeners
        window.removeEventListener('resize', () => {});
        
        // Dispose canvas
        canvas.dispose();
      } catch (error) {
        console.warn('Error during canvas cleanup:', error);
      }
    }
    
    // Reset all atoms
    set(canvasAtom, null);
    set(isInitializedAtom, false);
    set(historyStackAtom, []);
    set(redoStackAtom, []);
    set(currentStateIndexAtom, -1);
    set(isUndoingAtom, false);
    set(isRedoingAtom, false);
  }
);

const DrawingCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Jotai state hooks
  const canvas = useAtomValue(canvasAtom);
  const [, initializeCanvas] = useAtom(initializeCanvasAtom);
  const [, cleanupCanvas] = useAtom(cleanupCanvasAtom);
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

  // Initialize Fabric.js canvas with proper cleanup
  useEffect(() => {
    if (!canvasRef.current) return;
    
    initializeCanvas(canvasRef.current);
    
    // Cleanup function
    return () => {
      cleanupCanvas();
    };
  }, [initializeCanvas, cleanupCanvas]);

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