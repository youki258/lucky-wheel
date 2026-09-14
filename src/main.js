import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import VueParticles from '@tsparticles/vue3'
import { loadSlim } from '@tsparticles/slim'
import 'animate.css'
import App from './App.vue'
import DrawPage from './pages/DrawPage.vue'
import AdminPage from './pages/AdminPage.vue'
import './style.css'

const router = createRouter({
  // hash 模式：部署在任何反代后面都不需要额外配置
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: DrawPage },
    { path: '/admin', component: AdminPage },
  ],
})

createApp(App)
  .use(router)
  .use(ElementPlus, { locale: zhCn })
  .use(VueParticles, {
    init: async (engine) => {
      await loadSlim(engine)
    },
  })
  .mount('#app')
