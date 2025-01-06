import { defineConfig } from "vite";
import assetConversionPlugin from "./vite-plugin-asset-conversion";
import assetConversionConfig from "../assets/asset-conversion.config";

// TODO: Fix hot reloading/make sure that dev server from dev reloads once this assets finish (or simply join both? But then assets redone every time?)

export default defineConfig({
  plugins: [assetConversionPlugin(assetConversionConfig)],
  build: {
    // We don't actually want to build anything, just run the plugin
    emptyOutDir: false,
    rollupOptions: {
      input: "assets/noop.ts",
      output: {
        entryFileNames: "noop.js",
      },
      watch: {
        include: ["assets/**/*"],
      },
    },
    server: false, // Disable the development server
  },
});
