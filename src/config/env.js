/**
 * 环境配置 —— 接口基址（SLOT 客户端 H5）
 *
 * 后端：photography-server（Gin），客户端走 `/h5` 路由分组（短信验证码登录 + 客户端业务）。
 *
 * `/api` 是网关前缀，由 devServer（开发）/ nginx（生产）**剥离**后再转发 ——
 * 后端真实路由本身不含 `/api`（见 photography-server/internal/router/router.go）。
 *
 * 写法说明：条件编译用「先给默认值、再按平台重赋值」而非重复声明同名常量 ——
 * 后者在预处理前不是合法 JS（重复声明报错），会影响 ESLint / IDE 解析。
 */

/** 后端源地址：H5 留空 = 同源相对路径（走 /api 代理）；小程序无代理，必须直连后端源 */
let apiBase = 'http://localhost:8080' // 小程序端：本地联调指向本机，上线改为 https 合法域名
// #ifdef H5
apiBase = ''
// #endif
export const API_BASE = apiBase

/**
 * 客户端接口统一前缀：
 *   H5（API_BASE=''） → /api/h5/order/list → 代理剥 /api → 后端 /h5/order/list
 *   小程序（直连）     →  /h5/order/list                → 后端 /h5/order/list
 */
let apiPrefix = '/h5'
// #ifdef H5
apiPrefix = '/api/h5'
// #endif
export const API_PREFIX = apiPrefix

/**
 * 通知通道按环境降级（需求文档 v1.3 §8）：
 * - 微信内 H5 / 小程序：订阅消息
 * - 普通浏览器：短信触达
 * 判定方式：ua 含 MicroMessenger 即微信内
 */
export const IS_WECHAT = (() => {
  // #ifdef H5
  return /MicroMessenger/i.test(navigator.userAgent)
  // #endif
  // #ifndef H5
  return true // 小程序端视为微信生态，走订阅消息
  // #endif
})()
