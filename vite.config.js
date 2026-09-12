/**
 * Vite 配置 —— uni-app Vue3
 * 说明：uni 原生解析 pages.json / manifest.json，这里只做基础包装；
 *       后续如需代理后端接口，在 server.proxy 中按 photography-server 实际地址配置。
 */
import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

export default defineConfig({
  plugins: [uni()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    // TODO: 后端 photography-server 启动地址确认后，在此配置 /api 代理（当前走 env.js 中的完整基址直连）
  },
})
