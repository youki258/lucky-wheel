import { randomBytes, timingSafeEqual } from 'node:crypto'

// 内存会话：token → 过期时间。重启后需重新登录（可接受：抽奖是短时活动）
const SESSION_TTL = 7 * 24 * 3600 * 1000
export const COOKIE_NAME = 'lw_session'
const sessions = new Map()

function adminPassword() {
  return process.env.ADMIN_PASSWORD || 'admin123'
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a))
  const bb = Buffer.from(String(b))
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

export function login(password) {
  if (!safeEqual(password, adminPassword())) return null
  const token = randomBytes(24).toString('hex')
  sessions.set(token, Date.now() + SESSION_TTL)
  return token
}

export function logout(token) {
  sessions.delete(token)
}

// 顺手清过期，避免长期运行内存缓慢增长
function prune() {
  const now = Date.now()
  for (const [t, exp] of sessions) if (exp < now) sessions.delete(t)
}

function parseCookies(header) {
  const out = {}
  if (!header) return out
  for (const part of header.split(';')) {
    const i = part.indexOf('=')
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim())
  }
  return out
}

export function getSessionToken(req) {
  return parseCookies(req.headers.cookie)[COOKIE_NAME] || null
}

export function isAuthenticated(req) {
  prune()
  const token = getSessionToken(req)
  if (!token || !sessions.has(token)) return false
  if (sessions.get(token) < Date.now()) {
    sessions.delete(token)
    return false
  }
  return true
}

export function authRequired(req, res, next) {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'UNAUTHORIZED' })
  }
  next()
}

export function sessionCookie(token) {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL / 1000}`
}

export function clearCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
}
