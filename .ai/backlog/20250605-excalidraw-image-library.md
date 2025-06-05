# Excalidraw Image Library Conversion System

## Overview

This document outlines the requirements for developing a proof-of-concept (POC) system that converts organized image collections into Excalidraw library files. The system will enable the creation of custom, pre-configured libraries from image assets stored in a private repository structure, supporting the existing Excalidraw integration that hides public library browsing while maintaining library functionality.

## Project context

The SketchyAF application currently uses Excalidraw with hidden browse/upload functionality, relying on pre-configured libraries loaded from `public/libraries/*.excalidrawlib` files. This system will automate the creation of these library files from organized image collections, enabling efficient content curation and library management.

## Problem statement

Currently, creating Excalidraw libraries requires manual conversion of images into the `.excalidrawlib` format, which is time-consuming and error-prone. There is no systematic way to organize, process, and convert image collections into usable Excalidraw libraries, limiting the ability to provide rich, curated content libraries for users.

## Goals and objectives

### Primary goals
- Create an automated system for converting image folders into Excalidraw library files
- Establish a clear organizational structure for managing image collections
- Generate optimized libraries that integrate seamlessly with the existing Excalidraw implementation
- Provide a foundation for scalable library content management

### Success metrics
- Successful conversion of image folders to `.excalidrawlib` files
- Generated libraries load correctly in Excalidraw interface
- Image optimization reduces file sizes by at least 30%
- Script execution time under 30 seconds for libraries with 50+ images
- Zero manual intervention required for standard image formats

## User stories and acceptance criteria

### US-001: Image folder organization
**As a** content curator  
**I want to** organize images into themed folders  
**So that** I can create logical groupings for Excalidraw libraries

**Acceptance criteria:**
- Images can be organized in `assets/image-libraries/[folder-name]/` structure
- Folder names become library names in output files
- System supports nested folder structures for organization
- No specific naming conventions required for image files

### US-002: Multi-format image support
**As a** content curator  
**I want to** use various image formats  
**So that** I can work with existing image assets without conversion

**Acceptance criteria:**
- System supports PNG, JPG, JPEG, SVG, WebP, and GIF formats
- Unsupported formats are logged and skipped gracefully
- Image format validation occurs before processing
- Error messages clearly indicate unsupported formats

### US-003: Automated image optimization
**As a** content curator  
**I want** images to be automatically optimized  
**So that** library files are efficient and load quickly

**Acceptance criteria:**
- Images are compressed without significant quality loss
- Large images are resized to reasonable dimensions for library use
- Optimization settings are configurable
- Original images remain unchanged in source folders

### US-004: Library file generation
**As a** content curator  
**I want to** generate Excalidraw library files from image folders  
**So that** I can use them in the application

**Acceptance criteria:**
- Each folder generates one `.excalidrawlib` file named after the folder
- Output files are saved to `public/libraries/[folder-name].excalidrawlib`
- Generated libraries are valid Excalidraw library format
- Existing library files are overwritten with new versions

### US-005: Script execution
**As a** developer  
**I want to** run the conversion script manually  
**So that** I can generate libraries when needed

**Acceptance criteria:**
- Script is executable via npm command (e.g., `npm run build:libraries`)
- Script processes all folders in the image-libraries directory
- Progress feedback is provided during execution
- Success/failure status is clearly reported
- Script can be run from any directory in the project

### US-006: Error handling and logging
**As a** developer  
**I want** comprehensive error handling  
**So that** I can troubleshoot issues effectively

**Acceptance criteria:**
- Failed image processing doesn't stop entire script execution
- Clear error messages for common issues (missing folders, corrupt images, etc.)
- Summary report shows successful and failed conversions
- Logs include file paths and specific error details

## Technical requirements

### System architecture
- Node.js script using TypeScript (tsx) for execution
- Image processing library for optimization and format conversion
- File system operations for directory traversal and file generation
- JSON generation for Excalidraw library format compliance

### Performance requirements
- Process up to 100 images per library within 30 seconds
- Memory usage should not exceed 512MB during processing
- Support concurrent processing of multiple libraries
- Graceful handling of large image files (>10MB)

### File structure requirements
```
assets/
└── image-libraries/          # Private, not in public directory
    ├── robots/              # Example library folder
    │   ├── robot1.png
    │   ├── robot2.jpg
    │   └── robot3.svg
    ├── icons/
    │   └── [icon files]
    └── shapes/
        └── [shape files]

public/
└── libraries/               # Generated output location
    ├── robots.excalidrawlib
    ├── icons.excalidrawlib
    └── shapes.excalidrawlib
```

### Integration requirements
- Generated libraries must be compatible with existing Excalidraw implementation
- No changes required to current library loading mechanism
- Libraries should appear in Excalidraw library panel immediately after generation
- Support for the existing `robots.excalidrawlib` file structure

## Dependencies and constraints

### Technical dependencies
- Node.js runtime environment
- Image processing library (Sharp, Jimp, or similar)
- TypeScript/tsx for script execution
- File system access for reading source images and writing library files

### Constraints
- Private image folders must not be accessible via web server
- Generated libraries are public and accessible via HTTP
- Script execution is manual only (no automated triggers)
- No build process integration required for POC phase

### Assumptions
- Images in source folders are properly formatted and not corrupted
- Folder names are valid for use as library names
- Sufficient disk space available for optimized image generation
- Development environment has necessary Node.js packages available

## Future considerations

### Potential enhancements
- Automated script execution on image folder changes
- Integration with build/deployment pipeline
- Metadata extraction and library categorization
- Batch processing optimization for large image collections
- Support for image variants (different sizes, formats)
- Library versioning and change tracking

### Scalability considerations
- Support for hundreds of libraries
- Cloud storage integration for image assets
- Distributed processing for large image collections
- Caching mechanisms for unchanged images
- API integration for dynamic library generation

## Risk assessment

### Technical risks
- **Image processing performance**: Large images may cause memory issues
  - *Mitigation*: Implement streaming processing and memory limits
- **Library format compatibility**: Generated files may not load correctly
  - *Mitigation*: Validate against existing working library files
- **File system limitations**: Large numbers of files may cause issues
  - *Mitigation*: Implement batch processing and progress tracking

### Operational risks
- **Manual process dependency**: Requires developer intervention for updates
  - *Mitigation*: Clear documentation and simple execution process
- **Source image quality**: Poor quality images affect library usability
  - *Mitigation*: Image validation and quality checks during processing

## Success criteria

### MVP completion criteria
- Script successfully converts image folders to Excalidraw libraries
- Generated libraries load and display correctly in application
- All supported image formats are processed without errors
- Documentation enables other developers to use the system
- Performance meets specified requirements for typical use cases

### Quality gates
- All user stories have passing acceptance criteria
- Generated libraries are validated against Excalidraw format specification
- Error handling covers all identified failure scenarios
- Script execution is reliable and repeatable
- Code follows project standards and includes appropriate comments
