/**
 * 入口文件 —— uni-app Vue3 + Pinia
 * 说明：uni-app 编译到 H5 / 微信小程序双端，统一使用 createSSRApp 导出（uni-app 规范）。
 */
import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

export function createApp() {
  const app = createSSRApp(App)
  app.use(createPinia())
  return { app }
}
