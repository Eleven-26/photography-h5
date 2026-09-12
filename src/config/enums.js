/**
 * 后端枚举字典（前端展示的唯一状态来源）
 *
 * ⚠️ 字段纪律（需求文档 v1.3 §4.3）：
 * 1. 所有枚举值与文案对齐 photography-server DDL 字段注释，禁止自造状态值；
 * 2. 后端注释「待核验」为禁词，前端展示统一「待确认收款」（差异确认单 B9）；
 * 3. 报价状态 4-已拒绝：业务上无「拒绝报价」流程（口径①），该值不会被接口暴露，
 *    前端也不渲染任何「拒绝」入口。
 */

/** 订单状态 biz_order.status（DDL：0-待确认(客户预约) 1-待定金 2-待拍摄 3-拍摄中 4-精修中 5-待交付 6-已完成 7-已取消） */
export const ORDER_STATUS = {
  0: '待确认',
  1: '待定金',
  2: '待拍摄',
  3: '拍摄中',
  4: '精修中',
  5: '待交付',
  6: '已完成',
  7: '已取消',
}

/** 支付状态 biz_order.payment_status（DDL：1-待核验 2-已确认 3-已全额 4-待支付 5-已退款；1 展示为禁词修正文案） */
export const PAYMENT_STATUS = {
  1: '待确认收款',
  2: '已确认',
  3: '已全额',
  4: '待支付',
  5: '已退款',
}

/** 收款类型 biz_order_payment.type（DDL：deposit-定金 final-尾款 addon-加选；调度费类型缺位=确认单 B12） */
export const PAYMENT_TYPE = {
  deposit: '定金',
  final: '尾款',
  addon: '加选',
}

/** 交付阶段 biz_delivery.stage（DDL：1-待上传样片 2-客户选片中 3-精修进行中 4-待确认交付 5-已交付） */
export const DELIVERY_STAGE = {
  1: '待上传样片',
  2: '客户选片中',
  3: '精修进行中',
  4: '待确认交付',
  5: '已交付',
}

/** 交付明细用途 biz_delivery_item.kind（DDL：1-样片 2-已选 3-精修成品） */
export const DELIVERY_KIND = {
  1: '样片',
  2: '已选',
  3: '精修成品',
}

/** 改期费用类型 biz_order_reschedule.fee_type（DDL：1-免费 2-收调度费 3-不可改期） */
export const FEE_TYPE = {
  1: '免费',
  2: '收调度费',
  3: '不可改期',
}

/** 改期单状态 biz_order_reschedule.status（DDL：1-待确认 2-已同意 3-已拒绝 4-已取消） */
export const RESCHEDULE_STATUS = {
  1: '待确认',
  2: '已同意',
  3: '已拒绝',
  4: '已取消',
}

/** 退款状态 biz_order_refund.status（DDL：1-申请中 2-已通过 3-已退款 4-已驳回） */
export const REFUND_STATUS = {
  1: '申请中',
  2: '已通过',
  3: '已退款',
  4: '已驳回',
}

/** 报价状态 biz_quote.status（DDL：1-草稿 2-已发送 3-已接受 4-已拒绝 5-已成交；4 按口径①不暴露） */
export const QUOTE_STATUS = {
  1: '草稿',
  2: '已发送',
  3: '已接受',
  5: '已成交',
}

/** 套餐状态 biz_package.status（DDL：1-已上架 2-草稿 3-已下线；快捷直约仅对 status=1 开放，口径②） */
export const PACKAGE_STATUS = {
  1: '已上架',
  2: '草稿',
  3: '已下线',
}

/** 收款方式类型 biz_payment_method.type（DDL：wechat-微信 alipay-支付宝 bank-银行转账 cash-现金 other-其他） */
export const PAY_METHOD_TYPE = {
  wechat: '微信',
  alipay: '支付宝',
  bank: '银行转账',
  cash: '现金',
  other: '其他',
}

/** 订单加项分类 biz_order_addon.category（DDL：makeup-妆造 urgency-时效 service-服务 retouch-精修） */
export const ADDON_CATEGORY = {
  makeup: '妆造',
  urgency: '时效',
  service: '服务',
  retouch: '精修',
}

/** 订单来源 biz_order.source_type（DDL：1-管理端录入 2-客户预约(H5/小程序) 3-线索报价转化） */
export const SOURCE_TYPE = {
  1: '管理端录入',
  2: '客户预约',
  3: '线索报价转化',
}

/** 反馈优先级 biz_delivery_item.feedback_priority（DDL：normal-一般 important-重要 urgent-紧急） */
export const FEEDBACK_PRIORITY = {
  normal: '一般',
  important: '重要',
  urgent: '紧急',
}

/**
 * 客户侧展示态聚合（后端 0-7 + payment_status → 文档 S1-S11 的 UI 映射）
 * 仅用于展示层文案，不新增状态值；权威映射以后端确认单 B11 回勾结果为准。
 */
export const ORDER_VIEW_STATE = {
  0: '待确认',
  1: '待支付定金',
  2: '待拍摄',
  3: '拍摄中',
  4: '精修中',
  5: '待交付',
  6: '已完成',
  7: '已取消',
}
