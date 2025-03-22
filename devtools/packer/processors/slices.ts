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
  console.log(`Generating frames for ${baseSprite.name}...`);

  // Check if we have a slice sprite
  if (!baseSprite.sliceSprite) {
    console.warn(`No slice sprite found for ${baseSprite.name}`);
    return [{ x: 0, y: 0, w: baseSprite.width, h: baseSprite.height }];
  }

  const sliceSprite = baseSprite.sliceSprite;

  // Get the relative position between slice layer and content layer
  const sliceOffsetX = sliceSprite.x - baseSprite.x;
  const sliceOffsetY = sliceSprite.y - baseSprite.y;

  console.log(
    `Base sprite dimensions: ${baseSprite.width}x${baseSprite.height}`
  );
  console.log(`Base sprite position: (${baseSprite.x}, ${baseSprite.y})`);
  console.log(
    `Slice sprite dimensions: ${sliceSprite.width}x${sliceSprite.height}`
  );
  console.log(`Slice sprite position: (${sliceSprite.x}, ${sliceSprite.y})`);
  console.log(`Slice offset: (${sliceOffsetX}, ${sliceOffsetY})`);

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

  console.log(
    `Content bounds: (${contentLeft}, ${contentTop}) to (${contentRight}, ${contentBottom})`
  );
  console.log(`Content dimensions: ${contentWidth}x${contentHeight}`);

  // Find all slice markers in the slice data
  const slicePositionsX: Set<number> = new Set();
  const slicePositionsY: Set<number> = new Set();

  // Add content bounds as initial slice positions
  // These positions should be in the global coordinate space
  slicePositionsX.add(baseSprite.x + contentLeft);
  slicePositionsX.add(baseSprite.x + contentRight + 1); // +1 because right edge is exclusive
  slicePositionsY.add(baseSprite.y + contentTop);
  slicePositionsY.add(baseSprite.y + contentBottom + 1); // +1 because bottom edge is exclusive

  // Find all cross markers in the slice sprite's local space
  for (let y = 0; y < sliceSprite.height; y++) {
    for (let x = 0; x < sliceSprite.width; x++) {
      if (
        isSliceMarker(
          sliceSprite.data,
          sliceSprite.width,
          sliceSprite.height,
          x,
          y
        )
      ) {
        // Transform marker position to global space
        const globalX = sliceSprite.x + x;
        const globalY = sliceSprite.y + y;

        slicePositionsX.add(globalX);
        slicePositionsY.add(globalY);

        console.log(
          `Found slice marker at local (${x},${y}), global (${globalX},${globalY})`
        );
      }
    }
  }

  // Filter slice positions to only include those that intersect with content area in global space
  const validSlicePositionsX = Array.from(slicePositionsX)
    .filter(
      (x) =>
        x >= baseSprite.x + contentLeft && x <= baseSprite.x + contentRight + 1
    )
    .sort((a, b) => a - b);

  const validSlicePositionsY = Array.from(slicePositionsY)
    .filter(
      (y) =>
        y >= baseSprite.y + contentTop && y <= baseSprite.y + contentBottom + 1
    )
    .sort((a, b) => a - b);

  console.log("Valid slice positions X:", validSlicePositionsX);
  console.log("Valid slice positions Y:", validSlicePositionsY);

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
  const frames: { x: number; y: number; w: number; h: number }[] = [];

  for (let i = 0; i < validSlicePositionsY.length - 1; i++) {
    for (let j = 0; j < validSlicePositionsX.length - 1; j++) {
      // Get positions in global space
      const globalX1 = validSlicePositionsX[j];
      const globalY1 = validSlicePositionsY[i];
      const globalX2 = validSlicePositionsX[j + 1];
      const globalY2 = validSlicePositionsY[i + 1];

      // Convert global positions to local sprite space
      const localX = globalX1 - baseSprite.x;
      const localY = globalY1 - baseSprite.y;
      const w = globalX2 - globalX1;
      const h = globalY2 - globalY1;

      console.log(
        `Creating frame: global (${globalX1},${globalY1}) to (${globalX2},${globalY2})`,
        `\n  local (${localX},${localY}) ${w}x${h}`
      );

      frames.push({
        x: localX,
        y: localY,
        w,
        h,
      });
    }
  }

  console.log(`Generated ${frames.length} frames for ${baseSprite.name}`);
  frames.forEach((frame, index) => {
    console.log(
      `Frame ${index}: (${frame.x},${frame.y}) ${frame.w}x${frame.h}`
    );
  });

  return frames;
}
