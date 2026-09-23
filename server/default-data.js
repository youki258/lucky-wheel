// 默认种子数据 —— 首次启动且 data/ 目录为空时写入。
// 之后所有内容都存在 data/*.json 里，通过管理后台或直接改文件更新，代码无需改动。

export const defaultConfig = {
  // —— 文案 ——
  title: '欧气大转盘',
  subtitle: '转发这份欧气，下一个锦鲤就是你',
  buttonText: '马上开抽',
  centerText: 'GO',
  remainingText: '剩余抽奖次数：{n}',
  finishedText: '欧气用完啦，明天再来吸一口',
  stockEmptyText: '奖品被抢光了，手慢无',
  resultTemplate: '恭喜抽中\n{prize}',
  resultButtonText: '接好运',
  gridFillText: '谢谢参与',

  // —— 规则 ——
  theme: 'wheel', // wheel=大转盘 grid=九宫格 slot=老虎机
  totalDrawLimit: 12, // 本轮总抽奖次数上限
  animationDuration: 3, // 抽奖动画时长（秒）
  soundEnabled: true,
  showRemaining: true,

  // —— 配色（默认「霓虹派对」：深夜蓝绿 + 青粉霓虹 + 糖果扇区；后台可一键切换预设或自定义）——
  pageBgColor: '#042f2e',
  pageBgGradient: 'linear-gradient(168deg,#042f2e 0%,#0f172a 48%,#1e1b4b 100%)', // 可选，非空时优先于纯色
  titleColor: '#5eead4',
  subtitleColor: '#f0abfc',
  ringColor: '#f472b6',
  buttonColor: '#2dd4bf',
  buttonTextColor: '#042f2e',
  textColor: '#0f172a',
  sectorColors: ['#ffffff', '#ccfbf1', '#fce7f3', '#e0f2fe'],
  backgroundImage: '', // 可选：http(s) 链接或 dataURL，设置后替代纯色背景
}

export const defaultPrizes = [
  { id: 'mac', name: 'MacBook\nPro', image: '', count: 1, weight: 1, color: '', fontColor: '' },
  { id: 'cash', name: '888元\n红包', image: '', count: 2, weight: 1, color: '', fontColor: '' },
  { id: 'leave', name: '带薪假\n1天', image: '', count: 3, weight: 2, color: '', fontColor: '' },
  { id: 'milktea', name: '奶茶\n月卡', image: '', count: 5, weight: 3, color: '', fontColor: '' },
  { id: 'snack', name: '零食\n大礼包', image: '', count: 8, weight: 5, color: '', fontColor: '' },
]
