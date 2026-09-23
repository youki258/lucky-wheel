// tsParticles 预设：抽奖页青粉霓虹粒子徐徐上升；后台稀疏微光粒子
export const drawParticles = {
  fullScreen: { enable: false },
  fpsLimit: 60,
  detectRetina: true,
  particles: {
    number: { value: 46, density: { enable: true, width: 1200, height: 800 } },
    color: { value: ['#5eead4', '#f0abfc', '#ffffff', '#67e8f9'] },
    shape: { type: 'circle' },
    opacity: {
      value: { min: 0.08, max: 0.5 },
      animation: { enable: true, speed: 0.5, sync: false, startValue: 'random' },
    },
    size: { value: { min: 1, max: 3.2 } },
    move: {
      enable: true,
      speed: 0.5,
      direction: 'top',
      random: true,
      straight: false,
      outModes: { default: 'out' },
    },
  },
}

export const adminParticles = {
  fullScreen: { enable: false },
  fpsLimit: 45,
  detectRetina: true,
  particles: {
    number: { value: 20, density: { enable: true, width: 1400, height: 900 } },
    color: { value: ['#5eead4', '#f0abfc', '#a5f3fc'] },
    shape: { type: 'circle' },
    opacity: {
      value: { min: 0.05, max: 0.35 },
      animation: { enable: true, speed: 0.4, sync: false, startValue: 'random' },
    },
    size: { value: { min: 0.8, max: 2.4 } },
    move: {
      enable: true,
      speed: 0.28,
      direction: 'none',
      random: true,
      straight: false,
      outModes: { default: 'out' },
    },
  },
}
