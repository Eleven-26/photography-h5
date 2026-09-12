/**
 * 订单模块 —— 直约下单 / 订单查询 / 取消 / 需求修改
 *
 * 后端路由（internal/presentation/h5/h5.go，已逐条核对）：
 *   POST /h5/order/submit              提交预约（source_type=2 客户预约）
 *   POST /h5/order/list                我的订单（body 分页）
 *   POST /h5/order/detail/:id          :id = order_id
 *   POST /h5/order/confirm/:id         :id = order_id
 *   POST /h5/order/cancel/:id          :id = order_id
 *   POST /h5/order/prep/read/:id       :id = order_id（幂等）
 *   POST /h5/order/requirement/update/:id  :id = order_id
 */
import { rpc } from '@/api/common/http'
import { API_PATHS } from '@/api/common/apiPath'

/**
 * 提交预约（免报价直约，画板 C05 确认 → 后端自动预占档期）
 * @param {Object} payload 字段严格对齐后端 BookingSubmit DTO：
 *   package_id / shoot_date / shoot_time / shoot_address / people_count /
 *   shoot_style / remark / contact_name / contact_mobile
 */
export const submitBooking = (payload) => rpc(API_PATHS.order.submit, payload)

/** 我的订单列表（body: { page, page_size, status? }） */
export const getMyOrders = (params) => rpc(API_PATHS.order.list, params)

/** 订单详情 @param {number} id biz_order.id */
export const getOrderDetail = (id) => rpc(API_PATHS.order.detail, {}, id)

/** 确认预约单（:id = order_id） */
export const confirmBooking = (id) => rpc(API_PATHS.order.confirm, {}, id)

/**
 * 取消订单 / 申请取消（画板 C20；可退金额以后端计算为准）
 * @param {Object} payload { order_id, reason? }
 */
export const applyCancel = (payload) => {
  const { order_id: orderId, ...reason } = payload
  return rpc(API_PATHS.order.cancel, reason, orderId)
}

/** 确认已读拍前准备（biz_order.prep_read_at，:id = order_id，幂等） */
export const confirmPrepRead = (orderId) => rpc(API_PATHS.order.prepRead, {}, orderId)

/**
 * 修改拍摄需求（仅待定金/待拍摄，白名单字段）
 * @param {number} orderId
 * @param {Object} payload dto.ClientOrderRequirementReq
 */
export const updateOrderRequirement = (orderId, payload) =>
  rpc(API_PATHS.order.requirementUpdate, payload, orderId)
