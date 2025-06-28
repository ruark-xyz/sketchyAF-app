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
 * - Uses local Supabase database
 * 
 * Usage:
 *   node scripts/seed/booster-packs/sync-booster-packs.js
 *   npm run seed:booster-packs
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  // Local Supabase configuration
  supabaseUrl: 'http://127.0.0.1:54321',
  supabaseServiceKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
  
  // Asset directory configuration (consistent with assetLoader.ts)
  assetDirectory: path.resolve(__dirname, '../../../public/image-assets'),
  supportedExtensions: ['.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp'],
  
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
 * Discover all asset folders in the image-assets directory
 */
async function discoverAssetFolders() {
  console.log(`📁 Scanning asset directory: ${CONFIG.assetDirectory}`);
  
  try {
    const entries = await fs.readdir(CONFIG.assetDirectory, { withFileTypes: true });
    const folders = entries.filter(entry => entry.isDirectory());
    
    console.log(`📊 Found ${folders.length} folders to analyze`);
    
    const folderData = [];
    
    for (const folder of folders) {
      const folderPath = path.join(CONFIG.assetDirectory, folder.name);
      const assetInfo = await scanAssetDirectory(folderPath);
      const category = inferCategory(folder.name, assetInfo);
      
      folderData.push({
        name: folder.name,
        title: generateTitle(folder.name),
        description: generateDescription(folder.name, assetInfo, category),
        category,
        asset_count: assetInfo.totalFiles,
        asset_directory_name: folder.name, // This matches the DB column
        path: folderPath
      });
      
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
  console.log('🚀 Starting booster pack synchronization...\n');
  
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
