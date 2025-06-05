# Image Libraries

This directory contains organized image collections that are converted into Excalidraw libraries.

## Structure

```
src/assets/image-libraries/
├── robots/          # Robot-themed images
├── icons/           # Icon images  
├── shapes/          # Shape images
└── [folder-name]/   # Any other themed collection
```

## Usage

1. **Add images**: Place images in themed folders (e.g., `robots/`, `icons/`, etc.)
2. **Supported formats**: PNG, JPG, JPEG, SVG, WebP, GIF
3. **Generate libraries**: Run `npm run build:libraries`
4. **Output**: Libraries are created in `public/libraries/[folder-name].excalidrawlib`

## Image Guidelines

- **Size**: Images will be automatically resized to max 800x600px
- **Quality**: Images are optimized for web use
- **Naming**: No specific naming requirements
- **Organization**: Each folder becomes one library

## Example

```bash
# Add some robot images
src/assets/image-libraries/robots/
├── robot1.png
├── robot2.jpg
└── android.svg

# Run the build script
npm run build:libraries

# Generated output
public/libraries/robots.excalidrawlib
```

## Notes

- Original images are never modified
- Generated libraries overwrite existing ones
- Empty folders are skipped
- Invalid images are logged and skipped
