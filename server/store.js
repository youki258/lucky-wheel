import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { defaultConfig, defaultPrizes } from './default-data.js'

// 数据目录：环境变量 DATA_DIR 可覆盖（Docker 挂卷用），默认项目根 data/
export const DATA_DIR = process.env.DATA_DIR || path.resolve(process.cwd(), 'data')

const FILE = {
  config: path.join(DATA_DIR, 'config.json'),
  prizes: path.join(DATA_DIR, 'prizes.json'),
  records: path.join(DATA_DIR, 'records.json'),
}

function ensureDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

function atomicWrite(file, value) {
  const tmp = file + '.' + randomUUID() + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8')
  fs.renameSync(tmp, file)
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return fallback
  }
}

// 把代码内置的默认值合并进已保存的配置：
// 旧数据文件缺的新字段自动补默认值，多出来的未知字段原样保留（双向向前兼容）
function mergeDefaults(target, defaults) {
  const out = { ...target }
  for (const [k, v] of Object.entries(defaults)) {
    if (out[k] === undefined) out[k] = v
  }
  return out
}

export function initStore() {
  ensureDir()
  if (!fs.existsSync(FILE.config)) {
    atomicWrite(FILE.config, defaultConfig)
  }
  if (!fs.existsSync(FILE.prizes)) {
    atomicWrite(FILE.prizes, defaultPrizes)
  }
  if (!fs.existsSync(FILE.records)) {
    atomicWrite(FILE.records, [])
  }
}

export function getConfig() {
  return mergeDefaults(readJson(FILE.config, null) ?? { ...defaultConfig }, defaultConfig)
}

export function saveConfig(config) {
  atomicWrite(FILE.config, config)
}

export function getPrizes() {
  const prizes = readJson(FILE.prizes, [])
  return prizes.map((p) => ({ ...p, id: p.id || 'p' + randomUUID().slice(0, 8) }))
}

export function savePrizes(prizes) {
  atomicWrite(FILE.prizes, prizes)
}

export function getRecords() {
  return readJson(FILE.records, [])
}

export function saveRecords(records) {
  atomicWrite(FILE.records, records)
}
