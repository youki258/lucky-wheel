<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Setting, Goods, Tickets, Files, RefreshRight, SwitchButton, Lock, Plus, Delete, Top, Bottom, Upload } from '@element-plus/icons-vue'
import { api } from '../api.js'
import { adminParticles } from '../particles.js'
import { themePresets } from '../theme-presets.js'

const THEME_LABELS = { wheel: '🎡 大转盘', grid: '🎰 九宫格', slot: '🕹️ 老虎机' }
const TAB_TITLES = { settings: '活动设置', prizes: '奖品管理', records: '抽奖记录', backup: '备份恢复' }

const authed = ref(false)
const checking = ref(true)
const password = ref('')
const tab = ref('settings')
const configForm = ref({})
const prizeList = ref([])
const records = ref([])
const importFileRef = ref(null)
const bgFileRef = ref(null)

onMounted(async () => {
  document.documentElement.classList.add('dark') // Element Plus 暗色主题仅用于后台
  try {
    authed.value = (await api.session()).authenticated
    if (authed.value) await loadAll()
  } finally {
    checking.value = false
  }
})

onBeforeUnmount(() => {
  document.documentElement.classList.remove('dark')
})

function onUnauthorized(e) {
  if (e?.status === 401) {
    authed.value = false
    return true
  }
  return false
}

async function doLogin() {
  try {
    await api.login(password.value)
    authed.value = true
    password.value = ''
    ElMessage.success('欢迎回来，管理员')
    await loadAll()
  } catch {
    ElMessage.error('密码不对，再试试')
  }
}

async function doLogout() {
  await api.logout()
  authed.value = false
}

async function loadAll() {
  try {
    const [cfg, pz, rc] = await Promise.all([api.config(), api.prizes(), api.records()])
    configForm.value = cfg
    prizeList.value = pz
    records.value = rc
  } catch (e) {
    if (!onUnauthorized(e)) ElMessage.error('加载失败：' + (e.message || e))
  }
}

// —— 活动设置 ——
function applyPreset(preset) {
  Object.assign(configForm.value, structuredClone(preset.colors))
  // 预设统一控制配色，清除奖品的单独颜色，恢复自动配色
  prizeList.value.forEach((p) => {
    p.color = ''
    p.fontColor = ''
  })
  ElMessage.success(`已应用预设「${preset.name}」，记得点「保存活动配置」`)
}

async function saveSettings() {
  try {
    configForm.value = await api.saveConfig(configForm.value)
    ElMessage.success('活动配置已保存，抽奖页刷新即可看到')
  } catch (e) {
    if (!onUnauthorized(e)) ElMessage.error('保存失败：' + (e.message || e))
  }
}

function pickBackground() {
  bgFileRef.value?.click()
}

function onBackgroundFile(ev) {
  const file = ev.target.files?.[0]
  ev.target.value = ''
  if (!file) return
  if (file.size > 3 * 1024 * 1024) return ElMessage.warning('背景图不能超过 3MB')
  const reader = new FileReader()
  reader.onload = () => (configForm.value.backgroundImage = reader.result)
  reader.readAsDataURL(file)
}

// —— 奖品管理 ——
function addPrize() {
  prizeList.value.push({ id: '', name: '新奖品', image: '', count: 1, weight: 1, color: '', fontColor: '' })
}

async function removePrize(index) {
  const p = prizeList.value[index]
  try {
    await ElMessageBox.confirm(`删除奖品「${p.name.replace(/\n/g, ' ')}」？`, '确认', { type: 'warning' })
    prizeList.value.splice(index, 1)
  } catch { /* 取消 */ }
}

function movePrize(index, dir) {
  const j = index + dir
  if (j < 0 || j >= prizeList.value.length) return
  const list = prizeList.value
  ;[list[index], list[j]] = [list[j], list[index]]
}

function onPrizeImage(prize, uploadFile) {
  const raw = uploadFile?.raw
  if (!raw) return
  if (raw.size > 1.5 * 1024 * 1024) return ElMessage.warning('图片不能超过 1.5MB')
  const reader = new FileReader()
  reader.onload = () => (prize.image = reader.result)
  reader.readAsDataURL(raw)
}

async function savePrizes() {
  if (!prizeList.value.length) {
    try {
      await ElMessageBox.confirm('奖品列表为空，抽奖页将没有可抽内容，确定保存？', '确认', { type: 'warning' })
    } catch {
      return
    }
  }
  try {
    prizeList.value = await api.savePrizes(prizeList.value)
    ElMessage.success('奖品已保存')
  } catch (e) {
    if (e?.code === 'INVALID_PRIZES') ElMessage.error('保存失败：请检查每个奖品都有名称')
    else if (!onUnauthorized(e)) ElMessage.error('保存失败：' + (e.message || e))
  }
}

// —— 抽奖记录 ——
async function loadRecords() {
  try {
    records.value = await api.records()
  } catch (e) {
    if (!onUnauthorized(e)) ElMessage.error('加载失败：' + (e.message || e))
  }
}

async function resetRound() {
  try {
    await ElMessageBox.confirm(
      `确定重置本轮？将清空 ${records.value.length} 条抽奖记录，恢复全部次数与奖品库存。`,
      '重置本轮',
      { type: 'warning', confirmButtonText: '重置', cancelButtonText: '再想想' },
    )
  } catch {
    return
  }
  await api.reset()
  await loadRecords()
  ElMessage.success('已重置本轮')
}

function exportCsv() {
  window.location.href = api.recordsCsvUrl
}

function fmtTime(iso) {
  return new Date(iso).toLocaleString('zh-CN', { hour12: false })
}

// —— 备份恢复 ——
function exportBackup() {
  window.location.href = api.exportUrl
}

async function onImportFile(ev) {
  const file = ev.target.files?.[0]
  ev.target.value = ''
  if (!file) return
  try {
    const data = JSON.parse(await file.text())
    try {
      await ElMessageBox.confirm('导入将覆盖当前的活动配置和奖品列表，确定？', '导入配置', { type: 'warning' })
    } catch {
      return
    }
    await api.importData(data)
    await loadAll()
    ElMessage.success('导入成功')
  } catch (e) {
    ElMessage.error('导入失败：' + (e.message || e))
  }
}
</script>

<template>
  <div class="console">
    <vue-particles id="admin-particles" class="particles-layer" :options="adminParticles" />
    <div class="glow g1"></div>
    <div class="glow g2"></div>

    <!-- 登录 -->
    <div v-if="checking" class="login-wrap"><span class="checking">正在检查登录状态…</span></div>

    <div v-else-if="!authed" class="login-wrap">
      <div class="login-card glass">
        <div class="login-logo">🎡</div>
        <h1>幸运抽奖</h1>
        <p class="sub">管理控制台</p>
        <el-input
          v-model="password"
          type="password"
          size="large"
          placeholder="管理员密码"
          show-password
          @keyup.enter="doLogin"
        >
          <template #prefix><el-icon><Lock /></el-icon></template>
        </el-input>
        <el-button type="primary" size="large" class="login-btn" @click="doLogin">进 入</el-button>
        <router-link class="back" to="/">← 返回抽奖页</router-link>
      </div>
    </div>

    <!-- 控制台主体 -->
    <el-container v-else class="shell">
      <el-aside width="216px" class="aside glass">
        <div class="brand">
          <span class="logo">🎡</span>
          <div class="brand-text"><b>幸运抽奖</b><small>管理控制台</small></div>
        </div>
        <el-menu :default-active="tab" class="menu" @select="(k) => (tab = k)">
          <el-menu-item index="settings"><el-icon><Setting /></el-icon>活动设置</el-menu-item>
          <el-menu-item index="prizes"><el-icon><Goods /></el-icon>奖品管理</el-menu-item>
          <el-menu-item index="records"><el-icon><Tickets /></el-icon>抽奖记录</el-menu-item>
          <el-menu-item index="backup"><el-icon><Files /></el-icon>备份恢复</el-menu-item>
        </el-menu>
        <div class="aside-foot">
          <el-button text size="small" :icon="RefreshRight" @click="loadAll">刷新数据</el-button>
          <el-button text size="small" :icon="SwitchButton" @click="doLogout">退出登录</el-button>
        </div>
      </el-aside>

      <el-container class="right">
        <el-header class="tophead glass-sub" height="58px">
          <h2>{{ TAB_TITLES[tab] }}</h2>
          <span class="who">管理员</span>
        </el-header>

        <el-main class="main">
          <!-- 活动设置 -->
          <section v-show="tab === 'settings'" class="glass card">
            <h3 class="sec">款式 / 规则 / 文案</h3>
            <div class="grid">
              <el-form-item label="抽奖款式">
                <el-select v-model="configForm.theme" style="width: 100%">
                  <el-option v-for="(label, key) in THEME_LABELS" :key="key" :label="label" :value="key" />
                </el-select>
              </el-form-item>
              <el-form-item label="页面标题"><el-input v-model="configForm.title" maxlength="100" /></el-form-item>
              <el-form-item label="副标题"><el-input v-model="configForm.subtitle" maxlength="200" /></el-form-item>
              <el-form-item label="抽奖按钮文字"><el-input v-model="configForm.buttonText" maxlength="20" /></el-form-item>
              <el-form-item label="转盘中心文字"><el-input v-model="configForm.centerText" maxlength="10" /></el-form-item>
              <el-form-item label="总抽奖次数">
                <el-input-number v-model="configForm.totalDrawLimit" :min="1" :max="100000" style="width: 100%" />
              </el-form-item>
              <el-form-item label="动画时长（秒）">
                <el-input-number v-model="configForm.animationDuration" :min="1" :max="30" style="width: 100%" />
              </el-form-item>
              <el-form-item label="结果按钮文字"><el-input v-model="configForm.resultButtonText" maxlength="20" /></el-form-item>
              <el-form-item label="九宫格补位文案"><el-input v-model="configForm.gridFillText" maxlength="20" /></el-form-item>
              <el-form-item label="剩余次数文案（{n} = 次数）"><el-input v-model="configForm.remainingText" maxlength="100" /></el-form-item>
              <el-form-item label="次数用完提示"><el-input v-model="configForm.finishedText" maxlength="200" /></el-form-item>
              <el-form-item label="奖品抽完提示"><el-input v-model="configForm.stockEmptyText" maxlength="200" /></el-form-item>
              <el-form-item label="结果文案模板（{prize} = 奖品名）" class="span2">
                <el-input v-model="configForm.resultTemplate" type="textarea" :rows="2" maxlength="200" />
              </el-form-item>
            </div>
            <div class="switch-row">
              <span>显示剩余次数 <el-switch v-model="configForm.showRemaining" /></span>
              <span>中奖音效 <el-switch v-model="configForm.soundEnabled" /></span>
            </div>

            <h3 class="sec">柔和配色预设（点击应用，保存后生效；应用后仍可逐项微调）</h3>
            <div class="preset-row">
              <button v-for="p in themePresets" :key="p.name" type="button" class="preset" @click="applyPreset(p)">
                <span class="chips">
                  <i :style="{ background: p.colors.pageBgColor }"></i>
                  <i :style="{ background: p.colors.sectorColors[0] }"></i>
                  <i :style="{ background: p.colors.ringColor }"></i>
                  <i :style="{ background: p.colors.buttonColor }"></i>
                </span>
                <span class="preset-name">{{ p.name }}</span>
              </button>
            </div>

            <h3 class="sec">配色（支持任何 CSS 颜色，可用取色器）</h3>
            <div class="grid">
              <div class="color-item"><el-color-picker v-model="configForm.pageBgColor" /><span>页面背景</span></div>
              <div class="color-item"><el-color-picker v-model="configForm.titleColor" /><span>标题颜色</span></div>
              <div class="color-item"><el-color-picker v-model="configForm.ringColor" /><span>转盘外圈</span></div>
              <div class="color-item"><el-color-picker v-model="configForm.buttonColor" /><span>按钮颜色</span></div>
              <div class="color-item"><el-color-picker v-model="configForm.buttonTextColor" /><span>按钮文字</span></div>
              <div class="color-item"><el-color-picker v-model="configForm.textColor" /><span>扇区文字</span></div>
            </div>
            <div class="sector-colors">
              <div class="sc-head">
                <span>扇区底色轮换（奖品未单独设色时按顺序循环）</span>
                <el-button text type="primary" :icon="Plus" @click="configForm.sectorColors.push('#ffffff')">添加</el-button>
              </div>
              <div v-for="(c, i) in configForm.sectorColors" :key="i" class="sc-row">
                <el-color-picker v-model="configForm.sectorColors[i]" />
                <el-input v-model="configForm.sectorColors[i]" placeholder="#ffffff 或任意 CSS 颜色" />
                <el-button text type="danger" :icon="Delete" @click="configForm.sectorColors.splice(i, 1)" />
              </div>
            </div>
            <el-form-item label="背景渐变（可选，CSS background 值，非空时优先于页面背景纯色）" class="bg-field">
              <el-input v-model="configForm.pageBgGradient" placeholder="例：linear-gradient(168deg,#1e1b4b,#5b21b6)，留空用纯色背景" clearable />
            </el-form-item>
            <el-form-item label="背景图（可选，设置后替代纯色背景）" class="bg-field">
              <div class="inline">
                <el-input v-model="configForm.backgroundImage" placeholder="留空使用纯色；支持图片链接或上传" />
                <el-button :icon="Upload" @click="pickBackground">上传</el-button>
                <el-button @click="configForm.backgroundImage = ''">清除</el-button>
                <input ref="bgFileRef" type="file" accept="image/*" hidden @change="onBackgroundFile" />
              </div>
            </el-form-item>
            <div class="save-row">
              <el-button type="primary" size="large" round @click="saveSettings">保存活动配置</el-button>
            </div>
          </section>

          <!-- 奖品管理 -->
          <section v-show="tab === 'prizes'" class="glass card">
            <div class="table-head">
              <h3 class="sec">奖品列表（{{ prizeList.length }} 个，顺序即转盘顺序）</h3>
              <div>
                <el-button :icon="Plus" @click="addPrize">添加奖品</el-button>
                <el-button type="primary" @click="savePrizes">保存奖品</el-button>
              </div>
            </div>
            <el-table :data="prizeList" row-key="id" class="dark-table">
              <el-table-column label="顺序" width="96" align="center">
                <template #default="{ $index }">
                  <el-button-group>
                    <el-button size="small" :icon="Top" :disabled="$index === 0" @click="movePrize($index, -1)" />
                    <el-button size="small" :icon="Bottom" :disabled="$index === prizeList.length - 1" @click="movePrize($index, 1)" />
                  </el-button-group>
                </template>
              </el-table-column>
              <el-table-column label="奖品名称（可换行）" min-width="210">
                <template #default="{ row }">
                  <el-input v-model="row.name" type="textarea" :autosize="{ minRows: 1, maxRows: 3 }" placeholder="如：500元\n购物补贴" />
                </template>
              </el-table-column>
              <el-table-column label="图片" width="168">
                <template #default="{ row }">
                  <div class="img-cell">
                    <el-image
                      v-if="row.image"
                      :src="row.image"
                      fit="contain"
                      class="thumb"
                      :preview-src-list="[row.image]"
                      preview-teleported
                    />
                    <el-upload :show-file-list="false" :auto-upload="false" accept="image/*" :on-change="(f) => onPrizeImage(row, f)">
                      <el-button size="small" text type="primary">传图</el-button>
                    </el-upload>
                    <el-button v-if="row.image" size="small" text type="danger" @click="row.image = ''">×</el-button>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="份数" width="130">
                <template #default="{ row }">
                  <el-input-number v-model="row.count" :min="0" :max="99999" size="small" controls-position="right" style="width: 106px" />
                </template>
              </el-table-column>
              <el-table-column label="权重" width="130">
                <template #default="{ row }">
                  <el-input-number v-model="row.weight" :min="1" :max="999" size="small" controls-position="right" style="width: 106px" />
                </template>
              </el-table-column>
              <el-table-column label="扇区底色" width="86" align="center">
                <template #default="{ row }"><el-color-picker v-model="row.color" /></template>
              </el-table-column>
              <el-table-column label="文字颜色" width="86" align="center">
                <template #default="{ row }"><el-color-picker v-model="row.fontColor" /></template>
              </el-table-column>
              <el-table-column label="操作" width="76" align="center">
                <template #default="{ $index }">
                  <el-button size="small" type="danger" text @click="removePrize($index)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
            <p class="hint">
              份数 = 该奖品可被抽中的次数（重复奖品就填大一点的份数）；权重为附加倍率，默认 1 即可；颜色留空自动配色。九宫格款式最多展示 8 个奖品。
            </p>
          </section>

          <!-- 抽奖记录 -->
          <section v-show="tab === 'records'" class="glass card">
            <div class="table-head">
              <h3 class="sec">本轮抽奖记录（共 {{ records.length }} 次）</h3>
              <div>
                <el-button :icon="RefreshRight" @click="loadRecords">刷新</el-button>
                <el-button type="primary" plain @click="exportCsv">导出 CSV</el-button>
                <el-button type="danger" plain @click="resetRound">重置本轮</el-button>
              </div>
            </div>
            <el-table :data="records" class="dark-table" max-height="560">
              <el-table-column label="#" type="index" width="64" align="center" />
              <el-table-column label="时间" width="200">
                <template #default="{ row }">{{ fmtTime(row.time) }}</template>
              </el-table-column>
              <el-table-column label="抽中奖品">
                <template #default="{ row }">
                  <el-tag effect="dark" round>{{ row.prizeName }}</el-tag>
                </template>
              </el-table-column>
              <template #empty>本轮还没有抽奖记录</template>
            </el-table>
            <p class="hint">重置会清空本轮记录、恢复全部抽奖次数和奖品库存，操作前可先导出 CSV。</p>
          </section>

          <!-- 备份恢复 -->
          <section v-show="tab === 'backup'" class="glass card">
            <h3 class="sec">配置备份与恢复</h3>
            <p class="hint">
              全部数据存在服务器 data/ 目录的 JSON 文件里，升级或迁移时整目录拷走即可。<br />
              也可以在这里导出 JSON 备份，或把改好的 JSON 导入回来（支持先在本地改好再上传）。
            </p>
            <div class="save-row">
              <el-button type="primary" size="large" round @click="exportBackup">导出全部配置（JSON）</el-button>
              <el-button size="large" round @click="importFileRef.click()">导入配置（JSON）</el-button>
              <input ref="importFileRef" type="file" accept=".json,application/json" hidden @change="onImportFile" />
            </div>
          </section>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<style scoped>
.console {
  min-height: 100%;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(1100px 640px at 82% -10%, rgba(100, 116, 139, 0.14), transparent 60%),
    radial-gradient(900px 600px at -10% 110%, rgba(70, 86, 110, 0.16), transparent 60%),
    #12151a;
  color: var(--el-text-color-primary);
  /* Element Plus 品牌色定制（中性蓝灰） */
  --el-color-primary: #64748b;
  --el-color-primary-light-3: #929daa;
  --el-color-primary-light-5: #b1b9c5;
  --el-color-primary-light-7: #d1d6e0;
  --el-color-primary-light-8: #e0e3e8;
  --el-color-primary-light-9: #eff1f3;
  --el-color-primary-dark-2: #505d6f;
  --el-border-color: rgba(255, 255, 255, 0.14);
  --el-border-color-light: rgba(255, 255, 255, 0.1);
  --el-border-color-lighter: rgba(255, 255, 255, 0.08);
  --el-fill-color-blank: rgba(255, 255, 255, 0.04);
  --el-fill-color-light: rgba(255, 255, 255, 0.07);
}
.particles-layer {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}
.glow {
  position: fixed;
  border-radius: 50%;
  filter: blur(90px);
  opacity: 0.35;
  pointer-events: none;
  z-index: 0;
}
.glow.g1 {
  width: 420px;
  height: 420px;
  right: -120px;
  top: -140px;
  background: #46566e;
}
.glow.g2 {
  width: 380px;
  height: 380px;
  left: -140px;
  bottom: -160px;
  background: #2c3646;
}

.glass {
  background: rgba(255, 255, 255, 0.055);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

/* —— 登录 —— */
.login-wrap {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  perspective: 900px;
}
.checking {
  color: rgba(255, 255, 255, 0.6);
}
.login-card {
  width: min(92vw, 380px);
  border-radius: 22px;
  padding: 40px 38px 30px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 14px;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.45);
  transition: transform 0.35s ease;
  transform-style: preserve-3d;
}
.login-card:hover {
  transform: rotateX(2.5deg) rotateY(-2.5deg) translateY(-4px);
}
.login-logo {
  font-size: 54px;
  animation: logofloat 2.4s ease-in-out infinite;
}
@keyframes logofloat {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}
.login-card h1 {
  font-size: 26px;
  letter-spacing: 4px;
  background: linear-gradient(180deg, #ffffff, #c3cddd 70%, #9dacc4);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.login-card .sub {
  color: rgba(255, 255, 255, 0.55);
  font-size: 13px;
  letter-spacing: 6px;
  margin-top: -8px;
}
.login-btn {
  width: 100%;
  letter-spacing: 6px;
  text-indent: 6px;
}
.back {
  color: rgba(255, 255, 255, 0.45);
  font-size: 13px;
  text-decoration: none;
}
.back:hover {
  color: rgba(255, 255, 255, 0.8);
}

/* —— 控制台 —— */
.shell {
  position: relative;
  z-index: 1;
  min-height: 100vh;
}
.aside {
  display: flex;
  flex-direction: column;
  border-radius: 0 18px 18px 0;
  min-height: 100vh;
}
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 22px 18px 16px;
}
.brand .logo {
  font-size: 34px;
}
.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}
.brand-text b {
  font-size: 17px;
  letter-spacing: 2px;
  color: #e8ecf2;
}
.brand-text small {
  color: rgba(255, 255, 255, 0.45);
  font-size: 11px;
  letter-spacing: 3px;
}
.menu {
  border-right: none;
  background: transparent;
  flex: 1;
}
.menu :deep(.el-menu-item) {
  color: rgba(255, 235, 235, 0.72);
  border-radius: 12px;
  margin: 5px 12px;
  height: 46px;
  border: 1px solid transparent;
}
.menu :deep(.el-menu-item:hover) {
  background: rgba(255, 255, 255, 0.06);
}
.menu :deep(.el-menu-item.is-active) {
  background: linear-gradient(90deg, rgba(100, 116, 139, 0.32), rgba(100, 116, 139, 0.08));
  border-color: rgba(140, 155, 180, 0.4);
  color: #dfe5ee;
}
.aside-foot {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.aside-foot :deep(.el-button) {
  color: rgba(255, 255, 255, 0.55);
  justify-content: flex-start;
}

.tophead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 16px;
  margin: 14px 14px 0;
}
.tophead h2 {
  font-size: 17px;
  letter-spacing: 3px;
  color: #e8ecf2;
}
.who {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.18);
  padding: 4px 12px;
  border-radius: 999px;
}

.main {
  padding: 14px;
  overflow: visible;
}
.card {
  border-radius: 18px;
  padding: 22px 24px;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.35);
}
.sec {
  font-size: 14px;
  color: rgba(226, 232, 240, 0.8);
  letter-spacing: 2px;
  margin: 6px 0 14px;
  font-weight: 600;
}
.preset-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 18px;
}
.preset {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 7px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  transition: transform 0.15s ease, border-color 0.15s ease;
}
.preset:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.32);
}
.preset .chips {
  display: flex;
  gap: 4px;
}
.preset .chips i {
  width: 16px;
  height: 16px;
  border-radius: 5px;
  border: 1px solid rgba(255, 255, 255, 0.18);
}
.preset-name {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.72);
  letter-spacing: 1px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 4px 18px;
}
.grid :deep(.el-form-item) {
  margin-bottom: 14px;
}
.grid .span2 {
  grid-column: span 2;
}
.switch-row {
  display: flex;
  gap: 30px;
  margin: 4px 0 10px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
}
.color-item {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  color: rgba(255, 255, 255, 0.75);
  font-size: 13px;
}
.sector-colors {
  margin-bottom: 14px;
}
.sc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: rgba(255, 255, 255, 0.65);
  font-size: 13px;
  margin-bottom: 8px;
}
.sc-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  max-width: 420px;
}
.inline {
  display: flex;
  gap: 10px;
  width: 100%;
}
.inline .el-input {
  flex: 1;
}
.bg-field {
  margin-top: 6px;
  max-width: 640px;
}
.save-row {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.table-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
}
.table-head .sec {
  margin: 0;
}
.dark-table {
  width: 100%;
  --el-table-border-color: rgba(255, 255, 255, 0.08);
  --el-table-header-bg-color: rgba(255, 255, 255, 0.04);
  --el-table-tr-bg-color: transparent;
  --el-table-header-text-color: rgba(255, 255, 255, 0.55);
  border-radius: 12px;
  overflow: hidden;
}
.img-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}
.img-cell .thumb {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
}
.hint {
  color: rgba(255, 255, 255, 0.45);
  font-size: 12.5px;
  line-height: 1.8;
  margin-top: 12px;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
