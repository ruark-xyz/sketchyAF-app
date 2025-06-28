# Shared Scripts Configuration

This directory contains shared configuration and utilities used across multiple scripts in the SketchyAF project.

## Files

### `test-users.js`
Centralized configuration for test users used by all game phase testing scripts.

**Features:**
- Consistent test user data across all scripts
- Shared `getTestUsers()` function
- Standardized credential display
- Helper functions for user lookup

**Usage:**
```javascript
import { getTestUsers, displayTestUserCredentials } from '../shared/test-users.js';

// In your script
const users = await getTestUsers(supabase);
displayTestUserCredentials();
```

### `generate-test-users-seed.js`
Utility script to generate `seed-users.json` from the shared test user configuration.

**Usage:**
```bash
node scripts/shared/generate-test-users-seed.js
```

This ensures the seed data stays in sync with the test user configuration.

## Test Users

The shared configuration defines 4 test users:

1. **alice_sketcher** (alice@example.com)
2. **bob_artist** (bob@example.com) 
3. **charlie_draws** (charlie@example.com)
4. **diana_creative** (diana@example.com)

All users have the password: `testpass123`

## Setup Workflow

1. **Generate seed data:**
   ```bash
   node scripts/shared/generate-test-users-seed.js
   ```

2. **Create test users:**
   ```bash
   node scripts/seed/seed-users.js
   ```

3. **Run game phase tests:**
   ```bash
   node scripts/game/pre-round-phase.js
   node scripts/game/voting-phase.js
   ```

## Benefits

- ✅ **Consistency**: All scripts use the same test users
- ✅ **Maintainability**: Update users in one place
- ✅ **No Recreation**: Scripts don't recreate existing users
- ✅ **Session Preservation**: Login sessions remain active between test runs
- ✅ **Easy Setup**: Generate seed data automatically from configuration

## Adding New Game Phase Scripts

When creating new game phase testing scripts:

1. Import the shared functions:
   ```javascript
   import { getTestUsers, displayTestUserCredentials } from '../shared/test-users.js';
   ```

2. Use the shared functions:
   ```javascript
   const users = await getTestUsers(supabase);
   displayTestUserCredentials();
   ```

3. Remove any local user configuration or creation logic

This ensures all scripts share the same user base and maintain consistency across the testing suite.
