/**
 * 改期与取消退款模块
 * 后端字段：biz_order_reschedule（fee_type 1-免费 2-收调度费 3-不可改期；72h/20%/24h 阈值取 biz_studio_setting）
 *          biz_order_refund（退款基数=已付金额，refund_rule 档位按拍摄前小时）
 * 口径：调度费即时线下支付、不并入尾款（确认单 B2）；退款由摄影师线下退回、平台仅登记。
 * ⚠️ /reschedule/apply 为 h5.go 已确认路由；其余联调核对。
 */
import { get, post } from '@/utils/request'

/**
 * 申请改期（画板 C18/C19；24h 内后端拦截返回不可改）
 * @param {Object} payload 字段对齐 biz_order_reschedule：
 *   order_id     订单 ID
 *   new_date     新拍摄日期 yyyy-MM-dd
 *   new_time     新时间段
 *   reason_label 改期原因分类（时间冲突/天气原因/场地问题/与客户协商）
 *   reason       原因说明
 */
export const applyReschedule = (payload) => post('/reschedule/apply', payload)

/** 改期单列表/详情（展示调度费与审批进度） */
export const getRescheduleList = (orderId) => get('/reschedule/list', { order_id: orderId })

/**
 * 申请取消（画板 C20；可退金额以后端计算为准：基数=已付金额 × refund_rule 档位比例）
 * @param {Object} payload { order_id, reason_label, reason }
 */
export const applyCancel = (payload) => post('/order/cancel', payload)

/** 退款进度（画板 C21，biz_order_refund） */
export const getRefundList = (orderId) => get('/refund/list', { order_id: orderId })

/** 客户确认收到退款（biz_order_refund.customer_confirm_at） */
export const confirmRefundReceived = (refundId) => post('/refund/confirm', { refund_id: refundId })
