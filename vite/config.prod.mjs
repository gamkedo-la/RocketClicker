import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  logLevel: "warning",
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ["phaser"],
        },
      },
    },
    minify: "terser",
    terserOptions: {
      compress: {
        passes: 2,
      },
      mangle: true,
      format: {
        comments: false,
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
