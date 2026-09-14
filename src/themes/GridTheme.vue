<script setup>
// 主题：九宫格（3x3，外圈 8 格，中间是抽奖按钮）
// 奖品数超过 8 时只展示前 8 个（README 有说明）；不足 8 个用 config.gridFillText 补位
import { computed, ref } from 'vue'
import { LuckyGrid } from '@lucky-canvas/vue'

const props = defineProps({
  prizes: { type: Array, required: true },
  config: { type: Object, required: true },
})
const emit = defineEmits(['draw', 'end'])

const lucky = ref(null)

// 顺时针外圈格子坐标
const CELL_XY = [
  [0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [1, 2], [0, 2], [0, 1],
]

// 把 n 个奖品尽量均匀摆到 8 个格子上，其余格子用补位文案
const cellPrizeIndex = computed(() => {
  const n = props.prizes.length
  const cells = new Array(8).fill(-1)
  if (n === 0) return cells
  if (n >= 8) {
    for (let i = 0; i < 8; i++) cells[i] = i
    return cells
  }
  const used = new Set()
  for (let i = 0; i < n; i++) {
    let pos = Math.round((i * 8) / n)
    while (used.has(pos)) pos = (pos + 1) % 8
    used.add(pos)
    cells[pos] = i
  }
  return cells
})

// 格子内的多行文字：按 \n 拆成多段字体逐行渲染（九宫格不支持单条文本内换行）
// 字号分级：单行无图 20px，多行/带图缩小防溢出
function nameFonts(name, color, withImage) {
  const lines = String(name).split('\n').filter(Boolean).slice(0, 3)
  const tops = withImage
    ? lines.map((_, i) => `${52 + i * 15}%`)
    : lines.length > 1
      ? lines.map((_, i) => `${26 + i * 19}%`)
      : ['40%']
  return lines.map((text, i) => ({
    text,
    top: tops[i],
    fontSize: withImage || lines.length > 1 ? '15px' : '20px',
    fontColor: color,
    fontWeight: 600,
    lineHeight: '1.2',
  }))
}

// 把颜色往白色调淡（canvas 不认 color-mix，手动算 hex）
function tint(hex, ratio) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''))
  if (!m) return hex
  const n = parseInt(m[1], 16)
  const ch = (v) => Math.round(v + (255 - v) * ratio)
  return '#' + ((1 << 24) | (ch((n >> 16) & 255) << 16) | (ch((n >> 8) & 255) << 8) | ch(n & 255)).toString(16).slice(1)
}

const luckyPrizes = computed(() =>
  cellPrizeIndex.value.map((prizeIdx, cell) => {
    const [x, y] = CELL_XY[cell]
    if (prizeIdx < 0) {
      return {
        x,
        y,
        // 补位格：底色/文字都调浅，视觉退后突出真奖品
        background: tint(props.config.sectorColors[cell % props.config.sectorColors.length], 0.45),
        fonts: [{ text: props.config.gridFillText, fontSize: '15px', fontColor: tint(props.config.textColor, 0.35), fontWeight: 500, top: '40%' }],
      }
    }
    const p = props.prizes[prizeIdx]
    return {
      x,
      y,
      background: p.bgColor,
      fonts: nameFonts(p.name, p.fontColor || props.config.textColor, Boolean(p.image)),
      imgs: p.image ? [{ src: p.image, width: '38%', top: '7%' }] : undefined,
    }
  })
)

const buttons = computed(() => [
  {
    x: 1,
    y: 1,
    background: props.config.buttonColor,
    fonts: [
      { text: props.config.centerText, fontSize: '36px', fontColor: props.config.buttonTextColor, fontWeight: 700 },
    ],
  },
])

const blocks = computed(() => [{ padding: '3%', background: props.config.ringColor }])

const defaultConfig = computed(() => {
  const total = Math.max(1, props.config.animationDuration) * 1000
  return { speed: 40, accelerationTime: total * 0.5, decelerationTime: total * 0.5 }
})

function play() {
  lucky.value?.play()
}
// 奖品下标 → 展示格子下标（奖品超过 8 个时可能不在盘上，回落到 0 格）
function stop(prizeIndex) {
  const cell = cellPrizeIndex.value.indexOf(prizeIndex)
  lucky.value?.stop(cell >= 0 ? cell : 0)
}

defineExpose({ play, stop })
</script>

<template>
  <LuckyGrid
    ref="lucky"
    class="lucky"
    :prizes="luckyPrizes"
    :buttons="buttons"
    :blocks="blocks"
    :default-config="defaultConfig"
    :default-style="{ gutter: '6px' }"
    :active-style="{ background: config.buttonColor, fontColor: config.buttonTextColor }"
    @start="emit('draw')"
    @end="emit('end')"
  />
</template>

<style scoped>
.lucky {
  width: 100%;
  height: 100%;
}
</style>
