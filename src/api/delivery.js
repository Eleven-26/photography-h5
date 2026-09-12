/**
 * 选片与交付模块 —— 在线选片 / 加选 / 修图反馈 / 成片确认
 * 后端字段：biz_delivery + biz_delivery_item（无独立选片表）
 *   delivery.stage           1-待上传样片 2-客户选片中 3-精修进行中 4-待确认交付 5-已交付
 *   delivery.select_deadline 选片截止（口径③：超时【不】自动确认，系统通知双方）
 *   delivery.extra_selected_count / extra_fee  加选张数与差价（差价自动计入尾款）
 *   delivery.customer_confirmed_at  客户确认成片时间
 *   item.is_selected / feedback_*    逐张勾选与修图反馈四件套
 * ⚠️ /delivery/select | /delivery/confirm-extra | /delivery/confirm 为 h5.go 已确认路由；其余联调核对。
 */
import { get, post } from '@/utils/request'

/** 交付单详情（选片页 C13 数据源） */
export const getDeliveryDetail = (orderId) => get('/delivery/detail', { order_id: orderId })

/** 交付明细（样片/精修列表，kind: 1-样片 2-已选 3-精修成品） */
export const getDeliveryItems = (deliveryId) => get('/delivery/item/list', { delivery_id: deliveryId })

/**
 * 提交选片（逐张勾选结果）
 * @param {Object} payload
 *   delivery_id    交付单 ID
 *   item_ids       已选样片 ID 数组（biz_delivery_item.id，kind=1 的子集）
 *   超选差价由后端按 addon_unit_price 计算并写入 extra_fee / extra_selected_count（前端不计算金额）
 */
export const submitSelect = (payload) => post('/delivery/select', payload)

/**
 * 确认加片（extra_confirmed 置 1，差价并入尾款 → 订单进尾款待收）
 * @param {number} deliveryId
 */
export const confirmExtra = (deliveryId) => post('/delivery/confirm-extra', { delivery_id: deliveryId })

/**
 * 确认成片（写 customer_confirmed_at → 交付进已交付，开放高清下载）
 * @param {number} deliveryId
 */
export const confirmDelivery = (deliveryId) => post('/delivery/confirm', { delivery_id: deliveryId })

/**
 * 提交修图反馈（画板 C14）
 * @param {Object} payload 字段对齐 biz_delivery_item 反馈四件套：
 *   item_id            交付明细 ID
 *   feedback_content   反馈内容
 *   feedback_types     修改类型（逗号分隔：局部修饰/颜色调整/构图裁剪/其他）
 *   feedback_priority  normal | important | urgent
 */
export const submitFeedback = (payload) => post('/delivery/feedback', payload)
