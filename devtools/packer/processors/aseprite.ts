import type Aseprite from "../lib/ase-parser.ts";
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
 * Extract sprites from an Aseprite file's first frame
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

  console.log(`Extracting sprites from first frame...`);
  const firstFrame = asepriteFile.frames[0];
  const cels = firstFrame.cels
    .map((cel) => cel)
    .sort((a, b) => a.layerIndex - b.layerIndex);

  const extractionPromises = cels.map((cel) =>
    extractSprite(cel, asepriteFile)
  );

  const extractedSprites = (await Promise.all(extractionPromises)).filter(
    (sprite): sprite is ExtractedSprite => sprite !== null
  );

  // Create a map of slice layers for easier lookup
  const sliceLayers = new Map<string, Uint8Array>();

  // Find all slice layers and map them to their corresponding content layer
  extractedSprites.forEach((sprite) => {
    if (sprite.name.endsWith("-slices")) {
      const contentLayerName = sprite.name.replace("-slices", "");
      sliceLayers.set(contentLayerName, sprite.data);
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
    const sliceData = sliceLayers.get(sprite.name);

    // Link slice layer if found
    if (sliceData) {
      sprite.sliceData = sliceData;
      console.log(
        `  Found slice layer "${sprite.name}-slices" for "${sprite.name}"`
      );
    }

    // Add an empty placeholder in atlas config (we'll generate the actual frames later)
    atlasConfig.frames[sprite.name] = {
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
  cel: any,
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
    path: "", // No longer need physical files
    width: cel.w,
    height: cel.h,
    x: cel.xpos,
    y: cel.ypos,
    data: data,
  };
}
