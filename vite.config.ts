import { defineConfig } from "vite";
import { resolve } from "path";
import react from "@vitejs/plugin-react";
// import { libInjectCss } from "vite-plugin-lib-inject-css";
import dts from "vite-plugin-dts";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    copyPublicDir: false,
    minify: true,
    lib: {
      entry: [resolve(__dirname, "src/index.ts")],
      formats: ["es", "umd"],
      name: 'SwarmCommentSystem',
      fileName: (format) => `index.${format}.js`
    },
  },
  resolve: {
    alias: {
      '@components': resolve(__dirname, 'src/components'),
    },
  },
  plugins: [
    react(),
    dts({
      exclude: [
        resolve(__dirname, "src/main.tsx"),
        resolve(__dirname, "src/App.tsx"),
      ],
    }),
    nodePolyfills({
      include: ["stream", "util"],
    }),
  ],
});
