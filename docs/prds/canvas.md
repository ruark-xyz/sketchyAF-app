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

### Fabric.js Canvas Setup
```javascript
const canvas = new fabric.Canvas('sketchy-canvas', {
  isDrawingMode: true,
  backgroundColor: '#fff',
  selection: false,
  allowTouchScrolling: false,
  containerClass: 'canvas-container'
});

// Mobile optimizations
canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
canvas.freeDrawingBrush.width = 5;
canvas.freeDrawingBrush.color = "#000000";
canvas.freeDrawingBrush.decimate = 2; // Smooth mobile drawing
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

## 🎨 Feature Specifications

### 1. Freehand Drawing
**Requirements:**
- Default brush: 5px black pencil
- Smooth curves on mobile devices
- Responsive touch tracking
- Pressure sensitivity detection (if available)

**Implementation:**
```javascript
// Drawing mode configuration
canvas.isDrawingMode = true;
canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);

// Mobile optimizations
canvas.on('path:created', function(e) {
  const path = e.path;
  path.set({ 
    strokeLineCap: 'round',
    strokeLineJoin: 'round'
  });
  addToHistory();
});
```

### 2. Eraser Tool
**Requirements:**
- Toggle between draw/erase modes
- Visual feedback for eraser mode
- Consistent eraser size with brush size

**Implementation:**
```javascript
function toggleEraser(isEraserMode) {
  if (isEraserMode) {
    canvas.freeDrawingBrush = new fabric.EraserBrush(canvas);
    canvas.freeDrawingBrush.width = currentBrushSize;
  } else {
    canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
    canvas.freeDrawingBrush.width = currentBrushSize;
    canvas.freeDrawingBrush.color = currentColor;
  }
}
```

### 3. Undo/Redo System
**Requirements:**
- Maximum 10 states to conserve memory
- Visual undo/redo buttons
- Keyboard shortcuts (Ctrl+Z, Ctrl+Y)

**Implementation:**
```javascript
const historyStack = [];
const redoStack = [];
const MAX_HISTORY = 10;

function addToHistory() {
  const state = canvas.toJSON();
  historyStack.push(state);
  
  if (historyStack.length > MAX_HISTORY) {
    historyStack.shift();
  }
  
  redoStack.length = 0; // Clear redo stack
}

function undo() {
  if (historyStack.length > 1) {
    const currentState = historyStack.pop();
    redoStack.push(currentState);
    
    const previousState = historyStack[historyStack.length - 1];
    canvas.loadFromJSON(previousState, canvas.renderAll.bind(canvas));
  }
}
```

### 4. Color Selector
**Requirements:**
- 8-12 predefined colors aligned with brand
- Circular popup design following design system
- Single-tap color selection
- Current color indicator with brand styling

**Color Palette (Brand-Aligned):**
```javascript
const colorPalette = [
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
];
```

### 5. Brush Size Control
**Requirements:**
- 3-4 preset sizes (small, medium, large, XL)
- Visual size indicators
- Consistent sizing across tools

**Implementation:**
```javascript
const brushSizes = [2, 5, 10, 15];
let currentBrushSize = 5;

function setBrushSize(size) {
  currentBrushSize = size;
  if (canvas.freeDrawingBrush) {
    canvas.freeDrawingBrush.width = size;
  }
}
```

### 6. Booster Stencil System
**Requirements:**
- PNG/SVG stencil overlay
- Drag and scale functionality
- Lock/unlock toggle
- Masking for "color within lines"

**Implementation:**
```javascript
function addBoosterStencil(imageUrl) {
  fabric.Image.fromURL(imageUrl, function(img) {
    img.set({
      left: canvas.width / 2,
      top: canvas.height / 2,
      originX: 'center',
      originY: 'center',
      selectable: true,
      evented: true,
      erasable: false,
      opacity: 0.7
    });
    
    canvas.add(img);
    canvas.bringToFront(img);
  });
}

function lockStencil(stencil, isLocked) {
  stencil.set({
    selectable: !isLocked,
    evented: !isLocked
  });
}
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
- [x] Undo/redo with history management
- [x] Color palette (8 colors)

### Phase 2: Mobile Optimization
- [x] Touch gesture handling
- [x] Mobile UI layout
- [x] Performance optimizations
- [x] Auto-save system

### Phase 3: Booster Integration
- [x] Stencil overlay system
- [x] Drag and scale controls
- [x] Layer management
- [x] Export functionality

### Phase 4: Polish & Testing
- [x] Cross-device testing
- [x] Performance benchmarking
- [x] User experience refinements
- [x] Documentation and handoff

---

*This PRD serves as the technical blueprint for implementing the SketchyAF canvas drawing system using Fabric.js with mobile-first optimizations.* 