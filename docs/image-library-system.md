# Excalidraw SVG Library System

## Overview

This system automatically converts organized SVG collections into Excalidraw library files (`.excalidrawlib`). It enables the creation of custom, pre-configured libraries from SVG assets stored in a private repository structure, converting them to native Excalidraw vector elements for optimal performance and reliability.

## Quick Start

1. **Add SVG files** to themed folders in `src/assets/image-libraries/`
2. **Run the build script**: `npm run build:libraries`
3. **Generated libraries** appear in `public/libraries/` and load automatically in Excalidraw
4. **Shapes appear** in Library panel with color-coded identification

## Directory Structure

```
src/assets/image-libraries/     # Source SVG files (private)
├── shapes/                     # Shape SVG files
│   ├── circle.svg             # → Orange ellipse
│   ├── square.svg             # → Blue rectangle
│   └── triangle.svg           # → Red rotated rectangle
├── icons/                      # Icon SVG files
└── [custom-folder]/            # Any themed collection

public/libraries/               # Generated libraries (public)
├── robots.excalidrawlib        # Existing library (version 1)
├── shapes.excalidrawlib        # Generated from shapes/ folder
└── [custom-folder].excalidrawlib
```

## Supported Formats

- **SVG** - Vector graphics files (recommended and only supported format)
  - Converted to native Excalidraw vector elements
  - Shape type determined by filename patterns
  - Optimal performance and compatibility

## SVG Processing

### Shape Mapping Logic
- **circle.svg** → Orange ellipse element (`#fd7e14`)
- **square.svg** → Blue rectangle element (`#15aabf`)
- **triangle.svg** → Red rotated rectangle element (`#e03131`)
- **Custom patterns**: Extensible filename-to-shape mapping

### Configuration Settings
```typescript
const CONFIG = {
  sourceDir: 'src/assets/image-libraries',
  outputDir: 'public/libraries',
  supportedFormats: ['.svg'], // SVG only
  libraryElementSize: 150,
};
```

## Usage

### Adding New Libraries

1. **Create a folder** in `src/assets/image-libraries/`
2. **Add SVG files** to the folder (use descriptive filenames)
3. **Run build script**: `npm run build:libraries`
4. **Update ExcalidrawCanvas.tsx** to include the new library:

```typescript
const libraryFiles = [
  'robots.excalidrawlib',
  'shapes.excalidrawlib',
  'your-new-library.excalidrawlib', // Add this line
];
```

### Build Script

```bash
# Generate all libraries
npm run build:libraries

# Output example:
🚀 Starting Excalidraw Library Builder...
📂 Found 2 folder(s) to process
📁 Processing folder: shapes
🖼️  Found 3 SVG file(s) in shapes
   ✅ Processed: circle.svg (100x100)
   ✅ Processed: square.svg (100x100)
   ✅ Processed: triangle.svg (100x100)
💾 Created library: public/libraries/shapes.excalidrawlib
📊 Library contains 3 item(s)
✨ Library generation complete!
```

## Generated Library Format

The script creates valid Excalidraw library files with version 1 format:

```json
{
  "type": "excalidrawlib",
  "version": 1,
  "library": [
    [
      {
        "type": "ellipse",
        "version": 1,
        "id": "unique-id",
        "fillStyle": "solid",
        "strokeWidth": 2,
        "strokeStyle": "solid",
        "roughness": 1,
        "opacity": 100,
        "angle": 0,
        "x": 0,
        "y": 0,
        "strokeColor": "#000000",
        "backgroundColor": "#fd7e14",
        "width": 100,
        "height": 100,
        // ... other Excalidraw element properties
      }
    ]
  ]
}
```

## Integration with Excalidraw

### Automatic Loading
Libraries are automatically loaded when the Excalidraw component mounts:

```typescript
// In ExcalidrawCanvas.tsx
const libraryFiles = [
  'robots.excalidrawlib',
  'shapes.excalidrawlib',
];

// Libraries are loaded via fetch and added to Excalidraw
api.updateLibrary({
  libraryItems: libraryData || [],
  merge: true,
});
```

### Hidden UI Elements
The system hides browse/upload UI while keeping library functionality:

```css
/* Hide "Browse libraries" button */
.excalidraw .library-menu-browse-button {
  display: none !important;
}

/* Hide library menu (upload/import options) */
.excalidraw .library-menu-dropdown-container {
  display: none !important;
}
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
