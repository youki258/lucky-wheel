<script setup>
// 主题：老虎机（单排垂直滚轮，滚动的就是奖品列表）
// 关键约束（lucky-canvas SlotMachine 特性）：
//  1. 格子永远是正方形（边长 = 机器宽度），机器高度只是"取景窗"
//  2. 取景窗永远对准格子中部 → 文字必须画在格子垂直居中处才能保证可见
//  3. 滚轮宽度要 ≤ 取景窗高度，整个格子才完整可见
import { computed, ref } from 'vue'
import { SlotMachine } from '@lucky-canvas/vue'

const props = defineProps({
  prizes: { type: Array, required: true },
  config: { type: Object, required: true },
})
const emit = defineEmits(['draw', 'end'])

const lucky = ref(null)

// 画布 fillStyle 不认 color-mix()，手动把 ringColor 调浅做格子底色
function tint(hex, ratio) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''))
  if (!m) return undefined
  const n = parseInt(m[1], 16)
  const ch = (v) => Math.round(v + (255 - v) * ratio)
  const r = ch((n >> 16) & 255), g = ch((n >> 8) & 255), b = ch(n & 255)
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)
}

const luckyPrizes = computed(() =>
  props.prizes.map((p, i) => {
    // 按 \n 拆行（wordWrap 会吞掉换行符）；字号 26px 适配大格子
    const lines = String(p.name).split('\n').filter(Boolean).slice(0, 3)
    return {
      // 管理员单奖品自定义色优先；否则用 ringColor 调浅交替，保证格子间有对比
      // （sectorColors 是为转盘扇区设计的近白色，直接当格子底色会白成一片）
      background: p.color || (i % 2 ? tint(props.config.ringColor, 0.72) : '#ffffff'),
      fonts: lines.map((text, li) => ({
        text,
        top: p.image
          ? `${46 + li * 15}%`
          : lines.length > 1
            ? `${34 + li * 16}%`
            : '42%',
        fontSize: '26px',
        fontColor: p.fontColor || props.config.textColor,
        fontWeight: 600,
        lineHeight: '34px',
      })),
      imgs: p.image ? [{ src: p.image, width: '34%', top: '8%' }] : undefined,
    }
  })
)

const slots = computed(() => [
  { order: props.prizes.map((_, i) => i) },
])

const blocks = computed(() => [
  { padding: '4%', background: props.config.ringColor, borderRadius: '16px' },
])

const defaultConfig = computed(() => {
  const total = Math.max(1, props.config.animationDuration) * 1000
  return {
    mode: 'vertical',
    speed: 24,
    accelerationTime: total * 0.5,
    decelerationTime: total * 0.5,
    rowSpacing: '8px',
  }
})

function play() {
  lucky.value?.play()
}
function stop(prizeIndex) {
  lucky.value?.stop(prizeIndex)
}

defineExpose({ play, stop })
</script>

<template>
  <div class="slot-wrap">
    <div class="reel">
      <SlotMachine
        ref="lucky"
        class="lucky"
        :prizes="luckyPrizes"
        :slots="slots"
        :blocks="blocks"
        :default-config="defaultConfig"
        :default-style="{ borderRadius: '12px' }"
        @end="emit('end')"
      />
    </div>
  </div>
</template>

<style scoped>
.slot-wrap {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
/* 单排滚轮：窄而高，格子 = 宽度 ≤ 取景窗高度，格子完整可见 */
.reel {
  width: min(100%, 46vh, 336px);
  height: 100%;
}
.lucky {
  width: 100%;
  height: 100%;
}
</style>
