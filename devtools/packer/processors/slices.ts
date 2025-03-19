import type { ExtractedSprite } from "../types.ts";

/**
 * A cross marker is a pixel that has non-transparent pixels
 * in all four directions (up, down, left, right)
 */
function isSliceMarker(
  data: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number
): boolean {
  // Validate input parameters
  if (!data || data.length < 4 || width <= 0 || height <= 0) {
    return false;
  }

  // Quick bounds check for the center pixel
  if (x < 0 || x >= width || y < 0 || y >= height) {
    return false; // Center pixel is out of bounds
  }

  // Get the pixel index in the data array
  const getIndex = (x: number, y: number): number => {
    if (x < 0 || x >= width || y < 0 || y >= height) {
      // Out of bounds, but no need to log this as it's expected during edge checking
      return -1;
    }
    const index = (y * width + x) * 4;

    // Check if index is within data bounds
    if (index < 0 || index + 3 >= data.length) {
      console.log(`Index out of bounds: ${index}, ${x}, ${y}`);
      return -1;
    }

    return index;
  };

  const centerIndex = getIndex(x, y);
  // If center pixel is invalid or transparent, it's not a marker
  if (centerIndex === -1 || data[centerIndex + 3] === 0) {
    return false;
  }

  // Check each of the four directions for non-transparent pixels
  const up = getIndex(x, y - 1);
  const down = getIndex(x, y + 1);
  const left = getIndex(x - 1, y);
  const right = getIndex(x + 1, y);

  // All four directions must have non-transparent pixels to be a slice marker
  return (
    up !== -1 &&
    data[up + 3] !== 0 &&
    down !== -1 &&
    data[down + 3] !== 0 &&
    left !== -1 &&
    data[left + 3] !== 0 &&
    right !== -1 &&
    data[right + 3] !== 0
  );
}

/**
 * Find all slices in a sprite layer using marker crosses
 */
export function generateFrames(
  baseSprite: ExtractedSprite
): { x: number; y: number; w: number; h: number }[] {
  // Check if we have a slice sprite
  if (!baseSprite.sliceSprite) {
    console.warn(`No slice sprite found for ${baseSprite.name}`);
    return [{ x: 0, y: 0, w: baseSprite.width, h: baseSprite.height }];
  }

  const sliceSprite = baseSprite.sliceSprite;

  // Get the relative position between slice layer and content layer
  const sliceOffsetX = sliceSprite.x - baseSprite.x;
  const sliceOffsetY = sliceSprite.y - baseSprite.y;

  console.log(`Slice offset: (${sliceOffsetX}, ${sliceOffsetY})`);
  console.log(`Content position: (${baseSprite.x}, ${baseSprite.y})`);
  console.log(`Slice position: (${sliceSprite.x}, ${sliceSprite.y})`);

  // Get baseSprite origin within the full image
  const baseSpriteOriginX = baseSprite.x;
  const baseSpriteOriginY = baseSprite.y;

  console.log(
    `Base sprite origin in full image: (${baseSpriteOriginX}, ${baseSpriteOriginY})`
  );

  // Determine the content bounds (non-transparent area) of the base sprite
  let contentLeft = baseSprite.width;
  let contentTop = baseSprite.height;
  let contentRight = 0;
  let contentBottom = 0;

  // Find content bounds by scanning the base sprite for non-transparent pixels
  for (let y = 0; y < baseSprite.height; y++) {
    for (let x = 0; x < baseSprite.width; x++) {
      const index = (y * baseSprite.width + x) * 4;
      if (baseSprite.data[index + 3] !== 0) {
        // Non-transparent pixel
        contentLeft = Math.min(contentLeft, x);
        contentTop = Math.min(contentTop, y);
        contentRight = Math.max(contentRight, x);
        contentBottom = Math.max(contentBottom, y);
      }
    }
  }

  // If there's no content, return a single frame for the whole sprite
  if (contentLeft > contentRight || contentTop > contentBottom) {
    return [{ x: 0, y: 0, w: baseSprite.width, h: baseSprite.height }];
  }

  const contentWidth = contentRight - contentLeft + 1;
  const contentHeight = contentBottom - contentTop + 1;

  // Find all slice markers in the slice data
  const slicePositionsX: Set<number> = new Set();
  const slicePositionsY: Set<number> = new Set();

  // Add content bounds as initial slice positions
  slicePositionsX.add(contentLeft);
  slicePositionsX.add(contentRight + 1); // +1 because right edge is exclusive
  slicePositionsY.add(contentTop);
  slicePositionsY.add(contentBottom + 1); // +1 because bottom edge is exclusive

  // Calculate slice dimensions
  const sliceWidth = sliceSprite.width;
  const sliceHeight = sliceSprite.height;

  // Find all markers in the slice data
  const markers: { x: number; y: number }[] = [];

  // Find all cross markers, adjusting for the offset
  for (let y = 0; y < sliceHeight; y++) {
    for (let x = 0; x < sliceWidth; x++) {
      if (isSliceMarker(sliceSprite.data, sliceWidth, sliceHeight, x, y)) {
        // Store found marker for visualization
        markers.push({ x, y });

        // A cross marker creates both horizontal and vertical slice lines
        // We'll filter them later if they don't intersect with content

        // Transform from slice space to baseSprite space
        const baseSpriteX = x + sliceOffsetX;
        const baseSpriteY = y + sliceOffsetY;

        // Transform from baseSprite space to content space
        const contentX = baseSpriteOriginX + baseSpriteX;
        const contentY = baseSpriteOriginY + baseSpriteY;

        slicePositionsX.add(contentX);
        slicePositionsY.add(contentY);
        console.log(
          `Found slice marker at ${x},${y} (content space: ${contentX},${contentY})`
        );
      }
    }
  }

  // Filter slice positions to only include those that intersect with content area
  const validSlicePositionsX = Array.from(slicePositionsX)
    .filter((x) => x >= contentLeft && x <= contentRight + 1)
    .sort((a, b) => a - b);

  const validSlicePositionsY = Array.from(slicePositionsY)
    .filter((y) => y >= contentTop && y <= contentBottom + 1)
    .sort((a, b) => a - b);

  console.log(
    `Found ${slicePositionsX.size} X slice positions, ${validSlicePositionsX.length} valid`
  );
  console.log(
    `Found ${slicePositionsY.size} Y slice positions, ${validSlicePositionsY.length} valid`
  );

  // Generate all frames from the valid slice positions
  const frames: { x: number; y: number; w: number; h: number }[] = [];

  // If there are no valid slices, return a single frame for the content area
  if (validSlicePositionsX.length <= 1 || validSlicePositionsY.length <= 1) {
    return [
      {
        x: contentLeft,
        y: contentTop,
        w: contentWidth,
        h: contentHeight,
      },
    ];
  }

  // Create frames from the valid slice positions
  for (let i = 0; i < validSlicePositionsY.length - 1; i++) {
    for (let j = 0; j < validSlicePositionsX.length - 1; j++) {
      // These positions are relative to the content's local coordinate system
      const localX = validSlicePositionsX[j];
      const localY = validSlicePositionsY[i];
      const w = validSlicePositionsX[j + 1] - localX;
      const h = validSlicePositionsY[i + 1] - localY;

      // Convert these positions to be relative to the sprite's origin
      // Since the slice markers were detected in the content's coordinate system,
      // we need to ensure the frames are correctly positioned relative to the sprite's origin
      const frameX = localX;
      const frameY = localY;

      frames.push({
        x: frameX,
        y: frameY,
        w,
        h,
      });

      console.log(`Created frame: x=${frameX}, y=${frameY}, w=${w}, h=${h}`);
    }
  }

  console.log(`Generated ${frames.length} frames for ${baseSprite.name}`);

  // Log all the generated frames for debugging
  frames.forEach((frame, index) => {
    console.log(
      `Frame ${index}: x=${frame.x}, y=${frame.y}, w=${frame.w}, h=${frame.h}`
    );
  });

  return frames;
}
