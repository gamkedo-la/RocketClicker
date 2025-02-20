import fs from "fs";
import path from "path";
import { Plugin, ResolvedConfig } from "vite";

const supportedExtensions = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".mp3",
  ".ogg",
  ".wav",
  ".json",
  ".glb",
];

interface StandardAssetInfo {
  type: string;
  key: string;
  url: string;
}

interface SpritesheetAssetInfo {
  type: string;
  key: string;
  url: string;
  frameConfig?: {
    frameWidth?: number;
    frameHeight?: number;
    startFrame?: number;
    endFrame?: number;
    margin?: number;
    spacing?: number;
  };
}

interface AtlasAssetInfo {
  type: string;
  key: string;
  atlasURL: string;
  textureURL: string;
}

type AssetInfo = StandardAssetInfo | SpritesheetAssetInfo | AtlasAssetInfo;

interface AssetTypeInfo {
  extensions: string[];
  getInfo: (
    key: string,
    url: string,
    pngUrl?: string,
    config?: AssetConfiguration
  ) => AssetInfo;
  check?: (content: any) => boolean;
}

interface AssetConfiguration {
  input: string;
  output: string;
  type?: string;
  frameConfig?: {
    frameWidth?: number;
    frameHeight?: number;
    startFrame?: number;
    endFrame?: number;
    margin?: number;
    spacing?: number;
  };
  atlas?: {
    jsonPath?: string;
    texturePath?: string;
  };
}

interface AssetsConfigFile {
  assets: AssetConfiguration[];
  meta: {
    generated: string;
    version: string;
  };
}

const assetTypes: Record<string, AssetTypeInfo> = {
  image: {
    extensions: [".png", ".jpg", ".jpeg", ".gif"],
    getInfo: (key, url): AssetInfo => ({ type: "image", key, url }),
  },
  audio: {
    extensions: [".mp3", ".ogg", ".wav"],
    getInfo: (key, url): AssetInfo => ({ type: "audio", key, url }),
  },
  tilemapTiledJSON: {
    extensions: [".json"],
    check: (content): boolean =>
      content.type === "map" || content.layers !== undefined,
    getInfo: (key, url): AssetInfo => ({ type: "tilemapTiledJSON", key, url }),
  },
  aseprite: {
    extensions: [".json"],
    check: (content): boolean =>
      content.meta && content.meta.app === "http://www.aseprite.org/",
    getInfo: (key, jsonUrl, pngUrl): AssetInfo => ({
      type: "aseprite",
      key,
      atlasURL: jsonUrl,
      textureURL: pngUrl!,
    }),
  },
  json: {
    extensions: [".json"],
    getInfo: (key, url): AssetInfo => ({ type: "json", key, url }),
  },
  binary: {
    extensions: [".glb"],
    getInfo: (key, url): AssetInfo => ({ type: "binary", key, url }),
  },
  spritesheet: {
    extensions: [".png"],
    getInfo: (key, url, _, config): AssetInfo => ({
      type: "spritesheet",
      key,
      url,
      frameConfig: config?.frameConfig,
    }),
  },
  atlas: {
    extensions: [".png"],
    getInfo: (key, url, _, config): AssetInfo => ({
      type: "atlas",
      key,
      textureURL: url,
      atlasURL: config?.atlas?.jsonPath || "",
    }),
  },
};

export default function phaserAssetsPlugin(): Plugin {
  let config: ResolvedConfig;

  return {
    name: "phaser-assets",
    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },
    buildStart() {
      this.addWatchFile(path.resolve("public/assets"));
    },
    handleHotUpdate({ file }) {
      if (file.startsWith(path.resolve("public/assets"))) {
        generateAssets();
        return [];
      }
    },
    configureServer() {
      generateAssets();
    },
  };

  function generateAssets() {
    const assetsConfig = loadAssetsConfiguration();
    const assetsDir = path.resolve("public/assets");
    const assets: Record<string, AssetInfo[]> = {};

    function scanDirectory(dir: string, baseDir = "") {
      const files = fs.readdirSync(dir);
      const jsonFiles: { file: string; filePath: string; baseDir: string }[] =
        [];

      files.forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          scanDirectory(filePath, path.join(baseDir, file));
        } else if (
          supportedExtensions.includes(path.extname(file).toLowerCase())
        ) {
          if (path.extname(file).toLowerCase() === ".json") {
            jsonFiles.push({ file, filePath, baseDir });
          } else {
            const assetInfo = getAssetInfo(
              file,
              filePath,
              baseDir,
              assetsConfig
            );
            if (assetInfo) {
              if (!assets[assetInfo.type]) {
                assets[assetInfo.type] = [];
              }
              assets[assetInfo.type].push(assetInfo);
            }
          }
        }
      });

      // Process JSON files after other files
      jsonFiles.forEach(({ file, filePath, baseDir }) => {
        const assetInfo = processJsonAsset(
          file,
          filePath,
          baseDir,
          assetsConfig
        );
        if (assetInfo) {
          if (!assets[assetInfo.type]) {
            assets[assetInfo.type] = [];
          }
          assets[assetInfo.type].push(assetInfo);
        }
      });
    }

    function getAssetInfo(
      file: string,
      filePath: string,
      baseDir: string,
      assetsConfig?: AssetsConfigFile
    ): AssetInfo | null {
      const ext = path.extname(file).toLowerCase();
      const baseName = path.parse(file).name;
      const assetKey = path.join(baseDir, baseName).replace(/\\/g, "/");
      const assetPath = path.join("assets", baseDir, file).replace(/\\/g, "/");
      const publicPath = path.join("public", "assets", baseDir, file);

      // Find matching configuration by output path
      const matchingConfig = assetsConfig?.assets.find(
        (a) => a.output === publicPath
      );

      if (matchingConfig?.type && assetTypes[matchingConfig.type]) {
        return assetTypes[matchingConfig.type].getInfo(
          assetKey,
          assetPath,
          undefined,
          matchingConfig
        );
      }

      for (const [type, typeInfo] of Object.entries(assetTypes)) {
        if (typeInfo.extensions.includes(ext)) {
          return typeInfo.getInfo(assetKey, assetPath);
        }
      }

      return null;
    }

    function processJsonAsset(
      file: string,
      filePath: string,
      baseDir: string,
      assetsConfig?: AssetsConfigFile
    ): AssetInfo | null {
      const content = JSON.parse(fs.readFileSync(filePath, "utf8"));
      const baseName = path.parse(file).name;
      const assetKey = path.join(baseDir, baseName).replace(/\\/g, "/");
      const assetPath = path.join("assets", baseDir, file).replace(/\\/g, "/");
      const relativePath = path.join(baseDir, file);

      // Find matching configuration by output path
      const matchingConfig = assetsConfig?.assets.find(
        (a) => a.output === relativePath
      );

      if (matchingConfig?.type && assetTypes[matchingConfig.type]) {
        return assetTypes[matchingConfig.type].getInfo(
          assetKey,
          assetPath,
          undefined,
          matchingConfig
        );
      }

      if (
        assetTypes.tilemapTiledJSON.check &&
        assetTypes.tilemapTiledJSON.check(content)
      ) {
        return assetTypes.tilemapTiledJSON.getInfo(assetKey, assetPath);
      }
      if (assetTypes.aseprite.check && assetTypes.aseprite.check(content)) {
        const pngPath = path
          .join("assets", baseDir, `${baseName}.png`)
          .replace(/\\/g, "/");
        return assetTypes.aseprite.getInfo(assetKey, assetPath, pngPath);
      }
      return assetTypes.json.getInfo(assetKey, assetPath);
    }

    scanDirectory(assetsDir);

    // Generate assetPack.json
    const assetPack = {
      assetPack: {
        files: Object.values(assets).flat(),
      },
      meta: {
        app: "Phaser Vite Plugin",
        version: "0.2",
      },
    };

    const outputPath = path.resolve("public/assetPack.json");
    fs.writeFileSync(outputPath, JSON.stringify(assetPack, null, 2));
    config.logger.info(
      `[phaser-assets] Asset pack generated: ${path.relative(
        process.cwd(),
        outputPath
      )}`,
      { clear: true, timestamp: true }
    );

    // Generate assets.ts
    const resourcesContent = Object.values(assets)
      .flat()
      .map(
        (asset) =>
          `  "${asset.key
            .replace(/[\/\\]/g, ".")
            .replace(/[^A-Za-z0-9.-]+/g, "_")}": "${asset.key}",`
      )
      .join("\n");

    const assetsContent = `
// This file is auto-generated by vite-plugin-phaser-asset-pack
// Do not edit this file manually

export const RESOURCES = {
${resourcesContent}
} as const;
`;
    const assetsOutputPath = path.resolve("src/assets.ts");
    fs.writeFileSync(assetsOutputPath, assetsContent);
    config.logger.info(
      `[phaser-assets] Assets TypeScript file generated: ${path.relative(
        process.cwd(),
        assetsOutputPath
      )}`,
      { clear: true, timestamp: true }
    );

    // Log asset count
    const totalAssets = Object.values(assets).reduce(
      (sum, typeAssets) => sum + typeAssets.length,
      0
    );
    config.logger.info(
      `[phaser-assets] Total assets processed: ${totalAssets}`,
      {
        clear: true,
        timestamp: true,
      }
    );
  }

  function loadAssetsConfiguration(): AssetsConfigFile | undefined {
    const configPath = path.resolve("public/assets-configuration.json");
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, "utf8"));
    }
    return undefined;
  }
}
