import * as path from "path";
import sharp from "sharp";

import type {
  AtlasMetadata,
  ExtractedSprite,
  AtlasFrame,
  AtlasTexture,
} from "../types.ts";
import { generateFrames } from "./slices.ts";

interface TrimInfo {
  left: number;
  top: number;
  width: number;
  height: number;
}

export class Atlas {
  private sprites: ExtractedSprite[] = [];
  private trimInfo: Map<string, TrimInfo> = new Map();

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
   * Save each layer as a separate image file, cropped to content
   */
  async save(outputBasePath: string): Promise<string[]> {
    if (this.sprites.length === 0) {
      throw new Error("No sprites to process");
    }

    const { dir, name, ext } = path.parse(outputBasePath);
    const outputPaths: string[] = [];

    // Process each content layer
    for (let i = 0; i < this.sprites.length; i++) {
      const sprite = this.sprites[i];
      // Create a unique filename for each layer
      const outputPath = path.join(dir, `${name}_${sprite.name}${ext}`);
      outputPaths.push(outputPath);

      console.log(
        `Creating image for layer "${sprite.name}" (${sprite.width}x${sprite.height})...`
      );

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

      // Create a new buffer with only the visible content
      const croppedBuffer = Buffer.alloc(width * height * 4);

      // Copy only the visible pixels to the new buffer
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const sourceIndex = ((y + top) * sprite.width + (x + left)) * 4;
          const targetIndex = (y * width + x) * 4;

          // Copy all 4 channels (RGBA)
          croppedBuffer[targetIndex] = sprite.data[sourceIndex]; // R
          croppedBuffer[targetIndex + 1] = sprite.data[sourceIndex + 1]; // G
          croppedBuffer[targetIndex + 2] = sprite.data[sourceIndex + 2]; // B
          croppedBuffer[targetIndex + 3] = sprite.data[sourceIndex + 3]; // A
        }
      }

      // Store the trim information
      const trimInfo: TrimInfo = {
        left,
        top,
        width,
        height,
      };

      // Store the trim info for this sprite
      this.trimInfo.set(sprite.name, trimInfo);

      try {
        // Create and save the image using the cropped data
        await sharp(croppedBuffer, {
          raw: {
            width,
            height,
            channels: 4,
          },
        })
          .png()
          .toFile(outputPath);

        console.log(`Image saved to ${outputPath} (${width}x${height})`);
      } catch (error) {
        console.error(
          `Error creating image for layer "${sprite.name}":`,
          error
        );
        throw error;
      }
    }

    return outputPaths;
  }

  /**
   * Generate metadata for the layers in Phaser MultiAtlas format
   */
  generateMetadata(imagePaths: string[]): AtlasMetadata {
    const textures: AtlasTexture[] = [];

    for (let i = 0; i < this.sprites.length; i++) {
      const sprite = this.sprites[i];
      // Skip if we don't have a corresponding image path (might have been skipped)
      if (i >= imagePaths.length) continue;

      const imagePath = imagePaths[i];
      const baseName = path.basename(imagePath);
      const trimInfo = this.trimInfo.get(sprite.name) || {
        left: 0,
        top: 0,
        width: sprite.width,
        height: sprite.height,
      };

      // Find the corresponding slice layer if it exists
      if (!sprite.sliceData) {
        // No slice data, create a single frame for the whole layer
        textures.push({
          image: baseName,
          format: "RGBA8888",
          size: {
            w: trimInfo.width,
            h: trimInfo.height,
          },
          scale: 1,
          frames: [
            {
              filename: "0",
              frame: {
                x: 0,
                y: 0,
                w: trimInfo.width,
                h: trimInfo.height,
              },
              rotated: false,
              trimmed: false,
              spriteSourceSize: {
                x: 0,
                y: 0,
                w: trimInfo.width,
                h: trimInfo.height,
              },
              sourceSize: {
                w: trimInfo.width,
                h: trimInfo.height,
              },
            },
          ],
        });
        continue;
      }

      // Generate frames for sliced sprites
      const sliceFrames = generateFrames(sprite, sprite.sliceData);

      // Adjust frame coordinates based on trim
      const frames: AtlasFrame[] = sliceFrames.map((frame, index) => {
        // Adjust frame position relative to the trimmed image
        const adjustedX = Math.max(0, frame.x - trimInfo.left);
        const adjustedY = Math.max(0, frame.y - trimInfo.top);

        // Ensure frame doesn't extend beyond the trimmed image bounds
        const adjustedWidth = Math.min(frame.w, trimInfo.width - adjustedX);
        const adjustedHeight = Math.min(frame.h, trimInfo.height - adjustedY);

        return {
          filename: index.toString(),
          frame: {
            x: adjustedX,
            y: adjustedY,
            w: adjustedWidth,
            h: adjustedHeight,
          },
          rotated: false,
          trimmed: false,
          spriteSourceSize: {
            x: 0,
            y: 0,
            w: adjustedWidth,
            h: adjustedHeight,
          },
          sourceSize: {
            w: adjustedWidth,
            h: adjustedHeight,
          },
        };
      });

      textures.push({
        image: baseName,
        format: "RGBA8888",
        size: {
          w: trimInfo.width,
          h: trimInfo.height,
        },
        scale: 1,
        frames,
      });
    }

    return {
      textures,
      meta: {
        app: "Aseprite Packer",
        version: "1.0",
        format: "multiatlas",
      },
    };
  }
}
