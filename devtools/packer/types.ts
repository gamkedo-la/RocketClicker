export interface PackerOptions {
  input: string;
  output: string;
  name?: string;
  debug?: boolean;
}

export interface ExtractedSprite {
  index: number;
  name: string;
  path: string;
  width: number;
  height: number;
  x: number;
  y: number;
  data: Uint8Array;
  sliceSprite?: ExtractedSprite; // Reference to the slice layer sprite if it exists
  frameIndex?: number; // The frame index in the animation sequence
}

// Modified for Phaser 3 MultiAtlas format
export interface AtlasFrame {
  filename: string; // Now in format "spriteName#frameIndex" or "spriteName#frameIndex.sliceIndex"
  frame: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  rotated: boolean;
  trimmed: boolean;
  spriteSourceSize: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  sourceSize: {
    w: number;
    h: number;
  };
}

// Single texture within a MultiAtlas
export interface AtlasTexture {
  image: string;
  format: string;
  size: {
    w: number;
    h: number;
  };
  scale: number;
  frames: AtlasFrame[];
}

// MultiAtlas compatible format
export interface AtlasMetadata {
  textures: AtlasTexture[];
  meta: {
    app: string;
    version: string;
    format: string;
  };
}
