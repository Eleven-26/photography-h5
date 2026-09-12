/**
 * 请求层 —— uni.request Promise 封装
 *
 * 设计要点：
 * 1. 统一拼接 API_BASE + API_PREFIX；
 * 2. 自动携带登录 token（auth.js）；
 * 3. 401 → 清登录态并跳登录页（保留回跳地址）；
 * 4. 业务错误：uni.showToast 提示后端 msg，并 reject（调用方 catch 后可做表单保留输入等处理）；
 * 5. 响应结构：后端 photography-server 实际返回 `{code, msg, data, trace_id}`，`code=0` 为成功
 *    （见 internal/presentation/response/response.go），与本文件判断一致。
 *
 * ⚠️ 项目铁律：**业务接口一律 POST + JSON body**，后端不读 query（见 internal/pkg/params）。
 *    因此 request() 默认 method 为 POST；`get()` 仅为历史调用保留、请勿在新代码中使用。
 */
import { API_BASE, API_PREFIX } from '@/config/env'
import { getToken, clearAuth } from '@/utils/auth'

/**
 * 不需要登录态的白名单 —— 与后端 h5 分组公开路由一一对应
 * （见 photography-server/internal/presentation/h5/h5.go → RegisterPublic）。
 * 这里写的是**去掉 /h5 前缀**后的相对路径前缀。
 */
const PUBLIC_PATHS = [
  '/auth/', // /auth/sms-code、/auth/login（四端统一的验证码登录）
  '/package/', // /package/list、/package/detail/:id
  '/studio/info', // 工作室信息（预约主页聚合；原前端猜的 /home 并不存在）
  '/slot/list', // 可约档期（原前端猜的 /schedule/available 并不存在）
  '/asset/', // /asset/list、/asset/detail/:id（作品集）
  '/custom-request/submit', // 提交定制需求（公开接口）
]

/** 登录页路径（401 跳转用） */
const LOGIN_PAGE = '/pages/login/index'

/**
 * 发起请求
 * @param {Object} options
 * @param {string} options.url        - 接口路径（不含前缀，如 '/order/submit'）
 * @param {string} [options.method]   - 默认 POST（后端业务接口一律 POST）
 * @param {Object} [options.data]     - 请求参数（字段名严格按后端 DTO，不自造）
 * @param {boolean} [options.loading] - 是否显示 loading（默认 true；>1s 操作必须有加载态）
 * @param {boolean} [options.silent]  - 出错是否静默（默认 false：toast 后端 msg）
 * @returns {Promise<any>} data 字段
 */
export function request(options) {
  const { url, method = 'POST', data = {}, loading = true, silent = false } = options

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

/** POST 快捷方法（推荐：后端业务接口一律 POST） */
export const post = (url, data, extra = {}) => request({ url, data, method: 'POST', ...extra })

/**
 * @deprecated 后端**没有** GET 业务接口，调用必然 404（或方法不符）。
 * 仅为兼容历史脚本保留，新代码请一律用 post()。
 */
export const get = (url, data, extra = {}) => request({ url, data, method: 'GET', ...extra })
