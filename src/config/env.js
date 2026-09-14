/**
 * 环境配置 —— 仅「后端源地址 + 环境判定」。
 *
 * ⚠️ 接口**路径前缀**不在这里，在 `api/common/apiPath.js`（与 PC 端一致：
 *    路径与前缀同属 API 层基础设施，避免两处各写一份而漂移）。
 *
 * 后端：photography-server（Gin），客户端走 `/h5` 路由分组（短信验证码登录 + 客户端业务）。
 * `/api` 是网关前缀，由 devServer（开发）/ nginx（生产）**剥离**后再转发 ——
 * 后端真实路由本身不含 `/api`（见 photography-server/internal/router/router.go）。
 *
 * 写法说明：条件编译用「先给默认值、再按平台重赋值」而非重复声明同名常量 ——
 * 后者在预处理前不是合法 JS（重复声明报错），会影响 ESLint / IDE 解析。
 *
 * 因此本文件豁免两条静态分析规则（原因见下），其余文件照常生效：
 *   - no-useless-assignment：ESLint 不解析 `// #ifdef`，"默认值 + 按平台重赋值" 会被误判；
 *   - no-unreachable：`#ifdef` / `#ifndef` 两段 return 在预处理前会形成"后者不可达"。
 */
/* eslint-disable no-useless-assignment, no-unreachable -- 见上方文件说明（uni-app 条件编译） */

/**
 * 后端源地址（可由 `.env.[mode]` 覆盖，改地址不必动代码）：
 *   - 小程序端 → VITE_MP_API_BASE_URL。**无代理**，必须直连后端源；上线填微信后台的
 *     request 合法域名（https、不带路径）。留空回退到本机地址，真机上连不通。
 *   - H5 端   → VITE_API_BASE_URL。留空 = 同源相对路径，由 devServer / 容器 nginx 剥 /api 前缀。
 */
let apiBase = import.meta.env.VITE_MP_API_BASE_URL || 'http://localhost:8080'
// #ifdef H5
apiBase = import.meta.env.VITE_API_BASE_URL || ''
// #endif
export const API_BASE = apiBase

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
