import type Aseprite from "../lib/ase-parser.ts";
import type { AsepriteTypes } from "../lib/ase-parser.ts";
import type { ExtractedSprite } from "../types.ts";

interface AtlasFrame {
  frame: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  sourceSize: {
    w: number;
    h: number;
  };
  spriteSourceSize: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  trimmed: boolean;
}

interface AtlasConfig {
  frames: { [key: string]: AtlasFrame };
  meta: {
    scale: string;
    format: string;
    image: string; // The source image file
    size: { w: number; h: number };
  };
}

/**
 * Extract sprites from an Aseprite file's frames
 */
export async function extractSprites(
  asepriteFile: Aseprite
): Promise<{ sprites: ExtractedSprite[]; atlasConfig: AtlasConfig }> {
  if (asepriteFile.frames.length === 0) {
    console.warn("No frames found in the Aseprite file");
    return {
      sprites: [],
      atlasConfig: {
        frames: {},
        meta: {
          scale: "1",
          format: "RGBA8888",
          image: "",
          size: { w: 0, h: 0 },
        },
      },
    };
  }

  console.log(`Extracting sprites from all frames...`);
  const extractedSprites: ExtractedSprite[] = [];
  const layerFrames = new Map<number, ExtractedSprite[]>();

  // First, extract all frames for each layer
  for (
    let frameIndex = 0;
    frameIndex < asepriteFile.frames.length;
    frameIndex++
  ) {
    const frame = asepriteFile.frames[frameIndex];
    const cels = frame.cels
      .map((cel) => cel)
      .sort((a, b) => a.layerIndex - b.layerIndex);

    for (const cel of cels) {
      const sprite = await extractSprite(cel, asepriteFile);
      if (sprite) {
        // Store the frame index in the sprite
        sprite.frameIndex = frameIndex;

        // Group sprites by layer
        if (!layerFrames.has(cel.layerIndex)) {
          layerFrames.set(cel.layerIndex, []);
        }
        layerFrames.get(cel.layerIndex)!.push(sprite);
      }
    }
  }

  // Now process each layer's frames
  for (const [layerIndex, frames] of layerFrames.entries()) {
    const layer = asepriteFile.layers[layerIndex];
    if (!layer) continue;

    // Skip if layer name starts with _ or is "Layer"
    if (layer.name.startsWith("_") || layer.name.startsWith("Layer")) continue;

    // For slice layers, just use the first frame
    if (layer.name.endsWith("-slices")) {
      if (frames.length > 0) {
        extractedSprites.push(frames[0]);
      }
      continue;
    }

    // For content layers, include all frames
    extractedSprites.push(...frames);
  }

  // Create a map of slice layers for easier lookup
  const sliceLayers = new Map<string, ExtractedSprite>();

  // Find all slice layers and map them to their corresponding content layer
  extractedSprites.forEach((sprite) => {
    if (sprite.name.endsWith("-slices")) {
      const contentLayerName = sprite.name.replace("-slices", "");
      sliceLayers.set(contentLayerName, sprite);
    }
  });

  const atlasConfig: AtlasConfig = {
    frames: {},
    meta: {
      scale: "1",
      format: "RGBA8888",
      image: "", // Will be set by the packer
      size: { w: asepriteFile.width, h: asepriteFile.height },
    },
  };

  // Process each sprite, generating frames if it has a corresponding slice layer
  for (const sprite of extractedSprites) {
    // Skip slice layers themselves - they're just for defining the slices
    if (sprite.name.endsWith("-slices")) continue;

    // Find matching slice layer for this content layer
    const sliceSprite = sliceLayers.get(sprite.name);

    // Link slice layer if found
    if (sliceSprite) {
      // Just store a reference to the entire slice sprite
      sprite.sliceSprite = sliceSprite;
      console.log(
        `  Found slice layer "${sprite.name}-slices" for "${sprite.name}" at position (${sliceSprite.x}, ${sliceSprite.y}) with dimensions ${sliceSprite.width}x${sliceSprite.height}`
      );
    }

    // Generate frame name with animation frame index if applicable
    const frameName =
      sprite.frameIndex !== undefined
        ? `${sprite.name}#${sprite.frameIndex}`
        : sprite.name;

    // Add frame to atlas config
    atlasConfig.frames[frameName] = {
      frame: {
        x: sprite.x,
        y: sprite.y,
        w: sprite.width,
        h: sprite.height,
      },
      sourceSize: {
        w: sprite.width,
        h: sprite.height,
      },
      spriteSourceSize: {
        x: 0,
        y: 0,
        w: sprite.width,
        h: sprite.height,
      },
      trimmed: false,
    };
  }

  console.log(
    `Generated atlas with ${Object.keys(atlasConfig.frames).length} frames`
  );

  return { sprites: extractedSprites, atlasConfig };
}

async function extractSprite(
  cel: AsepriteTypes.Cel,
  asepriteFile: Aseprite
): Promise<ExtractedSprite | null> {
  const layer = asepriteFile.layers[cel.layerIndex];
  if (!layer) {
    console.log(`  Skipping cel with invalid layer index ${cel.layerIndex}`);
    return null;
  }

  const spriteName = layer.name || `sprite_${cel.layerIndex}`;

  if (
    !cel.rawCelData ||
    cel.rawCelData.length === 0 ||
    cel.w === 0 ||
    cel.h === 0
  ) {
    console.log(`  Skipping sprite "${spriteName}" (no data)`);
    return null;
  }

  console.log(`  Extracting sprite "${spriteName}" (${cel.w}x${cel.h})`);

  // Ensure the data is a Uint8Array (convert Buffer if needed)
  let data: Uint8Array;

  if (cel.rawCelData instanceof Uint8Array) {
    data = cel.rawCelData;
  } else if (Buffer.isBuffer(cel.rawCelData)) {
    data = new Uint8Array(cel.rawCelData);
  } else if (Array.isArray(cel.rawCelData)) {
    // Handle array data
    data = new Uint8Array(cel.rawCelData);
  } else {
    console.error(
      `Unknown data format for "${spriteName}":`,
      typeof cel.rawCelData
    );
    throw new Error(`Unsupported data format for layer: ${spriteName}`);
  }

  // Validate that the data size matches the expected dimensions
  const expectedSize = cel.w * cel.h * 4; // RGBA = 4 bytes per pixel
  if (data.length !== expectedSize) {
    console.warn(
      `Data size mismatch for "${spriteName}": expected ${expectedSize} bytes, got ${data.length} bytes`
    );

    // If the data is too small, pad it (this shouldn't happen but just in case)
    if (data.length < expectedSize) {
      const paddedData = new Uint8Array(expectedSize);
      paddedData.set(data);
      data = paddedData;
    } else if (data.length > expectedSize) {
      // If the data is too large, truncate it (this also shouldn't happen)
      data = data.slice(0, expectedSize);
    }
  }

  return {
    index: cel.layerIndex,
    name: spriteName,
    path: "",
    width: cel.w,
    height: cel.h,
    x: cel.xpos,
    y: cel.ypos,
    data: data,
  };
}
