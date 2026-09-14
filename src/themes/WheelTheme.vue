<script setup>
// 主题：大转盘（仿营销活动转盘）
// 契约：props 传入展示奖品（已带 bgColor）与全局配置；expose play()/stop(奖品下标)；事件 draw/end
import { computed, ref } from 'vue'
import { LuckyWheel } from '@lucky-canvas/vue'

const props = defineProps({
  prizes: { type: Array, required: true }, // [{ id, name, image, bgColor }]
  config: { type: Object, required: true },
})
const emit = defineEmits(['draw', 'end'])

const lucky = ref(null)

// 单奖品时复制一份展示，保证转盘至少两个扇区（中奖逻辑不受影响）
const display = computed(() =>
  props.prizes.length === 1 ? [props.prizes[0], props.prizes[0]] : props.prizes
)

function sectorFont(count) {
  if (count > 12) return '14px'
  if (count > 8) return '17px'
  return '20px'
}

// 按 \n 拆行：canvas wordWrap 会吞掉换行符，必须拆成多段字体逐行画
const nameLines = (name) => String(name).split('\n').filter(Boolean).slice(0, 3)

const luckyPrizes = computed(() =>
  display.value.map((p) => ({
    background: p.bgColor,
    fonts: nameLines(p.name).map((text, i) => ({
      text,
      top: p.image
        ? `${56 + i * 14}%` // 带图：文字在图下方
        : nameLines(p.name).length > 1
          ? `${16 + i * 16}%`
          : '26%',
      fontSize: sectorFont(display.value.length),
      fontColor: p.fontColor || props.config.textColor,
      fontWeight: 600,
      lineHeight: '1.2',
    })),
    imgs: p.image ? [{ src: p.image, width: '24%', top: '10%' }] : undefined,
  }))
)

const blocks = computed(() => [
  { padding: '5%', background: props.config.ringColor },
  { padding: '1.2%', background: props.config.sectorColors[0] || '#ffffff' },
])

const buttons = computed(() => [
  {
    radius: '26%',
    background: props.config.buttonColor,
    fonts: [
      {
        text: props.config.centerText,
        top: '-18px',
        fontSize: '32px',
        fontColor: props.config.buttonTextColor,
        fontWeight: 700,
      },
    ],
  },
])

const defaultConfig = computed(() => {
  const total = Math.max(1, props.config.animationDuration) * 1000
  return {
    speed: 30,
    accelerationTime: total * 0.5,
    decelerationTime: total * 0.5,
    stopRange: 0,
  }
})

// draw 结果的奖品下标 → 展示扇区下标（单奖品复制时恒为 0）
function stop(prizeIndex) {
  lucky.value?.stop(prizeIndex >= display.value.length - 1 ? display.value.length - 1 : prizeIndex)
}
function play() {
  lucky.value?.play()
}

defineExpose({ play, stop })
</script>

<template>
  <div class="wheel-wrap">
    <LuckyWheel
      ref="lucky"
      class="lucky"
      :prizes="luckyPrizes"
      :blocks="blocks"
      :buttons="buttons"
      :default-config="defaultConfig"
      @start="emit('draw')"
      @end="emit('end')"
    />
    <div class="pointer" :style="{ borderTopColor: config.ringColor }"></div>
  </div>
</template>

<style scoped>
.wheel-wrap {
  position: relative;
  width: 100%;
  height: 100%;
}
.lucky {
  width: 100%;
  height: 100%;
}
.pointer {
  position: absolute;
  top: 1.5%;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 15px solid transparent;
  border-right: 15px solid transparent;
  border-top: 26px solid;
  filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.25));
  pointer-events: none;
}
</style>
