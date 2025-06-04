# Canvas Drawing System PRD
*SketchyAF Mobile-First Drawing and Layering System*

## 🎯 Executive Summary

This PRD defines the core mobile-first drawing experience for SketchyAF - enabling users to create freehand drawings with booster pack overlays on touch devices. The system prioritises mobile UX above all else, with snappy performance and casual creativity to deliver a sub-2-second draw experience optimized for single-hand operation.

## 📋 Core Requirements

### Design Principles
| Principle | Implementation |
|-----------|----------------|
| **Mobile-First** | All interactions designed for touch, thumb zones prioritized |
| **Snappy** | Canvas loads instantly, tools accessible within 1 tap |
| **Single-Hand Operation** | All tools reachable with thumb, no two-handed gestures required |
| **Casual Creativity** | Minimal UI, intuitive controls, delightful haptic feedback |

### Mobile-First User Flow
1. User lands on draw page → Canvas visible in 1 second on mobile
2. Default drawing mode active → Start drawing immediately with finger
3. One-tap tool access → All tools in thumb-reachable bottom zone
4. Gesture-based shortcuts → Two-finger tap for quick actions
5. Auto-save → 30s timeout for mobile sessions

## 🛠️ Technical Architecture

### State Management with Jotai
```typescript
// Install Jotai for atomic state management
// npm install jotai

import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai'
import { atomWithReset, atomWithDefault, atomWithStorage } from 'jotai/utils'
import { loadable, unwrap } from 'jotai/utils'

// Core canvas atoms
const canvasAtom = atom<fabric.Canvas | null>(null)
const isInitializedAtom = atom(false)

// Drawing mode atoms
const isDrawModeAtom = atomWithDefault(atom(true))
const currentColorAtom = atomWithStorage('sketchy-color', '#121212')
const currentBrushSizeAtom = atomWithStorage('sketchy-brush-size', 5)

// UI state atoms
const showColorPaletteAtom = atom(false)
const showBrushSizesAtom = atom(false)
const isLoadingAtom = atom(false)
```

### Fabric.js Canvas Setup
```typescript
const initializeCanvasAtom = atom(
  null,
  (get, set, canvasElement: HTMLCanvasElement) => {
    if (get(isInitializedAtom)) return get(canvasAtom)

    const fabricCanvas = new fabric.Canvas(canvasElement, {
      isDrawingMode: true,
      backgroundColor: '#ffffff',
      selection: false,
      allowTouchScrolling: false,
      containerClass: 'canvas-container'
    })

    // Mobile optimizations
    fabricCanvas.freeDrawingBrush = new fabric.PencilBrush(fabricCanvas)
    fabricCanvas.freeDrawingBrush.width = get(currentBrushSizeAtom)
    fabricCanvas.freeDrawingBrush.color = get(currentColorAtom)
    fabricCanvas.freeDrawingBrush.decimate = 2 // Smooth mobile drawing

    // Set up canvas sizing
    const resizeCanvas = () => {
      fabricCanvas.setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    set(canvasAtom, fabricCanvas)
    set(isInitializedAtom, true)
    
    return fabricCanvas
  }
)
```

### Layer Architecture
```javascript
// Layer 1: Background (white/transparent)
canvas.backgroundColor = '#ffffff';

// Layer 2: Booster stencil overlay (locked)
const boosterLayer = new fabric.Group([], {
  selectable: false,
  evented: false,
  erasable: false
});

// Layer 3: User drawing layer (active)
const userLayer = new fabric.Group([], {
  selectable: true,
  evented: true,
  erasable: true
});
```

## 🔄 **Comprehensive Undo/Redo System with Jotai**

### Core Undo State Architecture
```typescript
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai'
import { atomWithReset, atomWithDefault } from 'jotai/utils'
import { unwrap } from 'jotai/utils'
import debounce from 'lodash.debounce'

// History stack configuration
const MAX_HISTORY_DESKTOP = 10
const MAX_HISTORY_MOBILE = 5
const DEBOUNCE_DELAY = 300

// Core history atoms
export const historyStackAtom = atom<string[]>([])
export const redoStackAtom = atom<string[]>([])
export const currentStateIndexAtom = atom(-1)
export const isUndoingAtom = atom(false)
export const isRedoingAtom = atom(false)

// Device detection atom
export const isMobileAtom = atom(() => {
  if (typeof window === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || window.innerWidth < 768
})

// Dynamic max history based on device
export const maxHistoryAtom = atom((get) => 
  get(isMobileAtom) ? MAX_HISTORY_MOBILE : MAX_HISTORY_DESKTOP
)

// History management derived atoms
export const canUndoAtom = atom((get) => {
  const currentIndex = get(currentStateIndexAtom)
  const isUndoing = get(isUndoingAtom)
  return currentIndex > 0 && !isUndoing
})

export const canRedoAtom = atom((get) => {
  const redoStack = get(redoStackAtom)
  const isRedoing = get(isRedoingAtom)
  return redoStack.length > 0 && !isRedoing
})

// History analytics atom
export const historyAnalyticsAtom = atom((get) => {
  const historyStack = get(historyStackAtom)
  const redoStack = get(redoStackAtom)
  const currentIndex = get(currentStateIndexAtom)
  const maxHistory = get(maxHistoryAtom)
  
  return {
    totalStates: historyStack.length,
    redoStates: redoStack.length,
    currentIndex,
    maxHistory,
    memoryUsage: historyStack.length / maxHistory,
    canUndo: get(canUndoAtom),
    canRedo: get(canRedoAtom)
  }
})
```

### Advanced History Management with Debouncing
```typescript
// Debounced history save atom
export const debouncedSaveHistoryAtom = atom(
  null,
  (get, set, canvas: fabric.Canvas) => {
    // Clear any existing timeout
    if (debouncedSaveHistoryAtom._timeoutId) {
      clearTimeout(debouncedSaveHistoryAtom._timeoutId)
    }

    // Set new timeout for debounced save
    debouncedSaveHistoryAtom._timeoutId = setTimeout(() => {
      const canvasState = JSON.stringify(canvas.toJSON())
      const currentIndex = get(currentStateIndexAtom)
      const maxHistory = get(maxHistoryAtom)
      
      set(historyStackAtom, (prevStack) => {
        // Remove any states after current index (for new branches)
        const newStack = prevStack.slice(0, currentIndex + 1)
        // Add new state
        const updatedStack = [...newStack, canvasState]
        // Keep only the last maxHistory states
        return updatedStack.slice(-maxHistory)
      })
      
      set(currentStateIndexAtom, (prevIndex) => {
        const newIndex = prevIndex + 1
        return Math.min(newIndex, maxHistory - 1)
      })
      
      // Clear redo stack when new action is performed
      set(redoStackAtom, [])
      
      // Trigger haptic feedback on mobile
      if (get(isMobileAtom) && navigator.vibrate) {
        navigator.vibrate(25)
      }
    }, DEBOUNCE_DELAY)
  }
)

// Immediate history save atom (for critical actions)
export const immediateHistorySaveAtom = atom(
  null,
  (get, set, canvas: fabric.Canvas) => {
    // Cancel any pending debounced save
    if (debouncedSaveHistoryAtom._timeoutId) {
      clearTimeout(debouncedSaveHistoryAtom._timeoutId)
    }
    
    const canvasState = JSON.stringify(canvas.toJSON())
    const currentIndex = get(currentStateIndexAtom)
    const maxHistory = get(maxHistoryAtom)
    
    set(historyStackAtom, (prevStack) => {
      const newStack = prevStack.slice(0, currentIndex + 1)
      const updatedStack = [...newStack, canvasState]
      return updatedStack.slice(-maxHistory)
    })
    
    set(currentStateIndexAtom, (prevIndex) => 
      Math.min(prevIndex + 1, maxHistory - 1)
    )
    
    set(redoStackAtom, [])
  }
)
```

### Undo/Redo Action Atoms
```typescript
// Undo action atom with enhanced error handling
export const undoActionAtom = atom(
  null,
  async (get, set, canvas: fabric.Canvas) => {
    const canUndo = get(canUndoAtom)
    const currentIndex = get(currentStateIndexAtom)
    const historyStack = get(historyStackAtom)
    
    if (!canUndo || !canvas) return false
    
    try {
      set(isUndoingAtom, true)
      
      // Provide haptic feedback on mobile
      if (get(isMobileAtom) && navigator.vibrate) {
        navigator.vibrate(50)
      }
      
      const previousState = historyStack[currentIndex - 1]
      const currentState = historyStack[currentIndex]
      
      // Add current state to redo stack
      set(redoStackAtom, (prev) => [...prev, currentState])
      
      // Load previous state
      await new Promise<void>((resolve, reject) => {
        canvas.loadFromJSON(previousState, () => {
          canvas.renderAll()
          set(currentStateIndexAtom, (prev) => prev - 1)
          resolve()
        }, (err) => reject(err))
      })
      
      return true
    } catch (error) {
      console.error('Undo failed:', error)
      return false
    } finally {
      set(isUndoingAtom, false)
    }
  }
)

// Redo action atom with enhanced error handling
export const redoActionAtom = atom(
  null,
  async (get, set, canvas: fabric.Canvas) => {
    const canRedo = get(canRedoAtom)
    const redoStack = get(redoStackAtom)
    
    if (!canRedo || !canvas) return false
    
    try {
      set(isRedoingAtom, true)
      
      // Provide haptic feedback on mobile
      if (get(isMobileAtom) && navigator.vibrate) {
        navigator.vibrate(50)
      }
      
      const nextState = redoStack[redoStack.length - 1]
      
      // Load next state
      await new Promise<void>((resolve, reject) => {
        canvas.loadFromJSON(nextState, () => {
          canvas.renderAll()
          
          // Update history stacks
          set(historyStackAtom, (prev) => [...prev, nextState])
          set(redoStackAtom, (prev) => prev.slice(0, -1))
          set(currentStateIndexAtom, (prev) => prev + 1)
          resolve()
        }, (err) => reject(err))
      })
      
      return true
    } catch (error) {
      console.error('Redo failed:', error)
      return false
    } finally {
      set(isRedoingAtom, false)
    }
  }
)
```

### Memory Management Atoms
```typescript
// Memory monitoring atom
export const memoryStatsAtom = atom((get) => {
  const historyStack = get(historyStackAtom)
  const redoStack = get(redoStackAtom)
  
  // Calculate approximate memory usage
  const historySize = JSON.stringify(historyStack).length
  const redoSize = JSON.stringify(redoStack).length
  const totalSize = historySize + redoSize
  
  return {
    historySize: (historySize / 1024).toFixed(2) + ' KB',
    redoSize: (redoSize / 1024).toFixed(2) + ' KB',
    totalSize: (totalSize / 1024).toFixed(2) + ' KB',
    historyCount: historyStack.length,
    redoCount: redoStack.length
  }
})

// Memory cleanup atom
export const memoryCleanupAtom = atom(
  null,
  (get, set) => {
    const isMobile = get(isMobileAtom)
    const maxHistory = get(maxHistoryAtom)
    
    // Aggressive cleanup for mobile
    if (isMobile) {
      set(historyStackAtom, (prev) => prev.slice(-Math.floor(maxHistory * 0.7)))
      set(redoStackAtom, (prev) => prev.slice(-Math.floor(maxHistory * 0.3)))
    }
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc()
    }
  }
)

// Auto memory management atom with monitoring
export const autoMemoryManagementAtom = atom(
  null,
  (get, set) => {
    // Monitor memory usage periodically
    const checkMemory = () => {
      if ('memory' in performance) {
        const memInfo = performance.memory as any
        const usedMB = memInfo.usedJSHeapSize / 1024 / 1024
        
        // Trigger cleanup if memory usage is high
        if (usedMB > 50) { // 50MB threshold
          set(memoryCleanupAtom)
        }
      }
    }
    
    // Set up periodic memory monitoring
    const intervalId = setInterval(checkMemory, 30000) // Every 30 seconds
    
    return () => clearInterval(intervalId)
  }
)
```

### History Persistence with Local Storage
```typescript
import { atomWithStorage } from 'jotai/utils'

// Persistent history atoms (for recovery)
export const persistentHistoryAtom = atomWithStorage<string[]>(
  'sketchy-history',
  [],
  {
    getItem: (key: string) => {
      try {
        const item = localStorage.getItem(key)
        return item ? JSON.parse(item) : []
      } catch {
        return []
      }
    },
    setItem: (key: string, value: string[]) => {
      try {
        // Only store last 3 states for persistence (mobile-friendly)
        const limitedHistory = value.slice(-3)
        localStorage.setItem(key, JSON.stringify(limitedHistory))
      } catch (error) {
        console.warn('Failed to save history to localStorage:', error)
      }
    },
    removeItem: (key: string) => localStorage.removeItem(key)
  }
)

// Auto-sync history to persistent storage
export const syncHistoryToPersistentAtom = atom(
  null,
  (get, set) => {
    const historyStack = get(historyStackAtom)
    set(persistentHistoryAtom, historyStack)
  }
)

// Recovery atom to restore from persistent storage
export const recoverHistoryAtom = atom(
  null,
  (get, set, canvas: fabric.Canvas) => {
    const persistentHistory = get(persistentHistoryAtom)
    
    if (persistentHistory.length > 0) {
      set(historyStackAtom, persistentHistory)
      set(currentStateIndexAtom, persistentHistory.length - 1)
      
      // Load the latest state
      const latestState = persistentHistory[persistentHistory.length - 1]
      canvas.loadFromJSON(latestState, () => {
        canvas.renderAll()
      })
    }
  }
)
```

### React Hooks for Undo/Redo Integration
```typescript
// Custom hook for undo/redo functionality
export const useUndoRedo = (canvas: fabric.Canvas | null) => {
  const [, undo] = useAtom(undoActionAtom)
  const [, redo] = useAtom(redoActionAtom)
  const [, saveHistory] = useAtom(debouncedSaveHistoryAtom)
  const [, immediateSave] = useAtom(immediateHistorySaveAtom)
  
  const canUndo = useAtomValue(canUndoAtom)
  const canRedo = useAtomValue(canRedoAtom)
  const isUndoing = useAtomValue(isUndoingAtom)
  const isRedoing = useAtomValue(isRedoingAtom)
  const analytics = useAtomValue(historyAnalyticsAtom)
  
  const handleUndo = useCallback(async () => {
    if (canvas && canUndo) {
      return await undo(canvas)
    }
    return false
  }, [canvas, canUndo, undo])
  
  const handleRedo = useCallback(async () => {
    if (canvas && canRedo) {
      return await redo(canvas)
    }
    return false
  }, [canvas, canRedo, redo])
  
  const handleSaveHistory = useCallback(() => {
    if (canvas) {
      saveHistory(canvas)
    }
  }, [canvas, saveHistory])
  
  const handleImmediateSave = useCallback(() => {
    if (canvas) {
      immediateSave(canvas)
    }
  }, [canvas, immediateSave])
  
  return {
    undo: handleUndo,
    redo: handleRedo,
    saveHistory: handleSaveHistory,
    immediateSave: handleImmediateSave,
    canUndo,
    canRedo,
    isUndoing,
    isRedoing,
    analytics
  }
}

// Custom hook for keyboard shortcuts
export const useUndoRedoKeyboard = (canvas: fabric.Canvas | null) => {
  const { undo, redo } = useUndoRedo(canvas)
  
  useEffect(() => {
    const handleKeyboard = async (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        await undo()
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Z')
      ) {
        e.preventDefault()
        await redo()
      }
    }

    window.addEventListener('keydown', handleKeyboard)
    return () => window.removeEventListener('keydown', handleKeyboard)
  }, [undo, redo])
}
```

### Canvas Event Integration
```typescript
// Canvas event handler setup with Jotai
export const setupCanvasHistoryEvents = (
  canvas: fabric.Canvas,
  saveHistory: () => void,
  immediateSave: () => void
) => {
  // Debounced events (frequent actions)
  canvas.on('path:created', saveHistory)
  canvas.on('object:modified', saveHistory)
  canvas.on('object:moved', saveHistory)
  canvas.on('object:scaled', saveHistory)
  canvas.on('object:rotated', saveHistory)
  
  // Immediate save events (critical actions)
  canvas.on('object:added', immediateSave)
  canvas.on('object:removed', immediateSave)
  canvas.on('canvas:cleared', immediateSave)
  
  // Mobile-specific events
  if ('ontouchstart' in window) {
    canvas.on('touch:gesture', saveHistory)
    canvas.on('touch:drag', saveHistory)
  }
  
  return () => {
    // Cleanup function
    canvas.off('path:created', saveHistory)
    canvas.off('object:modified', saveHistory)
    canvas.off('object:moved', saveHistory)
    canvas.off('object:scaled', saveHistory)
    canvas.off('object:rotated', saveHistory)
    canvas.off('object:added', immediateSave)
    canvas.off('object:removed', immediateSave)
    canvas.off('canvas:cleared', immediateSave)
    
    if ('ontouchstart' in window) {
      canvas.off('touch:gesture', saveHistory)
      canvas.off('touch:drag', saveHistory)
    }
  }
}
```

### Performance Monitoring and Analytics
```typescript
// Performance tracking atoms
export const undoRedoPerformanceAtom = atom({
  undoTimes: [] as number[],
  redoTimes: [] as number[],
  averageUndoTime: 0,
  averageRedoTime: 0,
  slowOperations: 0
})

// Performance tracking wrapper
export const trackUndoRedoPerformance = (
  operation: 'undo' | 'redo',
  fn: () => Promise<boolean>
) => {
  return async (get: any, set: any, ...args: any[]) => {
    const startTime = performance.now()
    
    try {
      const result = await fn.call(null, get, set, ...args)
      const endTime = performance.now()
      const duration = endTime - startTime
      
      // Track performance metrics
      set(undoRedoPerformanceAtom, (prev) => {
        const times = operation === 'undo' ? prev.undoTimes : prev.redoTimes
        const newTimes = [...times, duration].slice(-10) // Keep last 10 measurements
        
        const average = newTimes.reduce((a, b) => a + b, 0) / newTimes.length
        const slowOps = duration > 100 ? prev.slowOperations + 1 : prev.slowOperations
        
        return {
          ...prev,
          [operation === 'undo' ? 'undoTimes' : 'redoTimes']: newTimes,
          [operation === 'undo' ? 'averageUndoTime' : 'averageRedoTime']: average,
          slowOperations: slowOps
        }
      })
      
      return result
    } catch (error) {
      console.error(`${operation} performance tracking failed:`, error)
      throw error
    }
  }
}
```

### Mobile-Optimized Undo/Redo UI Components
```typescript
// Mobile undo/redo button component
const UndoRedoButtons: React.FC = () => {
  const canvas = useAtomValue(canvasAtom)
  const { undo, redo, canUndo, canRedo, isUndoing, isRedoing } = useUndoRedo(canvas)
  const isMobile = useAtomValue(isMobileAtom)
  
  return (
    <>
      {/* Undo button */}
      <button
        onClick={undo}
        disabled={!canUndo || isUndoing}
        className={`min-w-11 min-h-11 rounded-lg flex items-center justify-center transition-all duration-150 ease-out ${
          !canUndo || isUndoing
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:bg-primary/10 active:scale-95'
        }`}
        aria-label="Undo last action"
        style={{
          touchAction: 'manipulation', // Mobile optimization
          WebkitTapHighlightColor: 'transparent'
        }}
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
        aria-label="Redo last undone action"
        style={{
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent'
        }}
      >
        <Redo2 
          size={isMobile ? 22 : 20} 
          className={isRedoing ? 'animate-spin' : ''}
        />
      </button>
    </>
  )
}

// History analytics display (development/debug)
const HistoryAnalytics: React.FC = () => {
  const analytics = useAtomValue(historyAnalyticsAtom)
  const memoryStats = useAtomValue(memoryStatsAtom)
  const performance = useAtomValue(undoRedoPerformanceAtom)
  
  if (process.env.NODE_ENV !== 'development') return null
  
  return (
    <div className="fixed top-4 right-4 bg-black/80 text-white p-2 rounded text-xs font-mono">
      <div>History: {analytics.totalStates}/{analytics.maxHistory}</div>
      <div>Redo: {analytics.redoStates}</div>
      <div>Memory: {memoryStats.totalSize}</div>
      <div>Avg Undo: {performance.averageUndoTime.toFixed(1)}ms</div>
      <div>Avg Redo: {performance.averageRedoTime.toFixed(1)}ms</div>
    </div>
  )
}
```

### Undo/Redo Feature Requirements Summary

**Core Functionality:**
- ✅ **Atomic State Management**: Using Jotai for predictable, reactive state updates
- ✅ **Debounced History Saving**: Prevents excessive history entries during rapid drawing
- ✅ **Mobile-Optimized Memory**: Reduced history stack for mobile devices (5 vs 10 states)
- ✅ **Haptic Feedback**: Touch vibration for mobile undo/redo actions
- ✅ **Error Handling**: Robust error recovery for failed operations
- ✅ **Performance Tracking**: Real-time monitoring of undo/redo performance
- ✅ **Persistence**: Auto-save history to localStorage for session recovery
- ✅ **Memory Management**: Automatic cleanup and garbage collection

**Mobile-First Optimizations:**
- ✅ **Touch-Optimized UI**: Larger touch targets and proper touch handling
- ✅ **Memory Conservation**: Aggressive memory management for mobile devices
- ✅ **Performance Monitoring**: Track slow operations and optimize accordingly
- ✅ **Gesture Support**: Keyboard shortcuts with mobile considerations

**Advanced Features:**
- ✅ **Analytics Integration**: Track usage patterns and performance metrics
- ✅ **Recovery System**: Automatic recovery from crashes or page refreshes
- ✅ **Branching History**: Proper handling of new actions after undo
- ✅ **State Validation**: Ensure canvas state integrity across operations

## 🎨 Feature Specifications

### 1. Freehand Drawing
**Requirements:**
- Default brush: 5px black pencil
- Smooth curves on mobile devices
- Responsive touch tracking
- Pressure sensitivity detection (if available)

**Implementation:**
```typescript
// Drawing state atoms
const drawingModeAtom = atom(true)
const brushConfigAtom = atom((get) => ({
  width: get(currentBrushSizeAtom),
  color: get(currentColorAtom),
  strokeLineCap: 'round' as const,
  strokeLineJoin: 'round' as const,
  decimate: get(isMobileAtom) ? 2 : 1 // Mobile optimization
}))

// Drawing mode configuration with Jotai
const initializeDrawingAtom = atom(
  null,
  (get, set, canvas: fabric.Canvas) => {
    const isDrawMode = get(drawingModeAtom)
    const brushConfig = get(brushConfigAtom)
    
    canvas.isDrawingMode = true
    const brush = new fabric.PencilBrush(canvas)
    Object.assign(brush, brushConfig)
    canvas.freeDrawingBrush = brush
    
    // Set up history tracking
    const { saveHistory } = get(undoRedoHooksAtom)
    canvas.on('path:created', (e) => {
      const path = e.path
      path.set({
        strokeLineCap: 'round',
        strokeLineJoin: 'round'
      })
      saveHistory()
    })
  }
)
```

### 2. Eraser Tool
**Requirements:**
- Toggle between draw/erase modes
- Visual feedback for eraser mode
- Consistent eraser size with brush size

**Implementation:**
```typescript
// Eraser atoms
const eraserModeAtom = atom(false)
const eraserConfigAtom = atom((get) => ({
  width: get(currentBrushSizeAtom),
  strokeLineCap: 'round' as const,
  strokeLineJoin: 'round' as const
}))

// Toggle eraser mode atom
const toggleEraserAtom = atom(
  (get) => get(eraserModeAtom),
  (get, set, canvas: fabric.Canvas) => {
    const isEraser = !get(eraserModeAtom)
    set(eraserModeAtom, isEraser)
    
    if (isEraser) {
      const brush = new fabric.EraserBrush(canvas)
      Object.assign(brush, get(eraserConfigAtom))
      canvas.freeDrawingBrush = brush
    } else {
      const brush = new fabric.PencilBrush(canvas)
      Object.assign(brush, get(brushConfigAtom))
      canvas.freeDrawingBrush = brush
    }
    
    // Save state change
    const { immediateSave } = get(undoRedoHooksAtom)
    immediateSave()
  }
)
```

### 4. Color Selector
**Requirements:**
- 8-12 predefined colors aligned with brand
- Circular popup design following design system
- Single-tap color selection
- Current color indicator with brand styling

**Color Palette (Brand-Aligned):**
```typescript
// Color management atoms
const colorPaletteAtom = atom([
  '#121212', // Black (design system)
  '#FFFFFF', // White (design system)
  '#FF3366', // Primary brand color
  '#33CCFF', // Secondary brand color
  '#FFCC00', // Accent brand color
  '#22C55E', // Success green
  '#EF4444', // Error red
  '#F59E0B', // Warning orange
  '#3B82F6', // Info blue
  '#666666', // Medium gray
  '#333333', // Dark gray
  '#CCCCCC'  // Light gray
])

// Color selection atom
const selectColorAtom = atom(
  null,
  (get, set, color: string) => {
    set(currentColorAtom, color)
    set(showColorPaletteAtom, false)
    
    // Update brush color if in drawing mode
    const canvas = get(canvasAtom)
    if (canvas && canvas.freeDrawingBrush && !get(eraserModeAtom)) {
      canvas.freeDrawingBrush.color = color
    }
  }
)
```

### 5. Brush Size Control
**Requirements:**
- 3-4 preset sizes (small, medium, large, XL)
- Visual size indicators
- Consistent sizing across tools

**Implementation:**
```typescript
// Brush size atoms
const brushSizesAtom = atom([2, 5, 10, 15])
const selectBrushSizeAtom = atom(
  null,
  (get, set, size: number) => {
    set(currentBrushSizeAtom, size)
    set(showBrushSizesAtom, false)
    
    // Update current brush size
    const canvas = get(canvasAtom)
    if (canvas && canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.width = size
    }
  }
)
```

### 6. Booster Stencil System
**Requirements:**
- PNG/SVG stencil overlay
- Drag and scale functionality
- Lock/unlock toggle
- Masking for "color within lines"

**Implementation:**
```typescript
// Stencil management atoms
const stencilAtom = atom<fabric.Image | null>(null)
const stencilLockedAtom = atom(false)

const addBoosterStencilAtom = atom(
  null,
  (get, set, imageUrl: string) => {
    const canvas = get(canvasAtom)
    if (!canvas) return
    
    fabric.Image.fromURL(imageUrl, (img) => {
      img.set({
        left: canvas.width / 2,
        top: canvas.height / 2,
        originX: 'center',
        originY: 'center',
        selectable: true,
        evented: true,
        erasable: false,
        opacity: 0.7
      })
      
      canvas.add(img)
      canvas.bringToFront(img)
      set(stencilAtom, img)
      
      // Save to history
      const { immediateSave } = get(undoRedoHooksAtom)
      immediateSave()
    })
  }
)

const lockStencilAtom = atom(
  null,
  (get, set, isLocked: boolean) => {
    const stencil = get(stencilAtom)
    if (!stencil) return
    
    stencil.set({
      selectable: !isLocked,
      evented: !isLocked
    })
    
    set(stencilLockedAtom, isLocked)
    
    // Save state change
    const { immediateSave } = get(undoRedoHooksAtom)
    immediateSave()
  }
)
```

## 📱 Mobile UX Specifications (Primary Focus)

### Mobile-Optimized Toolbar Design
```scss
.mobile-toolbar {
  position: fixed;
  bottom: env(safe-area-inset-bottom, 20px);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px; // Design system sm spacing
  padding: 16px 24px; // Design system md + lg spacing
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px; // Design system lg border radius
  backdrop-filter: blur(20px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); // Design system lg shadow
  font-family: 'Montserrat', sans-serif;
  
  // Ensure minimum touch target sizes
  button {
    min-width: 44px;
    min-height: 44px;
    border-radius: 8px; // Design system md border radius
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    cursor: pointer;
    transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1); // Design system fast + default easing
    font-weight: 600; // Design system semibold
    
    &:hover {
      background: rgba(255, 51, 102, 0.1); // Primary color with 10% opacity
      transform: scale(1.05);
    }
    
    &:active {
      transform: scale(0.95);
      background: rgba(255, 51, 102, 0.2); // Primary color with 20% opacity
    }
    
    &.active {
      background: #FF3366; // Primary brand color
      color: white;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); // Design system md shadow
    }
  }
  
  // Primary tools always visible
  .primary-tools {
    display: flex;
    gap: 8px; // Design system sm spacing
  }
  
  // Secondary tools in expandable menu
  .tool-menu {
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-bottom: 16px; // Design system md spacing
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px; // Design system sm spacing
    padding: 16px; // Design system md spacing
    background: rgba(255, 255, 255, 0.95);
    border-radius: 16px; // Design system lg border radius
    backdrop-filter: blur(20px);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); // Design system lg shadow
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1); // Design system normal + default easing
    
    &.active {
      opacity: 1;
      pointer-events: all;
    }
  }
}

// Color palette optimized for mobile with design system
.mobile-color-palette {
  position: fixed;
  bottom: calc(env(safe-area-inset-bottom, 20px) + 80px);
  left: 50%;
  transform: translateX(-50%);
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px; // Design system sm spacing
  padding: 16px; // Design system md spacing
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px; // Design system lg border radius
  backdrop-filter: blur(20px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); // Design system lg shadow
  
  .color-swatch {
    width: 36px;
    height: 36px;
    border-radius: 9999px; // Design system full border radius
    border: 2px solid transparent;
    cursor: pointer;
    transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1); // Design system fast + default easing
    
    &:active {
      transform: scale(0.9);
    }
    
    &.selected {
      border-color: #FF3366; // Primary brand color
      box-shadow: 0 0 0 4px rgba(255, 51, 102, 0.3); // Primary with 30% opacity
      transform: scale(1.1);
    }
    
    &:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); // Design system md shadow
    }
  }
}

// Brush size selector for mobile with design system
.mobile-brush-selector {
  position: fixed;
  right: 24px; // Design system lg spacing
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 8px; // Design system sm spacing
  padding: 16px 12px; // Design system md spacing
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px; // Design system lg border radius
  backdrop-filter: blur(20px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); // Design system lg shadow
  
  .brush-size {
    width: 44px; // Minimum touch target
    height: 44px;
    border-radius: 8px; // Design system md border radius
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1); // Design system fast + default easing
    
    .size-indicator {
      background: #121212; // Design system black
      border-radius: 9999px; // Design system full border radius
      
      &.small { width: 4px; height: 4px; }
      &.medium { width: 8px; height: 8px; }
      &.large { width: 12px; height: 12px; }
      &.xl { width: 16px; height: 16px; }
    }
    
    &:hover {
      background: rgba(255, 51, 102, 0.1); // Primary with 10% opacity
      transform: scale(1.05);
    }
    
    &.selected {
      background: rgba(255, 51, 102, 0.1); // Primary with 10% opacity
      box-shadow: 0 0 0 2px #FF3366; // Primary brand color
      
      .size-indicator {
        background: #FF3366; // Primary brand color
      }
    }
  }
}

// Canvas container with design system spacing
.canvas-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #F8F8F8; // Design system off-white
  font-family: 'Poppins', sans-serif; // Design system body font
}

// Status messages with design system colors
.canvas-status {
  position: fixed;
  top: 24px; // Design system lg spacing
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px; // Design system spacing
  border-radius: 8px; // Design system md border radius
  font-family: 'Poppins', sans-serif;
  font-weight: 500; // Design system medium
  font-size: 0.875rem; // Design system small body
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); // Design system md shadow
  
  &.success {
    background: #22C55E; // Design system success
    color: white;
  }
  
  &.error {
    background: #EF4444; // Design system error
    color: white;
  }
  
  &.warning {
    background: #F59E0B; // Design system warning
    color: white;
  }
  
  &.info {
    background: #3B82F6; // Design system info
    color: white;
  }
}
```

### Enhanced Touch Gestures
| Gesture | Action | Mobile Implementation |
|---------|--------|----------------------|
| Single tap | Start drawing | Immediate response, 0ms delay |
| Long press (500ms) | Context menu | Haptic feedback, tool options |
| Two-finger tap | Toggle UI visibility | Hide/show all UI elements |
| Two-finger long press | Quick tool switch | Draw ↔ Erase toggle |
| Palm rejection | Ignore palm touches | Advanced touch filtering |

```javascript
// Enhanced touch handling for mobile
class MobileTouchHandler {
  constructor(canvas) {
    this.canvas = canvas;
    this.setupTouchEvents();
    this.enablePalmRejection();
  }
  
  setupTouchEvents() {
    // Prevent default touch behaviors
    this.canvas.upperCanvasEl.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.handleTouchStart(e);
    }, { passive: false });
    
    // Gesture detection
    let touchStartTime;
    let touchCount = 0;
    
    this.canvas.on('touch:gesture', (e) => {
      if (e.e.touches.length === 2) {
        // Two-finger gestures
        if (e.e.timeStamp - touchStartTime > 500) {
          this.toggleDrawEraseMode();
          this.triggerHapticFeedback();
        } else {
          this.toggleUIVisibility();
        }
      }
    });
  }
  
  enablePalmRejection() {
    this.canvas.on('before:path:created', (e) => {
      const touch = e.e.changedTouches?.[0];
      if (touch && this.isPalmTouch(touch)) {
        e.preventDefault();
        return false;
      }
    });
  }
  
  isPalmTouch(touch) {
    // Simple palm rejection based on touch size
    return touch.radiusX > 20 || touch.radiusY > 20;
  }
  
  triggerHapticFeedback() {
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  }
}
```

### Mobile Tool Organization
```javascript
// Prioritized tool layout for mobile with design system
const mobileToolConfig = {
  // Always visible (primary toolbar)
  primary: [
    { 
      id: 'draw', 
      icon: '✏️', 
      action: 'setDrawMode',
      label: 'Draw',
      ariaLabel: 'Switch to drawing mode'
    },
    { 
      id: 'erase', 
      icon: '🧽', 
      action: 'setEraseMode',
      label: 'Erase',
      ariaLabel: 'Switch to eraser mode'
    },
    { 
      id: 'colors', 
      icon: '🎨', 
      action: 'toggleColorPalette',
      label: 'Colors',
      ariaLabel: 'Open color palette'
    },
    { 
      id: 'undo', 
      icon: '↶', 
      action: 'undo',
      label: 'Undo',
      ariaLabel: 'Undo last action'
    },
    { 
      id: 'menu', 
      icon: '⋯', 
      action: 'toggleToolMenu',
      label: 'More',
      ariaLabel: 'Open tool menu'
    }
  ],
  
  // Hidden in expandable menu
  secondary: [
    { 
      id: 'redo', 
      icon: '↷', 
      action: 'redo',
      label: 'Redo',
      ariaLabel: 'Redo last undone action'
    },
    { 
      id: 'clear', 
      icon: '🗑️', 
      action: 'clearCanvas',
      label: 'Clear',
      ariaLabel: 'Clear entire canvas'
    },
    { 
      id: 'save', 
      icon: '💾', 
      action: 'saveDrawing',
      label: 'Save',
      ariaLabel: 'Save current drawing'
    },
    { 
      id: 'stencil', 
      icon: '📐', 
      action: 'toggleStencil',
      label: 'Stencil',
      ariaLabel: 'Toggle booster stencil'
    },
    { 
      id: 'export', 
      icon: '📤', 
      action: 'exportDrawing',
      label: 'Export',
      ariaLabel: 'Export drawing'
    },
    { 
      id: 'settings', 
      icon: '⚙️', 
      action: 'openSettings',
      label: 'Settings',
      ariaLabel: 'Open settings'
    }
  ]
};

function createToolButton(tool) {
  const button = document.createElement('button');
  button.className = 'tool-button';
  button.setAttribute('aria-label', tool.ariaLabel);
  button.setAttribute('data-tool', tool.id);
  
  // Apply design system styling
  button.style.cssText = `
    min-width: 44px;
    min-height: 44px;
    border-radius: 8px;
    border: none;
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Montserrat', sans-serif;
    font-weight: 600;
    font-size: 1.125rem;
    transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  `;
  
  button.innerHTML = `
    <span class="tool-icon">${tool.icon}</span>
    <span class="tool-label sr-only">${tool.label}</span>
  `;
  
  button.addEventListener('click', () => {
    window[tool.action]?.();
    updateActiveStates(tool.id);
  });
  
  return button;
}

function renderMobileToolbar() {
  const toolbar = document.createElement('div');
  toolbar.className = 'mobile-toolbar';
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', 'Drawing tools');
  
  // Primary tools
  const primaryContainer = document.createElement('div');
  primaryContainer.className = 'primary-tools';
  
  mobileToolConfig.primary.forEach(tool => {
    const button = createToolButton(tool);
    primaryContainer.appendChild(button);
  });
  
  toolbar.appendChild(primaryContainer);
  
  // Secondary tools menu
  const menuContainer = document.createElement('div');
  menuContainer.className = 'tool-menu';
  menuContainer.setAttribute('role', 'menu');
  menuContainer.setAttribute('aria-hidden', 'true');
  
  mobileToolConfig.secondary.forEach(tool => {
    const button = createToolButton(tool);
    button.setAttribute('role', 'menuitem');
    menuContainer.appendChild(button);
  });
  
  toolbar.appendChild(menuContainer);
  document.body.appendChild(toolbar);
}
```

### Mobile-Specific Performance Optimizations
```javascript
// Mobile-first canvas configuration
const mobileCanvasConfig = {
  // Reduce rendering load
  renderOnAddRemove: false,
  skipOffscreen: true,
  enableRetinaScaling: true,
  
  // Touch optimizations
  allowTouchScrolling: false,
  stopContextMenu: true,
  fireRightClick: false,
  
  // Mobile-specific settings
  touchStartTimeout: 0, // Immediate touch response
  devicePixelRatio: window.devicePixelRatio || 1
};

// Optimize for mobile screens
function setupMobileCanvas() {
  const canvas = new fabric.Canvas('sketchy-canvas', mobileCanvasConfig);
  
  // Mobile screen sizing
  const resizeCanvas = () => {
    const container = document.querySelector('.canvas-container');
    const dpr = window.devicePixelRatio || 1;
    
    canvas.setDimensions({
      width: window.innerWidth,
      height: window.innerHeight
    });
    
    // Account for device pixel ratio
    canvas.getElement().style.width = window.innerWidth + 'px';
    canvas.getElement().style.height = window.innerHeight + 'px';
  };
  
  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('orientationchange', () => {
    setTimeout(resizeCanvas, 100); // Delay for orientation change
  });
  
  resizeCanvas();
  return canvas;
}
```

## 🚀 Mobile Performance Requirements

### Touch Response Benchmarks
- Touch to stroke latency < 50ms
- Brush size change response < 25ms
- Tool switching animation < 150ms
- Color selection feedback < 100ms

### Canvas Optimization
```javascript
// Reduce canvas updates for better performance
canvas.renderOnAddRemove = false;
canvas.skipOffscreen = true;
canvas.enableRetinaScaling = true;

// Batch updates
function batchCanvasUpdate(operations) {
  canvas.renderOnAddRemove = false;
  operations.forEach(op => op());
  canvas.renderOnAddRemove = true;
  canvas.requestRenderAll();
}
```

### Memory Management
- Maximum 5 undo states on mobile (10 on desktop)
- Automatic canvas cleanup on navigation
- Image compression for export
- Aggressive garbage collection on mobile

### Loading Performance
- Canvas initialization < 500ms
- First draw response < 50ms (mobile priority)
- Tool switching < 25ms
- Color palette animation < 150ms

### Mobile Memory Management
```javascript
// Aggressive memory management for mobile
class MobileMemoryManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.maxHistoryMobile = 5; // Reduced for mobile
    this.setupMemoryMonitoring();
  }
  
  setupMemoryMonitoring() {
    // Monitor memory usage on mobile
    if ('memory' in performance) {
      setInterval(() => {
        const memInfo = performance.memory;
        if (memInfo.usedJSHeapSize > 50 * 1024 * 1024) { // 50MB threshold
          this.optimizeMemory();
        }
      }, 10000);
    }
  }
  
  optimizeMemory() {
    // Reduce history on mobile
    if (this.historyStack.length > this.maxHistoryMobile) {
      this.historyStack.splice(0, this.historyStack.length - this.maxHistoryMobile);
    }
    
    // Clear unused canvas objects
    this.canvas.getObjects().forEach(obj => {
      if (obj.opacity === 0 || !obj.visible) {
        this.canvas.remove(obj);
      }
    });
  }
}
```

## 💾 Data Management

### Auto-save System
```javascript
let autoSaveTimer;
const AUTO_SAVE_DELAY = 30000; // 30 seconds for mobile (60s for desktop)

function startAutoSave() {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    saveDrawing();
  }, AUTO_SAVE_DELAY);
}

function saveDrawing() {
  const drawingData = canvas.toJSON();
  localStorage.setItem('current-drawing', JSON.stringify(drawingData));
  
  // Optional: Save to server
  // api.saveDrawing(drawingData);
}
```

### Export Formats
```javascript
function exportDrawing(format = 'png') {
  switch (format) {
    case 'png':
      return canvas.toDataURL({
        format: 'png',
        quality: 0.8,
        enableRetinaScaling: true
      });
    
    case 'svg':
      return canvas.toSVG();
    
    case 'json':
      return canvas.toJSON();
  }
}
```

## 🔮 Future Features (Phase 2)

### Shape Tools
```javascript
const shapeTools = {
  circle: fabric.Circle,
  rectangle: fabric.Rect,
  triangle: fabric.Triangle,
  star: fabric.Polygon // Custom star shape
};
```

### Sticker System
- Drag-and-drop emoji library
- Custom sticker packs
- Monetization through premium stickers

### Advanced Stencils
- Masking for coloring within bounds
- Multi-layer stencils
- Animated stencil previews

## 🧪 Mobile Testing Requirements

### Mobile Device Testing Matrix (Priority Order)
| Device Type | Screen Size | OS | Testing Priority | Touch Features |
|-------------|-------------|-------|------------------|----------------|
| iPhone 13/14 | 390x844 | iOS 16+ | **Critical** | Pressure, palm rejection |
| Samsung Galaxy S23 | 360x780 | Android 13+ | **Critical** | Multi-touch, haptics |
| iPhone SE | 375x667 | iOS 15+ | **High** | Small screen optimization |
| iPad Mini | 768x1024 | iPadOS 16+ | **High** | Large touch targets |
| Google Pixel 7 | 393x851 | Android 13+ | **Medium** | Pure Android experience |
| OnePlus/Xiaomi | 412x892 | Android 12+ | **Medium** | Custom Android UIs |

### Mobile-Specific Test Scenarios
1. **Thumb Reach Test**: All tools accessible with single thumb
2. **Orientation Change**: Seamless portrait/landscape switching
3. **Background App**: Drawing preserved when app backgrounds
4. **Low Memory**: Graceful degradation on older devices
5. **Touch Accuracy**: Precise drawing on small screens
6. **Gesture Conflicts**: No interference with system gestures

### Mobile Accessibility Requirements
```javascript
// Mobile accessibility features with design system
const mobileA11yFeatures = {
  // Voice control for tools
  voiceCommands: {
    'draw': () => setDrawMode(),
    'erase': () => setEraseMode(),
    'undo': () => undo(),
    'clear': () => clearCanvas()
  },
  
  // High contrast mode using design system colors
  highContrast: {
    enabled: false,
    colors: {
      background: '#FFFFFF',
      foreground: '#121212',
      primary: '#FF3366',
      secondary: '#33CCFF'
    },
    toggle: () => toggleHighContrastMode()
  },
  
  // Large touch targets for accessibility (design system compliant)
  largeTouchTargets: {
    minSize: '44px', // Enhanced from WCAG 44px for mobile
    spacing: '8px'   // Design system sm spacing
  },
  
  // Screen reader support with proper semantics
  ariaLabels: {
    canvas: 'Drawing canvas for sketching',
    toolbar: 'Drawing tools and options',
    colorPalette: 'Color selection palette',
    brushSize: 'Brush size selector'
  },
  
  // Focus management following design system
  focusStyles: {
    outline: '2px solid #FF3366', // Primary brand color
    outlineOffset: '2px',
    borderRadius: '4px' // Design system sm border radius
  }
};
```

## 📊 Mobile Success Metrics

### Primary Mobile KPIs
- Time to first stroke on mobile < 1.5 seconds
- Single-hand operation success rate > 95%
- Touch accuracy rate > 90% (intended vs actual strokes)
- Mobile drawing completion rate > 85%

### Mobile Technical Metrics
- Touch latency < 50ms (industry leading)
- Frame rate > 60fps during drawing
- Memory usage < 30MB on mobile devices
- Battery impact < 5% per 10-minute session

### Mobile User Experience
- Thumb accessibility score > 95%
- Cross-device sync success rate > 99%
- Mobile UI satisfaction > 90%
- Zero palm rejection false positives

## 🔧 Implementation Plan

### Phase 1: Core Drawing
- [x] Fabric.js canvas setup
- [x] Freehand drawing with pencil brush
- [x] Basic eraser functionality
- [x] Color palette (8 colors)

### Phase 2: Undo/Redo with History Management
- [ ] Undo/redo with history management

### Phase 3: Mobile Optimization
- [ ] Touch gesture handling
- [ ] Mobile UI layout
- [ ] Performance optimizations
- [ ] Auto-save system

### Phase 4: Booster Integration
- [ ] Stencil overlay system
- [ ] Drag and scale controls
- [ ] Layer management
- [ ] Export functionality

### Phase 5: Polish & Testing
- [ ] Cross-device testing
- [ ] Performance benchmarking
- [ ] User experience refinements
- [ ] Documentation and handoff

---

*This PRD serves as the technical blueprint for implementing the SketchyAF canvas drawing system using Fabric.js with mobile-first optimizations.* 