// GitHub Pages 交互 Demo 用的 mock 实现：
// 与 server/routes.js 行为对齐（加权算法/错误码/sanitize 同源），
// 状态存 localStorage，刷新不丢；仅在 VITE_DEMO=true 构建时被引用。

import { defaultConfig, defaultPrizes } from '../../server/default-data.js'
import { sanitizeConfig, sanitizePrizes } from '../../server/sanitize.js'

// v2：种子数据/主题改版时递增，旧 localStorage 自动作废并重新播种
const KEY = {
  config: 'lw_demo_config_v2',
  prizes: 'lw_demo_prizes_v2',
  records: 'lw_demo_records_v2',
  session: 'lw_demo_session_v2',
}

const DEMO_PASSWORD = 'admin123'

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch { /* 隐私模式写入失败时降级为内存态 */ }
}

function clone(v) {
  return JSON.parse(JSON.stringify(v))
}

function mergeDefaults(target, defaults) {
  const out = { ...target }
  for (const [k, v] of Object.entries(defaults)) {
    if (out[k] === undefined) out[k] = v
  }
  return out
}

function err(code, status) {
  const e = new Error(code)
  e.code = code
  e.status = status
  return e
}

// —— 存取（首次访问写入种子数据，与后端 initStore 等价）——
function getConfig() {
  let c = read(KEY.config, null)
  if (!c) {
    c = clone(defaultConfig)
    write(KEY.config, c)
  }
  return mergeDefaults(c, defaultConfig)
}

function saveConfig(config) {
  write(KEY.config, config)
}

function getPrizes() {
  let p = read(KEY.prizes, null)
  if (!p) {
    p = clone(defaultPrizes)
    write(KEY.prizes, p)
  }
  return p.map((x) => ({ ...x, id: x.id || 'p' + Math.random().toString(36).slice(2, 10) }))
}

function savePrizes(prizes) {
  write(KEY.prizes, prizes)
}

function getRecords() {
  return read(KEY.records, [])
}

function saveRecords(records) {
  write(KEY.records, records)
}

function isAuthenticated() {
  return read(KEY.session, false) === true
}

// —— 加权抽奖：票数 = 剩余份数 × 权重，与 routes.js 同算法 ——
function doDraw() {
  const config = getConfig()
  const prizes = getPrizes()
  const records = getRecords()
  if (records.length >= config.totalDrawLimit) throw err('NO_DRAWS_LEFT', 409)
  const wonCount = (prizeId) => records.reduce((n, x) => n + (x.prizeId === prizeId ? 1 : 0), 0)
  const options = prizes
    .map((p) => ({ prize: p, tickets: Math.max(0, p.count - wonCount(p.id)) * Math.max(1, p.weight) }))
    .filter((o) => o.tickets > 0)
  if (!options.length) throw err('STOCK_EMPTY', 409)
  const total = options.reduce((s, o) => s + o.tickets, 0)
  let roll = Math.random() * total
  let picked = options[options.length - 1]
  for (const o of options) {
    roll -= o.tickets
    if (roll < 0) {
      picked = o
      break
    }
  }
  const prize = picked.prize
  const record = {
    id: globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2),
    time: new Date().toISOString(),
    prizeId: prize.id,
    prizeName: prize.name,
  }
  records.push(record)
  saveRecords(records)
  return {
    prizeId: prize.id,
    name: prize.name,
    image: prize.image,
    index: prizes.findIndex((p) => p.id === prize.id),
    remaining: Math.max(0, config.totalDrawLimit - records.length),
  }
}

function requireAuth() {
  if (!isAuthenticated()) throw err('UNAUTHORIZED', 401)
}

function recordsCsv() {
  const rows = [['抽奖时间', '奖品']]
  for (const rec of getRecords()) {
    rows.push([rec.time, rec.prizeName.replace(/\n/g, ' ')])
  }
  return (
    '﻿' +
    rows
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\r\n')
  )
}

function backupJson() {
  return JSON.stringify(
    { exportedAt: new Date().toISOString(), config: getConfig(), prizes: getPrizes() },
    null,
    2,
  )
}

function dataUrl(content, mime) {
  return `data:${mime};charset=utf-8,${encodeURIComponent(content)}`
}

// —— 对外接口：与 src/api.js 中 api 对象同形状 ——
export const api = {
  // 抽奖页
  async public() {
    const config = getConfig()
    const prizes = getPrizes()
    const records = getRecords()
    const remaining = Math.max(0, config.totalDrawLimit - records.length)
    const stockEmpty = prizes.every((p) => p.count <= 0)
    const wonCount = (prizeId) => records.reduce((n, x) => n + (x.prizeId === prizeId ? 1 : 0), 0)
    return {
      config,
      prizes: prizes.map((p) => ({
        id: p.id,
        name: p.name,
        image: p.image,
        color: p.color,
        fontColor: p.fontColor,
        left: Math.max(0, p.count - wonCount(p.id)),
      })),
      remaining,
      stockEmpty,
    }
  },
  async draw() {
    return doDraw()
  },

  // 会话
  async session() {
    return { authenticated: isAuthenticated() }
  },
  async login(password) {
    if (password !== DEMO_PASSWORD) throw err('WRONG_PASSWORD', 401)
    write(KEY.session, true)
    return { ok: true }
  },
  async logout() {
    write(KEY.session, false)
    return { ok: true }
  },

  // 管理后台
  async config() {
    requireAuth()
    return getConfig()
  },
  async saveConfig(config) {
    requireAuth()
    const merged = { ...getConfig(), ...(config || {}) }
    saveConfig(sanitizeConfig(merged))
    return getConfig()
  },
  async prizes() {
    requireAuth()
    return getPrizes()
  },
  async savePrizes(prizes) {
    requireAuth()
    const clean = sanitizePrizes(prizes)
    if (!clean) throw err('INVALID_PRIZES', 400)
    savePrizes(clean)
    return clean
  },
  async records() {
    requireAuth()
    return getRecords()
  },
  async reset() {
    requireAuth()
    saveRecords([])
    return { ok: true }
  },
  async importData(data) {
    requireAuth()
    const body = data || {}
    if (body.config !== undefined) {
      const merged = { ...getConfig(), ...body.config }
      saveConfig(sanitizeConfig(merged))
    }
    if (body.prizes !== undefined) {
      const prizes = sanitizePrizes(body.prizes)
      if (!prizes) throw err('INVALID_PRIZES', 400)
      savePrizes(prizes)
    }
    return { ok: true }
  },

  // 下载：getter 动态生成 data URL（AdminPage 用 window.location.href 赋值）
  get exportUrl() {
    return dataUrl(backupJson(), 'application/json')
  },
  get recordsCsvUrl() {
    return dataUrl(recordsCsv(), 'text/csv')
  },
}
