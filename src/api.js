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

export const api = {
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
