// Unit Tests for DrawingExportService
// Tests drawing export, validation, and storage functionality

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DrawingExportService } from '../DrawingExportService';
import { ExcalidrawElement } from '@excalidraw/excalidraw/types/types';

// Mock Excalidraw export functions
vi.mock('@excalidraw/excalidraw', () => ({
  exportToBlob: vi.fn().mockResolvedValue(new Blob(['mock-image'], { type: 'image/png' })),
  exportToSvg: vi.fn().mockResolvedValue({
    outerHTML: '<svg>mock-svg</svg>'
  })
}));

// Mock Supabase storage
vi.mock('../../utils/supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({
          data: { path: 'test-path' },
          error: null
        }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/image.png' }
        })
      })
    }
  }
}));

describe('DrawingExportService', () => {
  let service: DrawingExportService;
  let mockElements: ExcalidrawElement[];
  let mockAppState: any;

  beforeEach(() => {
    service = DrawingExportService.getInstance();
    
    mockElements = [
      {
        id: 'element-1',
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 200,
        height: 150,
        isDeleted: false
      } as ExcalidrawElement,
      {
        id: 'element-2',
        type: 'ellipse',
        x: 300,
        y: 200,
        width: 100,
        height: 100,
        isDeleted: false
      } as ExcalidrawElement
    ];

    mockAppState = {
      width: 800,
      height: 600,
      viewBackgroundColor: '#ffffff'
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = DrawingExportService.getInstance();
      const instance2 = DrawingExportService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('Drawing Validation', () => {
    it('should validate valid drawing', () => {
      const result = service.validateDrawing(mockElements);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.elementCount).toBe(2);
      expect(result.complexity).toBe('low');
    });

    it('should reject empty drawing', () => {
      const result = service.validateDrawing([]);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Drawing is empty');
    });

    it('should reject drawing with only deleted elements', () => {
      const deletedElements = mockElements.map(el => ({ ...el, isDeleted: true }));
      const result = service.validateDrawing(deletedElements);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Drawing has no visible elements');
    });

    it('should warn about complex drawings', () => {
      const complexElements = Array.from({ length: 600 }, (_, i) => ({
        ...mockElements[0],
        id: `element-${i}`
      }));
      
      const result = service.validateDrawing(complexElements);
      
      expect(result.isValid).toBe(true);
      expect(result.complexity).toBe('high');
      expect(result.warnings).toContain('Drawing has many elements, may affect performance');
    });

    it('should reject drawings with too many elements', () => {
      const tooManyElements = Array.from({ length: 1100 }, (_, i) => ({
        ...mockElements[0],
        id: `element-${i}`
      }));
      
      const result = service.validateDrawing(tooManyElements);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Drawing has too many elements (max 1000)');
    });
  });

  describe('Image Export', () => {
    it('should export drawing to PNG', async () => {
      const result = await service.exportToImage(mockElements, mockAppState, { format: 'png' });
      
      expect(result.success).toBe(true);
      expect(result.data).toBeInstanceOf(Blob);
    });

    it('should export drawing to SVG', async () => {
      const result = await service.exportToImage(mockElements, mockAppState, { format: 'svg' });
      
      expect(result.success).toBe(true);
      expect(result.data).toBeInstanceOf(Blob);
    });

    it('should export drawing to JPEG with quality', async () => {
      const result = await service.exportToImage(mockElements, mockAppState, { 
        format: 'jpeg', 
        quality: 0.8 
      });
      
      expect(result.success).toBe(true);
      expect(result.data).toBeInstanceOf(Blob);
    });

    it('should reject invalid drawings', async () => {
      const result = await service.exportToImage([], mockAppState);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Drawing validation failed');
    });

    it('should handle export errors', async () => {
      // Mock exportToBlob to throw an error
      const { exportToBlob } = await import('@excalidraw/excalidraw');
      vi.mocked(exportToBlob).mockRejectedValueOnce(new Error('Export failed'));

      const result = await service.exportToImage(mockElements, mockAppState);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Export failed');
    });
  });

  describe('Storage Upload', () => {
    let mockBlob: Blob;

    beforeEach(() => {
      mockBlob = new Blob(['test-image'], { type: 'image/png' });
    });

    it('should upload image to storage', async () => {
      const result = await service.uploadToStorage(mockBlob, 'game-123', 'user-456');
      
      expect(result.success).toBe(true);
      expect(result.data?.url).toBe('https://example.com/image.png');
    });

    it('should upload with thumbnail generation', async () => {
      // Mock canvas and image for thumbnail generation
      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn().mockReturnValue({
          drawImage: vi.fn()
        }),
        toBlob: vi.fn().mockImplementation((callback) => {
          callback(new Blob(['thumbnail'], { type: 'image/jpeg' }));
        })
      };
      
      const mockImage = {
        onload: null as any,
        onerror: null as any,
        width: 400,
        height: 300,
        set src(value: string) {
          // Simulate successful image load
          setTimeout(() => {
            if (this.onload) {
              this.onload();
            }
          }, 0);
        }
      };

      // Mock document.createElement
      global.document.createElement = vi.fn().mockImplementation((tagName) => {
        if (tagName === 'canvas') return mockCanvas;
        if (tagName === 'img') return mockImage;
        return {};
      });

      // Mock URL.createObjectURL
      global.URL.createObjectURL = vi.fn().mockReturnValue('mock-object-url');

      // Mock URL.createObjectURL
      global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');

      const result = await service.uploadToStorage(mockBlob, 'game-123', 'user-456', { 
        generateThumbnail: true 
      });

      // Trigger image load
      if (mockImage.onload) {
        mockImage.onload();
      }

      expect(result.success).toBe(true);
      expect(result.data?.url).toBeDefined();
    });

    it('should handle upload errors', async () => {
      // Mock storage to return error
      const { supabase } = await import('../../utils/supabase');
      vi.mocked(supabase.storage.from).mockReturnValueOnce({
        upload: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Upload failed' }
        }),
        getPublicUrl: vi.fn()
      } as any);

      const result = await service.uploadToStorage(mockBlob, 'game-123', 'user-456');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Upload failed');
    });
  });

  describe('Drawing Optimization', () => {
    it('should remove deleted elements', () => {
      const elementsWithDeleted = [
        ...mockElements,
        { ...mockElements[0], id: 'deleted-1', isDeleted: true }
      ];
      
      const optimized = service.optimizeDrawing(elementsWithDeleted);
      
      expect(optimized).toHaveLength(2);
      expect(optimized.every(el => !el.isDeleted)).toBe(true);
    });
  });

  describe('Metadata Extraction', () => {
    it('should extract drawing metadata', () => {
      const metadata = service.extractMetadata(
        mockElements,
        mockAppState,
        120, // drawing time
        1024, // file size
        'png',
        'booster-pack-1'
      );
      
      expect(metadata.elementCount).toBe(2);
      expect(metadata.complexity).toBe('low');
      expect(metadata.drawingTime).toBe(120);
      expect(metadata.canvasWidth).toBe(800);
      expect(metadata.canvasHeight).toBe(600);
      expect(metadata.fileSize).toBe(1024);
      expect(metadata.format).toBe('png');
      expect(metadata.boosterPackUsed).toBe('booster-pack-1');
    });

    it('should extract assets from image elements', () => {
      const elementsWithImages = [
        ...mockElements,
        {
          id: 'image-1',
          type: 'image',
          fileId: 'file-123',
          isDeleted: false
        } as any
      ];
      
      const metadata = service.extractMetadata(
        elementsWithImages,
        mockAppState,
        120,
        1024,
        'png'
      );
      
      expect(metadata.assetsUsed).toContain('file-123');
    });
  });
});
