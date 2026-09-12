/**
 * 支付登记模块 —— 定金 / 尾款（资金不经平台，仅登记，需求文档 §1 资金边界）
 * 后端字段：biz_order_payment（type: deposit/final/addon；status: 1-待确认收款 2-已确认 3-已退款）
 * 流程：客户线下转账 → 点「我已完成转账，通知摄影师」（登记）→ 摄影师确认收款
 * ⚠️ 接口路径联调前以后端 h5.go 实际注册为准。
 */
import { get, post } from '@/utils/request'

/**
 * 支付登记（客户标记已转账）
 * @param {Object} payload 字段对齐 biz_order_payment：
 *   order_id   订单 ID
 *   type       收款类型 deposit | final | addon
 *   amount     金额（元，展示值与订单 deposit_amt / final_amt 一致，前端不计算）
 *   method_id  收款方式 ID（biz_payment_method.id）
 *   voucher    凭证图片 URL（银行卡渠道必传，扫码直转可空）
 */
export const submitPaymentMark = (payload) => post('/pay/mark', payload)

/** 订单收款记录列表（展示登记状态） */
export const getPaymentList = (orderId) => get('/pay/list', { order_id: orderId })
