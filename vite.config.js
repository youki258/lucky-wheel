import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  // --mode demo 或 VITE_DEMO=true → mock 构建；否则生产构建摇掉 demo 模块
  const isDemo = mode === 'demo' || process.env.VITE_DEMO === 'true'
  return {
    plugins: [vue()],
    // GitHub Pages 项目站为子路径 /lucky-wheel/，Actions 构建注入 VITE_BASE；
    // 本地 dev 与 Docker 生产保持根路径 /
    base: process.env.VITE_BASE || '/',
    define: {
      'import.meta.env.VITE_DEMO': JSON.stringify(isDemo ? 'true' : 'false'),
    },
    server: {
      proxy: {
        // 开发模式前端 5173，API 转发给后端 3001；生产模式由同一个 Express 托管
        '/api': 'http://localhost:3001',
      },
    },
    build: {
      outDir: 'dist',
    },
  }
})
