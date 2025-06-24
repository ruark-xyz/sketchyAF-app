// Drawing Export Service - Handles Excalidraw drawing export and storage
// Provides image generation, validation, optimization, and Supabase Storage upload

import { supabase } from '../utils/supabase';
import { ServiceResponse } from '../types/game';
import { ExcalidrawElement, AppState, BinaryFiles } from '@excalidraw/excalidraw/types/types';
import { exportToBlob, exportToSvg } from '@excalidraw/excalidraw';

// Drawing Export Options
export interface ExportOptions {
  format: 'png' | 'svg' | 'jpeg';
  quality?: number; // 0-1 for JPEG
  scale?: number; // Export scale multiplier
  backgroundColor?: string;
  padding?: number;
  width?: number;
  height?: number;
}

// Drawing Validation Result
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  elementCount: number;
  complexity: 'low' | 'medium' | 'high';
}

// Drawing Metadata
export interface DrawingMetadata {
  elementCount: number;
  complexity: 'low' | 'medium' | 'high';
  drawingTime: number;
  canvasWidth: number;
  canvasHeight: number;
  fileSize: number;
  format: string;
  assetsUsed: string[];
  boosterPackUsed?: string;
}

export class DrawingExportService {
  private static instance: DrawingExportService | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): DrawingExportService {
    if (!DrawingExportService.instance) {
      DrawingExportService.instance = new DrawingExportService();
    }
    return DrawingExportService.instance;
  }

  /**
   * Export Excalidraw elements to image blob
   */
  async exportToImage(
    elements: ExcalidrawElement[],
    appState: Partial<AppState>,
    options: ExportOptions = { format: 'png' },
    files?: BinaryFiles | null
  ): Promise<ServiceResponse<Blob>> {
    try {
      console.log('DrawingExportService: Exporting with:', {
        elementCount: elements.length,
        filesCount: files ? Object.keys(files).length : 0,
        files: files,
        options: options
      });

      // Debug: Check for image elements and their file references
      const imageElements = elements.filter(el => el.type === 'image' && !el.isDeleted);
      console.log('DrawingExportService: Image elements found:', imageElements.map(el => ({
        id: el.id,
        fileId: (el as any).fileId,
        type: el.type
      })));

      if (files) {
        console.log('DrawingExportService: Available file IDs:', Object.keys(files));
      }

      // Validate elements
      const validation = this.validateDrawing(elements);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Drawing validation failed: ${validation.errors.join(', ')}`,
          code: 'VALIDATION_FAILED'
        };
      }

      // Set default export options
      const exportOptions = {
        format: options.format || 'png',
        quality: options.quality || 0.9,
        scale: options.scale || 1,
        backgroundColor: options.backgroundColor || '#ffffff',
        padding: options.padding || 20,
        ...options
      };

      let blob: Blob;

      if (exportOptions.format === 'svg') {
        // Export as SVG
        const svgElement = await exportToSvg({
          elements,
          appState: {
            ...appState,
            exportBackground: true,
            viewBackgroundColor: exportOptions.backgroundColor,
            exportPadding: exportOptions.padding,
            exportScale: exportOptions.scale,
          },
          files: files || null,
        });

        // Convert SVG to blob
        // Handle both DOM element and object with outerHTML property
        const svgString = svgElement.outerHTML || new XMLSerializer().serializeToString(svgElement);
        blob = new Blob([svgString], { type: 'image/svg+xml' });
      } else {
        // Export as raster image (PNG/JPEG)
        blob = await exportToBlob({
          elements,
          mimeType: exportOptions.format === 'jpeg' ? 'image/jpeg' : 'image/png',
          quality: exportOptions.format === 'jpeg' ? exportOptions.quality : undefined,
          appState: {
            ...appState,
            exportBackground: true,
            viewBackgroundColor: exportOptions.backgroundColor,
            exportPadding: exportOptions.padding,
            exportScale: exportOptions.scale,
          },
          files: files || null,
        });
      }

      // Validate file size (max 10MB as per game constants)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (blob.size > maxSize) {
        return { 
          success: false, 
          error: `Drawing file size (${Math.round(blob.size / 1024 / 1024)}MB) exceeds maximum allowed (10MB)`,
          code: 'FILE_TOO_LARGE'
        };
      }

      return { success: true, data: blob };
    } catch (error) {
      console.error('Failed to export drawing to image:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown export error',
        code: 'EXPORT_FAILED'
      };
    }
  }

  /**
   * Upload image blob to Supabase Storage
   */
  async uploadToStorage(
    imageBlob: Blob, 
    gameId: string, 
    userId: string,
    options: { generateThumbnail?: boolean } = {}
  ): Promise<ServiceResponse<{ url: string; thumbnailUrl?: string }>> {
    try {
      const timestamp = Date.now();
      const fileExtension = imageBlob.type.split('/')[1] || 'png';
      const fileName = `${gameId}/${userId}/${timestamp}.${fileExtension}`;
      const thumbnailFileName = `${gameId}/${userId}/${timestamp}_thumb.${fileExtension}`;

      // Upload main image
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('drawings')
        .upload(fileName, imageBlob, {
          contentType: imageBlob.type,
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Failed to upload drawing:', uploadError);
        return { 
          success: false, 
          error: uploadError.message,
          code: 'UPLOAD_FAILED'
        };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('drawings')
        .getPublicUrl(fileName);

      const result: { url: string; thumbnailUrl?: string } = {
        url: urlData.publicUrl
      };

      // Generate and upload thumbnail if requested
      if (options.generateThumbnail) {
        try {
          const thumbnailBlob = await this.generateThumbnail(imageBlob);
          
          const { error: thumbUploadError } = await supabase.storage
            .from('drawings')
            .upload(thumbnailFileName, thumbnailBlob, {
              contentType: thumbnailBlob.type,
              cacheControl: '3600',
              upsert: true
            });

          if (!thumbUploadError) {
            const { data: thumbUrlData } = supabase.storage
              .from('drawings')
              .getPublicUrl(thumbnailFileName);
            
            result.thumbnailUrl = thumbUrlData.publicUrl;
          } else {
            console.warn('Failed to upload thumbnail:', thumbUploadError);
          }
        } catch (thumbError) {
          console.warn('Failed to generate thumbnail:', thumbError);
        }
      }

      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to upload to storage:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown upload error',
        code: 'STORAGE_ERROR'
      };
    }
  }

  /**
   * Validate drawing elements (basic technical validation only)
   */
  validateDrawing(elements: ExcalidrawElement[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if drawing has elements
    if (!elements || elements.length === 0) {
      // Allow empty drawings - users should be able to submit anything
      return {
        isValid: true,
        errors,
        warnings,
        elementCount: 0,
        complexity: 'low'
      };
    }

    // Filter active elements
    const activeElements = elements.filter(el => !el.isDeleted);
    const elementCount = activeElements.length;

    // Basic technical limits only
    if (elementCount > 1000) {
      errors.push('Drawing has too many elements (max 1000)');
    }

    // Calculate complexity
    let complexity: 'low' | 'medium' | 'high' = 'low';
    if (elementCount > 100) complexity = 'medium';
    if (elementCount > 300) complexity = 'high';

    // Basic element validation (technical only)
    for (const element of activeElements) {
      if (!element.id) {
        errors.push('Element missing ID');
      }
      if (!element.type) {
        errors.push('Element missing type');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      elementCount,
      complexity
    };
  }

  /**
   * Optimize drawing elements for storage
   */
  optimizeDrawing(elements: ExcalidrawElement[]): ExcalidrawElement[] {
    // Remove deleted elements
    let optimizedElements = elements.filter(el => !el.isDeleted);

    // Remove elements with zero dimensions (invisible)
    optimizedElements = optimizedElements.filter(el => {
      if (el.width === 0 || el.height === 0) {
        return false;
      }
      return true;
    });

    // Remove duplicate elements (same position, size, and type)
    const uniqueElements: ExcalidrawElement[] = [];
    const elementHashes = new Set<string>();

    for (const element of optimizedElements) {
      // Create a hash based on key properties
      const hash = `${element.type}-${element.x}-${element.y}-${element.width}-${element.height}`;

      if (!elementHashes.has(hash)) {
        elementHashes.add(hash);
        uniqueElements.push(element);
      }
    }

    // Clean up element properties (remove undefined/null values)
    const cleanedElements = uniqueElements.map(element => {
      const cleaned: any = {};

      for (const [key, value] of Object.entries(element)) {
        if (value !== undefined && value !== null) {
          cleaned[key] = value;
        }
      }

      return cleaned as ExcalidrawElement;
    });

    // Sort elements by z-index for consistent ordering
    cleanedElements.sort((a, b) => {
      const aIndex = a.index || 0;
      const bIndex = b.index || 0;
      return aIndex - bIndex;
    });

    return cleanedElements;
  }

  /**
   * Content filtering for inappropriate drawings
   */
  filterContent(elements: ExcalidrawElement[]): { isAppropriate: boolean; reasons: string[] } {
    const reasons: string[] = [];
    const activeElements = elements.filter(el => !el.isDeleted);

    // Check text content for inappropriate language
    const inappropriateWords = [
      // Add basic inappropriate words - in production, use a more comprehensive list
      'spam', 'test123', 'asdf', 'qwerty'
    ];

    for (const element of activeElements) {
      if (element.type === 'text' && element.text) {
        const text = element.text.toLowerCase();

        // Check for inappropriate words
        for (const word of inappropriateWords) {
          if (text.includes(word)) {
            reasons.push(`Contains inappropriate text: "${word}"`);
          }
        }

        // Check for excessive repetition (spam-like behavior)
        const words = text.split(/\s+/);
        const wordCount: Record<string, number> = {};

        for (const word of words) {
          wordCount[word] = (wordCount[word] || 0) + 1;
        }

        const maxRepeats = Math.max(...Object.values(wordCount));
        if (maxRepeats > 10 && words.length > 20) {
          reasons.push('Contains excessive text repetition');
        }
      }
    }

    // Check for suspicious drawing patterns
    const elementTypes = activeElements.map(el => el.type);
    const typeCount: Record<string, number> = {};

    for (const type of elementTypes) {
      typeCount[type] = (typeCount[type] || 0) + 1;
    }

    // Flag drawings with excessive single-type elements (potential spam)
    for (const [type, count] of Object.entries(typeCount)) {
      if (count > 100 && type !== 'draw' && type !== 'freedraw') {
        reasons.push(`Excessive use of ${type} elements (${count})`);
      }
    }

    return {
      isAppropriate: reasons.length === 0,
      reasons
    };
  }

  /**
   * Generate thumbnail from image blob
   */
  private async generateThumbnail(imageBlob: Blob, maxSize = 200): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      img.onload = () => {
        // Calculate thumbnail dimensions
        const { width, height } = img;
        const aspectRatio = width / height;
        
        let thumbWidth = maxSize;
        let thumbHeight = maxSize;
        
        if (aspectRatio > 1) {
          thumbHeight = maxSize / aspectRatio;
        } else {
          thumbWidth = maxSize * aspectRatio;
        }

        // Set canvas size
        canvas.width = thumbWidth;
        canvas.height = thumbHeight;

        // Draw scaled image
        ctx.drawImage(img, 0, 0, thumbWidth, thumbHeight);

        // Convert to blob
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to generate thumbnail blob'));
          }
        }, 'image/jpeg', 0.8);
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for thumbnail generation'));
      };

      img.src = URL.createObjectURL(imageBlob);
    });
  }

  /**
   * Extract drawing metadata
   */
  extractMetadata(
    elements: ExcalidrawElement[],
    appState: Partial<AppState>,
    drawingTime: number,
    fileSize: number,
    format: string,
    boosterPackId?: string
  ): DrawingMetadata {
    const validation = this.validateDrawing(elements);

    // Extract canvas dimensions
    const canvasWidth = appState.width || 800;
    const canvasHeight = appState.height || 600;

    // Extract assets used from image elements
    const assetsUsed: string[] = [];
    for (const element of elements) {
      if (element.type === 'image' && !element.isDeleted) {
        // Try to extract asset info from element metadata or file ID
        // This would need to be enhanced based on how assets are stored
        if (element.fileId) {
          assetsUsed.push(element.fileId);
        }
      }
    }

    return {
      elementCount: validation.elementCount,
      complexity: validation.complexity,
      drawingTime,
      canvasWidth,
      canvasHeight,
      fileSize,
      format,
      assetsUsed,
      boosterPackUsed: boosterPackId
    };
  }
}

// Export singleton instance
export const drawingExportService = DrawingExportService.getInstance();
