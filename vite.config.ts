import { defineConfig } from 'vite'
import { join } from 'path'

export default defineConfig({
  base: '/',
  resolve: {
    alias: {
      '@': join(__dirname, 'src'),
    }
  },
})
