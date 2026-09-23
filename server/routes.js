import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import {
  getConfig, saveConfig, getPrizes, savePrizes, getRecords, saveRecords,
} from './store.js'
import {
  login, logout, authRequired, isAuthenticated, sessionCookie, clearCookie,
} from './auth.js'
import { sanitizeConfig, sanitizePrizes } from './sanitize.js'

export { sanitizeConfig, sanitizePrizes }

export function buildRouter() {
  const r = Router()

  // —— 会话 ——
  r.post('/login', (req, res) => {
    const token = login(req.body?.password)
    if (!token) return res.status(401).json({ error: 'WRONG_PASSWORD' })
    res.setHeader('Set-Cookie', sessionCookie(token))
    res.json({ ok: true })
  })

  r.post('/logout', (req, res) => {
    logout(req.headers.cookie ? getSessionTokenSafe(req) : null)
    res.setHeader('Set-Cookie', clearCookie())
    res.json({ ok: true })
  })

  r.get('/session', (req, res) => {
    res.json({ authenticated: isAuthenticated(req) })
  })

  // —— 抽奖页公开数据：只给展示字段，不暴露库存/权重 ——
  r.get('/public', (req, res) => {
    const config = getConfig()
    const prizes = getPrizes()
    const records = getRecords()
    const remaining = Math.max(0, config.totalDrawLimit - records.length)
    const stockEmpty = prizes.every((p) => p.count <= 0)
    const wonCount = (prizeId) => records.reduce((n, x) => n + (x.prizeId === prizeId ? 1 : 0), 0)
    res.json({
      config,
      // left = 该奖品剩余可抽数量：抡到 0 的奖品前端不再展示（抡到即消失）
      prizes: prizes.map((p) => ({
        id: p.id, name: p.name, image: p.image, color: p.color, fontColor: p.fontColor,
        left: Math.max(0, p.count - wonCount(p.id)),
      })),
      remaining,
      stockEmpty,
    })
  })

  // —— 抽奖：服务端按「剩余份数 × 权重」加权随机，扣减并记录 ——
  r.post('/draw', (req, res) => {
    const config = getConfig()
    const prizes = getPrizes()
    const records = getRecords()
    if (records.length >= config.totalDrawLimit) {
      return res.status(409).json({ error: 'NO_DRAWS_LEFT' })
    }
    const wonCount = (prizeId) => records.reduce((n, x) => n + (x.prizeId === prizeId ? 1 : 0), 0)
    // 加权票箱：不展开大数组，直接在权重总和上取随机点
    const options = prizes
      .map((p) => ({ prize: p, tickets: Math.max(0, p.count - wonCount(p.id)) * Math.max(1, p.weight) }))
      .filter((o) => o.tickets > 0)
    if (!options.length) {
      return res.status(409).json({ error: 'STOCK_EMPTY' })
    }
    const total = options.reduce((s, o) => s + o.tickets, 0)
    let roll = Math.random() * total
    let picked = options[options.length - 1]
    for (const o of options) {
      roll -= o.tickets
      if (roll < 0) { picked = o; break }
    }
    const prize = picked.prize
    records.push({
      id: randomUUID(),
      time: new Date().toISOString(),
      prizeId: prize.id,
      prizeName: prize.name,
    })
    saveRecords(records)
    res.json({
      prizeId: prize.id,
      name: prize.name,
      image: prize.image,
      index: prizes.findIndex((p) => p.id === prize.id),
      remaining: Math.max(0, config.totalDrawLimit - records.length),
    })
  })

  // —— 以下需要管理员登录 ——
  r.get('/config', authRequired, (req, res) => {
    res.json(getConfig())
  })

  r.put('/config', authRequired, (req, res) => {
    // 与已存配置合并后清洗，保证不丢用户在文件里手工加的扩展字段
    const merged = { ...getConfig(), ...(req.body || {}) }
    saveConfig(sanitizeConfig(merged))
    res.json(getConfig())
  })

  r.get('/prizes', authRequired, (req, res) => {
    res.json(getPrizes())
  })

  r.put('/prizes', authRequired, (req, res) => {
    const prizes = sanitizePrizes(req.body)
    if (!prizes) return res.status(400).json({ error: 'INVALID_PRIZES' })
    savePrizes(prizes)
    res.json(prizes)
  })

  r.get('/records', authRequired, (req, res) => {
    res.json(getRecords())
  })

  r.get('/records/export.csv', authRequired, (req, res) => {
    const rows = [['抽奖时间', '奖品']]
    for (const rec of getRecords()) {
      rows.push([rec.time, rec.prizeName.replace(/\n/g, ' ')])
    }
    const csv = '\uFEFF' + rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n')
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="records.csv"')
    res.send(csv)
  })

  r.post('/reset', authRequired, (req, res) => {
    saveRecords([])
    res.json({ ok: true })
  })

  // —— 全量备份 / 恢复 ——
  r.get('/export', authRequired, (req, res) => {
    res.setHeader('Content-Disposition', 'attachment; filename="lucky-wheel-backup.json"')
    res.json({ exportedAt: new Date().toISOString(), config: getConfig(), prizes: getPrizes() })
  })

  r.post('/import', authRequired, (req, res) => {
    const body = req.body || {}
    if (body.config !== undefined) {
      const merged = { ...getConfig(), ...body.config }
      saveConfig(sanitizeConfig(merged))
    }
    if (body.prizes !== undefined) {
      const prizes = sanitizePrizes(body.prizes)
      if (!prizes) return res.status(400).json({ error: 'INVALID_PRIZES' })
      savePrizes(prizes)
    }
    res.json({ ok: true })
  })

  return r
}

// logout 里的 cookie 读取（避免 auth.js 泄漏内部函数，这里独立小实现）
function getSessionTokenSafe(req) {
  const header = req.headers.cookie || ''
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=')
    if (k === 'lw_session') return rest.join('=')
  }
  return null
}
