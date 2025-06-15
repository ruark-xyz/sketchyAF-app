// Image Asset Loading and Management Utilities

import { ImageAsset, ImageCollection, ImageFormat, IMAGE_MIME_TYPES } from '../types/assets';
import { AssetManifest } from '../types/manifest';

// Configuration for image asset loading
const ASSET_CONFIG = {
  basePath: '/src/assets/image-libraries',
  publicPath: '/image-assets',
  supportedExtensions: ['.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp'],
  manifestPath: '/asset-manifest.json'
};

// Cache for the loaded manifest
let manifestCache: AssetManifest | null = null;

/**
 * Generate a unique ID for an image asset
 */
function generateAssetId(collection: string, fileName: string): string {
  return `${collection}-${fileName.replace(/\.[^/.]+$/, '')}`;
}

/**
 * Get image format from file extension
 */
function getImageFormat(fileName: string): ImageFormat {
  const ext = fileName.toLowerCase().split('.').pop();
  switch (ext) {
    case 'svg': return 'svg';
    case 'png': return 'png';
    case 'jpg': return 'jpg';
    case 'jpeg': return 'jpeg';
    case 'gif': return 'gif';
    case 'webp': return 'webp';
    default: return 'png'; // fallback
  }
}

/**
 * Check if a file extension is supported
 */
function isSupportedImageFormat(fileName: string): boolean {
  const ext = '.' + fileName.toLowerCase().split('.').pop();
  return ASSET_CONFIG.supportedExtensions.includes(ext);
}

/**
 * Extract dimensions from SVG content
 */
function extractSVGDimensions(svgContent: string): { width?: number; height?: number } {
  const widthMatch = svgContent.match(/width="(\d+)"/);
  const heightMatch = svgContent.match(/height="(\d+)"/);
  const viewBoxMatch = svgContent.match(/viewBox="[^"]*\s+(\d+)\s+(\d+)"/);

  let width: number | undefined;
  let height: number | undefined;

  if (widthMatch && heightMatch) {
    width = parseInt(widthMatch[1]);
    height = parseInt(heightMatch[1]);
  } else if (viewBoxMatch) {
    width = parseInt(viewBoxMatch[1]);
    height = parseInt(viewBoxMatch[2]);
  }

  return { width, height };
}

/**
 * Create preview URL for different image formats
 */
function createPreviewUrl(content: string | undefined, fileName: string, format: ImageFormat): string {
  if (format === 'svg' && content) {
    // For SVG, create data URL from content
    const encodedSvg = btoa(unescape(encodeURIComponent(content)));
    return `data:image/svg+xml;base64,${encodedSvg}`;
  } else {
    // For other formats, use the public URL directly
    const collection = fileName.split('/')[0] || '';
    return `/image-assets/${collection}/${fileName.split('/').pop()}`;
  }
}

/**
 * Load the asset manifest from the generated file
 */
async function loadManifest(): Promise<AssetManifest> {
  if (manifestCache) {
    return manifestCache;
  }

  try {
    // Load manifest from public directory
    const response = await fetch(ASSET_CONFIG.manifestPath);
    if (!response.ok) {
      throw new Error(`Failed to fetch manifest: ${response.status}`);
    }

    const manifest: AssetManifest = await response.json();
    manifestCache = manifest;
    return manifest;
  } catch (error) {
    console.error('Failed to load asset manifest:', error);
    // Return empty manifest as fallback
    const fallbackManifest: AssetManifest = {
      generated: new Date().toISOString(),
      collections: {},
      totalFiles: 0,
      supportedExtensions: ASSET_CONFIG.supportedExtensions,
    };
    manifestCache = fallbackManifest;
    return fallbackManifest;
  }
}

/**
 * Load image content (only for SVG files)
 */
async function loadImageContent(collection: string, fileName: string, format: ImageFormat): Promise<string | undefined> {
  if (format !== 'svg') {
    // Non-SVG images don't need content loading
    return undefined;
  }

  try {
    const url = `${ASSET_CONFIG.publicPath}/${collection}/${fileName}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to load SVG: ${response.status} ${response.statusText}`);
    }

    const content = await response.text();
    return content;
  } catch (error) {
    console.error(`Error loading SVG ${collection}/${fileName}:`, error);
    throw error;
  }
}

/**
 * Load all image assets for a specific collection
 */
export async function loadCollectionAssets(collectionName: string): Promise<ImageAsset[]> {
  const assets: ImageAsset[] = [];

  try {
    // Load the manifest to get the list of files
    const manifest = await loadManifest();
    const collection = manifest.collections[collectionName];

    if (!collection) {
      console.warn(`Collection '${collectionName}' not found in manifest`);
      return assets;
    }

    for (const manifestFile of collection.files) {
      if (!isSupportedImageFormat(manifestFile.name)) {
        console.warn(`Unsupported format: ${manifestFile.name}`);
        continue;
      }

      try {
        const format = getImageFormat(manifestFile.name);
        const mimeType = IMAGE_MIME_TYPES[format];
        const content = await loadImageContent(collectionName, manifestFile.name, format);

        // Extract dimensions (only works for SVG)
        const dimensions = format === 'svg' && content ? extractSVGDimensions(content) : {};

        const previewUrl = createPreviewUrl(content, `${collectionName}/${manifestFile.name}`, format);

        const asset: ImageAsset = {
          id: generateAssetId(collectionName, manifestFile.name),
          name: manifestFile.name.replace(/\.[^/.]+$/, ''), // Remove extension
          fileName: manifestFile.name,
          collection: collectionName,
          format,
          mimeType,
          content,
          previewUrl,
          ...dimensions,
        };

        assets.push(asset);
      } catch (error) {
        console.error(`Failed to load asset ${manifestFile.name} from collection ${collectionName}:`, error);
      }
    }
  } catch (error) {
    console.error(`Failed to load collection ${collectionName}:`, error);
  }

  return assets;
}

/**
 * Load all available image collections
 */
export async function loadAllCollections(): Promise<ImageCollection[]> {
  const collections: ImageCollection[] = [];

  try {
    // Load the manifest to get all available collections
    const manifest = await loadManifest();

    for (const [collectionName, manifestCollection] of Object.entries(manifest.collections)) {
      try {
        const assets = await loadCollectionAssets(collectionName);
        collections.push({
          id: collectionName,
          name: collectionName,
          displayName: manifestCollection.displayName,
          assets,
          totalCount: assets.length,
        });
      } catch (error) {
        console.error(`Failed to load collection ${collectionName}:`, error);
        // Add empty collection to maintain structure
        collections.push({
          id: collectionName,
          name: collectionName,
          displayName: manifestCollection.displayName,
          assets: [],
          totalCount: 0,
        });
      }
    }
  } catch (error) {
    console.error('Failed to load manifest for collections:', error);
  }

  return collections;
}

/**
 * Search for image assets across all collections
 */
export function searchAssets(collections: ImageCollection[], query: string): ImageAsset[] {
  if (!query.trim()) return [];

  const searchTerm = query.toLowerCase();
  const results: ImageAsset[] = [];

  for (const collection of collections) {
    for (const asset of collection.assets) {
      if (
        asset.name.toLowerCase().includes(searchTerm) ||
        asset.collection.toLowerCase().includes(searchTerm) ||
        asset.format.toLowerCase().includes(searchTerm)
      ) {
        results.push(asset);
      }
    }
  }

  return results;
}

/**
 * Configuration for adaptive image sizing
 */
const ADAPTIVE_SIZING_CONFIG = {
  // Maximum percentage of viewport that an image should occupy
  maxViewportWidthPercent: 0.8,
  maxViewportHeightPercent: 0.8,
  // Minimum and maximum sizes in pixels
  minSize: 50,
  maxSize: 1000,
  // Default size when no dimensions are available
  defaultSize: 200,
  // Zoom level thresholds for different sizing strategies
  zoomThresholds: {
    veryZoomedOut: 0.25, // < 25% zoom
    zoomedOut: 0.5,      // < 50% zoom
    normal: 1.0,         // 100% zoom
    zoomedIn: 2.0,       // > 200% zoom
  }
} as const;

/**
 * Calculate adaptive image dimensions based on viewport size, zoom level, and image properties
 *
 * @param originalWidth - Original image width (if available)
 * @param originalHeight - Original image height (if available)
 * @param viewportWidth - Current viewport width in pixels
 * @param viewportHeight - Current viewport height in pixels
 * @param zoomLevel - Current Excalidraw zoom level (1.0 = 100%)
 * @returns Calculated width and height for optimal display
 */
export function calculateAdaptiveImageSize(
  originalWidth: number | undefined,
  originalHeight: number | undefined,
  viewportWidth: number,
  viewportHeight: number,
  zoomLevel: number
): { width: number; height: number } {
  const config = ADAPTIVE_SIZING_CONFIG;

  // Calculate effective viewport size (accounting for zoom)
  const effectiveViewportWidth = viewportWidth / zoomLevel;
  const effectiveViewportHeight = viewportHeight / zoomLevel;

  // Calculate maximum allowed dimensions
  const maxAllowedWidth = effectiveViewportWidth * config.maxViewportWidthPercent;
  const maxAllowedHeight = effectiveViewportHeight * config.maxViewportHeightPercent;

  // Determine base dimensions
  let baseWidth: number;
  let baseHeight: number;

  if (originalWidth && originalHeight) {
    // Use original dimensions as starting point
    baseWidth = originalWidth;
    baseHeight = originalHeight;
  } else if (originalWidth) {
    // Only width available, assume square
    baseWidth = originalWidth;
    baseHeight = originalWidth;
  } else if (originalHeight) {
    // Only height available, assume square
    baseWidth = originalHeight;
    baseHeight = originalHeight;
  } else {
    // No dimensions available, use default
    baseWidth = config.defaultSize;
    baseHeight = config.defaultSize;
  }

  // Apply zoom-based scaling adjustments
  let scaleFactor = 1.0;

  if (zoomLevel < config.zoomThresholds.veryZoomedOut) {
    // Very zoomed out - make images larger so they're visible
    scaleFactor = 2.0;
  } else if (zoomLevel < config.zoomThresholds.zoomedOut) {
    // Zoomed out - make images slightly larger
    scaleFactor = 1.5;
  } else if (zoomLevel > config.zoomThresholds.zoomedIn) {
    // Zoomed in - make images smaller to fit better
    scaleFactor = 0.7;
  }
  // Normal zoom (0.5 - 2.0) uses scaleFactor = 1.0

  // Apply scale factor
  let targetWidth = baseWidth * scaleFactor;
  let targetHeight = baseHeight * scaleFactor;

  // Ensure we don't exceed viewport constraints
  if (targetWidth > maxAllowedWidth || targetHeight > maxAllowedHeight) {
    const widthRatio = maxAllowedWidth / targetWidth;
    const heightRatio = maxAllowedHeight / targetHeight;
    const constraintRatio = Math.min(widthRatio, heightRatio);

    targetWidth *= constraintRatio;
    targetHeight *= constraintRatio;
  }

  // Apply absolute size constraints
  targetWidth = Math.max(config.minSize, Math.min(config.maxSize, targetWidth));
  targetHeight = Math.max(config.minSize, Math.min(config.maxSize, targetHeight));

  // Maintain aspect ratio if original dimensions were available
  if (originalWidth && originalHeight && originalWidth !== originalHeight) {
    const aspectRatio = originalWidth / originalHeight;

    // Determine which dimension to constrain based on aspect ratio
    if (aspectRatio > 1) {
      // Wider than tall - constrain by width
      targetHeight = targetWidth / aspectRatio;
    } else {
      // Taller than wide - constrain by height
      targetWidth = targetHeight * aspectRatio;
    }
  }

  return {
    width: Math.round(targetWidth),
    height: Math.round(targetHeight)
  };
}

/**
 * Clean up blob URLs to prevent memory leaks
 */
export function cleanupAssetPreviews(assets: ImageAsset[]): void {
  for (const asset of assets) {
    if (asset.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(asset.previewUrl);
    }
  }
}

// Export configuration for external use
export { ASSET_CONFIG, ADAPTIVE_SIZING_CONFIG };
