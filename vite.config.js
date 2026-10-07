import {
  defineConfig,
} from "vite";

import {
  resolve,
} from "node:path";
import { cpSync, copyFileSync } from "node:fs";

export default defineConfig({
  base: './',
  plugins: [{
    name: 'moot-extension-package',
    closeBundle() {
      copyFileSync('manifest.json', 'dist/manifest.json');
      for (const folder of ['background', 'content', 'utils', 'shared', 'ai']) {
        cpSync(`src/${folder}`, `dist/src/${folder}`, { recursive: true });
      }
    },
  }],
  root: ".",

  publicDir:
    "public",

  build: {
    outDir:
      "dist",

    emptyOutDir:
      true,

    sourcemap:
      true,

    rollupOptions: {
      input: {
        sidepanel:
          resolve(
            import.meta.dirname,
            "src/sidepanel/index.html"
          ),
      },
    },
  },

  server: {
    port:
      5173,

    strictPort:
      true,
  },
});
