import * as path from "path";
import sharp from "sharp";

import type { AtlasFrame, AtlasMetadata, ExtractedSprite } from "../types.ts";
import { generateFrames } from "./slices.ts";

interface TrimInfo {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  sprite: ExtractedSprite;
}

interface Space {
  x: number;
  y: number;
  w: number;
  h: number;
}

const BLEED_MARGIN = 1; // 1px bleed margin

export class Atlas {
  private sprites: ExtractedSprite[] = [];
  private trimInfo: Map<string, TrimInfo> = new Map();
  private packedSprites: Map<string, Box[]> = new Map();

  /**
   * Add sprites to the atlas
   */
  addSprites(sprites: ExtractedSprite[]): void {
    // Only add content layers (not slice layers) and filter out ignored layers
    for (const sprite of sprites) {
      // Skip slice layers
      if (sprite.name.endsWith("-slices")) continue;

      // Skip layers starting with _ or named "Layer"
      if (sprite.name.startsWith("_") || sprite.name.startsWith("Layer"))
        continue;

      this.sprites.push(sprite);
    }
  }

  /**
   * Pack sprites into a texture atlas using a simple rectangle packing algorithm
   */
  private packSprites(sprites: ExtractedSprite[]): Box[] {
    // Group sprites by base name (without frame number)
    const spriteGroups = new Map<string, ExtractedSprite[]>();
    for (const sprite of sprites) {
      const baseName = sprite.name.split("#")[0];
      if (!spriteGroups.has(baseName)) {
        spriteGroups.set(baseName, []);
      }
      spriteGroups.get(baseName)!.push(sprite);
    }

    // Convert sprites to boxes with their dimensions
    const boxes: Box[] = [];
    for (const [_baseName, groupSprites] of spriteGroups) {
      // Find the maximum dimensions for this sprite group
      let maxWidth = 0;
      let maxHeight = 0;
      for (const sprite of groupSprites) {
        const trimInfo = this.trimInfo.get(sprite.name);
        if (trimInfo) {
          maxWidth = Math.max(maxWidth, trimInfo.width);
          maxHeight = Math.max(maxHeight, trimInfo.height);
        }
      }

      // Create boxes for each sprite in the group, adding bleed margin
      for (const sprite of groupSprites) {
        boxes.push({
          x: 0,
          y: 0,
          w: maxWidth + BLEED_MARGIN * 2,
          h: maxHeight + BLEED_MARGIN * 2,
          sprite,
        });
      }
    }

    // Calculate total area and maximum width
    let area = 0;
    let maxWidth = 0;
    for (const box of boxes) {
      area += box.w * box.h;
      maxWidth = Math.max(maxWidth, box.w);
    }

    // Sort boxes by height, descending
    boxes.sort((a, b) => b.h - a.h);

    // Calculate initial width for a roughly square packing
    const startWidth = Math.max(Math.ceil(Math.sqrt(area / 0.95)), maxWidth);

    // Initialize spaces with a single space
    const spaces: Space[] = [{ x: 0, y: 0, w: startWidth, h: Infinity }];
    const packed: Box[] = [];

    // Pack each box
    for (const box of boxes) {
      // Look through spaces backwards
      for (let i = spaces.length - 1; i >= 0; i--) {
        const space = spaces[i];

        // Check if box fits in this space
        if (box.w > space.w || box.h > space.h) continue;

        // Place box in this space
        box.x = space.x;
        box.y = space.y;
        packed.push(box);

        // Update or split the space
        if (box.w === space.w && box.h === space.h) {
          // Space matches exactly - remove it
          const last = spaces.pop();
          if (i < spaces.length) spaces[i] = last!;
        } else if (box.h === space.h) {
          // Space matches height - update width
          space.x += box.w;
          space.w -= box.w;
        } else if (box.w === space.w) {
          // Space matches width - update height
          space.y += box.h;
          space.h -= box.h;
        } else {
          // Split space into two
          spaces.push({
            x: space.x + box.w,
            y: space.y,
            w: space.w - box.w,
            h: box.h,
          });
          space.y += box.h;
          space.h -= box.h;
        }
        break;
      }
    }

    return packed;
  }

  /**
   * Get pixel color from sprite data with bounds checking
   */
  private getPixel(
    sprite: ExtractedSprite,
    x: number,
    y: number
  ): [number, number, number, number] {
    // Clamp coordinates to sprite bounds
    x = Math.max(0, Math.min(x, sprite.width - 1));
    y = Math.max(0, Math.min(y, sprite.height - 1));

    const index = (y * sprite.width + x) * 4;
    return [
      sprite.data[index],
      sprite.data[index + 1],
      sprite.data[index + 2],
      sprite.data[index + 3],
    ];
  }

  /**
   * Save each layer as a separate image file, cropped to content
   */
  async save(outputBasePath: string): Promise<string[]> {
    if (this.sprites.length === 0) {
      throw new Error("No sprites to process");
    }

    // First pass: calculate trim info for each sprite
    for (const sprite of this.sprites) {
      // Find the content bounds by scanning for non-transparent pixels
      let left = sprite.width;
      let top = sprite.height;
      let right = 0;
      let bottom = 0;

      for (let y = 0; y < sprite.height; y++) {
        for (let x = 0; x < sprite.width; x++) {
          const index = (y * sprite.width + x) * 4;
          // Check if pixel is not transparent
          if (sprite.data[index + 3] !== 0) {
            left = Math.min(left, x);
            top = Math.min(top, y);
            right = Math.max(right, x);
            bottom = Math.max(bottom, y);
          }
        }
      }

      // Handle case where there's no visible content
      if (left > right || top > bottom) {
        console.log(`  No visible content in layer "${sprite.name}", skipping`);
        continue;
      }

      const width = right - left + 1;
      const height = bottom - top + 1;

      // Store the trim information
      this.trimInfo.set(sprite.name, {
        left,
        top,
        width,
        height,
      });
    }

    // Pack the sprites
    const packedBoxes = this.packSprites(this.sprites);

    // Find atlas dimensions
    let atlasWidth = 0;
    let atlasHeight = 0;
    for (const box of packedBoxes) {
      atlasWidth = Math.max(atlasWidth, box.x + box.w);
      atlasHeight = Math.max(atlasHeight, box.y + box.h);
    }

    // Create atlas buffer
    const atlasBuffer = Buffer.alloc(atlasWidth * atlasHeight * 4);

    // Copy each sprite to its position in the atlas
    for (const box of packedBoxes) {
      const sprite = box.sprite;
      const trimInfo = this.trimInfo.get(sprite.name);
      if (!trimInfo) continue;

      // Copy sprite data to atlas with bleed margin
      for (let y = -BLEED_MARGIN; y < trimInfo.height + BLEED_MARGIN; y++) {
        for (let x = -BLEED_MARGIN; x < trimInfo.width + BLEED_MARGIN; x++) {
          // Get source pixel coordinates (with bleed)
          const srcX = x + trimInfo.left;
          const srcY = y + trimInfo.top;

          // Get the pixel color (will be clamped to edges)
          const [r, g, b, a] = this.getPixel(sprite, srcX, srcY);

          // Calculate target position in atlas (including bleed margin)
          const targetX = box.x + x + BLEED_MARGIN;
          const targetY = box.y + y + BLEED_MARGIN;
          const targetIndex = (targetY * atlasWidth + targetX) * 4;

          // Copy pixel to atlas
          atlasBuffer[targetIndex] = r;
          atlasBuffer[targetIndex + 1] = g;
          atlasBuffer[targetIndex + 2] = b;
          atlasBuffer[targetIndex + 3] = a;
        }
      }

      // Store the packed position for metadata generation
      const baseName = sprite.name.split("#")[0];
      if (!this.packedSprites.has(baseName)) {
        this.packedSprites.set(baseName, []);
      }
      this.packedSprites.get(baseName)!.push(box);
    }

    // Save the atlas
    const outputPath = outputBasePath;
    try {
      await sharp(atlasBuffer, {
        raw: {
          width: atlasWidth,
          height: atlasHeight,
          channels: 4,
        },
      })
        .png()
        .toFile(outputPath);

      console.log(
        `Atlas saved to ${outputPath} (${atlasWidth}x${atlasHeight})`
      );
      return [outputPath];
    } catch (error) {
      console.error("Error creating atlas:", error);
      throw error;
    }
  }

  /**
   * Generate metadata for the layers in Phaser MultiAtlas format
   */
  generateMetadata(imagePaths: string[]): AtlasMetadata {
    if (imagePaths.length === 0)
      return {
        textures: [],
        meta: { app: "Aseprite Packer", version: "1.0", format: "multiatlas" },
      };

    const baseName = path.basename(imagePaths[0]);
    const frames: AtlasFrame[] = [];

    // Generate frames for each sprite group
    for (const [spriteName, boxes] of this.packedSprites) {
      // If there's a slice sprite, generate sliced frames
      const sliceSprite = boxes[0].sprite.sliceSprite;
      if (sliceSprite) {
        const sliceFrames = generateFrames(boxes[0].sprite);
        boxes.forEach((box, frameIndex) => {
          sliceFrames.forEach((slice, sliceIndex) => {
            // Adjust slice coordinates relative to the packed position, accounting for bleed margin
            const adjustedX =
              box.x +
              BLEED_MARGIN +
              (slice.x - this.trimInfo.get(box.sprite.name)!.left);
            const adjustedY =
              box.y +
              BLEED_MARGIN +
              (slice.y - this.trimInfo.get(box.sprite.name)!.top);

            frames.push({
              filename: `${spriteName}#${frameIndex}.${sliceIndex}`,
              frame: {
                x: adjustedX,
                y: adjustedY,
                w: slice.w,
                h: slice.h,
              },
              rotated: false,
              trimmed: false,
              spriteSourceSize: {
                x: 0,
                y: 0,
                w: slice.w,
                h: slice.h,
              },
              sourceSize: {
                w: slice.w,
                h: slice.h,
              },
            });
          });
        });
      } else {
        // No slices, just create frames for each animation frame
        boxes.forEach((box, frameIndex) => {
          frames.push({
            filename: `${spriteName}#${frameIndex}`,
            frame: {
              x: box.x + BLEED_MARGIN,
              y: box.y + BLEED_MARGIN,
              w: box.w - BLEED_MARGIN * 2,
              h: box.h - BLEED_MARGIN * 2,
            },
            rotated: false,
            trimmed: false,
            spriteSourceSize: {
              x: 0,
              y: 0,
              w: box.w - BLEED_MARGIN * 2,
              h: box.h - BLEED_MARGIN * 2,
            },
            sourceSize: {
              w: box.w - BLEED_MARGIN * 2,
              h: box.h - BLEED_MARGIN * 2,
            },
          });
        });
      }
    }

    return {
      textures: [
        {
          image: baseName,
          format: "RGBA8888",
          size: {
            w: 0, // Will be set by the image dimensions
            h: 0,
          },
          scale: 1,
          frames,
        },
      ],
      meta: {
        app: "Aseprite Packer",
        version: "1.0",
        format: "multiatlas",
      },
    };
  }
}
