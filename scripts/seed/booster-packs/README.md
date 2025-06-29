# Booster Pack Synchronization Scripts

This directory contains scripts for synchronizing the `booster_packs` database table with image asset folders found in `./public/image-assets`.

## Overview

The booster pack synchronization system ensures that the database stays in sync with the actual asset folders on disk. This is essential for the SketchyAF asset loading system which dynamically loads images from the `./public/image-assets` directory.

## Main Script: `sync-booster-packs.js`

### Purpose

Synchronizes the `booster_packs` table with folders in `./public/image-assets` by:

- **Discovering** all folders in the image assets directory
- **Analyzing** folder contents to count supported image files
- **Creating** new booster pack entries for newly discovered folders
- **Updating** existing entries with current asset counts and metadata
- **Deactivating** entries where the corresponding folder no longer exists
- **Preserving** manually entered data like custom descriptions

### Features

- ✅ **Idempotent**: Safe to run multiple times without data loss
- ✅ **Asset Analysis**: Counts and categorizes image files in each folder
- ✅ **Smart Defaults**: Generates reasonable titles, descriptions, and categories
- ✅ **Data Preservation**: Keeps manually customized titles and descriptions
- ✅ **Status Management**: Uses `is_active` column to track folder existence
- ✅ **Local Database**: Targets local Supabase instance for development
- ✅ **Comprehensive Logging**: Detailed progress and error reporting

### Supported Image Formats

The script recognizes the same image formats as the asset loader:
- `.svg` - Scalable Vector Graphics
- `.png` - Portable Network Graphics  
- `.jpg` / `.jpeg` - JPEG images
- `.gif` - Graphics Interchange Format
- `.webp` - WebP images

### Usage

```bash
# Run directly with Node.js
node scripts/seed/booster-packs/sync-booster-packs.js

# Or use npm script (if configured)
npm run seed:booster-packs
```

### Database Schema Compatibility

The script works with the existing `booster_packs` table schema:

```sql
CREATE TABLE booster_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  is_premium BOOLEAN DEFAULT FALSE,
  asset_directory_name TEXT NOT NULL UNIQUE,
  cover_image_url TEXT,
  price_cents INTEGER DEFAULT 0,
  category TEXT,
  is_active BOOLEAN DEFAULT TRUE,  -- Used as status column
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  asset_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  usage_count INTEGER DEFAULT 0
);
```

### Data Inference Logic

#### Title Generation
- Converts folder names to human-readable titles
- Example: `meme-collection` → `Meme Collection`

#### Category Inference
- Maps folder names to logical categories:
  - `memes`, `troll` → `memes`
  - `shapes`, `basic` → `basics`
  - `animals` → `nature`
  - `food`, `objects` → `objects`
  - `icons` → `icons`
  - Default → `general`

#### Description Generation
- Creates descriptive text based on category and asset count
- Example: `Collection of internet memes and reaction images (7 assets)`

### Status Management

The script uses the `is_active` boolean column to track folder existence:

- **`is_active = true`**: Folder exists in `./public/image-assets`
- **`is_active = false`**: Folder no longer exists (but database record preserved)

This approach ensures:
- No data loss when folders are temporarily moved or renamed
- Historical tracking of booster packs
- Ability to reactivate packs when folders are restored

### Data Preservation

The script intelligently preserves manually customized data:

- **Titles**: Only updates if current title matches auto-generated pattern
- **Descriptions**: Only updates if current description appears auto-generated
- **Categories**: Only sets if currently empty
- **Custom Fields**: Never overwrites `is_premium`, `price_cents`, `cover_image_url`

### Example Output

```
🚀 Starting booster pack synchronization...

📁 Scanning asset directory: /path/to/public/image-assets
📊 Found 4 folders to analyze
  📂 memes: 7 assets (memes)
  📂 shapes: 2 assets (basics)
  📂 animals: 2 assets (nature)
  📂 food: 1 assets (objects)

🔍 Fetching existing booster packs from database...
📊 Found 2 existing booster packs in database

📝 Processing synchronization...

✅ Synchronization completed!

📊 Summary:
  ➕ Created: 2 booster packs
  🔄 Updated: 2 booster packs
  ❌ Deactivated: 0 booster packs
  ⚠️  Errors: 0

➕ Created packs: animals, food
🔄 Updated packs: memes, shapes

🎉 Booster pack synchronization finished successfully!
```

### Error Handling

The script includes comprehensive error handling:

- **Directory Access**: Warns about unreadable directories but continues
- **Database Errors**: Reports specific SQL errors for each operation
- **Network Issues**: Handles Supabase connection problems gracefully
- **Validation**: Checks for required environment and file system access

### Integration with Asset Loader

This script maintains consistency with `src/utils/assetLoader.ts`:

- Uses same supported file extensions
- Matches folder scanning logic
- Ensures `asset_directory_name` corresponds to actual folder names
- Maintains compatibility with manifest-based loading

### Development Workflow

1. **Add new asset folders** to `./public/image-assets`
2. **Run sync script** to update database
3. **Test asset loading** in the application
4. **Verify booster pack** appears in UI

### Security Notes

- Uses Supabase service role key for admin operations
- Targets local development database only
- No external network dependencies beyond local Supabase
- File system access limited to public asset directory

### Troubleshooting

**Script fails to connect to database:**
- Ensure Supabase local development is running (`npx supabase start`)
- Check that database is accessible on port 54322

**Folders not detected:**
- Verify folders exist in `./public/image-assets`
- Check folder permissions are readable
- Ensure folders contain supported image files

**Database updates fail:**
- Check for unique constraint violations on `asset_directory_name`
- Verify RLS policies allow service role access
- Review database logs for detailed error messages
