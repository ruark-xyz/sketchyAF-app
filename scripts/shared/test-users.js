/**
 * Shared Test Users Configuration
 * 
 * This module provides a centralized configuration for test users used across
 * all game phase testing scripts. It ensures consistency and makes it easy to
 * maintain test user data in one place.
 * 
 * Usage:
 *   import { TEST_USERS, getTestUsers } from '../shared/test-users.js';
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Test user configuration
 * These users should be created using the seed-users script before running game tests
 */
export const TEST_USERS = [
  {
    email: 'alice@example.com',
    password: 'testpass123',
    username: 'alice_sketcher',
    avatar_url: 'https://randomuser.me/api/portraits/women/1.jpg'
  },
  {
    email: 'bob@example.com',
    password: 'testpass123',
    username: 'bob_artist',
    avatar_url: 'https://randomuser.me/api/portraits/men/2.jpg'
  },
  {
    email: 'charlie@example.com',
    password: 'testpass123',
    username: 'charlie_draws',
    avatar_url: 'https://randomuser.me/api/portraits/men/3.jpg'
  },
  {
    email: 'diana@example.com',
    password: 'testpass123',
    username: 'diana_creative',
    avatar_url: 'https://randomuser.me/api/portraits/women/4.jpg'
  }
];

/**
 * Get test users from database (assumes they already exist)
 * This function replaces the individual getTestUsers functions in each script
 * 
 * @param {Object} supabase - Supabase client instance
 * @returns {Promise<Array>} Array of user objects from database
 */
export async function getTestUsers(supabase) {
  console.log('👥 Getting test users...');

  const users = [];

  for (const participant of TEST_USERS) {
    try {
      // Check if user exists
      const { data: existingUser, error: selectError } = await supabase
        .from('users')
        .select('id, email, username, avatar_url')
        .eq('email', participant.email)
        .single();

      if (existingUser) {
        console.log(`   ✅ User found: ${participant.username} (${participant.email})`);
        users.push(existingUser);
        continue;
      }

      if (selectError && selectError.code !== 'PGRST116') {
        throw selectError;
      }

      // User doesn't exist - provide helpful message
      console.log(`   ⚠️  User not found: ${participant.username} (${participant.email})`);
      console.log(`       Please create this user first or run the seed-users script`);
      throw new Error(`Test user ${participant.email} does not exist. Please create test users first.`);

    } catch (error) {
      console.log(`   ❌ Error with user ${participant.email}: ${error.message}`);
      throw error;
    }
  }

  return users;
}

/**
 * Create test users seed data for the seed-users.json file
 * This function generates the JSON structure needed for the seed script
 * 
 * @returns {Object} Seed data object for seed-users.json
 */
export function generateSeedData() {
  return {
    users: TEST_USERS.map(user => ({
      ...user,
      is_subscriber: false,
      subscription_tier: 'free'
    }))
  };
}

/**
 * Display test user credentials for console output
 * Standardized format for showing login information
 * 
 * @returns {void}
 */
export function displayTestUserCredentials() {
  console.log('👥 Test Users (login credentials):');
  TEST_USERS.forEach((participant, index) => {
    console.log(`   ${index + 1}. ${participant.username}`);
    console.log(`      Email: ${participant.email}`);
    console.log(`      Password: ${participant.password}`);
  });
}

/**
 * Get test user count
 * 
 * @returns {number} Number of test users
 */
export function getTestUserCount() {
  return TEST_USERS.length;
}

/**
 * Get test user by email
 * 
 * @param {string} email - User email to find
 * @returns {Object|null} Test user object or null if not found
 */
export function getTestUserByEmail(email) {
  return TEST_USERS.find(user => user.email === email) || null;
}

/**
 * Get test user by username
 * 
 * @param {string} username - Username to find
 * @returns {Object|null} Test user object or null if not found
 */
export function getTestUserByUsername(username) {
  return TEST_USERS.find(user => user.username === username) || null;
}
