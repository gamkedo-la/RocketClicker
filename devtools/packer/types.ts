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
  sliceData?: Uint8Array; // Optional reference to slice data
}

// Modified for Phaser 3 MultiAtlas format
export interface AtlasFrame {
  filename: string; // The name of the frame (numeric index as string)
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
  image: string; // The image filename
  format: string; // Usually "RGBA8888"
  size: {
    w: number;
    h: number;
  };
  scale: number;
  frames: AtlasFrame[]; // Array of frames in this texture
}

// MultiAtlas compatible format
export interface AtlasMetadata {
  textures: AtlasTexture[];
  meta: {
    app: string;
    version: string;
    format: string; // "multiatlas"
  };
}
