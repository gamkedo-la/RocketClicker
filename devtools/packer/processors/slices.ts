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

  // Get the pixel index in the data array
  const getIndex = (x: number, y: number): number => {
    if (x < 0 || x >= width || y < 0 || y >= height) {
      return -1; // Out of bounds
    }
    const index = (y * width + x) * 4;

    // Check if index is within data bounds
    if (index < 0 || index + 3 >= data.length) {
      return -1;
    }

    return index;
  };

  const centerIndex = getIndex(x, y);
  if (centerIndex === -1 || data[centerIndex + 3] === 0) {
    return false; // Transparent center pixel
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
  baseSprite: ExtractedSprite,
  sliceData: Uint8Array
): { x: number; y: number; w: number; h: number }[] {
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

  // Find all cross markers
  for (let y = 0; y < baseSprite.height; y++) {
    for (let x = 0; x < baseSprite.width; x++) {
      if (isSliceMarker(sliceData, baseSprite.width, baseSprite.height, x, y)) {
        // A cross marker creates both horizontal and vertical slice lines
        // We'll filter them later if they don't intersect with content
        slicePositionsX.add(x);
        slicePositionsY.add(y);
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
      const x = validSlicePositionsX[j];
      const y = validSlicePositionsY[i];
      const w = validSlicePositionsX[j + 1] - x;
      const h = validSlicePositionsY[i + 1] - y;

      frames.push({ x, y, w, h });
    }
  }

  console.log(`Generated ${frames.length} frames for ${baseSprite.name}`);
  return frames;
}
