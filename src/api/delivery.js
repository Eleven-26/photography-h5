/**
 * 选片与交付模块 —— 在线选片 / 加片 / 确认成片 / 修图反馈
 *
 * ⚠️ `:id` 语义是重灾区（已按后端 h5.go 逐条核对）：
 *   /delivery/detail/:id、/delivery/items/:id 的 :id 是 **order_id**（按订单反查交付单）；
 *   /delivery/select|confirm-extra|confirm|extra-quote/:id 的 :id 是 **delivery_id**；
 *   /delivery/feedback/:item_id 的 :item_id 是 **交付明细 ID**。
 */
import { rpc } from '@/api/common/http'
import { API_PATHS } from '@/api/common/apiPath'

/**
 * 交付详情 —— 返回 `{ delivery, items }`（:id = order_id）
 * 未建交付单时返回 `{ delivery: null, items: [] }`，不是 404。
 */
export const getDeliveryDetail = (orderId) => rpc(API_PATHS.delivery.detail, {}, orderId)

/**
 * 交付文件明细（样片/已选/精修，kind: 1/2/3）
 * @param {number} orderId 注意是 **订单 ID**，不是交付单 ID
 */
export const getDeliveryItems = (orderId) => rpc(API_PATHS.delivery.items, {}, orderId)

/**
 * 提交选片（逐张勾选结果）
 * @param {Object} payload { delivery_id, item_ids }
 * 超选差价由后端按单价计算并写入 extra_fee / extra_selected_count（前端不计算金额）
 */
export const submitSelect = (payload) => {
  const { delivery_id: deliveryId, item_ids: itemIds } = payload
  return rpc(API_PATHS.delivery.select, { item_ids: itemIds }, deliveryId)
}

/** 确认加片（extra_confirmed 置 1，差价并入尾款）@param {number} deliveryId */
export const confirmExtra = (deliveryId) => rpc(API_PATHS.delivery.confirmExtra, {}, deliveryId)

/** 确认成片（写 customer_confirmed_at → 已交付，开放高清下载）@param {number} deliveryId */
export const confirmDelivery = (deliveryId) => rpc(API_PATHS.delivery.confirm, {}, deliveryId)

/**
 * 提交修图反馈（画板 C14）
 * @param {Object} payload { item_id, feedback_content, feedback_types, feedback_priority }
 */
export const submitFeedback = (payload) => {
  const { item_id: itemId, ...body } = payload
  return rpc(API_PATHS.delivery.feedback, body, itemId)
}

/**
 * 加片费试算（:id = delivery_id；body 可为空，按当前已选张数试算）
 * @param {number} deliveryId
 * @param {number} [selectCount]
 */
export const getExtraQuote = (deliveryId, selectCount) =>
  rpc(API_PATHS.delivery.extraQuote, selectCount != null ? { select_count: selectCount } : {}, deliveryId)
