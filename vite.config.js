import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Served from the custom apex domain thekaashvijewels.com, so assets live at '/'.
// (Previously '/kaashvijewels/' for the bhavuk461.github.io/kaashvijewels/ project URL.)
export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
  },
})
