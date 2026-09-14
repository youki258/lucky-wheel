<script setup>
import { computed, onMounted, ref } from 'vue'
import confetti from 'canvas-confetti'
import { api } from '../api.js'
import { drawParticles } from '../particles.js'
import WheelTheme from '../themes/WheelTheme.vue'
import GridTheme from '../themes/GridTheme.vue'
import SlotTheme from '../themes/SlotTheme.vue'

const THEMES = { wheel: WheelTheme, grid: GridTheme, slot: SlotTheme }

const loaded = ref(false)
const config = ref({})
const prizes = ref([])
const remaining = ref(0)
const stockEmpty = ref(false)
const finished = ref(false)
const drawing = ref(false)
const themeRef = ref(null)
const result = ref(null)
const showModal = ref(false)

const themeComp = computed(() => THEMES[config.value.theme] || WheelTheme)

// 扇区底色：奖品自带 color 优先，否则按配置色轮换；
// 库存（left）归零的奖品直接从盘面消失——抽到即不再出现
const displayPrizes = computed(() => {
  const colors = config.value.sectorColors?.length ? config.value.sectorColors : ['#ffffff']
  return prizes.value
    .filter((p) => (p.left ?? 1) > 0)
    .map((p, i) => ({ ...p, bgColor: p.color || colors[i % colors.length] }))
})

const canDraw = computed(() => loaded.value && remaining.value > 0 && !stockEmpty.value && !drawing.value)
const remainingText = computed(() => String(config.value.remainingText || '').replace('{n}', remaining.value))

// 页面背景：背景图 > 渐变（pageBgGradient，CSS background 值）> 纯色
const pageStyle = computed(() =>
  config.value.backgroundImage
    ? { backgroundImage: `url(${config.value.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: config.value.pageBgGradient || config.value.pageBgColor || '#8f1f1b' }
)
const hasBgImage = computed(() => Boolean(config.value.backgroundImage))

// 根级 CSS 变量：角落“管理”链接用标题色（深浅两色背景都可见）
const rootVars = computed(() => ({ '--link': config.value.titleColor || '#666666' }))

// 标题颜色：从配置的标题色派生渐变（适配任何色系）
const titleStyle = computed(() => {
  const t = config.value.titleColor || '#2f4a41'
  return {
    backgroundImage: `linear-gradient(180deg, color-mix(in srgb, ${t} 60%, white) 0%, ${t} 55%, color-mix(in srgb, ${t} 76%, black) 100%)`,
    filter: 'drop-shadow(0 2px 1px rgba(0, 0, 0, 0.22))',
  }
})

// 光芒 / 灯泡颜色：从外圈色派生，浅色深色主题都协调
const rayColor = computed(() => `color-mix(in srgb, ${config.value.ringColor || '#888888'} 7%, transparent)`)
const bulbColor = computed(() => `color-mix(in srgb, ${config.value.ringColor || '#888888'} 22%, white)`)

// 转盘外框：配置外圈色 + 发光
const frameStyle = computed(() => {
  const c = config.value.ringColor || '#e8373c'
  return {
    background: `radial-gradient(circle at 50% 30%, color-mix(in srgb, ${c} 72%, white), ${c} 70%)`,
    boxShadow: `0 0 0 3px color-mix(in srgb, ${c} 60%, white) inset, 0 18px 48px rgba(0,0,0,.45), 0 0 70px color-mix(in srgb, ${c} 55%, transparent)`,
  }
})

// 灯泡跑马圈（仅大转盘主题）
const bulbs = computed(() =>
  Array.from({ length: 16 }, (_, i) => ({
    style: {
      '--bulb': bulbColor.value,
      transform: `translate(-50%, -50%) rotate(${i * (360 / 16)}deg) translateY(calc(var(--stage) * -0.5 - 12px))`,
      animationDelay: `${(i % 2) * 0.6}s`,
    },
  }))
)

// 鼠标跟随 3D 倾斜（subtle，不干扰抽奖）
const tiltStyle = ref({})
function onTilt(e) {
  const r = e.currentTarget.getBoundingClientRect()
  const dx = (e.clientX - r.left) / r.width - 0.5
  const dy = (e.clientY - r.top) / r.height - 0.5
  tiltStyle.value = {
    transform: `perspective(1100px) rotateY(${(dx * 8).toFixed(2)}deg) rotateX(${(-dy * 8).toFixed(2)}deg)`,
  }
}
function resetTilt() {
  tiltStyle.value = { transform: 'perspective(1100px) rotateY(0deg) rotateX(0deg)' }
}

// 结果弹窗：底色跟随页面基调（暗色主题=暗弹窗+亮字，浅色主题=浅弹窗+深字），边框/文字从配置派生
const modalStyle = computed(() => {
  const r = config.value.ringColor || '#888888'
  const base = config.value.pageBgColor || '#ffffff'
  return {
    background: `linear-gradient(180deg, color-mix(in srgb, ${r} 6%, ${base}), color-mix(in srgb, ${r} 16%, ${base}))`,
    borderColor: `color-mix(in srgb, ${r} 45%, ${base})`,
    color: config.value.textColor,
  }
})

// 结果文案按模板渲染，{prize} 占位符单独高亮
const resultParts = computed(() => {
  const tpl = String(config.value.resultTemplate || '{prize}')
  const name = result.value?.name || ''
  const i = tpl.indexOf('{prize}')
  if (i < 0) return { before: tpl, name: '', after: '' }
  return { before: tpl.slice(0, i), name, after: tpl.slice(i + 7) }
})

onMounted(async () => {
  try {
    await refresh()
  } finally {
    loaded.value = true
  }
})

async function refresh() {
  const data = await api.public()
  config.value = data.config
  prizes.value = data.prizes
  remaining.value = data.remaining
  stockEmpty.value = data.stockEmpty
  if (data.remaining <= 0) finished.value = true
  document.title = data.config.title || '幸运抽奖'
}

async function draw() {
  if (!canDraw.value) return
  drawing.value = true
  result.value = null
  themeRef.value?.play()
  try {
    const res = await api.draw()
    remaining.value = res.remaining
    // 等转盘动画结束后再停在结果扇区：
    // 用 prizeId 对映到“当前展示列表”的下标（库存归零的奖品已被过滤，下标会偏移）
    setTimeout(() => {
      const di = displayPrizes.value.findIndex((p) => p.id === res.prizeId)
      themeRef.value?.stop(di >= 0 ? di : 0)
    }, 60)
    result.value = res
  } catch (e) {
    drawing.value = false
    if (e.code === 'NO_DRAWS_LEFT') {
      finished.value = true
    } else if (e.code === 'STOCK_EMPTY') {
      stockEmpty.value = true
      showModal.value = true
    } else {
      themeRef.value?.stop(0)
      alert('网络异常，请重试')
    }
  }
}

function onSpinEnd() {
  if (!drawing.value) return
  drawing.value = false
  if (result.value) {
    if (remaining.value <= 0) finished.value = true
    playChime()
    burstConfetti()
    showModal.value = true
    // 动画结束后再刷新：库存归零的奖品此时从盘面消失（转盘重新渲染）
    refresh().catch(() => {})
  }
}

function closeResult() {
  showModal.value = false
  result.value = null
}

function burstConfetti() {
  try {
    const c = config.value
    const colors = [c.titleColor, c.ringColor, c.sectorColors?.[0] || '#ffffff', '#ffffff'].filter(Boolean)
    const base = { zIndex: 300, colors }
    confetti({ ...base, particleCount: 110, spread: 80, origin: { y: 0.55 }, scalar: 1.05, gravity: 0.9 })
    confetti({ ...base, particleCount: 50, angle: 60, spread: 60, origin: { x: 0, y: 0.75 } })
    confetti({ ...base, particleCount: 50, angle: 120, spread: 60, origin: { x: 1, y: 0.75 } })
  } catch { /* 视觉增强失败不影响主流程 */ }
}

let audioCtx = null
function playChime() {
  if (!config.value.soundEnabled) return
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)()
    const t = audioCtx.currentTime
    ;[659, 880].forEach((freq, i) => {
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const start = t + i * 0.13
      gain.gain.setValueAtTime(0.001, start)
      gain.gain.exponentialRampToValueAtTime(0.22, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5)
      osc.connect(gain).connect(audioCtx.destination)
      osc.start(start)
      osc.stop(start + 0.55)
    })
  } catch { /* 浏览器不支持时静默 */ }
}
</script>

<template>
  <div class="draw-page" :class="{ 'with-bg': hasBgImage }" :style="[pageStyle, rootVars]">
    <!-- 装饰层：旋转光芒 + 金色粒子 + 暗角（颜色全部从配置派生） -->
    <div v-if="!hasBgImage" class="sunburst" :style="{ '--ray': rayColor }"></div>
    <vue-particles v-if="!hasBgImage" id="draw-particles" class="particles-layer" :options="drawParticles" />
    <div class="vignette"></div>

    <div class="content">
      <header class="head">
        <h1 class="title animate__animated animate__fadeInDown" :style="titleStyle">{{ config.title }}</h1>
        <p class="subtitle animate__animated animate__fadeInDown animate__slow" :style="{ color: config.subtitleColor }">{{ config.subtitle }}</p>
      </header>

      <main class="stage-wrap" :class="'theme-' + config.theme" @mousemove="onTilt" @mouseleave="resetTilt">
        <div class="frame" :class="{ round: config.theme === 'wheel' }" :style="[frameStyle, tiltStyle]">
          <template v-if="config.theme === 'wheel'">
            <i v-for="(b, i) in bulbs" :key="i" class="bulb" :style="b.style"></i>
          </template>
          <div class="stage">
            <component
              :is="themeComp"
              v-if="loaded"
              ref="themeRef"
              :prizes="displayPrizes"
              :config="config"
              @draw="draw"
              @end="onSpinEnd"
            />
          </div>
        </div>
      </main>

      <footer class="actions animate__animated animate__fadeInUp animate__slow">
        <p v-if="config.showRemaining && !finished" class="remaining">{{ remainingText }}</p>
        <p v-if="finished" class="finished-tip" :style="{ color: config.titleColor }">{{ config.finishedText }}</p>
        <button
          class="draw-btn"
          :class="{ disabled: !canDraw }"
          :style="canDraw
            ? {
                background: `linear-gradient(180deg, color-mix(in srgb, ${config.buttonColor} 55%, white), ${config.buttonColor} 55%, color-mix(in srgb, ${config.buttonColor} 80%, black))`,
                color: config.buttonTextColor,
                '--glow': config.buttonColor,
              }
            : {}"
          @click="draw"
        >
          {{ config.buttonText }}
        </button>
      </footer>
    </div>

    <router-link class="admin-link" to="/admin">管理</router-link>

    <div v-if="showModal" class="mask" @click.self="closeResult">
      <div class="modal animate__animated animate__bounceIn" :style="modalStyle">
        <div class="coin3d" aria-hidden="true">
          <div class="coin-inner">
            <span class="face front">🪙</span>
            <span class="face back">⭐</span>
          </div>
        </div>
        <div class="modal-text" :style="{ color: config.subtitleColor }">
          {{ resultParts.before }}<span
            class="modal-prize"
            :style="titleStyle"
          >{{ resultParts.name }}</span>{{ resultParts.after }}
        </div>
        <button
          class="modal-btn"
          :style="{
            background: `linear-gradient(180deg, color-mix(in srgb, ${config.buttonColor} 55%, white), ${config.buttonColor} 60%)`,
            color: config.buttonTextColor,
          }"
          @click="closeResult"
        >
          {{ config.resultButtonText }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.draw-page {
  --stage: min(84vw, 52vh, 480px);
  height: 100%;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.with-bg::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
}

/* 旋转光芒（颜色由 --ray 变量注入，从配置外圈色派生） */
.sunburst {
  position: absolute;
  inset: -55%;
  background: repeating-conic-gradient(
    from 0deg at 50% 50%,
    var(--ray, rgba(0, 0, 0, 0.04)) 0deg 9deg,
    transparent 9deg 22deg
  );
  animation: sunspin 70s linear infinite;
  pointer-events: none;
}
@keyframes sunspin {
  to {
    transform: rotate(360deg);
  }
}
.vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 38%, transparent 48%, rgba(0, 0, 0, 0.2) 100%);
  pointer-events: none;
}
.particles-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.content {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 26px 16px 34px;
}

.head {
  text-align: center;
}
.title {
  font-size: clamp(32px, 6.4vw, 60px);
  font-weight: 900;
  letter-spacing: 6px;
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
}
.subtitle {
  margin-top: 10px;
  font-size: clamp(14px, 2.2vw, 20px);
  letter-spacing: 2px;
}

.stage-wrap {
  margin: auto;
  padding: 6px 0;
}
.frame {
  position: relative;
  width: var(--stage);
  aspect-ratio: 1;
  padding: 18px;
  border-radius: 26px;
  transition: transform 0.25s ease-out;
  transform-style: preserve-3d;
  will-change: transform;
}
.frame.round {
  border-radius: 50%;
}

/* 灯泡跑马圈（颜色从 --bulb 派生） */
.bulb {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--bulb, #ffffff);
  box-shadow: 0 0 6px 1px var(--bulb, rgba(0, 0, 0, 0.15));
  animation: bulbblink 1.2s ease-in-out infinite;
}
@keyframes bulbblink {
  0%,
  100% {
    opacity: 0.3;
  }
  50% {
    opacity: 1;
  }
}

.stage {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 10px 22px rgba(0, 0, 0, 0.35));
}
.theme-slot .frame {
  aspect-ratio: auto;
  width: min(88vw, 560px);
  height: min(50vh, 400px);
}

.actions {
  text-align: center;
}
.remaining {
  display: inline-block;
  color: #fff;
  font-size: 16px;
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(255, 255, 255, 0.25);
  padding: 6px 20px;
  border-radius: 999px;
  margin-bottom: 14px;
  backdrop-filter: blur(2px);
}
.finished-tip {
  display: inline-block;
  font-size: 17px;
  font-weight: 600;
  background: rgba(0, 0, 0, 0.07);
  border: 1px solid rgba(0, 0, 0, 0.12);
  padding: 6px 20px;
  border-radius: 999px;
  margin-bottom: 14px;
}
.draw-btn {
  min-width: min(80vw, 400px);
  padding: 17px 46px;
  font-size: 25px;
  font-weight: 800;
  letter-spacing: 8px;
  text-indent: 8px;
  border-radius: 999px;
  box-shadow:
    0 6px 0 rgba(0, 0, 0, 0.28),
    0 0 34px color-mix(in srgb, var(--glow, #e8373c) 60%, transparent),
    inset 0 2px 0 rgba(255, 255, 255, 0.45);
  animation: btnpulse 1.6s ease-in-out infinite;
  transition: transform 0.08s ease;
}
@keyframes btnpulse {
  0%,
  100% {
    box-shadow:
      0 6px 0 rgba(0, 0, 0, 0.28),
      0 0 24px color-mix(in srgb, var(--glow, #e8373c) 45%, transparent),
      inset 0 2px 0 rgba(255, 255, 255, 0.45);
  }
  50% {
    box-shadow:
      0 6px 0 rgba(0, 0, 0, 0.28),
      0 0 46px color-mix(in srgb, var(--glow, #e8373c) 80%, transparent),
      inset 0 2px 0 rgba(255, 255, 255, 0.45);
  }
}
.draw-btn:not(.disabled):active {
  transform: translateY(3px);
}
.draw-btn.disabled {
  cursor: not-allowed;
  background: linear-gradient(180deg, #b5b5b5, #8f8f8f) !important;
  color: #f2f2f2 !important;
  animation: none;
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.2);
}

.admin-link {
  position: fixed;
  right: 14px;
  bottom: 12px;
  font-size: 13px;
  text-decoration: none;
  z-index: 2;
  color: color-mix(in srgb, var(--link, #888888) 50%, transparent);
}
.admin-link:hover {
  color: color-mix(in srgb, var(--link, #888888) 85%, transparent);
}

.mask {
  position: fixed;
  inset: 0;
  background: rgba(20, 4, 4, 0.66);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.modal {
  width: min(86vw, 380px);
  border-width: 2px;
  border-style: solid;
  border-radius: 26px;
  padding: 34px 30px 30px;
  text-align: center;
  box-shadow: 0 26px 70px rgba(0, 0, 0, 0.35), inset 0 0 0 5px rgba(255, 255, 255, 0.55);
}
/* 弹窗里的 3D 旋转金币 */
.coin3d {
  display: flex;
  justify-content: center;
  perspective: 700px;
}
.coin-inner {
  position: relative;
  width: 76px;
  height: 76px;
  transform-style: preserve-3d;
  animation: coinspin 3.4s linear infinite;
}
.coin-inner .face {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 58px;
  backface-visibility: hidden;
  filter: drop-shadow(0 6px 10px rgba(150, 90, 0, 0.35));
}
.coin-inner .face.back {
  transform: rotateY(180deg);
}
@keyframes coinspin {
  from {
    transform: rotateY(0deg);
  }
  to {
    transform: rotateY(360deg);
  }
}
.modal-text {
  color: var(--modal-text, inherit); /* 模板里注入副标题色，暗浅主题都可读 */
  white-space: pre-line;
  font-size: 19px;
  line-height: 1.6;
  margin-top: 10px;
}
.modal-prize {
  display: block;
  font-size: 42px;
  font-weight: 900;
  letter-spacing: 2px;
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  margin: 8px 0;
  white-space: pre-line;
}
.modal-btn {
  margin-top: 24px;
  padding: 13px 52px;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 4px;
  text-indent: 4px;
  border-radius: 999px;
  box-shadow: 0 5px 0 rgba(0, 0, 0, 0.18), inset 0 2px 0 rgba(255, 255, 255, 0.4);
}
</style>
