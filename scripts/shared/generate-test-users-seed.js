#!/usr/bin/env node

/**
 * Generate Test Users Seed Data
 * 
 * This script generates a seed-users.json file with the test users used by
 * the game phase testing scripts. This ensures consistency between the
 * shared test user configuration and the seed data.
 * 
 * Usage:
 *   node scripts/shared/generate-test-users-seed.js
 * 
 * This will create/update scripts/seed/seed-users.json with the test users
 * defined in the shared test-users.js configuration.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateSeedData } from './test-users.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the seed file
const SEED_FILE_PATH = path.join(__dirname, '../seed/seed-users.json');

/**
 * Generate and write the seed file
 */
function generateSeedFile() {
  console.log('🌱 Generating test users seed data...');
  
  try {
    // Generate seed data from shared configuration
    const seedData = generateSeedData();
    
    // Create the seed directory if it doesn't exist
    const seedDir = path.dirname(SEED_FILE_PATH);
    if (!fs.existsSync(seedDir)) {
      fs.mkdirSync(seedDir, { recursive: true });
      console.log(`   📁 Created directory: ${seedDir}`);
    }
    
    // Write the seed file
    fs.writeFileSync(SEED_FILE_PATH, JSON.stringify(seedData, null, 2));
    
    console.log(`   ✅ Generated seed file: ${SEED_FILE_PATH}`);
    console.log(`   👥 Users included: ${seedData.users.length}`);
    
    // Display the users that will be created
    console.log('\n📋 Test users that will be created:');
    seedData.users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.username} (${user.email})`);
    });
    
    console.log('\n🚀 Next steps:');
    console.log('   1. Run: node scripts/seed/seed-users.js');
    console.log('   2. Then run any game phase test script');
    
  } catch (error) {
    console.error('❌ Error generating seed file:', error.message);
    process.exit(1);
  }
}

/**
 * Main execution
 */
function main() {
  console.log('🎯 Test Users Seed Generator');
  console.log('============================');
  
  generateSeedFile();
  
  console.log('\n🎉 Seed file generation complete!');
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
