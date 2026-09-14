// 默认种子数据 —— 首次启动且 data/ 目录为空时写入。
// 之后所有内容都存在 data/*.json 里，通过管理后台或直接改文件更新，代码无需改动。

export const defaultConfig = {
  // —— 文案 ——
  title: '幸运抽奖',
  subtitle: '点击下方按钮开始抽奖',
  buttonText: '立即抽奖',
  centerText: '抽',
  remainingText: '剩余抽奖次数：{n}',
  finishedText: '抽奖次数已用完，请联系主持人重置',
  stockEmptyText: '奖品已被抽完啦',
  resultTemplate: '恭喜抽中\n{prize}',
  resultButtonText: '开心收下',
  gridFillText: '谢谢参与',

  // —— 规则 ——
  theme: 'wheel', // wheel=大转盘 grid=九宫格 slot=老虎机
  totalDrawLimit: 10, // 本轮总抽奖次数上限
  animationDuration: 3, // 抽奖动画时长（秒）
  soundEnabled: true,
  showRemaining: true,

  // —— 配色（默认「星夜鎏金」：暗夜紫蓝渐变 + 鎏金；后台可一键切换预设或自定义）——
  pageBgColor: '#1e1b4b',
  pageBgGradient: 'linear-gradient(168deg,#1e1b4b 0%,#3730a3 48%,#6d28d9 100%)', // 可选，非空时优先于纯色
  titleColor: '#ffd76e',
  subtitleColor: '#c4b5fd',
  ringColor: '#e6a23c',
  buttonColor: '#ffb648',
  buttonTextColor: '#4a2500',
  textColor: '#6b4a12',
  sectorColors: ['#fffdf4', '#ffedc2'],
  backgroundImage: '', // 可选：http(s) 链接或 dataURL，设置后替代纯色背景
}

export const defaultPrizes = [
  { id: 'usb', name: 'U盘', image: '', count: 1, weight: 1, color: '', fontColor: '' },
  { id: 'bag', name: '帆布袋', image: '', count: 1, weight: 1, color: '', fontColor: '' },
  { id: 'pen', name: '笔', image: '', count: 2, weight: 1, color: '', fontColor: '' },
  { id: 'book', name: '本子', image: '', count: 2, weight: 1, color: '', fontColor: '' },
]
