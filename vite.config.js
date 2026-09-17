import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Fixed port so the dev server is always the same browser origin.
    // Supabase auth sessions live in that origin's localStorage — if
    // Vite silently drifts to a new port because 5173 is already taken
    // by a leftover process, the browser treats it as a different site
    // and the session doesn't carry over, forcing a fresh login every
    // time. Failing loudly here instead surfaces the real problem
    // (a stray dev server still running) instead of hiding it.
    port: 5173,
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    globals: true,
    pool: 'threads',
  },
})