import { exec, execSync } from "child_process";
import path from "path";
import fs from "fs";
import { Plugin } from "vite";

interface AssetMetadata {
  type?: string;
  frameConfig?: {
    frameWidth?: number;
    frameHeight?: number;
    startFrame?: number;
    endFrame?: number;
    margin?: number;
    spacing?: number;
  };
  multiAtlas?: {
    atlasURL?: string;
  };
}

interface ConversionConfig {
  input: string;
  output: string;
  finalOutput?: string;
  executable: string;
  args: string;
  inputFolder?: string;
  outputFolder?: string;
  metadata?: AssetMetadata;
}

interface AssetConversionConfig {
  conversions: ConversionConfig[];
  inputFolder?: string;
  outputFolder?: string;
}

function validateConversionConfig(conversion: ConversionConfig): void {
  if (!conversion.input) {
    throw new Error(
      "Error: Missing required 'input' field in conversion config"
    );
  }
  if (!conversion.output && !conversion.metadata?.type) {
    throw new Error(
      "Error: Either 'output' or 'metadata.type' must be specified in conversion config"
    );
  }
  if (conversion.executable && !conversion.args) {
    throw new Error(
      `Error: 'args' field is required when specifying executable '${conversion.executable}'`
    );
  }
}

function applyDefaultFolders(
  config: AssetConversionConfig,
  conversion: ConversionConfig
): ConversionConfig {
  const inputFolder = conversion.inputFolder || config.inputFolder || "assets";
  const outputFolder =
    conversion.outputFolder || config.outputFolder || "public/assets";

  return {
    ...conversion,
    input: path.join(inputFolder, conversion.input),
    output: path.join(outputFolder, conversion.output),
  };
}

function checkExecutable(executable: string): boolean {
  try {
    execSync(`command -v ${executable}`, { stdio: "ignore" });
    return true;
  } catch (error) {
    return false;
  }
}

function assetConversionPlugin(config: AssetConversionConfig): Plugin {
  const convertAsset = (conversion: ConversionConfig) => {
    // Validate conversion config
    validateConversionConfig(conversion);

    let { input, output, executable, args } = applyDefaultFolders(
      config,
      conversion
    );

    if (conversion.metadata?.type === "multiatlas") {
      // npm run packer -- -i assets/ui-test-copy.aseprite -o tmp -n wololo
      executable = "npm run packer";
      args = `-- -i \${input} -o \${output} -n ${conversion.output}`;
    }

    if (executable === undefined) {
      executable = "cp";
      args = "${input} ${output}";
    } else if (!checkExecutable(executable)) {
      console.warn(
        `Warning: ${executable} is not available in the system PATH. Skipping conversion for ${input}.`
      );
      return;
    }

    const resolvedArgs = args
      .replace("${input}", path.resolve(input))
      .replace("${output}", path.resolve(output));

    const command = `${executable} ${resolvedArgs}`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error converting asset: ${error}`);
        return;
      }
      if (stderr) {
        console.error(`Asset conversion stderr: ${stderr}`);
        return;
      }
      console.log(`Asset converted: ${input} -> ${output}`);
    });
  };

  const generateAssetsConfig = () => {
    const assetsConfig = {
      assets: config.conversions.map((conversion) => {
        const { input, output, metadata } = applyDefaultFolders(
          config,
          conversion
        );
        return {
          input: path.relative(process.cwd(), input),
          output: path.relative(process.cwd(), output),
          finalOutput: conversion.finalOutput,
          ...metadata,
        };
      }),
      meta: {
        app: "Phaser Vite Plugin",
        version: "0.2",
      },
    };

    const outputPath = path.resolve("public/assets-configuration.json");
    fs.writeFileSync(outputPath, JSON.stringify(assetsConfig, null, 2));
    console.log("Generated assets configuration at:", outputPath);
  };

  let watcher: fs.FSWatcher | null = null;

  return {
    name: "asset-conversion",
    buildStart() {
      // Initial conversion of all assets
      config.conversions.forEach(convertAsset);
      generateAssetsConfig();

      // Set up file watching
      const assetsDir = path.resolve("assets");
      watcher = fs.watch(
        assetsDir,
        { recursive: true },
        (eventType, filename) => {
          if (filename) {
            const conversion = config.conversions.find(
              (c) => c.input === filename
            );
            if (conversion) {
              console.log(`Asset changed: ${filename}. Running conversion...`);
              convertAsset(conversion);
            }
          }
        }
      );

      console.log("Watching for asset changes...");
    },
    closeBundle() {
      if (watcher) {
        watcher.close();
        console.log("Stopped watching for asset changes.");
      }
    },
  };
}

export default assetConversionPlugin;
