#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const ASSETS_DIR = path.join(__dirname, '..', 'public', 'image-assets');
const OUTPUT_DIR = path.join(__dirname, '..', 'public');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'asset-manifest.json');
const SUPPORTED_EXTENSIONS = ['.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp'];

/**
 * Check if a file has a supported image extension
 */
function isSupportedImageFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return SUPPORTED_EXTENSIONS.includes(ext);
}

/**
 * Get file stats for an image file
 */
function getFileStats(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return {
      size: stats.size,
      modified: stats.mtime.toISOString(),
    };
  } catch (error) {
    console.warn(`Warning: Could not get stats for ${filePath}:`, error.message);
    return {
      size: 0,
      modified: new Date().toISOString(),
    };
  }
}

/**
 * Scan a directory for image files
 */
function scanDirectory(dirPath, collectionName) {
  const files = [];
  
  try {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isFile() && isSupportedImageFile(item)) {
        const fileStats = getFileStats(itemPath);
        files.push({
          name: item,
          path: `${collectionName}/${item}`,
          extension: path.extname(item).toLowerCase().slice(1), // Remove the dot
          ...fileStats,
        });
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error.message);
  }
  
  return files.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Generate the complete asset manifest
 */
function generateManifest() {
  const manifest = {
    generated: new Date().toISOString(),
    collections: {},
    totalFiles: 0,
    supportedExtensions: SUPPORTED_EXTENSIONS,
  };

  try {
    // Check if assets directory exists
    if (!fs.existsSync(ASSETS_DIR)) {
      console.error(`Assets directory not found: ${ASSETS_DIR}`);
      return manifest;
    }

    const items = fs.readdirSync(ASSETS_DIR);
    
    for (const item of items) {
      const itemPath = path.join(ASSETS_DIR, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        console.log(`Scanning collection: ${item}`);
        const files = scanDirectory(itemPath, item);
        
        manifest.collections[item] = {
          name: item,
          displayName: item.charAt(0).toUpperCase() + item.slice(1), // Capitalize first letter
          files,
          count: files.length,
        };
        
        manifest.totalFiles += files.length;
        console.log(`  Found ${files.length} files`);
      }
    }
    
  } catch (error) {
    console.error('Error generating manifest:', error.message);
  }

  return manifest;
}

/**
 * Ensure output directory exists
 */
function ensureOutputDirectory() {
  // Public directory should already exist, but check anyway
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created output directory: ${OUTPUT_DIR}`);
  }
}

/**
 * Write manifest to file
 */
function writeManifest(manifest) {
  try {
    ensureOutputDirectory();
    const jsonContent = JSON.stringify(manifest, null, 2);
    fs.writeFileSync(OUTPUT_FILE, jsonContent, 'utf8');
    console.log(`✅ Asset manifest generated: ${OUTPUT_FILE}`);
    console.log(`📊 Total collections: ${Object.keys(manifest.collections).length}`);
    console.log(`📁 Total files: ${manifest.totalFiles}`);
  } catch (error) {
    console.error('❌ Error writing manifest:', error.message);
    process.exit(1);
  }
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Generating asset manifest...');
  console.log(`📂 Scanning: ${ASSETS_DIR}`);
  
  const manifest = generateManifest();
  writeManifest(manifest);
  
  // Display summary
  console.log('\n📋 Collections found:');
  for (const [name, collection] of Object.entries(manifest.collections)) {
    console.log(`  • ${collection.displayName}: ${collection.count} files`);
  }
}

// Run the script
main();
