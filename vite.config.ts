import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Recharts é grande; o bundle único (~190 kB gzip) é aceitável para este app.
  build: { chunkSizeWarningLimit: 800 },
})
