# Excalidraw SVG Asset System

## Overview

This system provides a direct-loading SVG asset system for the Excalidraw canvas. SVG files are organized in collections and loaded dynamically at runtime through the SVG Drawer component, which converts them to image elements on the canvas for optimal performance and reliability.

## Quick Start

1. **Add SVG files** to themed folders in `src/assets/image-libraries/`
2. **Copy SVG files** to corresponding folders in `public/svg-assets/`
3. **Update configuration** in `src/utils/svgAssetLoader.ts`
4. **SVGs appear** in the SVG Drawer accessible via the image button in Excalidraw

## Directory Structure

```
src/assets/image-libraries/     # Source SVG files (development)
├── shapes/                     # Shape SVG files
│   ├── circle.svg
│   ├── square.svg
│   └── triangle.svg
├── troll/                      # Troll face collection
│   └── troll-face-meme-linetest.svg
├── icons/                      # Icon SVG files (empty)
└── [custom-folder]/            # Any themed collection

public/svg-assets/              # Runtime-accessible SVG files
├── shapes/                     # Copied from src/assets/image-libraries/shapes/
│   ├── circle.svg
│   ├── square.svg
│   └── triangle.svg
└── troll/                      # Copied from src/assets/image-libraries/troll/
    └── troll-face-meme-linetest.svg
```

## Supported Formats

- **SVG** - Vector graphics files (only supported format)
  - Loaded directly at runtime via HTTP requests
  - Converted to Excalidraw image elements when inserted
  - Maintains original SVG quality and scalability

## SVG Loading Process

### Runtime Loading
1. **HTTP Request**: SVG files are fetched from `/public/svg-assets/` at runtime
2. **Data URL Conversion**: SVG content is converted to base64 data URLs
3. **Image Element Creation**: Excalidraw image elements are created with proper positioning
4. **Canvas Insertion**: Images are inserted directly into the Excalidraw canvas

### Configuration Settings
```typescript
// In src/utils/svgAssetLoader.ts
const SVG_ASSETS_CONFIG = {
  basePath: '/src/assets/image-libraries',
  supportedExtensions: ['.svg'],
  collections: [
    { id: 'shapes', name: 'shapes', displayName: 'Basic Shapes' },
    { id: 'troll', name: 'troll', displayName: 'Troll Faces' },
    { id: 'icons', name: 'icons', displayName: 'Icons' },
  ]
};
```

## Usage

### Adding New Collections

1. **Create a folder** in `src/assets/image-libraries/[collection-name]/`
2. **Add SVG files** to the folder (use descriptive filenames)
3. **Copy SVG files** to `public/svg-assets/[collection-name]/`
4. **Update configuration** in `src/utils/svgAssetLoader.ts`:

```typescript
// Add to collections array
{ id: 'your-collection', name: 'your-collection', displayName: 'Your Collection' },

// Add to knownFiles object in loadCollectionAssets()
const knownFiles: Record<string, string[]> = {
  shapes: ['circle.svg', 'square.svg', 'triangle.svg'],
  troll: ['troll-face-meme-linetest.svg'],
  'your-collection': ['file1.svg', 'file2.svg'], // Add this line
};
```

### SVG Drawer Access

The SVG collections are accessible through the SVG Drawer component:

1. **Open Excalidraw**: Navigate to the drawing canvas
2. **Click SVG Button**: Click the image icon in the top-right corner
3. **Browse Collections**: Use tabs to switch between collections
4. **Search SVGs**: Use the search bar to find specific assets
5. **Insert SVG**: Click any SVG thumbnail to insert it into the canvas

```typescript
// SVG Drawer features:
- Collection tabs (Basic Shapes, Troll Faces, etc.)
- Search functionality across all collections
- Real-time SVG preview thumbnails
- Click-to-insert with automatic positioning
- Loading states and error handling
```

## SVG Asset Format

SVG files are loaded directly without conversion, maintaining their original structure:

```xml
<!-- Example: circle.svg -->
<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="40" fill="#4CAF50" stroke="#388E3C" stroke-width="2"/>
</svg>

<!-- When inserted, becomes an Excalidraw image element -->
{
  "type": "image",
  "id": "unique-id",
  "fileId": "file-id",
  "x": 100,
  "y": 100,
  "width": 100,
  "height": 100,
  // ... other Excalidraw image properties
}
```

## Integration with Excalidraw

### SVG Drawer Component
The SVG assets are accessed through a custom drawer component:

```typescript
// In ExcalidrawCanvas.tsx
import SVGDrawer from './SVGDrawer';

// SVG Drawer state
const [isSVGDrawerOpen, setIsSVGDrawerOpen] = useState(false);

// Custom SVG Library Button
<button onClick={() => setIsSVGDrawerOpen(true)}>
  <Image size={20} />
</button>

// SVG Drawer Component
<SVGDrawer
  isOpen={isSVGDrawerOpen}
  onClose={() => setIsSVGDrawerOpen(false)}
  excalidrawAPI={excalidrawAPIRef.current}
/>
```

### Asset Loading Process
SVG collections are loaded dynamically when the drawer opens:

```typescript
// In SVGDrawer.tsx
const [collections, setCollections] = useState<SVGCollection[]>([]);

useEffect(() => {
  const loadCollections = async () => {
    const loadedCollections = await loadAllCollections();
    setCollections(loadedCollections);
  };
  loadCollections();
}, []);
```

## Error Handling

### Common Issues
- **Empty folders**: Skipped with warning message
- **Non-SVG files**: Logged and skipped (only SVG supported)
- **Invalid SVG**: Error logged, processing continues
- **Missing dimensions**: Default size applied (150px)

### Error Messages
```bash
⚠️  No SVG files found in folder-name
❌ Failed to process shape.svg: Error details
💡 Create folders with SVG files to generate libraries
```

## Performance

### Benchmarks
- **Processing**: 3 SVG files in <1 second
- **Memory**: Minimal footprint (no image processing)
- **File sizes**: Compact vector-based libraries
- **Loading**: Instant library loading in Excalidraw

### Optimization Tips
- Use descriptive SVG filenames for shape mapping
- Keep SVG files simple for best conversion results
- Organize SVGs logically by theme/category
- Remove unused SVG files to reduce library size

## Development

### Script Location
- **Main script**: `scripts/build-libraries.ts`
- **Configuration**: Edit CONFIG object in script
- **Dependencies**: Node.js file system operations only

### Customization
```typescript
// Modify these settings in scripts/build-libraries.ts
const CONFIG = {
  sourceDir: 'src/assets/image-libraries',
  outputDir: 'public/libraries',
  supportedFormats: ['.svg'], // SVG only
  libraryElementSize: 150,     // Default library element size
};

// Extend shape mapping in createExcalidrawElementFromSvg()
function createExcalidrawElementFromSvg(filename: string, width: number, height: number) {
  const name = filename.toLowerCase();
  if (name.includes('circle')) return ellipseElement;
  if (name.includes('square')) return rectangleElement;
  // Add custom patterns here
}
```

### Adding New Features
1. **Advanced SVG parsing**: Full SVG-to-vector conversion
2. **Shape pattern expansion**: More filename-to-shape mappings
3. **Multi-format support**: Re-enable PNG/JPG if needed
4. **Automated processing**: File watchers and build integration

## Troubleshooting

### Common Problems

**Script fails to run**
```bash
# Check Node.js version
node --version  # Should be 16+

# Install dependencies
npm install
```

**SVG files not processing**
```bash
# Check SVG files
file src/assets/image-libraries/folder/*.svg

# Verify folder structure
ls -la src/assets/image-libraries/
```

**Libraries not loading in Excalidraw**
```bash
# Check generated files
ls -la public/libraries/

# Verify file format
head -20 public/libraries/your-library.excalidrawlib
```

**TypeScript errors**
```bash
# Check script syntax
npx tsx --check scripts/build-libraries.ts
```

## Future Enhancements

### Planned Features
- **Watch mode**: Auto-regenerate on file changes
- **Build integration**: Include in CI/CD pipeline
- **Cloud storage**: Support for remote image sources
- **API integration**: Dynamic library generation
- **Metadata extraction**: Image tags and descriptions

### Scalability
- Support for hundreds of libraries
- Distributed processing for large collections
- Caching for unchanged images
- Progressive loading for large libraries

## Contributing

### Adding Support for New Formats
1. Update `supportedFormats` in CONFIG
2. Test with sample images
3. Update documentation

### Improving Performance
1. Profile with large image sets
2. Optimize Sharp processing pipeline
3. Implement parallel processing

### Bug Reports
Include:
- SVG file content and structure
- Error messages from build script
- System information
- Sample SVG files (if possible)

---

## Implementation Notes

### Why SVG-Only Approach

The system was designed to use SVG files exclusively for several key reasons:

1. **Reliability**: No complex file system dependencies or image encoding issues
2. **Performance**: Native vector elements load instantly without file resolution
3. **Compatibility**: Perfect integration with existing version 1 library format
4. **Simplicity**: Eliminates image optimization, base64 encoding, and file management complexity

### Shape Mapping Strategy

The filename-based shape mapping provides:
- **Predictable behavior**: Clear relationship between filename and output shape
- **Easy extension**: Simple to add new shape patterns
- **Visual identification**: Color coding helps distinguish shape types
- **Maintainability**: No complex SVG parsing required

### Future Migration Path

The current implementation provides a foundation for:
- **Full SVG parsing**: Upgrade to convert actual SVG paths to Excalidraw elements
- **Multi-format support**: Re-enable image processing if specific use cases require it
- **Advanced features**: Metadata extraction, categorization, and automated processing

This approach prioritizes reliability and immediate functionality while maintaining flexibility for future enhancements.
