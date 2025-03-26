/// <reference types="vitest" />
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    globals: true,
  },
  esbuild: {
    jsx: "automatic",
    jsxDev: false,
    jsxFactory: "createElement",
    jsxFragment: "Fragment",
    jsxInject: `import { createElement } from '@game/core/jsx/jsx-runtime'`,
    jsxSideEffects: true,
  },
  resolve: {
    alias: {
      "@game": "/src",
    },
  },
});
