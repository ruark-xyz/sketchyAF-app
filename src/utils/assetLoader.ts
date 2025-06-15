// Image Asset Loading and Management Utilities

import { ImageAsset, ImageCollection, ImageFormat, IMAGE_MIME_TYPES } from '../types/assets';

// Configuration for image asset loading
const ASSET_CONFIG = {
  basePath: '/src/assets/image-libraries',
  publicPath: '/image-assets',
  supportedExtensions: ['.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp'],
  collections: [
    { id: 'shapes', name: 'shapes', displayName: 'Basic Shapes' },
    { id: 'troll', name: 'troll', displayName: 'Troll Faces' },
    { id: 'test', name: 'test', displayName: 'Test' },
  ]
};

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
function createPreviewUrl(content: string | null, fileName: string, format: ImageFormat): string {
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
 * Load image content (only for SVG files)
 */
async function loadImageContent(collection: string, fileName: string, format: ImageFormat): Promise<string | null> {
  if (format !== 'svg') {
    // Non-SVG images don't need content loading
    return null;
  }

  console.log(`📁 Loading SVG: ${collection}/${fileName}`);
  try {
    const url = `${ASSET_CONFIG.publicPath}/${collection}/${fileName}`;
    console.log(`🌐 Fetching from URL: ${url}`);

    const response = await fetch(url);
    console.log(`📡 Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      throw new Error(`Failed to load SVG: ${response.status} ${response.statusText}`);
    }

    const content = await response.text();
    console.log(`📄 SVG content loaded (${content.length} chars): ${content.substring(0, 100)}...`);

    return content;
  } catch (error) {
    console.error(`❌ Error loading SVG ${collection}/${fileName}:`, error);
    throw error;
  }
}

/**
 * Load all image assets for a specific collection
 */
export async function loadCollectionAssets(collectionName: string): Promise<ImageAsset[]> {
  console.log(`📚 Loading collection: ${collectionName}`);
  const assets: ImageAsset[] = [];

  // Known files with multiple formats
  const knownFiles: Record<string, string[]> = {
    shapes: [
      'circle.svg',
      'square.svg',
      'triangle.svg'
    ],
    troll: [
      'troll-face-meme-linetest.svg'
    ],
    test: [
      'DreamShaper_v5_An_expansive_post_modern_interior_with_a_modern_0.jpg'
    ]
  };

  const files = knownFiles[collectionName] || [];
  console.log(`📋 Files to load for ${collectionName}:`, files);

  for (const fileName of files) {
    console.log(`🔄 Processing file: ${fileName}`);
    
    if (!isSupportedImageFormat(fileName)) {
      console.warn(`⚠️ Unsupported format: ${fileName}`);
      continue;
    }

    try {
      const format = getImageFormat(fileName);
      const mimeType = IMAGE_MIME_TYPES[format];
      const content = await loadImageContent(collectionName, fileName, format);
      
      // Extract dimensions (only works for SVG)
      const dimensions = format === 'svg' && content ? extractSVGDimensions(content) : {};
      
      const previewUrl = createPreviewUrl(content, `${collectionName}/${fileName}`, format);

      console.log(`📐 Extracted dimensions for ${fileName}:`, dimensions);
      console.log(`🖼️ Created preview URL for ${fileName}: ${previewUrl.substring(0, 50)}...`);

      const asset: ImageAsset = {
        id: generateAssetId(collectionName, fileName),
        name: fileName.replace(/\.[^/.]+$/, ''), // Remove extension
        fileName,
        collection: collectionName,
        format,
        mimeType,
        content,
        previewUrl,
        ...dimensions,
      };

      console.log(`✅ Asset created for ${fileName}:`, {
        id: asset.id,
        name: asset.name,
        collection: asset.collection,
        format: asset.format,
        mimeType: asset.mimeType,
        contentLength: asset.content?.length || 0,
        dimensions: { width: asset.width, height: asset.height }
      });

      assets.push(asset);
    } catch (error) {
      console.error(`❌ Failed to load asset ${fileName} from collection ${collectionName}:`, error);
    }
  }

  console.log(`📊 Collection ${collectionName} loaded with ${assets.length} assets`);
  return assets;
}

/**
 * Load all available image collections
 */
export async function loadAllCollections(): Promise<ImageCollection[]> {
  const collections: ImageCollection[] = [];

  for (const config of ASSET_CONFIG.collections) {
    try {
      const assets = await loadCollectionAssets(config.name);
      collections.push({
        id: config.id,
        name: config.name,
        displayName: config.displayName,
        assets,
        totalCount: assets.length,
      });
    } catch (error) {
      console.error(`Failed to load collection ${config.name}:`, error);
      // Add empty collection to maintain structure
      collections.push({
        id: config.id,
        name: config.name,
        displayName: config.displayName,
        assets: [],
        totalCount: 0,
      });
    }
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
export { ASSET_CONFIG };
