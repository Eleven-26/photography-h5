/**
 * 传输层 —— uni.request Promise 封装
 *
 * 目录位置对齐 SLOT 管理端 photography-frontend/src/api/common/http.ts：
 * 「传输层」放在 api/common/ 下，与「路径注册表」(apiPath.js) 同为 API 层基础设施，
 * 不再散落在 utils/ —— utils/ 只放与接口无关的纯工具（format / slug / demo）。
 *
 * 设计要点：
 * 1. 统一拼接 API_BASE + API_PREFIX（后者来自 apiPath.js）；
 * 2. 自动携带登录 token（auth.js）；
 * 3. 401 → 清登录态并跳登录页（保留回跳地址）；
 * 4. 业务错误：uni.showToast 提示后端 msg，并 reject（调用方 catch 后可做表单保留输入等处理）；
 * 5. 响应结构：后端 photography-server 实际返回 `{code, msg, data, trace_id}`，`code=0` 为成功
 *    （见 internal/presentation/response/response.go），与本文件判断一致。
 *
 * ⚠️ 项目铁律：**业务接口一律 POST + JSON body**，后端不读 query（见 internal/pkg/params）。
 *    路径参数走 URL（/x/y/:id），业务参数走 body；因此对外只暴露 rpc()，不提供 get()。
 */
import { API_BASE } from '@/config/env'
import { API_PREFIX } from '@/api/common/apiPath'
import { getToken, clearAuth } from '@/utils/auth'
import { getSlug } from '@/utils/slug'
import { getStaffId } from '@/utils/referrer'

/**
 * 不需要登录态的白名单 —— 与后端 h5 分组公开路由一一对应
 * （见 photography-server/internal/presentation/h5/h5.go → RegisterPublic）。
 * 这里写的是**去掉端前缀**后的相对路径前缀。
 */
const PUBLIC_PATHS = [
  'auth/', // auth/sms-code、auth/login（验证码登录）
  'package/', // package/list、package/detail/:id
  'studio/info', // 工作室信息（预约主页聚合）
  'slot/list', // 可约档期
  'asset/', // asset/list、asset/detail/:id（作品集）
  'custom-request/submit' // 提交定制需求（公开接口，登录与否均可）
]

/** 登录页路径（401 跳转用） */
const LOGIN_PAGE = '/pages/login/index'

/**
 * 发起请求
 * @param {Object} options
 * @param {string} options.url        - 接口路径（不含端前缀，如 'order/list'）
 * @param {Object} [options.data]     - 请求参数（字段名严格按后端 DTO，不自造）
 * @param {boolean} [options.loading] - 是否显示 loading（默认 true；>1s 操作必须有加载态）
 * @param {boolean} [options.silent]  - 出错是否静默（默认 false：toast 后端 msg）
 * @returns {Promise<any>} data 字段
 */
export function request(options) {
  const { url, data = {}, loading = true, silent = false } = options

  if (loading) uni.showLoading({ title: '加载中…', mask: true })

  const needAuth = !PUBLIC_PATHS.some((p) => url.startsWith(p))
  const header = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (needAuth && token) header.Authorization = `Bearer ${token}`

  // 租户定位：客户端一律不传 company_id（#29 防遍历），公开接口（studio/info、package/list、
  // slot/list、asset/list 等）由后端按 slug 反查 —— 见 photography-server/internal/presentation/h5/h5.go
  // → slugFrom（取值优先级：X-Slug 头 > body.slug > query ?slug=）。这里统一注入头，
  // 避免每个 api 模块各传一次。getSlug() 会顺带从当前 URL 的 ?slug= 捕获并落缓存，
  // 故客户打开分享链接（https://host/?slug=xxx）后首次请求即能定位到正确工作室。
  const slug = getSlug()
  if (slug) header['X-Slug'] = slug

  // 分享人归属：客户从员工 A 的预约主页链接进入（...&staff_id=12）并下单时，订单归到 A 名下。
  // 与 X-Slug 同款做法——这里统一注入头，避免每个 api 模块各传一次（后端仅
  // /order/submit 消费该头，见 h5.go → staffFrom，其余接口带着无副作用）。
  // 未携带时不加该头，后端按「非分享进入」处理：订单不落归属，由工作室后续指派。
  const staffId = getStaffId()
  if (staffId) header['X-Staff-Id'] = staffId

  return new Promise((resolve, reject) => {
    uni.request({
      url: `${API_BASE}${API_PREFIX}/${url}`,
      method: 'POST',
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

        // 业务层：{code, msg, data, trace_id}，code=0 为成功
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
      }
    })
  })
}

/**
 * RPC 调用助手 —— 与后端「所有业务路由均为 POST /{apiPath}[/:id]」一一对应。
 * @param {string} apiPath - API_PATHS 中的相对路径（如 API_PATHS.order.list）
 * @param {Object} [data]  - JSON body
 * @param {number|string} [id] - 路径参数（存在则拼到末尾）
 * @param {Object} [extra] - 透传 { loading, silent }
 */
export const rpc = (apiPath, data, id, extra = {}) =>
  request({ url: id != null ? `${apiPath}/${id}` : apiPath, data, ...extra })
