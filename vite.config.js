import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Static site, no backend. Deploys to Vercel with the default Vite preset.
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
