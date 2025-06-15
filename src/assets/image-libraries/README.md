# Image Asset Collections

This directory contains organized image collections that are loaded directly by the Asset Drawer component.

## Structure

```
src/assets/image-libraries/
├── shapes/          # Basic shapes (circle, square, triangle)
├── troll/           # Troll face memes
├── icons/           # Icon collection (empty for now)
└── [folder-name]/   # Any other themed collection
```

## Usage

1. **Add image files**: Place image files in themed folders
2. **Copy to public**: Image files must be copied to `public/image-assets/[folder-name]/`
3. **Update loader**: Add new collections to `assetLoader.ts` configuration
4. **Automatic loading**: Images are loaded directly in the browser via HTTP requests

## Supported Formats

- **SVG** - Vector graphics (recommended for icons and simple graphics)
- **PNG** - Raster images with transparency support
- **JPG/JPEG** - Compressed raster images
- **GIF** - Animated or static images
- **WebP** - Modern compressed format

## Image Guidelines

- **Formats**: SVG, PNG, JPG, JPEG, GIF, WebP are supported
- **Size**: Keep file sizes reasonable for web loading
- **Quality**: Optimize images for web use
- **Naming**: Descriptive filenames (e.g., `circle.svg`, `star-icon.png`)
- **Organization**: Each folder becomes one collection in the drawer

## Current Collections

### Shapes Collection
- `circle.svg` - Orange circle shape
- `square.svg` - Green square shape
- `triangle.svg` - Orange triangle shape

### Troll Collection
- `troll-face-meme-linetest.svg` - Classic troll face

### Icons Collection
- (Empty - ready for expansion with various image formats)

## Adding New Collections

1. Create folder in `src/assets/image-libraries/[collection-name]/`
2. Add image files to the folder (SVG, PNG, JPG, GIF, WebP)
3. Copy image files to `public/image-assets/[collection-name]/`
4. Update `ASSET_CONFIG.collections` in `src/utils/assetLoader.ts`
5. Add file list to `knownFiles` object in `loadCollectionAssets()`

## Notes

- Images are loaded at runtime, no build step required
- Files must exist in both `src/assets/` and `public/image-assets/` directories
- Invalid images are logged and skipped
- Collections with no valid images show as empty in the drawer
- SVG files have their content loaded for inline processing
- Other formats are loaded as external image references
