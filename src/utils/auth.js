/**
 * 登录态管理 —— token 与客户信息存取
 * 登录方式：全端统一手机号验证码（需求文档 v1.3 §2/§8，不依赖微信授权）
 * 存储：uni.setStorageSync（H5 → localStorage / 小程序 → storage，跨端一致）
 */
const KEY_TOKEN = 'slot_customer_token'
const KEY_CUSTOMER = 'slot_customer_info'

/** 保存登录态 */
export function setAuth(token, customerInfo) {
  uni.setStorageSync(KEY_TOKEN, token)
  if (customerInfo) uni.setStorageSync(KEY_CUSTOMER, JSON.stringify(customerInfo))
}

/** 读取 token */
export function getToken() {
  return uni.getStorageSync(KEY_TOKEN) || ''
}

/** 读取客户信息（crm_customer 行：id/code/name/mobile/avatar/openid/…） */
export function getCustomer() {
  const raw = uni.getStorageSync(KEY_CUSTOMER)
  try {
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/** 是否已登录 */
export function isLoggedIn() {
  return !!getToken()
}

/** 清除登录态（401 或主动退出） */
export function clearAuth() {
  uni.removeStorageSync(KEY_TOKEN)
  uni.removeStorageSync(KEY_CUSTOMER)
}
