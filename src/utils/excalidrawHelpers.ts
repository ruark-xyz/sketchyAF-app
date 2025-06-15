/**
 * Excalidraw utility functions for canvas operations and positioning
 *
 * This module provides helper functions for working with Excalidraw canvas,
 * including viewport calculations, SVG conversion, and element creation utilities.
 */

import { AppState } from '@excalidraw/excalidraw/types/types';
import { ExcalidrawImageElement, FileId } from '@excalidraw/excalidraw/types/element/types';
import { DataURL } from '@excalidraw/excalidraw/types/types';

/**
 * Configuration for default element dimensions
 */
export const EXCALIDRAW_DEFAULTS = {
  DEFAULT_WIDTH: 200,
  DEFAULT_HEIGHT: 200,
  DEFAULT_STROKE_WIDTH: 1,
  DEFAULT_OPACITY: 100,
} as const;

/**
 * Calculate the center position of the current Excalidraw viewport
 * This is used to position new elements in the center of the visible area
 * 
 * @param appState - The current Excalidraw app state
 * @returns The center coordinates { x, y } in canvas space
 */
export function getViewportCenter(appState: AppState | null): { x: number; y: number } {
  // Default center position if appState is not available
  const defaultCenter = { x: 0, y: 0 };
  
  if (!appState) {
    console.warn('No app state provided, using default center position');
    return defaultCenter;
  }
  
  try {
    // Extract viewport properties with safe defaults
    const { scrollX = 0, scrollY = 0, zoom = { value: 1 } } = appState;
    const zoomValue = typeof zoom === 'object' ? zoom.value : zoom;
    
    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Calculate center position in canvas coordinates
    // Formula: (screen_position - scroll_offset) / zoom_level
    const centerX = (-scrollX + viewportWidth / 2) / zoomValue;
    const centerY = (-scrollY + viewportHeight / 2) / zoomValue;
    
    console.log('📍 Viewport center calculated:', {
      scrollX,
      scrollY,
      zoomValue,
      viewportWidth,
      viewportHeight,
      centerX,
      centerY
    });
    
    return { x: centerX, y: centerY };
  } catch (error) {
    console.warn('Could not calculate viewport center:', error);
    return defaultCenter;
  }
}

/**
 * Convert SVG string to a data URL for use in Excalidraw
 * 
 * @param svgContent - The SVG content as a string
 * @returns A data URL string that can be used as an image source
 */
export function svgToDataURL(svgContent: string): string {
  // Encode SVG content to base64 data URL
  const encodedSvg = btoa(unescape(encodeURIComponent(svgContent)));
  return `data:image/svg+xml;base64,${encodedSvg}`;
}

/**
 * Generate a unique ID for Excalidraw elements
 * Uses crypto.randomUUID() if available, falls back to a simple random string
 * 
 * @returns A unique identifier string
 */
export function generateElementId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback for environments without crypto.randomUUID
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Create a timestamp for Excalidraw elements
 *
 * @returns Current timestamp in milliseconds
 */
export function createTimestamp(): number {
  return Date.now();
}

/**
 * Create an Excalidraw image element from SVG content
 *
 * @param options - Configuration options for the image element
 * @returns A properly configured ExcalidrawImageElement
 */
export function createImageElement(options: {
  id: string;
  fileId: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  timestamp?: number;
}): ExcalidrawImageElement {
  const {
    id,
    fileId,
    x,
    y,
    width = EXCALIDRAW_DEFAULTS.DEFAULT_WIDTH,
    height = EXCALIDRAW_DEFAULTS.DEFAULT_HEIGHT,
    timestamp = createTimestamp(),
  } = options;

  return {
    type: 'image',
    id,
    status: 'saved',
    fileId: fileId as FileId,
    version: 1,
    versionNonce: timestamp,
    x: x - width / 2, // Center horizontally
    y: y - height / 2, // Center vertically
    width,
    height,
    scale: [1, 1],
    isDeleted: false,
    fillStyle: 'solid',
    strokeWidth: EXCALIDRAW_DEFAULTS.DEFAULT_STROKE_WIDTH,
    strokeStyle: 'solid',
    roughness: 1,
    opacity: EXCALIDRAW_DEFAULTS.DEFAULT_OPACITY,
    groupIds: [],
    strokeColor: '#000000',
    backgroundColor: 'transparent',
    seed: timestamp,
    roundness: null,
    angle: 0,
    frameId: null,
    boundElements: null,
    updated: timestamp,
    locked: false,
    link: null,
  };
}

/**
 * Create a file object for Excalidraw's file system
 *
 * @param options - Configuration options for the file
 * @returns A file object that can be added to Excalidraw
 */
export function createExcalidrawFile(options: {
  id: string;
  dataURL: string;
  timestamp?: number;
}) {
  const {
    id,
    dataURL,
    timestamp = createTimestamp(),
  } = options;

  return {
    mimeType: 'image/svg+xml' as const,
    id: id as FileId,
    dataURL: dataURL as DataURL,
    created: timestamp,
  };
}
