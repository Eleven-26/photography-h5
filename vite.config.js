/**

 * Vite 配置 —— uni-app Vue3
 * 说明：uni 原生解析 pages.json / manifest.json，这里只做基础包装；
 *       后续如需代理后端接口，在 server.proxy 中按 photography-server 实际地址配置。
 */
import { defineConfig, loadEnv } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

/**
 * 后端地址。与 SLOT 管理端（photography-frontend）保持同一约定：
 * devServer 代理 /api 并**剥掉前缀**再转发 —— 后端路由本身不含 /api。
 * 覆盖：BACKEND_URL=http://192.168.1.10:8080 npm run dev:h5
 */
const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // 构建期强校验（P0）：生产小程序**无代理**，必须直连合法 https 域名。
  // env.js 对空值会回退 localhost —— 若静默通过，问题只在真机上暴露，故此处直接阻断构建。
  if (process.env.UNI_PLATFORM === 'mp-weixin' && mode === 'production' && !env.VITE_MP_API_BASE_URL) {
    throw new Error(
      '[构建阻断] 生产小程序缺少 VITE_MP_API_BASE_URL：请在 .env.production 配置微信后台 request 合法域名（https、不带路径）'
    )
  }

  return {
    plugins: [uni()],
    /* Dart Sass 弃用告警治理：
     * 1) @import 已在源码中全部改为 @use；
     * 2) 残留的 legacy-js-api 警告来自构建链路本身（uni-app 把 vite 精确锁在 5.2.8，
     *    切换 Dart Sass modern API 所需的 css.preprocessorOptions.scss.api 自 Vite 5.4 才提供），
     *    当前无法根治，故显式静音以免刷屏。 */
    css: {
      preprocessorOptions: {
        scss: {
          silenceDeprecations: ['legacy-js-api'],
        },
      },
    },
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
        // 公开作品图（后端 /media，不剥前缀）：作品集封面/图集在库里是站内相对路径，
        // dev 下不代理会打到 devServer 上 404 → 作品集页图片全空白
        '/media': {
          target: backendUrl,
          changeOrigin: true,
        },
      },
    },
  }
})
