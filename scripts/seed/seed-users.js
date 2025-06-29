#!/usr/bin/env node

/**
 * Seed Users Script
 * 
 * This script reads user data from a git-ignored JSON file and creates users
 * in the Supabase database using the admin API. It follows the same patterns
 * as other scripts in this project.
 * 
 * Usage:
 *   node scripts/seed/seed-users.js
 *   npm run seed:users
 * 
 * JSON file structure (scripts/seed/seed-users.json):
 * {
 *   "users": [
 *     {
 *       "email": "user@example.com",
 *       "password": "password123",
 *       "username": "username",
 *       "avatar_url": "https://example.com/avatar.jpg",
 *       "is_subscriber": false,
 *       "subscription_tier": "free"
 *     }
 *   ]
 * }
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: '.env.local' });

// Configuration
const SEED_FILE_PATH = path.join(__dirname, 'seed-users.json');

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Validate user data structure
 */
function validateUserData(user, index) {
  const errors = [];
  
  if (!user.email || typeof user.email !== 'string') {
    errors.push(`User ${index}: email is required and must be a string`);
  }
  
  if (!user.password || typeof user.password !== 'string') {
    errors.push(`User ${index}: password is required and must be a string`);
  }
  
  if (!user.username || typeof user.username !== 'string') {
    errors.push(`User ${index}: username is required and must be a string`);
  }
  
  if (user.subscription_tier && !['free', 'premium'].includes(user.subscription_tier)) {
    errors.push(`User ${index}: subscription_tier must be 'free' or 'premium'`);
  }
  
  return errors;
}

/**
 * Load and validate seed data from JSON file
 */
function loadSeedData() {
  try {
    if (!fs.existsSync(SEED_FILE_PATH)) {
      console.log(`❌ Seed file not found: ${SEED_FILE_PATH}`);
      console.log('\n📝 Create a seed file with the following structure:');
      console.log(JSON.stringify({
        users: [
          {
            email: "user@example.com",
            password: "password123",
            username: "username",
            avatar_url: "https://example.com/avatar.jpg",
            is_subscriber: false,
            subscription_tier: "free"
          }
        ]
      }, null, 2));
      return null;
    }

    const fileContent = fs.readFileSync(SEED_FILE_PATH, 'utf8');
    const seedData = JSON.parse(fileContent);
    
    if (!seedData.users || !Array.isArray(seedData.users)) {
      console.log('❌ Invalid seed data: "users" array is required');
      return null;
    }
    
    // Validate each user
    const allErrors = [];
    seedData.users.forEach((user, index) => {
      const errors = validateUserData(user, index + 1);
      allErrors.push(...errors);
    });
    
    if (allErrors.length > 0) {
      console.log('❌ Validation errors:');
      allErrors.forEach(error => console.log(`   ${error}`));
      return null;
    }
    
    return seedData;
    
  } catch (error) {
    console.log(`❌ Error loading seed file: ${error.message}`);
    return null;
  }
}

/**
 * Create a single user in Supabase
 */
async function createUser(userData, index) {
  const { email, password, username, avatar_url, is_subscriber, subscription_tier } = userData;
  
  try {
    console.log(`${index}. Creating user: ${email}`);
    
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single();
    
    if (existingUser) {
      console.log(`   ⚠️  User already exists: ${email}`);
      return { success: true, existed: true, user: existingUser };
    }
    
    // Create auth user with admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        username,
        avatar_url
      }
    });

    if (authError) {
      console.log(`   ❌ Auth error: ${authError.message}`);
      return { success: false, error: authError.message };
    }

    // The user profile should be automatically created by the trigger
    // But let's verify and update if needed
    const userId = authData.user.id;
    
    // Wait a moment for the trigger to execute
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Check if profile was created and update additional fields
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (profileError) {
      console.log(`   ❌ Profile lookup error: ${profileError.message}`);
      return { success: false, error: profileError.message };
    }
    
    // Update profile with additional fields if provided
    if (is_subscriber !== undefined || subscription_tier) {
      const updateData = {};
      if (is_subscriber !== undefined) updateData.is_subscriber = is_subscriber;
      if (subscription_tier) updateData.subscription_tier = subscription_tier;
      
      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId);
      
      if (updateError) {
        console.log(`   ⚠️  Profile update warning: ${updateError.message}`);
      }
    }
    
    console.log(`   ✅ Created successfully: ${username} (${userId})`);
    return { 
      success: true, 
      existed: false, 
      user: { 
        id: userId, 
        email, 
        username,
        is_subscriber: is_subscriber || false,
        subscription_tier: subscription_tier || 'free'
      } 
    };
    
  } catch (error) {
    console.log(`   💥 Exception: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Main seeding function
 */
async function seedUsers() {
  console.log('👥 Seeding users from JSON file...\n');
  
  // Load seed data
  const seedData = loadSeedData();
  if (!seedData) {
    return false;
  }
  
  console.log(`📊 Found ${seedData.users.length} users to process\n`);
  
  const results = {
    created: 0,
    existed: 0,
    failed: 0,
    errors: []
  };
  
  // Process each user
  for (let i = 0; i < seedData.users.length; i++) {
    const user = seedData.users[i];
    const result = await createUser(user, i + 1);
    
    if (result.success) {
      if (result.existed) {
        results.existed++;
      } else {
        results.created++;
      }
    } else {
      results.failed++;
      results.errors.push(`${user.email}: ${result.error}`);
    }
    
    // Small delay between users to avoid rate limiting
    if (i < seedData.users.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  // Summary
  console.log('\n📋 Seeding Summary:');
  console.log(`   ✅ Created: ${results.created}`);
  console.log(`   ⚠️  Already existed: ${results.existed}`);
  console.log(`   ❌ Failed: ${results.failed}`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    results.errors.forEach(error => console.log(`   ${error}`));
  }
  
  return results.failed === 0;
}

// Run the seeding script
seedUsers()
  .then(success => {
    console.log(success ? '\n🎉 User seeding completed successfully!' : '\n💥 User seeding completed with errors');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Fatal error during user seeding:', error);
    process.exit(1);
  });
