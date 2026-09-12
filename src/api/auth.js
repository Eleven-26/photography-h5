/**
 * 认证模块 —— 手机号验证码登录（全端统一，需求文档 v1.3 §8）
 * 后端：h5 分组短信验证码路由（CustomerAuth）
 * ⚠️ 接口路径以后端 h5.go 实际注册为准，联调前逐条核对。
 */
import { get, post } from '@/utils/request'

/** 发送验证码 @param {string} mobile 手机号 */
export const sendSmsCode = (mobile) => post('/auth/send-code', { mobile })

/** 验证码登录 @returns {token, customer: crm_customer 行} */
export const loginByCode = (mobile, smsCode) => post('/auth/login', { mobile, smsCode })
