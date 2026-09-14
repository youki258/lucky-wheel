// 色彩预设 v2 —— 方向：比旧马卡龙系更饱和、更有对比；默认走「暗夜 + 鎏金」的
// 现代抽奖大屏风（梯度背景 + 金色外圈 + 奶油扇区），其余预设覆盖浅色鲜活系与暗色系。
// pageBgGradient 是可选的 CSS background 值（支持渐变），非空时优先于 pageBgColor 纯色。
// 点击应用到表单（同时清除奖品的自定义颜色，恢复自动配色），保存后生效；应用后仍可继续微调。
export const themePresets = [
  {
    name: '星夜鎏金',
    colors: {
      pageBgColor: '#1e1b4b',
      pageBgGradient: 'linear-gradient(168deg,#1e1b4b 0%,#3730a3 48%,#6d28d9 100%)',
      titleColor: '#ffd76e',
      subtitleColor: '#c4b5fd',
      ringColor: '#e6a23c',
      buttonColor: '#ffb648',
      buttonTextColor: '#4a2500',
      textColor: '#6b4a12',
      sectorColors: ['#fffdf4', '#ffedc2'],
    },
  },
  {
    name: '靛蓝极光',
    colors: {
      pageBgColor: '#eef2ff',
      pageBgGradient: 'linear-gradient(170deg,#eef2ff 0%,#e0e7ff 100%)',
      titleColor: '#4338ca',
      subtitleColor: '#818cf8',
      ringColor: '#a5b4fc',
      buttonColor: '#6366f1',
      buttonTextColor: '#ffffff',
      textColor: '#312e81',
      sectorColors: ['#ffffff', '#e8ebff'],
    },
  },
  {
    name: '薄荷汽水',
    colors: {
      pageBgColor: '#ecfdf5',
      pageBgGradient: 'linear-gradient(165deg,#ecfdf5 0%,#a7f3d0 100%)',
      titleColor: '#047857',
      subtitleColor: '#0d9488',
      ringColor: '#6ee7b7',
      buttonColor: '#10b981',
      buttonTextColor: '#ffffff',
      textColor: '#065f46',
      sectorColors: ['#ffffff', '#e6f9f1'],
    },
  },
  {
    name: '蜜桃气泡',
    colors: {
      pageBgColor: '#fff1f2',
      pageBgGradient: 'linear-gradient(165deg,#ffe4e6 0%,#fecdd3 100%)',
      titleColor: '#be123c',
      subtitleColor: '#fb7185',
      ringColor: '#fda4af',
      buttonColor: '#f43f5e',
      buttonTextColor: '#ffffff',
      textColor: '#881337',
      sectorColors: ['#ffffff', '#fff1f2'],
    },
  },
  {
    name: '深海蓝调',
    colors: {
      pageBgColor: '#0f172a',
      pageBgGradient: 'linear-gradient(168deg,#020617 0%,#0c4a6e 55%,#0e7490 100%)',
      titleColor: '#7dd3fc',
      subtitleColor: '#94a3b8',
      ringColor: '#0ea5e9',
      buttonColor: '#fbbf24',
      buttonTextColor: '#422006',
      textColor: '#dbeafe',
      sectorColors: ['#16283e', '#1f3a5f'],
    },
  },
  {
    name: '暖阳蜜橘',
    colors: {
      pageBgColor: '#fff7ed',
      pageBgGradient: 'linear-gradient(165deg,#fff7ed 0%,#fed7aa 100%)',
      titleColor: '#c2410c',
      subtitleColor: '#fb923c',
      ringColor: '#fdba74',
      buttonColor: '#f97316',
      buttonTextColor: '#ffffff',
      textColor: '#7c2d12',
      sectorColors: ['#ffffff', '#fff5e6'],
    },
  },
]
