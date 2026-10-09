import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';

const IMAGE_CATS = ['pothole', 'crack', 'sign', 'manhole', 'marking', 'gravel', 'night'];

// Virtual module virtual:image-counts — reads public/images/ at build time.
// Import as: import IMAGE_COUNTS from 'virtual:image-counts'
function imageCountsPlugin() {
  const virtualId = 'virtual:image-counts';
  const resolved = '\0' + virtualId;
  return {
    name: 'image-counts',
    resolveId(id: string) {
      if (id === virtualId) return resolved;
    },
    load(id: string) {
      if (id !== resolved) return;
      const imagesDir = resolve(__dirname, 'public/images');
      const counts: Record<string, number> = {};
      for (const cat of IMAGE_CATS) {
        const dir = resolve(imagesDir, cat);
        try {
          counts[cat] = fs.readdirSync(dir).filter((f: string) => f.endsWith('.jpg')).length;
        } catch {
          counts[cat] = 0;
        }
      }
      return `export default ${JSON.stringify(counts)}`;
    },
  };
}

export default defineConfig({
  plugins: [react(), imageCountsPlugin()],
  resolve: {
    alias: {
      '@shared': resolve(__dirname, '../src/shared'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
