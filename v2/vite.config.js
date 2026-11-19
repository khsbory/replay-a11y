import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const path = file => fileURLToPath(new URL(file, import.meta.url));
export default defineConfig(({ mode }) => ({
  define: {
    __RECAPTCHA_SITE_KEY__: JSON.stringify(mode === 'release-test' ? 'synthetic-site-id-for-tests-only' : ''),
    __VERIFIED_QA_APP__: JSON.stringify('1:000000000000:web:0000000000000000000000'),
  },
  publicDir: false, // No implicit copy of sources, evidence or project files.
  build: {
    outDir: mode === 'release-test' ? 'dist-test' : 'dist',
    sourcemap: false,
    rollupOptions: { input: [path('./index.html'), path('./approved-demo.html')] },
  },
  plugins: [{
    name: 'approved-phone-pages',
    apply: 'build',
    async generateBundle() {
      for (const name of ['before', 'after']) {
        const source = await readFile(path(`../phone/${name}.html`));
        this.emitFile({ type: 'asset', fileName: `${name}.html`, source });
      }
    },
  }],
}));
