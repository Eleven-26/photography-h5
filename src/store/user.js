/**
 * 用户状态 —— Pinia
 * 管理登录态与客户信息（crm_customer 行），全局响应式读取。
 */
import { defineStore } from 'pinia'
import { setAuth, clearAuth, getCustomer, isLoggedIn } from '@/utils/auth'

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
  },
})
