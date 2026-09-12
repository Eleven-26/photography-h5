/**
 * 退款模块 —— 申请 / 进度 / 客户确认收到退款
 *
 * ⚠️ `:order_id` 是订单 ID、`:id` 是退款单 ID。
 * 后端路由：
 *   POST /h5/refund/apply/:order_id   申请退款（退款基数=已付金额）
 *   POST /h5/refund/list/:order_id    我的订单退款记录（不分页）
 *   POST /h5/refund/confirm/:id       客户确认收到退款（写 customer_confirm_at，幂等）
 * 退款由摄影师线下退回、平台仅登记；客户确认与员工端审批构成闭环。
 */
import { rpc } from '@/api/common/http'
import { API_PATHS } from '@/api/common/apiPath'

/**
 * 申请退款 @param {number} orderId
 * @param {Object} payload dto.ClientRefundReq
 */
export const applyRefund = (orderId, payload) => rpc(API_PATHS.refund.apply, payload, orderId)

/** 我的订单退款记录 @param {number} orderId */
export const getRefundList = (orderId) => rpc(API_PATHS.refund.list, {}, orderId)

/** 客户确认收到退款 @param {number} refundId 退款单 ID */
export const confirmRefundReceived = (refundId) => rpc(API_PATHS.refund.confirm, {}, refundId)
