/**
 * 环境配置 —— 接口基址
 * 后端：photography-server（Gin），客户端走 /h5 路由分组（短信验证码登录 + 客户端业务）
 * 说明：小程序端需在微信公众平台配置 request 合法域名；H5 开发期可直连本机后端。
 */
export const API_BASE = 'http://localhost:8080'

/** 客户端接口统一前缀（对应后端 router.go 中 h5 分组） */
export const API_PREFIX = '/api/h5'

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
