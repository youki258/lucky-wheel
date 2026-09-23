import { api as demoApi } from './demo/api-demo.js'

// 真实后端调用（Docker / 本地 dev / Render 实例走这里）
async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    let code = 'HTTP_' + res.status
    try {
      const body = await res.json()
      if (body?.error) code = body.error
    } catch { /* 非 JSON 错误体 */ }
    const err = new Error(code)
    err.code = code
    err.status = res.status
    throw err
  }
  return res.json()
}

const post = (url, body) => request(url, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined })
const put = (url, body) => request(url, { method: 'PUT', body: JSON.stringify(body) })

const realApi = {
  // 抽奖页
  public: () => request('/api/public'),
  draw: () => post('/api/draw'),

  // 会话
  session: () => request('/api/session'),
  login: (password) => post('/api/login', { password }),
  logout: () => post('/api/logout'),

  // 管理后台
  config: () => request('/api/config'),
  saveConfig: (config) => put('/api/config', config),
  prizes: () => request('/api/prizes'),
  savePrizes: (prizes) => put('/api/prizes', prizes),
  records: () => request('/api/records'),
  reset: () => post('/api/reset'),
  importData: (data) => post('/api/import', data),

  // 下载（带 cookie）
  exportUrl: '/api/export',
  recordsCsvUrl: '/api/records/export.csv',
}

// VITE_DEMO 构建时被 Vite 静态替换：true → demo 分支；未设 → false，
// Rollup 摇掉 demoApi（验收：生产 dist 中 grep 不到 lw_demo 种子串）。
export const isDemo = import.meta.env.VITE_DEMO === 'true'
export const api = isDemo ? demoApi : realApi
