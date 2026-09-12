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
 * 从 URL 查询串捕获 slug 并落缓存（仅 H5 有效；小程序无 window，直接跳过）
 * @returns {string} 捕获到的 slug，未捕获返回 ''
 */
export function captureSlug() {
  try {
    if (typeof window !== 'undefined' && window.location && window.location.search) {
      const s = new URLSearchParams(window.location.search).get('slug')
      if (s) {
        uni.setStorageSync(KEY_SLUG, s)
        return s
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
