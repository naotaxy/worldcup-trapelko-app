import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base so the same build works both at a host root (Render) and under
// a project subpath (GitHub Pages: /<repo>/). The app only uses hash anchors,
// no client-side routing, so relative asset URLs are safe.
// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
})
