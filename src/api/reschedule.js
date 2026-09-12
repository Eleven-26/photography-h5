/**
 * 改期模块（调度费即时线下支付、不并入尾款 —— 确认单 B2）
 *
 * ⚠️ `:order_id` 是订单 ID、`:id` 是改期单 ID，两者不可混。
 * 后端路由：
 *   POST /h5/reschedule/apply/:order_id   申请改期（24h 内后端拦截）
 *   POST /h5/reschedule/list/:order_id    我的订单改期单列表（不分页）
 *   POST /h5/reschedule/detail/:id        改期单详情 + 调度费支付状态
 *   POST /h5/reschedule/cancel/:id        撤回改期申请
 *   POST /h5/reschedule/pay/:id           提交调度费支付凭证
 */
import { rpc } from '@/api/common/http'
import { API_PATHS } from '@/api/common/apiPath'

/**
 * 申请改期（画板 C18/C19）
 * @param {Object} payload { order_id, new_date, new_time, reason_label?, reason? }
 */
export const applyReschedule = (payload) => {
  const { order_id: orderId, ...body } = payload
  return rpc(API_PATHS.reschedule.apply, body, orderId)
}

/** 我的订单改期单列表 @param {number} orderId */
export const getRescheduleList = (orderId) => rpc(API_PATHS.reschedule.list, {}, orderId)

/** 改期单详情 @param {number} id 改期单 ID */
export const getRescheduleDetail = (id) => rpc(API_PATHS.reschedule.detail, {}, id)

/** 撤回改期申请 @param {number} id 改期单 ID */
export const cancelReschedule = (id) => rpc(API_PATHS.reschedule.cancel, {}, id)

/**
 * 提交调度费支付凭证 @param {number} id 改期单 ID
 * @param {Object} payload dto.ClientReschedulePayReq
 */
export const payRescheduleFee = (id, payload) => rpc(API_PATHS.reschedule.pay, payload, id)
