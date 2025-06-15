// SVG Asset Loading and Management Utilities

import { SVGAsset, SVGCollection } from '../types/svg';

// Configuration for SVG asset loading
const SVG_ASSETS_CONFIG = {
  basePath: '/src/assets/image-libraries',
  supportedExtensions: ['.svg'],
  collections: [
    { id: 'shapes', name: 'shapes', displayName: 'Basic Shapes' },
    { id: 'troll', name: 'troll', displayName: 'Troll Faces' },
    { id: 'icons', name: 'icons', displayName: 'Icons' },
  ]
};

/**
 * Generate a unique ID for an SVG asset
 */
function generateAssetId(collection: string, fileName: string): string {
  return `${collection}-${fileName.replace(/\.[^/.]+$/, '')}`;
}

/**
 * Create a blob URL for SVG content to use as preview
 */
function createSVGPreviewUrl(svgContent: string): string {
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  return URL.createObjectURL(blob);
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
 * Load SVG content from a file path
 * We'll copy SVG files to the public directory and serve them from there
 */
async function loadSVGContent(collection: string, fileName: string): Promise<string> {
  console.log(`📁 Loading SVG: ${collection}/${fileName}`);
  try {
    // Fetch from public directory where SVG files should be copied
    const url = `/svg-assets/${collection}/${fileName}`;
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
 * Load all SVG assets for a specific collection
 */
export async function loadCollectionAssets(collectionName: string): Promise<SVGAsset[]> {
  console.log(`📚 Loading collection: ${collectionName}`);
  const assets: SVGAsset[] = [];

  // For now, we'll hardcode the known files since we can't dynamically scan directories in the browser
  // In a real implementation, you might want to generate this list at build time
  const knownFiles: Record<string, string[]> = {
    shapes: ['circle.svg', 'square.svg', 'triangle.svg'],
    troll: ['troll-face-meme-linetest.svg'],
    icons: [], // Empty for now, but structure is ready
  };

  const files = knownFiles[collectionName] || [];
  console.log(`📋 Files to load for ${collectionName}:`, files);

  for (const fileName of files) {
    console.log(`🔄 Processing file: ${fileName}`);
    try {
      const content = await loadSVGContent(collectionName, fileName);
      const dimensions = extractSVGDimensions(content);
      const previewUrl = createSVGPreviewUrl(content);

      console.log(`📐 Extracted dimensions for ${fileName}:`, dimensions);
      console.log(`🖼️ Created preview URL for ${fileName}: ${previewUrl.substring(0, 50)}...`);

      const asset = {
        id: generateAssetId(collectionName, fileName),
        name: fileName.replace(/\.[^/.]+$/, ''), // Remove extension
        fileName,
        collection: collectionName,
        content,
        previewUrl,
        ...dimensions,
      };

      console.log(`✅ Asset created for ${fileName}:`, {
        id: asset.id,
        name: asset.name,
        collection: asset.collection,
        contentLength: asset.content.length,
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
 * Load all available SVG collections
 */
export async function loadAllCollections(): Promise<SVGCollection[]> {
  const collections: SVGCollection[] = [];

  for (const config of SVG_ASSETS_CONFIG.collections) {
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
 * Search for SVG assets across all collections
 */
export function searchAssets(collections: SVGCollection[], query: string): SVGAsset[] {
  if (!query.trim()) return [];

  const searchTerm = query.toLowerCase();
  const results: SVGAsset[] = [];

  for (const collection of collections) {
    for (const asset of collection.assets) {
      if (
        asset.name.toLowerCase().includes(searchTerm) ||
        asset.collection.toLowerCase().includes(searchTerm)
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
export function cleanupAssetPreviews(assets: SVGAsset[]): void {
  for (const asset of assets) {
    if (asset.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(asset.previewUrl);
    }
  }
}
