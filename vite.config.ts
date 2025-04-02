import react from "@vitejs/plugin-react";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import { nodePolyfills } from "vite-plugin-node-polyfills";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig(({ mode }) => {
  const isProd = mode === "production";

  return {
    build: {
      copyPublicDir: false,
      minify: isProd,
      lib: {
        entry: [resolve(__dirname, "src/index.ts")],
        formats: ["es", "cjs", "umd"],
        name: "SwarmCommentSystem", // TODO: rename to swarm-comment-system-ui
        fileName: format => `index.${format}.js`,
      },
      sourcemap: isProd,
      rollupOptions: {
        external: ["@ethersphere/bee-js", "stream", "react", "react/jsx-runtime", "@solarpunkltd/comment-system"],
        output: {
          globals: {
            "@ethersphere/bee-js": "BeeJS",
            stream: "stream",
            react: "react",
            "react/jsx-runtime": "react/jsx-runtime",
            "@solarpunkltd/comment-system": "@solarpunkltd/comment-system",
          },
        },
      },
    },
    plugins: [
      react(),
      dts({
        exclude: [resolve(__dirname, "src/main.tsx"), resolve(__dirname, "src/App.tsx")],
        outDir: "dist/types",
        entryRoot: "src",
      }),
      nodePolyfills({
        // To add only specific polyfills, add them here. If no option is passed, adds all polyfills
        include: ["stream", "util"],
      }),
    ],
  };
});
