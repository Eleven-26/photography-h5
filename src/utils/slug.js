/**
 * 工作室短链标识（slug）—— 多租户路由键
 *
 * 后端 h5 登录**必填**（internal/presentation/h5/h5.go → slugFrom）：
 *   取值优先级 ① 请求头 `X-Slug` → ② body.slug → ③ query ?slug=
 * 本文件提供 body/query 侧的统一取值入口（登录请求把 slug 放进 body）。
 *
 * 来源优先级：
 *   ① 当前 URL 查询参数 `?slug=`（H5 分享链接形如 https://host/?slug=xxx）
 *   ② 本地缓存（记住上次进入的工作室，二次访问免带参）
 */
const KEY_SLUG = 'slot_studio_slug'

/**
 * 上一次已解析过的 query string。
 * 本函数现由请求层每次请求调用（见 api/common/http.js 注入 X-Slug 头），
 * 若不加短路，每个请求都会触发一次同步存储写入（H5 端即 localStorage.setItem）。
 * URL 未变化时直接返回，由调用方回退到缓存值。
 */
let lastSearch

/**
 * 从 URL 查询串捕获 slug 并落缓存（仅 H5 有效；小程序无 window，直接跳过）
 * @returns {string} 本次新捕获到的 slug；URL 未变化或无 slug 时返回 ''
 */
export function captureSlug() {
  try {
    if (typeof window !== 'undefined' && window.location) {
      const search = window.location.search || ''
      if (search === lastSearch) return '' // 同一 URL 已处理过，跳过重复解析与写入
      lastSearch = search
      if (search) {
        const s = new URLSearchParams(search).get('slug')
        if (s) {
          uni.setStorageSync(KEY_SLUG, s)
          return s
        }
      }
    }
  } catch {
    // 小程序环境没有 URLSearchParams/window，走缓存分支
  }
  return ''
}

/** 读取 slug：URL 实时值优先，其次缓存 */
export function getSlug() {
  return captureSlug() || uni.getStorageSync(KEY_SLUG) || ''
}

/** 显式写入 slug（小程序端的进入参数由页面 onLoad(options) 拿到后调用本方法） */
export function setSlug(slug) {
  if (slug) uni.setStorageSync(KEY_SLUG, slug)
}

/** 清除 slug（切换工作室时用） */
export function clearSlug() {
  uni.removeStorageSync(KEY_SLUG)
}
