/**
 * 请求层 —— uni.request Promise 封装
 *
 * 设计要点：
 * 1. 统一拼接 API_BASE + API_PREFIX；
 * 2. 自动携带登录 token（auth.js）；
 * 3. 401 → 清登录态并跳登录页（保留回跳地址）；
 * 4. 业务错误：uni.showToast 提示后端 msg，并 reject（调用方 catch 后可做表单保留输入等处理）；
 * 5. 响应结构约定 {code, msg, data} —— 后端实际结构确认后如有差异，仅需调整本文件 normalize。
 */
import { API_BASE, API_PREFIX } from '@/config/env'
import { getToken, clearAuth } from '@/utils/auth'

/** 不需要登录态的白名单路径（与后端 h5 分组的公开路由对齐后维护） */
const PUBLIC_PATHS = ['/auth/send-code', '/auth/login', '/home', '/package', '/asset']

/** 登录页路径（401 跳转用） */
const LOGIN_PAGE = '/pages/login/index'

/**
 * 发起请求
 * @param {Object} options
 * @param {string} options.url        - 接口路径（不含前缀，如 '/order/submit'）
 * @param {string} [options.method]   - GET | POST，默认 GET
 * @param {Object} [options.data]     - 请求参数（字段名严格按后端 DTO，不自造）
 * @param {boolean} [options.loading] - 是否显示 loading（默认 true；>1s 操作必须有加载态）
 * @param {boolean} [options.silent]  - 出错是否静默（默认 false：toast 后端 msg）
 * @returns {Promise<any>} data 字段
 */
export function request(options) {
  const { url, method = 'GET', data = {}, loading = true, silent = false } = options

  if (loading) uni.showLoading({ title: '加载中…', mask: true })

  const needAuth = !PUBLIC_PATHS.some((p) => url.startsWith(p))
  const header = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (needAuth && token) header.Authorization = `Bearer ${token}`

  return new Promise((resolve, reject) => {
    uni.request({
      url: `${API_BASE}${API_PREFIX}${url}`,
      method,
      data,
      header,
      timeout: 15000,
      success: (res) => {
        const { statusCode, data: body } = res

        // HTTP 401：登录态失效 → 清态跳登录（携带回跳）
        if (statusCode === 401) {
          clearAuth()
          const pages = getCurrentPages()
          const current = pages[pages.length - 1]
          const redirect = current ? current.route : ''
          uni.reLaunch({ url: `${LOGIN_PAGE}?redirect=/${redirect}` })
          return reject(new Error('未登录或登录已过期'))
        }

        // HTTP 层错误
        if (statusCode < 200 || statusCode >= 300) {
          if (!silent) uni.showToast({ title: `请求失败（${statusCode}）`, icon: 'none' })
          return reject(new Error(`HTTP ${statusCode}`))
        }

        // 业务层：约定 {code, msg, data}，code=0 为成功（以 photography-server 实际响应为准）
        if (body && typeof body.code === 'number' && body.code !== 0) {
          if (!silent) uni.showToast({ title: body.msg || '操作失败', icon: 'none' })
          return reject(Object.assign(new Error(body.msg || '操作失败'), { code: body.code, body }))
        }

        resolve(body && 'data' in body ? body.data : body)
      },
      fail: (err) => {
        // 网络层失败：保留调用方 catch 权限，toast 提示但不重试（避免重复提交）
        if (!silent) uni.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
        reject(err)
      },
      complete: () => {
        if (loading) uni.hideLoading()
      },
    })
  })
}

/** GET 快捷方法 */
export const get = (url, data, extra = {}) => request({ url, data, method: 'GET', ...extra })

/** POST 快捷方法 */
export const post = (url, data, extra = {}) => request({ url, data, method: 'POST', ...extra })
