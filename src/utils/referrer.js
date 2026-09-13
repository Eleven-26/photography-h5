/**
 * 分享人标识（staff_id）—— 预约主页分享链接的归属键
 *
 * 员工端「我的预约主页」分享出的链接形如：
 *   https://host/?slug=xxx&staff_id=12
 *   ├─ slug     定位租户（见 utils/slug.js）
 *   └─ staff_id 标识**分享人**，客户凭该链接登录后下单，订单归到这位员工名下
 *               （后端写入 biz_order.photographer_id，员工端「仅本人」数据范围据此可查）
 *
 * 后端取值优先级（photography-server/internal/presentation/h5/h5.go → staffFrom）：
 *   ① 请求头 X-Staff-Id → ② body.staff_id → ③ query ?staff_id=
 * 本文件负责 ③ 的捕获与缓存；①② 由 api/common/http.js 统一注入头 + 各 api 模块传 body。
 *
 * 来源优先级：
 *   ① 当前 URL 查询参数 `?staff_id=`
 *   ② 本地缓存（同一客户二次访问免带参，与 slug 同款策略）
 *
 * ⚠️ 与 slug 的区别：slug 是「进哪个工作室」，staff_id 是「算谁的客户单」；
 *    两者独立，slug 缺失时后端仍会报「缺少工作室标识」，staff_id 缺失只是不落归属。
 */
const KEY_STAFF_ID = 'slot_ref_staff_id'

/**
 * 上一次已解析过的 query string。
 * 本捕获函数由请求层每次请求间接触发（http.js 注入 X-Staff-Id 头），
 * 不加短路会让每次请求都做一次同步存储写入（H5 端即 localStorage.setItem）。
 */
let lastSearch

/** 规范化 staff_id：仅接受正整数（后端约定 > 0 有效），其余一律视为未携带 */
function normalize(raw) {
  const n = parseInt(raw, 10)
  return Number.isInteger(n) && n > 0 ? String(n) : ''
}

/**
 * 从 URL 查询串捕获 staff_id 并落缓存（仅 H5 有效；小程序无 window，直接跳过）
 * @returns {string} 本次新捕获到的 staff_id；URL 未变化或无该参数时返回 ''
 */
export function captureStaffId() {
  try {
    if (typeof window !== 'undefined' && window.location) {
      const search = window.location.search || ''
      if (search === lastSearch) return '' // 同一 URL 已处理过，跳过重复解析与写入
      lastSearch = search
      if (search) {
        const id = normalize(new URLSearchParams(search).get('staff_id'))
        if (id) {
          uni.setStorageSync(KEY_STAFF_ID, id)
          return id
        }
      }
    }
  } catch {
    // 小程序环境没有 URLSearchParams/window，走缓存分支
  }
  return ''
}

/** 读取 staff_id：URL 实时值优先，其次缓存；未携带时返回 ''（后端据此不落归属） */
export function getStaffId() {
  return captureStaffId() || uni.getStorageSync(KEY_STAFF_ID) || ''
}

/** 显式写入 staff_id（小程序端的进入参数由页面 onLoad(options) 拿到后调用本方法） */
export function setStaffId(staffId) {
  const id = normalize(staffId)
  if (id) uni.setStorageSync(KEY_STAFF_ID, id)
}

/** 清除 staff_id（切换工作室/分享人时用） */
export function clearStaffId() {
  uni.removeStorageSync(KEY_STAFF_ID)
}
