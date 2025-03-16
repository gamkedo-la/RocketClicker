#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import Aseprite from "./lib/ase-parser.ts";

import { extractSprites } from "./processors/aseprite.ts";
import { Atlas } from "./processors/atlas.ts";
import type { PackerOptions } from "./types.ts";

async function processAsepriteFile(options: PackerOptions): Promise<void> {
  const absoluteInput = path.resolve(options.input);
  const absoluteOutput = path.resolve(options.output);
  const baseName = options.name || path.parse(absoluteInput).name;

  console.log(`Processing Aseprite file: ${absoluteInput}`);
  console.log(`Output directory: ${absoluteOutput}`);
  console.log(`Base name: ${baseName}`);

  // Ensure output directory exists
  await fs.promises.mkdir(absoluteOutput, { recursive: true });

  try {
    // Parse Aseprite file
    console.log(`Reading Aseprite file...`);
    const asepriteData = await fs.promises.readFile(absoluteInput);
    console.log(`File size: ${Math.round(asepriteData.length / 1024)} KB`);

    const asepriteFile = new Aseprite(asepriteData, baseName);
    console.log(`Parsing Aseprite data...`);
    asepriteFile.parse();

    console.log(
      `Aseprite file ${path.basename(absoluteInput)} parsed successfully`
    );
    console.log(
      `Dimensions: ${asepriteFile.width}x${asepriteFile.height}, Layers: ${asepriteFile.layers.length}`
    );

    if (options.debug) {
      console.log(`Debug information:`);
      console.log(` - Number of frames: ${asepriteFile.frames?.length || 0}`);
      console.log(` - Number of layers: ${asepriteFile.layers?.length || 0}`);
      console.log(
        ` - Layer names: ${(asepriteFile.layers || [])
          .map((l) => l.name || "unnamed")
          .join(", ")}`
      );

      // Only log header properties if they exist (optional chaining)
      if (typeof asepriteFile === "object") {
        console.log(` - Width: ${asepriteFile.width}`);
        console.log(` - Height: ${asepriteFile.height}`);

        // Additional header info if available
        const header = (asepriteFile as any).header;
        if (header) {
          console.log(` - Aseprite version: ${header.version || "unknown"}`);
          console.log(
            ` - Color depth: ${header.colorDepth || "unknown"} bits per pixel`
          );
          console.log(
            ` - Transparent color index: ${
              header.transparentColorIndex || "none"
            }`
          );
        }
      }
    }

    // Extract sprites from Aseprite file
    console.log(`Extracting sprites...`);
    const { sprites } = await extractSprites(asepriteFile);
    if (sprites.length === 0) {
      throw new Error("No valid sprites found in the Aseprite file");
    }

    // Count regular layers vs slice layers
    const contentLayers = sprites.filter((s) => !s.name.endsWith("-slices"));
    const sliceLayers = sprites.filter((s) => s.name.endsWith("-slices"));

    console.log(`Found ${sprites.length} total layers:`);
    console.log(`- ${contentLayers.length} content layers`);
    console.log(`- ${sliceLayers.length} slice layers`);

    if (options.debug) {
      for (const sprite of sprites) {
        console.log(
          `  - Sprite "${sprite.name}": ${sprite.width}x${sprite.height}, data size: ${sprite.data.length} bytes`
        );
      }
    }

    // Process the sprites
    console.log(`Adding sprites to atlas...`);
    const atlas = new Atlas();
    atlas.addSprites(sprites);

    // Generate individual image files for each layer
    console.log(`Generating image files...`);
    const atlasBasePath = path.join(absoluteOutput, `${baseName}.png`);
    const imagePaths = await atlas.save(atlasBasePath);

    console.log(`Created ${imagePaths.length} image file(s)`);

    // Generate and save metadata in MultiAtlas format
    console.log(`Generating metadata...`);
    const metadata = atlas.generateMetadata(imagePaths);
    const metadataPath = path.join(absoluteOutput, `${baseName}.json`);
    await fs.promises.writeFile(
      metadataPath,
      JSON.stringify(metadata, null, 2)
    );

    // Get the actual total frames (excluding slice layers)
    const totalFrames = metadata.textures.reduce(
      (sum, texture) => sum + texture.frames.length,
      0
    );

    console.log(`MultiAtlas metadata saved to ${metadataPath}`);
    console.log(`Total frames in metadata: ${totalFrames}`);
  } catch (error) {
    console.error("Error processing Aseprite file:", error);

    if (error instanceof Error) {
      console.error(`Error message: ${error.message}`);
      console.error(`Error stack: ${error.stack}`);
    }

    if (options.debug) {
      console.error("Full error details:", JSON.stringify(error, null, 2));
    }

    throw error;
  }
}

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
  .option("input", {
    alias: "i",
    type: "string",
    description: "Input Aseprite file",
    demandOption: true,
  })
  .option("output", {
    alias: "o",
    type: "string",
    description: "Output directory",
    demandOption: true,
  })
  .option("name", {
    alias: "n",
    type: "string",
    description: "Base name for output files (defaults to input filename)",
  })
  .option("debug", {
    alias: "d",
    type: "boolean",
    description: "Enable debug mode with additional output",
    default: false,
  })
  .help()
  .alias("help", "h").argv as PackerOptions;

// Run the packer
processAsepriteFile(argv).catch(() => {
  process.exit(1);
});
