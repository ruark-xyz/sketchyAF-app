// SVG to Excalidraw conversion utilities

import svgToEx from 'svg-to-excalidraw';
import { SVGAsset, SVGConversionResult } from '../types/svg';

/**
 * Convert SVG content to Excalidraw elements
 */
export async function convertSVGToExcalidraw(
  svgContent: string,
  options?: {
    x?: number;
    y?: number;
    scale?: number;
  }
): Promise<SVGConversionResult> {
  console.log('🔄 Starting SVG conversion...');
  console.log('📄 SVG Content preview:', svgContent.substring(0, 200) + '...');
  console.log('⚙️ Options:', options);

  try {
    // Use svg-to-excalidraw library to convert SVG
    console.log('📦 Calling svgToEx.convert...');
    const result = svgToEx.convert(svgContent);

    console.log('📊 Conversion result:', {
      hasErrors: result.hasErrors,
      contentType: typeof result.content,
      contentLength: result.content?.length || 0,
      errorsCount: result.errors?.length || 0,
      resultKeys: Object.keys(result),
      fullResult: result
    });

    if (result.hasErrors) {
      console.error('❌ SVG conversion errors:', result.errors);
      return {
        success: false,
        error: result.errors?.join(', ') || 'SVG conversion failed'
      };
    }

    if (!result.content) {
      console.error('❌ No content generated from SVG');
      return {
        success: false,
        error: 'No content was generated from the SVG'
      };
    }

    console.log('📝 Raw content preview:', JSON.stringify(result.content));

    // The content from svg-to-excalidraw might be a JSON string or already an object
    // We need to parse it if it's a string, or use it directly if it's already an object
    console.log('🔍 Processing content...');
    let parsedContent;

    if (typeof result.content === 'string') {
      console.log('� Content is a string, attempting to parse JSON...');
      try {
        parsedContent = JSON.parse(result.content);
        console.log('✅ JSON parsed successfully');
      } catch (parseError) {
        console.error('❌ SVG conversion parse error:', parseError);
        console.error('📄 Content that failed to parse (first 500 chars):', result.content.substring(0, 500));
        console.error('📄 Content that failed to parse (last 500 chars):', result.content.substring(Math.max(0, result.content.length - 500)));
        return {
          success: false,
          error: `Failed to parse converted SVG content: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
        };
      }
    } else if (typeof result.content === 'object' && result.content !== null) {
      console.log('📦 Content is already an object, using directly');
      parsedContent = result.content;
    } else {
      console.error('❌ Unexpected content type:', typeof result.content);
      return {
        success: false,
        error: `Unexpected content type: ${typeof result.content}`
      };
    }

    console.log('📋 Parsed content structure:', {
      keys: Object.keys(parsedContent),
      hasElements: 'elements' in parsedContent,
      hasAppState: 'appState' in parsedContent,
      type: parsedContent.type || 'unknown'
    });

    // Extract elements from the parsed content
    // The structure should be { elements: [...], appState: {...} }
    const elements = parsedContent.elements || [];

    console.log('🎯 Elements extracted:', {
      count: elements.length,
      firstElementType: elements[0]?.type || 'none',
      elementTypes: elements.map((el: any) => el.type).slice(0, 5)
    });

    if (elements.length === 0) {
      console.warn('⚠️ No elements found in converted SVG');
      console.warn('📊 Full parsed content:', parsedContent);
      return {
        success: false,
        error: 'No elements were generated from the SVG'
      };
    }

    // Apply positioning and scaling if provided
    let processedElements = elements;

    console.log('🎨 Applying transformations...');
    if (options?.x !== undefined || options?.y !== undefined || options?.scale !== undefined) {
      console.log('📐 Transformation options:', options);
      processedElements = processedElements.map((element: any, index: number) => {
        const originalElement = { ...element };
        const updatedElement = { ...element };

        // Apply positioning
        if (options.x !== undefined) {
          updatedElement.x = (updatedElement.x || 0) + options.x;
        }
        if (options.y !== undefined) {
          updatedElement.y = (updatedElement.y || 0) + options.y;
        }

        // Apply scaling
        if (options.scale !== undefined && options.scale !== 1) {
          updatedElement.x = (updatedElement.x || 0) * options.scale;
          updatedElement.y = (updatedElement.y || 0) * options.scale;
          updatedElement.width = (updatedElement.width || 0) * options.scale;
          updatedElement.height = (updatedElement.height || 0) * options.scale;
        }

        if (index === 0) {
          console.log('🔄 First element transformation:', {
            original: { x: originalElement.x, y: originalElement.y, width: originalElement.width, height: originalElement.height },
            updated: { x: updatedElement.x, y: updatedElement.y, width: updatedElement.width, height: updatedElement.height }
          });
        }

        return updatedElement;
      });
    } else {
      console.log('⏭️ No transformations applied');
    }

    console.log('✅ SVG conversion completed successfully');
    console.log('📊 Final result:', {
      elementsCount: processedElements.length,
      firstElementPosition: processedElements[0] ? { x: processedElements[0].x, y: processedElements[0].y } : null
    });

    return {
      success: true,
      elements: processedElements
    };
  } catch (error) {
    console.error('❌ SVG conversion error:', error);
    console.error('📄 SVG content that caused error:', svgContent);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown conversion error'
    };
  }
}

/**
 * Convert an SVG asset to Excalidraw elements with positioning
 */
export async function convertAssetToExcalidraw(
  asset: SVGAsset,
  insertPosition?: { x: number; y: number }
): Promise<SVGConversionResult> {
  const options = insertPosition ? {
    x: insertPosition.x,
    y: insertPosition.y,
    scale: 1
  } : undefined;

  return convertSVGToExcalidraw(asset.content, options);
}

/**
 * Get the center position of the current Excalidraw viewport
 * This is a helper function to position new elements in the center of the view
 */
export function getViewportCenter(
  appState: any
): { x: number; y: number } {
  // Default center position if appState is not available
  const defaultCenter = { x: 0, y: 0 };
  
  if (!appState) return defaultCenter;
  
  try {
    // Calculate center based on viewport
    const { scrollX = 0, scrollY = 0, zoom = { value: 1 } } = appState;
    const zoomValue = typeof zoom === 'object' ? zoom.value : zoom;
    
    // Approximate viewport size (this could be made more accurate by getting actual canvas dimensions)
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    const centerX = (-scrollX + viewportWidth / 2) / zoomValue;
    const centerY = (-scrollY + viewportHeight / 2) / zoomValue;
    
    return { x: centerX, y: centerY };
  } catch (error) {
    console.warn('Could not calculate viewport center:', error);
    return defaultCenter;
  }
}

/**
 * Insert converted elements into Excalidraw canvas
 */
export function insertElementsIntoCanvas(
  excalidrawAPI: any,
  elements: any[],
  position?: { x: number; y: number }
): boolean {
  console.log('📝 Inserting elements into canvas...');
  console.log('📊 Input parameters:', {
    hasAPI: !!excalidrawAPI,
    elementsCount: elements?.length || 0,
    position
  });

  try {
    if (!excalidrawAPI) {
      console.error('❌ No Excalidraw API provided');
      return false;
    }

    if (!elements || elements.length === 0) {
      console.error('❌ No elements to insert');
      return false;
    }

    // Get current scene elements
    console.log('📋 Getting current scene elements...');
    const currentElements = excalidrawAPI.getSceneElements();
    console.log('📊 Current scene has', currentElements.length, 'elements');

    // Position elements if position is provided
    let positionedElements = elements;
    if (position) {
      console.log('📐 Applying position offset:', position);
      positionedElements = elements.map((element, index) => {
        const positioned = {
          ...element,
          x: element.x + position.x,
          y: element.y + position.y,
        };

        if (index === 0) {
          console.log('🎯 First element positioning:', {
            original: { x: element.x, y: element.y },
            positioned: { x: positioned.x, y: positioned.y }
          });
        }

        return positioned;
      });
    } else {
      console.log('⏭️ No position offset applied');
    }

    // Add new elements to the scene
    const updatedElements = [...currentElements, ...positionedElements];
    console.log('📊 Total elements after insertion:', updatedElements.length);

    console.log('🔄 Updating scene...');
    excalidrawAPI.updateScene({
      elements: updatedElements,
    });

    console.log('✅ Elements successfully inserted into canvas');
    return true;
  } catch (error) {
    console.error('❌ Error inserting elements into canvas:', error);
    return false;
  }
}
