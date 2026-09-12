/**
 * 订单模块 —— 直约下单 / 订单查询
 * 口径②：快捷直约仅限已上架完整套餐（后端 BookingSubmit 校验，前端不重复实现拦截逻辑，
 *         但列表入口按 package.status===1 过滤展示）。
 * 后端字段：biz_order（source_type=2 客户预约）
 * ⚠️ /order/submit 为 h5.go 已确认存在的路由；其余路径联调前核对。
 */
import { get, post } from '@/utils/request'

/**
 * 提交预约（免报价直约，画板 C05 确认 → 生成 biz_order source_type=2，后端自动预占档期）
 * @param {Object} payload 字段严格对齐后端 BookingSubmit DTO：
 *   package_id     套餐 ID（biz_package.id，须为已上架完整套餐）
 *   shoot_date     拍摄日期 yyyy-MM-dd
 *   shoot_time     拍摄时间段
 *   shoot_address  拍摄地点
 *   people_count   拍摄人数（如 "2大1小"）
 *   shoot_style    拍摄风格
 *   remark         备注
 *   contact_name / contact_mobile 联系人（游客下单场景）
 */
export const submitBooking = (payload) => post('/order/submit', payload)

/** 我的订单列表（登录态，customer_id 从 token 解析） */
export const getMyOrders = (params) => get('/order/list', params)

/** 订单详情 @param {number} id biz_order.id */
export const getOrderDetail = (id) => get('/order/detail', { id })

/** 确认阅读拍前准备（biz_order.prep_read_at） */
export const confirmPrepRead = (orderId) => post('/order/prep/read', { order_id: orderId })
