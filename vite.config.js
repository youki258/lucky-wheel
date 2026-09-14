import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      // 开发模式前端 5173，API 转发给后端 3001；生产模式由同一个 Express 托管
      '/api': 'http://localhost:3001',
    },
  },
  build: {
    outDir: 'dist',
  },
})
