import { defineConfig } from "vite";
import phaserAssetsPlugin from "./vite-plugin-phaser-asset-pack.ts";

const fullReloadAlways = {
  handleHotUpdate({ server }) {
    // TODO: Maybe assets hot reload?
    server.ws.send({ type: "full-reload" });
    return [];
  },
};

export default defineConfig({
  base: "./",
  plugins: [phaserAssetsPlugin(), fullReloadAlways],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ["phaser"],
        },
      },
    },
  },
  esbuild: {
    jsx: "automatic",
    jsxDev: false,
    jsxFactory: "createElement",
    jsxFragment: "Fragment",
    jsxInject: `import { createElement } from '@game/ui/lib'`,
    jsxSideEffects: true,
  },
  resolve: {
    alias: {
      "@game": "/src",
    },
  },
  server: {
    port: 8080,
  },
});
