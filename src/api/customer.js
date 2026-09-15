/**
 * 客户中心（画板 CC01）—— 个人资料
 *
 * 后端路由（photography-server/internal/presentation/h5/h5.go → RegisterAuthed）：
 *   POST /h5/customer/profile          读当前登录客户的资料（白名单字段）
 *   POST /h5/customer/profile/update   改资料
 *
 * ⚠️ 两条都**必须登录**（不在 http.js 的 PUBLIC_PATHS 白名单内）：
 *    匿名调用会拿到 401 → request 层清登录态并跳登录页。
 *    客户中心按 A2 口径设计（匿名可打开、点具体功能才拦登录），所以页面侧
 *    必须先 isLoggedIn() 判断、未登录时不发请求，否则一进页面就被踢去登录页。
 *
 * 归属由令牌内 customer_id 锁定，请求体**不传** customer_id（防越权，见后端注释）。
 */
import { rpc } from '@/api/common/http'
import { API_PATHS } from '@/api/common/apiPath'

/**
 * 我的资料
 * @param {Object} [extra] 透传 { loading, silent } —— 如定制需求页静默回填时用
 *                         { loading: false, silent: true }（取不到就用本地缓存，不打断填写）
 * @returns {Promise<Object>} { id, code, name, mobile, wechat, gender, birthday,
 *                              avatar, prefer_style, prefer_scene, order_count }
 *   ⚠️ 不含 remark / tags / level / source / status —— 这些是工作室内部字段，后端白名单已挡掉。
 */
export const getProfile = (extra = {}) => rpc(API_PATHS.customer.profile, {}, null, extra)

/**
 * 修改资料（局部更新）
 * @param {Object} patch 只传要改的字段：
 *   name / wechat / gender(male|female|unknown) / birthday(YYYY-MM-DD) /
 *   prefer_style / prefer_scene
 *   ⚠️ 字段**省略** = 保持原值；传空串 = 清空（后端按「指针非 nil」判定，
 *      见 dto.ClientProfileUpdateReq —— 用「非空才更新」的话客户永远清不掉填错的偏好）。
 *   ⚠️ 手机号不在可改范围：它是登录凭据，换绑必须走短信验证。
 */
export const updateProfile = (patch) => rpc(API_PATHS.customer.profileUpdate, patch)
