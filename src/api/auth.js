/**
 * 认证模块 —— 手机号验证码登录（全端统一，需求文档 v1.3 §8）
 *
 * 后端实际路由（internal/presentation/h5/h5.go → RegisterPublic，已逐条核对）：
 *   POST /h5/auth/sms-code   { mobile }                     发送验证码
 *   POST /h5/auth/login      { slug, mobile, code, openid? } 验证码登录 → { token, customer }
 *
 * ⚠️ 两处易错点（联调实测）：
 *   1. 路径是 `/auth/sms-code`，不是 /auth/send-code；
 *   2. 请求体字段是 **code**，不是 smsCode；且 **slug 为后端必填**
 *      （缺失会返回「缺少工作室标识（slug）」），来源见 utils/slug.js。
 */
import { post } from '@/utils/request'
import { getSlug } from '@/utils/slug'

/** 发送验证码 @param {string} mobile 手机号 */
export const sendSmsCode = (mobile) => post('/auth/sms-code', { mobile })

/**
 * 验证码登录
 * @param {string} mobile 手机号
 * @param {string} code   短信验证码
 * @returns {Promise<{token: string, customer: Object}>} customer = crm_customer 行
 */
export const loginByCode = (mobile, code) =>
  post('/auth/login', { slug: getSlug(), mobile, code })
