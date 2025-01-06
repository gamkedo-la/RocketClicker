import { exec, execSync } from "child_process";
import path from "path";
import fs from "fs";
import { Plugin } from "vite";

interface ConversionConfig {
  input: string;
  output: string;
  executable: string;
  args: string;
  inputFolder?: string;
  outputFolder?: string;
}

interface AssetConversionConfig {
  conversions: ConversionConfig[];
  inputFolder?: string;
  outputFolder?: string;
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
    let { input, output, executable, args } = applyDefaultFolders(
      config,
      conversion
    );

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

  let watcher: fs.FSWatcher | null = null;

  return {
    name: "asset-conversion",
    buildStart() {
      // Initial conversion of all assets
      config.conversions.forEach(convertAsset);

      // Set up file watching
      const assetsDir = path.resolve("assets");
      watcher = fs.watch(
        assetsDir,
        { recursive: true },
        (eventType, filename) => {
          if (filename) {
            const fullPath = path.join(assetsDir, filename);
            const conversion = config.conversions.find(
              (c) => path.resolve(c.input) === fullPath
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
