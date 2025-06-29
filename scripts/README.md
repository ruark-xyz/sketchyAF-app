# Scripts Directory

This directory contains utility scripts for the SketchyAF project.

## Directory Structure

- **`seed/`** - Database seeding scripts for populating test data
  - `seed-users.js` - Create users from JSON file
  - `seed-users.example.json` - Example user data structure
  - `README.md` - Detailed seeding documentation

## Utility Scripts

- **`generate-asset-manifest.js`** - Generates asset manifest for image loading
- **`create-persistent-test-game.js`** - Creates test games for development
- **Timer and Game Testing Scripts:**
  - `local-timer-monitor.js`
  - `test-database-timer-functions.js`
  - `test-game-creation-fix.js`
  - `test-redirect-behavior.js`
  - `test-simplified-architecture.js`
  - `test-simplified-components.js`
  - `test-specific-game.js`
  - `test-timer-monitor.js`
  - `validate-timer-implementation.js`

## Usage

Most scripts can be run directly with Node.js:

```bash
node scripts/script-name.js
```

Some scripts have corresponding npm scripts defined in `package.json`:

```bash
npm run generate:manifest
npm run seed:users
```

## Environment Requirements

Scripts that interact with Supabase require environment variables in `.env.local`:

- `VITE_SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for admin operations
- `VITE_SUPABASE_ANON_KEY` - Anonymous key for client operations
