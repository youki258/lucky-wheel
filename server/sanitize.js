// 输入清洗 —— 前端 mock 与服务端共用，保证两边校验行为一致。
// 只接受已知字段并做类型/范围收敛，其余丢弃。

const THEMES = ['wheel', 'grid', 'slot']

// 双端可用的 id：浏览器与 Node 均有 globalThis.crypto.randomUUID
function genId(prefix = 'p') {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return prefix + c.randomUUID().slice(0, 8)
  return prefix + Math.random().toString(36).slice(2, 10)
}

export function newId() {
  return genId('')
}

export function clampInt(v, min, max, fallback) {
  const n = Number.parseInt(v, 10)
  if (Number.isNaN(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

export function clampStr(v, max, fallback = '') {
  if (v === undefined || v === null) return fallback
  return String(v).slice(0, max)
}

export function clampBool(v, fallback = false) {
  if (typeof v === 'boolean') return v
  if (v === 'true') return true
  if (v === 'false') return false
  return fallback
}

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
    pageBgGradient: clampStr(c.pageBgGradient, 300, ''),
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
      id: clampStr(p.id, 40) || 'p' + genId('').slice(0, 8),
      name,
      image: clampStr(p.image, 2 * 1024 * 1024),
      count: clampInt(p.count, 0, 99999, 1),
      weight: clampInt(p.weight, 1, 999, 1),
      color: clampStr(p.color, 64),
      fontColor: clampStr(p.fontColor, 64),
    })
  }
  return out
}
