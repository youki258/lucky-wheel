import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { initStore } from './store.js'
import { buildRouter } from './routes.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.resolve(__dirname, '../dist')
const PORT = Number.parseInt(process.env.PORT || '3001', 10)

initStore()

const app = express()
app.use(express.json({ limit: '8mb' })) // 配置导入/奖品图片(dataURL)可能较大

app.use('/api', buildRouter())

// API 401 时返回 JSON 而不是 HTML
app.use('/api', (req, res) => res.status(404).json({ error: 'NOT_FOUND' }))

// 生产模式：托管前端构建产物（dist/ 不存在时说明是纯后端开发模式）
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST))
  app.use((req, res, next) => {
    if (req.method === 'GET') return res.sendFile(path.join(DIST, 'index.html'))
    next()
  })
}

app.listen(PORT, () => {
  console.log(`[lucky-wheel] server on http://localhost:${PORT}  (admin: /#/admin)`)
})
