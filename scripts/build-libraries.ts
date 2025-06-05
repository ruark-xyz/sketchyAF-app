#!/usr/bin/env node
/**
 * Excalidraw SVG Library Builder
 *
 * Converts SVG files organized in folders to Excalidraw library files.
 * Each folder in src/assets/image-libraries/ becomes a separate .excalidrawlib file.
 *
 * Usage: npm run build:libraries
 */

import fs from 'fs/promises';
import path from 'path';

// Configuration
const CONFIG = {
  sourceDir: 'src/assets/image-libraries',
  outputDir: 'public/libraries',
  supportedFormats: ['.svg'], // Only support SVG for now
  libraryElementSize: 150, // Default size for library elements
};

// Types for version 1 library format (compatible with existing robots library)
type LibraryItem = ExcalidrawElement[];

interface ImageFile {
  name: string;
  path: string;
}

interface FolderInfo {
  name: string;
  path: string;
}

interface ExcalidrawElement {
  type: 'rectangle' | 'ellipse' | 'line';
  version: number;
  versionNonce: number;
  isDeleted: boolean;
  id: string;
  fillStyle: string;
  strokeWidth: number;
  strokeStyle: string;
  roughness: number;
  opacity: number;
  angle: number;
  x: number;
  y: number;
  strokeColor: string;
  backgroundColor: string;
  width: number;
  height: number;
  seed: number;
  groupIds: string[];
  frameId: null;
  roundness: null;
  boundElements: null;
  updated: number;
  link: null;
  locked: boolean;
}

interface ProcessingStats {
  totalFolders: number;
  processedFolders: number;
  processedImages: number;
  errors: string[];
}

// Utility functions
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function generateNonce(): number {
  return Math.floor(Math.random() * 2147483647);
}

async function isImageFile(filePath: string): Promise<boolean> {
  const ext = path.extname(filePath).toLowerCase();
  return CONFIG.supportedFormats.includes(ext);
}

async function processSvgFile(inputPath: string): Promise<{ svgContent: string; width: number; height: number }> {
  try {
    const svgContent = await fs.readFile(inputPath, 'utf-8');

    // Extract width and height from SVG, or use default
    const widthMatch = svgContent.match(/width="(\d+)"/);
    const heightMatch = svgContent.match(/height="(\d+)"/);
    const viewBoxMatch = svgContent.match(/viewBox="[^"]*\s+(\d+)\s+(\d+)"/);

    let width = CONFIG.libraryElementSize;
    let height = CONFIG.libraryElementSize;

    if (widthMatch && heightMatch) {
      width = parseInt(widthMatch[1]);
      height = parseInt(heightMatch[1]);
    } else if (viewBoxMatch) {
      width = parseInt(viewBoxMatch[1]);
      height = parseInt(viewBoxMatch[2]);
    }

    return {
      svgContent,
      width,
      height,
    };
  } catch (error) {
    throw new Error(`Failed to process SVG: ${error}`);
  }
}

function createExcalidrawElementFromSvg(
  filename: string,
  width: number,
  height: number
): ExcalidrawElement {
  const name = filename.toLowerCase();

  // Shape mapping based on filename patterns
  const shapeConfig = getShapeConfig(name);

  return {
    type: shapeConfig.type,
    version: 1,
    versionNonce: generateNonce(),
    isDeleted: false,
    id: generateId(),
    fillStyle: 'solid',
    strokeWidth: 2,
    strokeStyle: 'solid',
    roughness: 1,
    opacity: 100,
    angle: shapeConfig.angle,
    x: 0,
    y: 0,
    strokeColor: '#000000',
    backgroundColor: shapeConfig.backgroundColor,
    width: width || CONFIG.libraryElementSize,
    height: height || CONFIG.libraryElementSize,
    seed: Math.floor(Math.random() * 2147483647),
    groupIds: [],
    frameId: null,
    roundness: null,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
  };
}

function getShapeConfig(filename: string) {
  if (filename.includes('circle') || filename.includes('ellipse')) {
    return { type: 'ellipse' as const, backgroundColor: '#fd7e14', angle: 0 };
  }
  if (filename.includes('triangle')) {
    return { type: 'rectangle' as const, backgroundColor: '#e03131', angle: Math.PI / 4 };
  }
  // Default to rectangle (square)
  return { type: 'rectangle' as const, backgroundColor: '#15aabf', angle: 0 };
}

async function processSvgFolder(folderPath: string, folderName: string): Promise<LibraryItem[]> {
  console.log(`📁 Processing folder: ${folderName}`);

  const folderFiles = await fs.readdir(folderPath);
  const svgFiles: ImageFile[] = [];

  // Filter for SVG files
  for (const file of folderFiles) {
    const filePath = path.join(folderPath, file);
    const stat = await fs.stat(filePath);

    if (stat.isFile() && await isImageFile(filePath)) {
      svgFiles.push({ name: file, path: filePath });
    }
  }

  if (svgFiles.length === 0) {
    console.log(`⚠️  No SVG files found in ${folderName}`);
    return [];
  }

  console.log(`🖼️  Found ${svgFiles.length} SVG file(s) in ${folderName}`);

  const libraryItems: LibraryItem[] = [];

  for (const svgFile of svgFiles) {
    try {
      // Process SVG file
      const { width, height } = await processSvgFile(svgFile.path);

      // Create Excalidraw element based on filename
      const element = createExcalidrawElementFromSvg(svgFile.name, width, height);

      // Create library item (array of elements)
      libraryItems.push([element]);

      console.log(`   ✅ ${svgFile.name} (${width}x${height})`);

    } catch (error) {
      console.error(`   ❌ Failed to process ${svgFile.name}: ${error}`);
    }
  }

  return libraryItems;
}

async function createLibraryFile(libraryItems: LibraryItem[], outputPath: string): Promise<void> {
  const libraryData = {
    type: 'excalidrawlib',
    version: 1,
    library: libraryItems,
  };

  await fs.writeFile(outputPath, JSON.stringify(libraryData, null, 2));
}

async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

async function main(): Promise<void> {
  console.log('🚀 Starting Excalidraw Library Builder...\n');

  const stats: ProcessingStats = {
    totalFolders: 0,
    processedFolders: 0,
    processedImages: 0,
    errors: [],
  };

  try {
    await ensureDirectoryExists(CONFIG.outputDir);

    // Check if source directory exists
    try {
      await fs.access(CONFIG.sourceDir);
    } catch {
      console.error(`❌ Source directory not found: ${CONFIG.sourceDir}`);
      console.log(`💡 Please create the directory and add SVG folders to it.`);
      process.exit(1);
    }

    // Find all folders in source directory
    const folders = await fs.readdir(CONFIG.sourceDir);
    const svgFolders: FolderInfo[] = [];

    for (const folder of folders) {
      const folderPath = path.join(CONFIG.sourceDir, folder);
      const stat = await fs.stat(folderPath);

      if (stat.isDirectory()) {
        svgFolders.push({ name: folder, path: folderPath });
      }
    }

    if (svgFolders.length === 0) {
      console.log(`⚠️  No folders found in ${CONFIG.sourceDir}`);
      console.log(`💡 Create folders with SVG files to generate libraries.`);
      return;
    }

    stats.totalFolders = svgFolders.length;
    console.log(`📂 Found ${svgFolders.length} folder(s) to process\n`);

    // Process each folder
    for (const folder of svgFolders) {
      try {
        const libraryItems = await processSvgFolder(folder.path, folder.name);

        if (libraryItems.length > 0) {
          const outputPath = path.join(CONFIG.outputDir, `${folder.name}.excalidrawlib`);
          await createLibraryFile(libraryItems, outputPath);

          console.log(`💾 Created: ${folder.name}.excalidrawlib (${libraryItems.length} items)\n`);

          stats.processedFolders++;
          stats.processedImages += libraryItems.length;
        }

      } catch (error) {
        const errorMsg = `Failed to process folder ${folder.name}: ${error}`;
        console.error(`❌ ${errorMsg}`);
        stats.errors.push(errorMsg);
      }
    }

    // Print summary
    console.log('📈 Summary:');
    console.log(`   Folders processed: ${stats.processedFolders}/${stats.totalFolders}`);
    console.log(`   SVG files processed: ${stats.processedImages}`);

    if (stats.errors.length > 0) {
      console.log(`   Errors: ${stats.errors.length}`);
      stats.errors.forEach(error => console.log(`     - ${error}`));
    }

    console.log('\n✨ Library generation complete!');

  } catch (error) {
    console.error(`💥 Fatal error: ${error}`);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
