/**
 * 认证模块 —— 客户手机号验证码登录
 *
 * 后端路由（internal/presentation/h5/h5.go → RegisterPublic，已逐条核对）：
 *   POST /h5/auth/sms-code   { mobile }
 *   POST /h5/auth/login      { slug, mobile, code, openid? } → { token, customer }
 *
 * ⚠️ 两处易错点（联调实测）：
 *   1. 路径是 `auth/sms-code`，不是 /auth/send-code；
 *   2. 请求体字段是 **code**，不是 smsCode；且 **slug 为后端必填**
 *      （缺失返回「缺少工作室标识（slug）」），来源见 utils/slug.js。
 */
import { rpc } from '@/api/common/http'
import { API_PATHS } from '@/api/common/apiPath'
import { getSlug } from '@/utils/slug'

/** 发送验证码 @param {string} mobile 手机号 */
export const sendSmsCode = (mobile) => rpc(API_PATHS.auth.smsCode, { mobile })

/**
 * 验证码登录
 * @param {string} mobile 手机号
 * @param {string} code   短信验证码。**开发环境可传空串** —— 后端 h5.loginRequireSmsCode()
 *                        仅在 dev / docker.dev 跳过校验；test / prod 传空仍是 400。
 * @returns {Promise<{token: string, customer: Object}>} customer = crm_customer 行
 */
export const loginByCode = (mobile, code) =>
  rpc(API_PATHS.auth.login, { slug: getSlug(), mobile, code })
