/**
 * 收款模块 —— 定金 / 尾款 / 调度费（资金不经平台，仅登记；需求文档 §1 资金边界）
 *
 * 流程：客户线下转账 → 「我已完成转账，通知摄影师」（登记）→ 摄影师在员工端确认到账。
 * 后端路由：
 *   POST /h5/pay/mark                 客户登记转账（只落 status=1 待核验，paid_amt 不变）
 *   POST /h5/payment/list/:order_id   订单收款记录
 *   POST /h5/payment-method/list      可用收款方式（只出启用项）
 */
import { rpc } from '@/api/common/http'
import { API_PATHS } from '@/api/common/apiPath'

/**
 * 客户登记转账（**只登记不确认**，到账确认权仍在员工端 /payment/confirm/:id）
 * @param {Object} payload dto.ClientPaymentMarkReq：
 *   order_id / type(deposit|final|addon) / amount / method_id / voucher / paid_at / remark
 */
export const submitPaymentMark = (payload) => rpc(API_PATHS.pay.mark, payload)

/** 订单收款记录列表 @param {number} orderId */
export const getPaymentList = (orderId) => rpc(API_PATHS.payment.list, {}, orderId)

/** 可用收款方式（biz_payment_method，只出启用项，供支付页展示收款码/账号） */
export const getPaymentMethods = () => rpc(API_PATHS.paymentMethod.list, {})
