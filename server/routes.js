import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import {
  getConfig, saveConfig, getPrizes, savePrizes, getRecords, saveRecords,
} from './store.js'
import {
  login, logout, authRequired, isAuthenticated, sessionCookie, clearCookie,
} from './auth.js'

const THEMES = ['wheel', 'grid', 'slot']

function clampInt(v, min, max, fallback) {
  const n = Number.parseInt(v, 10)
  if (Number.isNaN(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

function clampStr(v, max, fallback = '') {
  if (v === undefined || v === null) return fallback
  return String(v).slice(0, max)
}

function clampBool(v, fallback = false) {
  if (typeof v === 'boolean') return v
  if (v === 'true') return true
  if (v === 'false') return false
  return fallback
}

// 只接受已知字段并做类型/范围收敛，其余丢弃 —— 配置文件可以随便加注释性字段，接口侧保持干净
export function sanitizeConfig(input) {
  const c = input && typeof input === 'object' ? input : {}
  return {
    title: clampStr(c.title, 100, '幸运抽奖'),
    subtitle: clampStr(c.subtitle, 200),
    buttonText: clampStr(c.buttonText, 20, '立即抽奖'),
    centerText: clampStr(c.centerText, 10, '抽'),
    remainingText: clampStr(c.remainingText, 100, '剩余抽奖次数：{n}'),
    finishedText: clampStr(c.finishedText, 200, '抽奖次数已用完'),
    stockEmptyText: clampStr(c.stockEmptyText, 200, '奖品已被抽完啦'),
    resultTemplate: clampStr(c.resultTemplate, 200, '恭喜抽中\n{prize}'),
    resultButtonText: clampStr(c.resultButtonText, 20, '好的'),
    gridFillText: clampStr(c.gridFillText, 20, '谢谢参与'),
    buttonTextColor: clampStr(c.buttonTextColor, 64, '#ffffff'),
    subtitleColor: clampStr(c.subtitleColor, 64, '#ffffff'),
    backgroundImage: clampStr(c.backgroundImage, 3 * 1024 * 1024, ''),
    theme: THEMES.includes(c.theme) ? c.theme : 'wheel',
    totalDrawLimit: clampInt(c.totalDrawLimit, 1, 100000, 10),
    animationDuration: clampInt(c.animationDuration, 1, 30, 3),
    soundEnabled: clampBool(c.soundEnabled, true),
    showRemaining: clampBool(c.showRemaining, true),
    pageBgColor: clampStr(c.pageBgColor, 64, '#8f1f1b'),
    pageBgGradient: clampStr(c.pageBgGradient, 300, ''), // 可选：CSS background 值（渐变），非空时优先于 pageBgColor
    titleColor: clampStr(c.titleColor, 64, '#ffd54f'),
    ringColor: clampStr(c.ringColor, 64, '#e8373c'),
    buttonColor: clampStr(c.buttonColor, 64, '#e8373c'),
    textColor: clampStr(c.textColor, 64, '#d2451e'),
    sectorColors: Array.isArray(c.sectorColors)
      ? c.sectorColors.slice(0, 24).map((s) => clampStr(s, 64, '#ffffff'))
      : ['#ffffff', '#fff3d6'],
  }
}

export function sanitizePrizes(input) {
  if (!Array.isArray(input)) return null
  if (input.length > 24) return null
  const out = []
  for (const p of input) {
    if (!p || typeof p !== 'object') return null
    const name = clampStr(p.name, 100).trim()
    if (!name) return null
    out.push({
      id: clampStr(p.id, 40) || 'p' + randomUUID().slice(0, 8),
      name,
      image: clampStr(p.image, 2 * 1024 * 1024), // 支持 http(s) 链接或 dataURL（后台传图）
      count: clampInt(p.count, 0, 99999, 1),
      weight: clampInt(p.weight, 1, 999, 1),
      color: clampStr(p.color, 64), // 留空则按 sectorColors 轮换
      fontColor: clampStr(p.fontColor, 64), // 留空则用全局 textColor
    })
  }
  return out
}

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
