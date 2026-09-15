/**
 * 用户状态 —— Pinia
 *
 * 目录位置对齐 SLOT 管理端 photography-frontend/src/stores/（复数）。
 * 管理登录态与客户信息（crm_customer 行），全局响应式读取。
 */
import { defineStore } from 'pinia'
import { setAuth, clearAuth, getCustomer, getToken, isLoggedIn } from '@/utils/auth'

export const useUserStore = defineStore('user', {
  state: () => ({
    /** 是否已登录 */
    loggedIn: isLoggedIn(),
    /** 客户信息（对齐 crm_customer 字段：id/code/name/mobile/avatar/…） */
    customer: getCustomer(),
  }),
  getters: {
    /** 展示名：优先客户姓名 */
    displayName: (state) => (state.customer && state.customer.name) || '',
  },
  actions: {
    /** 登录成功：写入本地存储并同步 state */
    login(token, customerInfo) {
      setAuth(token, customerInfo)
      this.loggedIn = true
      this.customer = customerInfo || null
    },
    /** 退出登录 */
    logout() {
      clearAuth()
      this.loggedIn = false
      this.customer = null
    },
    /**
     * 局部更新客户信息（客户中心改完资料后调用）
     *
     * 必须同时写本地存储：客户信息在多个页面直接读 getCustomer()（如定制需求页带入
     * 姓名/手机/偏好），只改 state 会让那些页面在本次会话结束前一直用旧值。
     * token 不变，故复用 setAuth（它同时写 token 与 customer 两个键）。
     */
    patchCustomer(patch) {
      this.customer = { ...(this.customer || {}), ...(patch || {}) }
      setAuth(getToken(), this.customer)
    },
  },
})
