import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { build } from 'esbuild'
import path from 'path'

/**
 * Custom Vite plugin to compile the service worker (src/sw.ts) into sw.js.
 *
 * The SW runs in a separate global scope and can't be part of the main Vite bundle.
 * This plugin uses esbuild to compile it as a standalone file:
 * - Dev: outputs to public/ so the dev server can serve it at /sw.js
 * - Build: emits to the dist/ output directory
 */
function serviceWorkerPlugin(): Plugin {
  const swEntry = path.resolve(__dirname, 'src/sw.ts');

  async function buildSW(outdir: string) {
    await build({
      entryPoints: [swEntry],
      outfile: path.join(outdir, 'sw.js'),
      bundle: true,
      format: 'esm',
      target: 'es2022',
      minify: false,
    });
  }

  return {
    name: 'service-worker',

    // During dev, compile sw.ts → public/sw.js so the dev server serves it
    async buildStart() {
      await buildSW(path.resolve(__dirname, 'public'));
    },

    // During production build, also emit sw.js to the output directory
    async writeBundle(options) {
      const outDir = options.dir || path.resolve(__dirname, 'dist');
      await buildSW(outDir);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), serviceWorkerPlugin()],
  css: {
    devSourcemap: true,
  },
  build: {
    sourcemap: true,
  },
  server: {
    port: 5173,
    strictPort: true,  // Fail if port is in use instead of switching
  },
})
