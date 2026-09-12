/**
 * Vite 配置 —— uni-app Vue3
 * 说明：uni 原生解析 pages.json / manifest.json，这里只做基础包装；
 *       后续如需代理后端接口，在 server.proxy 中按 photography-server 实际地址配置。
 */
import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

/**
 * 后端地址。与 SLOT 管理端（photography-frontend）保持同一约定：
 * devServer 代理 /api 并**剥掉前缀**再转发 —— 后端路由本身不含 /api。
 * 浏览器侧看到的是同源请求，因此不需要把本机 dev 端口加进后端 CORS 白名单。
 * 覆盖：BACKEND_URL=http://192.168.1.10:8080 npm run dev:h5
 */
const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080'

export default defineConfig({
  plugins: [uni()],
  server: {
    host: '0.0.0.0',
    // 5173 是 SLOT 管理端的端口，客户端 H5 用独立端口，避免抢端口与 CORS 白名单冲突
    port: 5174,
    proxy: {
      '/api': {
        target: backendUrl,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''), // 剥前缀：后端注册的是 /h5/...
      },
    },
  },
})
