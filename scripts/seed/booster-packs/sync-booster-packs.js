#!/usr/bin/env node

/**
 * Booster Pack Synchronization Script
 *
 * This script synchronizes the `booster_packs` table with image asset folders
 * found in `./public/image-assets`. It follows the project's seed script
 * organization pattern and ensures consistency with the asset loading system.
 *
 * Features:
 * - Scans ./public/image-assets for folders (each folder = booster pack)
 * - Infers pack data from folder name and contents
 * - Sets is_active=true for existing folders, is_active=false for missing folders
 * - Preserves manually entered data like descriptions
 * - Idempotent - safe to run multiple times
 * - Supports different environment configurations
 *
 * Usage:
 *   node scripts/seed/booster-packs/sync-booster-packs.js [--env=.env.local]
 *   npm run seed:booster-packs
 *   npm run seed:booster-packs -- --env=.env.production
 *
 * Environment Files:
 *   --env=.env.local      (default) Use local development database
 *   --env=.env.production Use production database (requires production credentials)
 *   --env=.env.staging    Use staging database
 *
 * The script will load the specified environment file to get Supabase credentials:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { config } from 'dotenv';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    envFile: '.env.local' // Default to .env.local
  };

  for (const arg of args) {
    if (arg.startsWith('--env=')) {
      options.envFile = arg.split('=')[1];
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Booster Pack Synchronization Script

Usage:
  node sync-booster-packs.js [options]

Options:
  --env=<file>    Environment file to load (default: .env.local)
  --help, -h      Show this help message

Examples:
  node sync-booster-packs.js
  node sync-booster-packs.js --env=.env.production
  node sync-booster-packs.js --env=.env.development
      `);
      process.exit(0);
    }
  }

  return options;
}

/**
 * Load environment configuration
 */
function loadEnvironment(envFile) {
  const rootDir = path.resolve(__dirname, '../../..');
  const envPath = path.resolve(rootDir, envFile);

  console.log(`🔧 Loading environment from: ${envFile}`);

  try {
    config({ path: envPath });
    console.log(`✅ Environment loaded successfully`);
  } catch (error) {
    console.warn(`⚠️  Warning: Could not load ${envFile}:`, error.message);
    console.log('📝 Continuing with existing environment variables...');
  }
}

// Parse command line arguments and load environment
const options = parseArgs();
loadEnvironment(options.envFile);

// Configuration
const CONFIG = {
  // Supabase configuration from environment variables
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',

  // Asset directory configuration (consistent with assetLoader.ts)
  assetDirectory: path.resolve(__dirname, '../../../public/image-assets'),
  supportedExtensions: ['.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp'],

  // Cover image configuration
  coverImageDirectory: path.resolve(__dirname, '../../../public/booster-packs/covers'),
  coverImageSize: 400, // Square cover images
  collageGrid: { rows: 2, cols: 2 }, // 2x2 grid for collage
  minImagesForCollage: 1, // Minimum images needed to create a collage

  // Default values for new booster packs
  defaults: {
    is_premium: false,
    price_cents: 0,
    sort_order: 100, // New packs get higher sort order
  }
};

/**
 * Initialize Supabase client with service role key for admin operations
 */
function createSupabaseClient() {
  console.log(`🔗 Connecting to Supabase: ${CONFIG.supabaseUrl}`);

  if (!CONFIG.supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  }

  return createClient(CONFIG.supabaseUrl, CONFIG.supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Check if a file has a supported image extension
 */
function isSupportedImageFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return CONFIG.supportedExtensions.includes(ext);
}

/**
 * Scan a directory and count supported image files
 */
async function scanAssetDirectory(dirPath) {
  try {
    const files = await fs.readdir(dirPath);
    const imageFiles = files.filter(isSupportedImageFile);
    
    // Group files by extension for analysis
    const filesByType = {};
    imageFiles.forEach(file => {
      const ext = path.extname(file).toLowerCase();
      if (!filesByType[ext]) filesByType[ext] = [];
      filesByType[ext].push(file);
    });
    
    return {
      totalFiles: imageFiles.length,
      filesByType,
      allFiles: imageFiles
    };
  } catch (error) {
    console.warn(`⚠️  Could not scan directory ${dirPath}:`, error.message);
    return {
      totalFiles: 0,
      filesByType: {},
      allFiles: []
    };
  }
}

/**
 * Generate a human-readable title from folder name
 */
function generateTitle(folderName) {
  return folderName
    .split(/[-_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Infer category from folder name and contents
 */
function inferCategory(folderName, assetInfo) {
  const name = folderName.toLowerCase();
  
  // Predefined category mappings
  const categoryMappings = {
    'meme': 'memes',
    'memes': 'memes',
    'troll': 'memes',
    'shape': 'basics',
    'shapes': 'basics',
    'basic': 'basics',
    'animal': 'nature',
    'animals': 'nature',
    'food': 'objects',
    'object': 'objects',
    'objects': 'objects',
    'icon': 'icons',
    'icons': 'icons'
  };
  
  // Check for direct matches
  for (const [key, category] of Object.entries(categoryMappings)) {
    if (name.includes(key)) {
      return category;
    }
  }
  
  // Default category based on content
  if (assetInfo.totalFiles === 0) return 'empty';
  if (assetInfo.totalFiles < 5) return 'small';
  
  return 'general';
}

/**
 * Generate description based on folder contents
 */
function generateDescription(folderName, assetInfo, category) {
  const title = generateTitle(folderName);
  const fileCount = assetInfo.totalFiles;

  if (fileCount === 0) {
    return `${title} collection (empty)`;
  }

  const typeDescriptions = {
    'memes': 'internet memes and reaction images',
    'basics': 'essential shapes and basic elements',
    'nature': 'animals and nature-themed graphics',
    'objects': 'everyday objects and items',
    'icons': 'icons and symbols',
    'general': 'various graphics and illustrations'
  };

  const typeDesc = typeDescriptions[category] || 'graphics and illustrations';
  return `Collection of ${typeDesc} (${fileCount} assets)`;
}

/**
 * Ensure the cover image directory exists
 */
async function ensureCoverImageDirectory() {
  try {
    await fs.mkdir(CONFIG.coverImageDirectory, { recursive: true });
    console.log(`📁 Cover image directory ready: ${CONFIG.coverImageDirectory}`);
  } catch (error) {
    console.error('❌ Failed to create cover image directory:', error);
    throw error;
  }
}

/**
 * Convert SVG to PNG buffer for image processing
 */
async function convertSvgToPng(svgPath, size = 200) {
  try {
    const svgBuffer = await fs.readFile(svgPath);
    return await sharp(svgBuffer)
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toBuffer();
  } catch (error) {
    console.warn(`⚠️  Failed to convert SVG ${svgPath}:`, error.message);
    return null;
  }
}

/**
 * Process image file to buffer for collage creation
 */
async function processImageToBuffer(imagePath, size = 200) {
  try {
    const ext = path.extname(imagePath).toLowerCase();

    if (ext === '.svg') {
      return await convertSvgToPng(imagePath, size);
    } else {
      // Handle raster images (PNG, JPG, etc.)
      return await sharp(imagePath)
        .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .png()
        .toBuffer();
    }
  } catch (error) {
    console.warn(`⚠️  Failed to process image ${imagePath}:`, error.message);
    return null;
  }
}

/**
 * Create a default cover image when there are insufficient images
 */
async function createDefaultCoverImage(folderName, category) {
  try {
    const title = generateTitle(folderName);
    const size = CONFIG.coverImageSize;

    // Create a simple colored background based on category
    const categoryColors = {
      'memes': { r: 255, g: 193, b: 7 },     // Yellow
      'basics': { r: 52, g: 152, b: 219 },   // Blue
      'nature': { r: 46, g: 204, b: 113 },   // Green
      'objects': { r: 155, g: 89, b: 182 },  // Purple
      'icons': { r: 231, g: 76, b: 60 },     // Red
      'general': { r: 149, g: 165, b: 166 }  // Gray
    };

    const color = categoryColors[category] || categoryColors['general'];

    // Create a simple cover with background color and text
    const svg = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="rgb(${color.r}, ${color.g}, ${color.b})" opacity="0.8"/>
        <rect x="20" y="20" width="${size-40}" height="${size-40}" fill="none" stroke="white" stroke-width="4" rx="10"/>
        <text x="50%" y="45%" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="24" font-weight="bold">${title}</text>
        <text x="50%" y="60%" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="16">${category.toUpperCase()}</text>
      </svg>
    `;

    return await sharp(Buffer.from(svg))
      .png()
      .toBuffer();
  } catch (error) {
    console.warn(`⚠️  Failed to create default cover for ${folderName}:`, error.message);
    return null;
  }
}

/**
 * Generate a cover image collage from folder images
 */
async function generateCoverImage(folderData) {
  try {
    const { name: folderName, path: folderPath, category } = folderData;
    const assetInfo = await scanAssetDirectory(folderPath);

    console.log(`🎨 Generating cover image for ${folderName}...`);

    // If no images or too few images, create a default cover
    if (assetInfo.totalFiles < CONFIG.minImagesForCollage) {
      console.log(`  📝 Creating default cover (${assetInfo.totalFiles} images found)`);
      const defaultBuffer = await createDefaultCoverImage(folderName, category);
      if (!defaultBuffer) {
        throw new Error('Failed to create default cover image');
      }
      return defaultBuffer;
    }

    // Select up to 4 images for the collage
    const maxImages = CONFIG.collageGrid.rows * CONFIG.collageGrid.cols;
    const selectedImages = assetInfo.allFiles.slice(0, maxImages);

    console.log(`  🖼️  Creating collage from ${selectedImages.length} images`);

    // Process images to buffers
    const imageBuffers = [];
    const cellSize = Math.floor(CONFIG.coverImageSize / 2);

    for (const imageFile of selectedImages) {
      const imagePath = path.join(folderPath, imageFile);
      const buffer = await processImageToBuffer(imagePath, cellSize);
      if (buffer) {
        imageBuffers.push(buffer);
      }
    }

    if (imageBuffers.length === 0) {
      console.log(`  📝 No processable images found, creating default cover`);
      return await createDefaultCoverImage(folderName, category);
    }

    // Create collage
    const collageSize = CONFIG.coverImageSize;
    const collage = sharp({
      create: {
        width: collageSize,
        height: collageSize,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    });

    // Position images in a grid
    const composite = [];
    for (let i = 0; i < Math.min(imageBuffers.length, maxImages); i++) {
      const row = Math.floor(i / CONFIG.collageGrid.cols);
      const col = i % CONFIG.collageGrid.cols;
      const left = col * cellSize;
      const top = row * cellSize;

      composite.push({
        input: imageBuffers[i],
        left,
        top
      });
    }

    return await collage.composite(composite).jpeg({ quality: 90 }).toBuffer();

  } catch (error) {
    console.error(`❌ Failed to generate cover image for ${folderData.name}:`, error);
    return null;
  }
}

/**
 * Discover all asset folders in the image-assets directory
 */
async function discoverAssetFolders() {
  console.log(`📁 Scanning asset directory: ${CONFIG.assetDirectory}`);

  try {
    // Ensure cover image directory exists
    await ensureCoverImageDirectory();

    const entries = await fs.readdir(CONFIG.assetDirectory, { withFileTypes: true });
    const folders = entries.filter(entry => entry.isDirectory());

    console.log(`📊 Found ${folders.length} folders to analyze`);

    const folderData = [];

    for (const folder of folders) {
      const folderPath = path.join(CONFIG.assetDirectory, folder.name);
      const assetInfo = await scanAssetDirectory(folderPath);
      const category = inferCategory(folder.name, assetInfo);

      // Generate cover image for this folder
      const folderInfo = {
        name: folder.name,
        title: generateTitle(folder.name),
        description: generateDescription(folder.name, assetInfo, category),
        category,
        asset_count: assetInfo.totalFiles,
        asset_directory_name: folder.name, // This matches the DB column
        path: folderPath
      };

      // Generate and save cover image
      const coverImageBuffer = await generateCoverImage(folderInfo);
      let coverImageUrl = null;

      if (coverImageBuffer) {
        try {
          const coverImagePath = path.join(CONFIG.coverImageDirectory, `${folder.name}.jpg`);
          await fs.writeFile(coverImagePath, coverImageBuffer);
          coverImageUrl = `/booster-packs/covers/${folder.name}.jpg`;
          console.log(`  🎨 Generated cover image: ${coverImageUrl}`);
        } catch (error) {
          console.warn(`  ⚠️  Failed to save cover image for ${folder.name}:`, error.message);
        }
      }

      // Add cover image URL to folder data
      folderInfo.cover_image_url = coverImageUrl;
      folderData.push(folderInfo);

      console.log(`  📂 ${folder.name}: ${assetInfo.totalFiles} assets (${category})`);
    }

    return folderData;
  } catch (error) {
    console.error('❌ Failed to scan asset directory:', error);
    throw error;
  }
}

/**
 * Get existing booster packs from database
 */
async function getExistingBoosterPacks(supabase) {
  console.log('🔍 Fetching existing booster packs from database...');
  
  const { data, error } = await supabase
    .from('booster_packs')
    .select('*')
    .order('sort_order', { ascending: true });
  
  if (error) {
    console.error('❌ Failed to fetch existing booster packs:', error);
    throw error;
  }
  
  console.log(`📊 Found ${data.length} existing booster packs in database`);
  return data;
}

/**
 * Main synchronization function
 */
async function syncBoosterPacks() {
  console.log('🚀 Starting booster pack synchronization...');
  console.log(`📄 Environment file: ${options.envFile}`);
  console.log('');

  try {
    // Initialize Supabase client
    const supabase = createSupabaseClient();
    
    // Discover folders and get existing data
    const [discoveredFolders, existingPacks] = await Promise.all([
      discoverAssetFolders(),
      getExistingBoosterPacks(supabase)
    ]);
    
    // Create maps for efficient lookups
    const folderMap = new Map(discoveredFolders.map(f => [f.asset_directory_name, f]));
    const existingMap = new Map(existingPacks.map(p => [p.asset_directory_name, p]));
    
    console.log('\n📝 Processing synchronization...');
    
    const operations = {
      created: [],
      updated: [],
      deactivated: [],
      errors: []
    };
    
    // Process discovered folders
    for (const folder of discoveredFolders) {
      const existing = existingMap.get(folder.asset_directory_name);
      
      if (existing) {
        // Update existing pack
        const updates = {
          asset_count: folder.asset_count,
          status: 'active', // Folder exists, so pack should be active
          updated_at: new Date().toISOString()
        };

        // Only update title and description if they weren't manually customized
        const isDefaultTitle = existing.title === generateTitle(existing.asset_directory_name);
        const isDefaultDesc = existing.description?.includes('(') && existing.description?.includes('assets)');

        if (isDefaultTitle) {
          updates.title = folder.title;
        }

        if (isDefaultDesc || !existing.description) {
          updates.description = folder.description;
        }

        if (!existing.category) {
          updates.category = folder.category;
        }

        // Always update cover image URL if generated
        if (folder.cover_image_url) {
          updates.cover_image_url = folder.cover_image_url;
        }
        
        const { error } = await supabase
          .from('booster_packs')
          .update(updates)
          .eq('id', existing.id);
        
        if (error) {
          operations.errors.push({ folder: folder.name, error: error.message });
        } else {
          operations.updated.push(folder.name);
        }
      } else {
        // Create new pack
        const newPack = {
          title: folder.title,
          description: folder.description,
          asset_directory_name: folder.asset_directory_name,
          category: folder.category,
          asset_count: folder.asset_count,
          status: 'active',
          cover_image_url: folder.cover_image_url,
          ...CONFIG.defaults
        };
        
        const { error } = await supabase
          .from('booster_packs')
          .insert([newPack]);
        
        if (error) {
          operations.errors.push({ folder: folder.name, error: error.message });
        } else {
          operations.created.push(folder.name);
        }
      }
    }
    
    // Deactivate packs for missing folders
    for (const existing of existingPacks) {
      if (!folderMap.has(existing.asset_directory_name) && (existing.status === 'active' || existing.is_active)) {
        const { error } = await supabase
          .from('booster_packs')
          .update({
            status: 'inactive',
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
        
        if (error) {
          operations.errors.push({ 
            folder: existing.asset_directory_name, 
            error: error.message 
          });
        } else {
          operations.deactivated.push(existing.asset_directory_name);
        }
      }
    }
    
    // Report results
    console.log('\n✅ Synchronization completed!');
    console.log('\n📊 Summary:');
    console.log(`  ➕ Created: ${operations.created.length} booster packs`);
    console.log(`  🔄 Updated: ${operations.updated.length} booster packs`);
    console.log(`  ❌ Deactivated: ${operations.deactivated.length} booster packs`);
    console.log(`  ⚠️  Errors: ${operations.errors.length}`);
    
    if (operations.created.length > 0) {
      console.log('\n➕ Created packs:', operations.created.join(', '));
    }
    
    if (operations.updated.length > 0) {
      console.log('🔄 Updated packs:', operations.updated.join(', '));
    }
    
    if (operations.deactivated.length > 0) {
      console.log('❌ Deactivated packs:', operations.deactivated.join(', '));
    }
    
    if (operations.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      operations.errors.forEach(({ folder, error }) => {
        console.log(`  - ${folder}: ${error}`);
      });
    }
    
    console.log('\n🎉 Booster pack synchronization finished successfully!');
    
  } catch (error) {
    console.error('\n❌ Synchronization failed:', error);
    process.exit(1);
  }
}

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  syncBoosterPacks();
}

export { syncBoosterPacks };
