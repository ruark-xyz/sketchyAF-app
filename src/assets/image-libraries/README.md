# SVG Asset Collections

This directory contains organized SVG collections that are loaded directly by the SVG Drawer component.

## Structure

```
src/assets/image-libraries/
├── shapes/          # Basic shapes (circle, square, triangle)
├── troll/           # Troll face memes
├── icons/           # Icon collection (empty for now)
└── [folder-name]/   # Any other themed collection
```

## Usage

1. **Add SVG files**: Place SVG files in themed folders
2. **Copy to public**: SVG files must be copied to `public/svg-assets/[folder-name]/`
3. **Update loader**: Add new collections to `svgAssetLoader.ts` configuration
4. **Automatic loading**: SVGs are loaded directly in the browser via HTTP requests

## SVG Guidelines

- **Format**: Only SVG files are supported
- **Size**: SVGs should have proper width/height attributes or viewBox
- **Quality**: Keep SVGs optimized and clean
- **Naming**: Descriptive filenames (e.g., `circle.svg`, `star-icon.svg`)
- **Organization**: Each folder becomes one collection in the drawer

## Current Collections

### Shapes Collection
- `circle.svg` - Orange circle shape
- `square.svg` - Green square shape
- `triangle.svg` - Orange triangle shape

### Troll Collection
- `troll-face-meme-linetest.svg` - Classic troll face

## Adding New Collections

1. Create folder in `src/assets/image-libraries/[collection-name]/`
2. Add SVG files to the folder
3. Copy SVG files to `public/svg-assets/[collection-name]/`
4. Update `SVG_ASSETS_CONFIG.collections` in `src/utils/svgAssetLoader.ts`
5. Add file list to `knownFiles` object in `loadCollectionAssets()`

## Notes

- SVGs are loaded at runtime, no build step required
- Files must exist in both `src/assets/` and `public/svg-assets/` directories
- Invalid SVGs are logged and skipped
- Collections with no valid SVGs show as empty in the drawer
