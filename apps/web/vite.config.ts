import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@bookmarks/spatial-engine': fileURLToPath(
        new URL('../../packages/spatial-engine/src/index.ts', import.meta.url),
      ),
    },
  },
})
