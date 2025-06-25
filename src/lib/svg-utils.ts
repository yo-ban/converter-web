/**
 * Extract dimensions from SVG string
 * Returns width/height from SVG attributes, or null if not found
 * Priority: width/height attributes > viewBox (as fallback)
 */
export function extractSVGDimensions(svgString: string): { width: number; height: number } | null {
  // First, try width and height attributes (these define actual SVG size)
  const widthMatch = svgString.match(/width\s*=\s*["']([^"']+)["']/i);
  const heightMatch = svgString.match(/height\s*=\s*["']([^"']+)["']/i);
  
  if (widthMatch && heightMatch) {
    const widthStr = widthMatch[1].trim();
    const heightStr = heightMatch[1].trim();
    
    // Only accept pure numbers or numbers with 'px' suffix
    // Reject percentages, em, rem, etc.
    const numericPattern = /^(\d+\.?\d*)(px)?$/;
    const widthParsed = widthStr.match(numericPattern);
    const heightParsed = heightStr.match(numericPattern);
    
    if (widthParsed && heightParsed) {
      const width = parseFloat(widthParsed[1]);
      const height = parseFloat(heightParsed[1]);
      
      if (!isNaN(width) && !isNaN(height) && width > 0 && height > 0) {
        return { width, height };
      }
    }
  }
  
  // If no width/height, try viewBox as fallback (for aspect ratio)
  const viewBoxMatch = svgString.match(/viewBox\s*=\s*["']([^"']+)["']/i);
  if (viewBoxMatch) {
    const values = viewBoxMatch[1].trim().split(/\s+/).map(Number);
    if (values.length === 4) {
      const [, , vbWidth, vbHeight] = values;
      if (!isNaN(vbWidth) && !isNaN(vbHeight) && vbWidth > 0 && vbHeight > 0) {
        return { width: vbWidth, height: vbHeight };
      }
    }
  }
  
  return null;
}

/**
 * Calculate dimensions preserving aspect ratio
 * If only width or height is provided, calculate the other dimension
 */
export function calculateAspectRatioDimensions(
  originalWidth: number,
  originalHeight: number,
  targetWidth?: number,
  targetHeight?: number
): { width: number; height: number } {
  const aspectRatio = originalWidth / originalHeight;
  
  if (targetWidth && targetHeight) {
    // Both specified, return as is
    return { width: targetWidth, height: targetHeight };
  } else if (targetWidth) {
    // Only width specified, calculate height
    return { width: targetWidth, height: Math.round(targetWidth / aspectRatio) };
  } else if (targetHeight) {
    // Only height specified, calculate width
    return { width: Math.round(targetHeight * aspectRatio), height: targetHeight };
  } else {
    // Neither specified, use original
    return { width: originalWidth, height: originalHeight };
  }
}