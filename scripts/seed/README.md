# Seed Scripts Directory

This directory contains seeding scripts for populating the SketchyAF database with test data.

## Available Seeding Scripts

### User Seeding Script (`seed-users.js`)
### Booster Pack Synchronization (`booster-packs/sync-booster-packs.js`)

## User Seeding Script

### Overview

The `seed-users.js` script allows you to create multiple users in your Supabase database from a JSON file. This is useful for:

- Setting up test users for development
- Populating the database with initial users
- Creating users with specific configurations

### Usage

1. **Create your seed data file:**
   ```bash
   cp scripts/seed/seed-users.example.json scripts/seed/seed-users.json
   ```

2. **Edit the seed data:**
   Edit `scripts/seed/seed-users.json` with your desired user data. The file structure should be:
   ```json
   {
     "users": [
       {
         "email": "user@example.com",
         "password": "password123",
         "username": "unique_username",
         "avatar_url": "https://example.com/avatar.jpg",
         "is_subscriber": false,
         "subscription_tier": "free"
       }
     ]
   }
   ```

3. **Run the script:**
   ```bash
   # Using npm script (recommended)
   npm run seed:users
   
   # Or directly with node
   node scripts/seed/seed-users.js
   ```

### Field Descriptions

- **email** (required): User's email address (must be unique)
- **password** (required): User's password for authentication
- **username** (required): Display username (must be unique)
- **avatar_url** (optional): URL to user's avatar image
- **is_subscriber** (optional): Boolean indicating if user has a subscription (default: false)
- **subscription_tier** (optional): Either "free" or "premium" (default: "free")

### Features

- **Validation**: Validates all user data before processing
- **Duplicate Detection**: Skips users that already exist in the database
- **Error Handling**: Provides detailed error messages for failed operations
- **Progress Tracking**: Shows progress and summary of operations
- **Rate Limiting**: Includes delays between user creation to avoid rate limits

### Security Notes

- The `scripts/seed/seed-users.json` file is automatically git-ignored to prevent committing sensitive data
- Uses Supabase service role key for admin operations
- Passwords are securely handled by Supabase Auth
- Email confirmation is automatically handled

### Example Output

```
👥 Seeding users from JSON file...

📊 Found 4 users to process

1. Creating user: alice@example.com
   ✅ Created successfully: alice_sketcher (uuid-here)
2. Creating user: bob@example.com
   ✅ Created successfully: bob_artist (uuid-here)
3. Creating user: charlie@example.com
   ✅ Created successfully: charlie_draws (uuid-here)
4. Creating user: diana@example.com
   ⚠️  User already exists: diana@example.com

📋 Seeding Summary:
   ✅ Created: 3
   ⚠️  Already existed: 1
   ❌ Failed: 0

🎉 User seeding completed successfully!
```

## Booster Pack Synchronization Script

### Overview

The `booster-packs/sync-booster-packs.js` script synchronizes the `booster_packs` database table with image asset folders found in `./public/image-assets`. This ensures the database stays current with the actual asset files available for the drawing interface.

### Usage

```bash
# Using npm script (recommended)
npm run seed:booster-packs

# Or directly with node
node scripts/seed/booster-packs/sync-booster-packs.js
```

### Key Features

- **Folder Discovery**: Automatically scans `./public/image-assets` for directories
- **Asset Analysis**: Counts supported image files and infers metadata
- **Status Management**: Uses `status` column ('active'/'inactive') based on folder existence
- **Data Preservation**: Keeps manually customized titles and descriptions
- **Idempotent**: Safe to run multiple times without data loss
- **Local Database**: Targets local Supabase development instance

### What It Does

1. **Scans** `./public/image-assets` directory for folders
2. **Creates** new booster pack entries for newly discovered folders
3. **Updates** existing entries with current asset counts and metadata
4. **Deactivates** entries where folders no longer exist (sets `status = 'inactive'`)
5. **Reactivates** entries when folders are restored (sets `status = 'active'`)

### Example Output

```
🚀 Starting booster pack synchronization...

📁 Scanning asset directory: ./public/image-assets
📊 Found 4 folders to analyze
  📂 memes: 7 assets (memes)
  📂 shapes: 2 assets (basics)
  📂 animals: 2 assets (nature)
  📂 food: 1 assets (objects)

📊 Summary:
  ➕ Created: 2 booster packs
  🔄 Updated: 2 booster packs
  ❌ Deactivated: 0 booster packs

🎉 Booster pack synchronization finished successfully!
```

For detailed documentation, see `./scripts/seed/booster-packs/README.md`.

## Future Seed Scripts

This directory can be expanded with additional seeding scripts for other data types:

- Game seeding scripts
- Test data generation scripts

## Environment Requirements

Make sure you have the following environment variables set in `.env.local`:

- `VITE_SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (for admin operations)
