// Types for image asset management and conversion

/**
 * Supported image formats for the asset system
 */
export type ImageFormat = 'svg' | 'png' | 'jpg' | 'jpeg' | 'gif' | 'webp';

/**
 * MIME type mapping for supported image formats
 */
export const IMAGE_MIME_TYPES: Record<ImageFormat, string> = {
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
} as const;

/**
 * Individual image asset
 */
export interface ImageAsset {
  id: string;
  name: string;
  fileName: string;
  collection: string;
  format: ImageFormat;
  mimeType: string;
  content?: string; // Only for SVG files
  previewUrl: string;
  width?: number;
  height?: number;
}

/**
 * Collection of image assets
 */
export interface ImageCollection {
  id: string;
  name: string;
  displayName: string;
  assets: ImageAsset[];
  totalCount: number;
}

/**
 * Asset drawer component state
 */
export interface AssetDrawerState {
  isOpen: boolean;
  selectedCollection: string | null;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;
}
