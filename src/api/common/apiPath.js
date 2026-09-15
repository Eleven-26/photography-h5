/**
 * API 路径注册表 —— 单一事实来源
 *
 * 对齐 SLOT 管理端 photography-frontend/src/api/common/apiPath.ts：
 * 路径只在这里声明一次，api/*.js 只引用常量、不写字面量 ——
 * 避免同一条路径在多个模块里各写一遍、然后各错各的。
 *
 * ⚠️ 路径口径（2026-09-12 按后端真实路由逐条核对，见 photography-server/internal/presentation/h5/h5.go）：
 * 1. 所有业务接口一律 **POST + JSON body**，路径参数用 :id / :order_id（后端不读 query，见 internal/pkg/params）；
 * 2. 这里写的是**去掉端前缀**后的相对路径，端前缀由 rpc() 统一拼接；
 * 3. `:id` 语义是重灾区，易错的几条已就地标注 —— 尤其：
 *      /delivery/detail/:id 与 /delivery/items/:id 的 :id 都是 **order_id**（按订单反查交付单）；
 *      /delivery/select|confirm-extra|confirm/:id 的 :id 才是 **delivery_id**。
 */

/* eslint-disable no-useless-assignment -- uni-app 条件编译约定：``先给默认值、再按平台重赋值``。
   ESLint 不解析 `// #ifdef` 注释，会把默认值赋值误判为「后续未被使用」；而改成重复 `const`
   声明又会在预处理前变成非法 JS（重复声明）。故仅对本文件豁免该规则，其余文件照常生效。 */

/** 端前缀：H5 走 /api/h5（devServer / nginx 剥掉 /api），小程序直连 /h5 */
let apiPrefix = '/h5'
// #ifdef H5
apiPrefix = '/api/h5'
// #endif
export const API_PREFIX = apiPrefix

export const API_PATHS = {
  // 认证（公开）
  auth: {
    smsCode: 'auth/sms-code',
    login: 'auth/login'
  },
  // 预约主页（公开；租户由 slug 反查，客户端不传 company_id）
  studio: { info: 'studio/info' },
  package: {
    list: 'package/list',
    detail: 'package/detail'
  },
  asset: {
    list: 'asset/list',
    detail: 'asset/detail'
  },
  slot: { list: 'slot/list' },
  // 客户中心（CC01，登录后）：个人资料读写。
  // 字段白名单见后端 dto.ClientProfileUpdateReq —— crm_customer 与员工端共用一张表，
  // remark / tags / level / source / status 属工作室内部信息，客户端不可读也不可改。
  customer: {
    profile: 'customer/profile',
    profileUpdate: 'customer/profile/update'
  },
  // 定制需求
  customRequest: {
    submit: 'custom-request/submit',
    list: 'custom-request/list'
  },
  // 订单
  order: {
    submit: 'order/submit',
    list: 'order/list',
    detail: 'order/detail',
    confirm: 'order/confirm',
    cancel: 'order/cancel',
    /** 拍前准备已读（:id = order_id，幂等） */
    prepRead: 'order/prep/read',
    /** 修改拍摄需求（:id = order_id，仅待定金/待拍摄） */
    requirementUpdate: 'order/requirement/update'
  },
  // 改期（:order_id 为订单 ID，:id 为改期单 ID）
  reschedule: {
    apply: 'reschedule/apply',
    cancel: 'reschedule/cancel',
    list: 'reschedule/list',
    detail: 'reschedule/detail',
    pay: 'reschedule/pay'
  },
  // 退款
  refund: {
    apply: 'refund/apply',
    list: 'refund/list',
    /** :id = 退款单 ID（客户确认收到退款） */
    confirm: 'refund/confirm'
  },
  // 收款（资金不经平台：/pay/mark 只登记，确认在员工端）
  payment: { list: 'payment/list' },
  pay: { mark: 'pay/mark' },
  paymentMethod: { list: 'payment-method/list' },
  review: {
    /** :order_id = 订单 ID（订单完成后才能评价，每单一评） */
    create: 'review/create',
    /** 我的评价（客户中心 → 我的评价；不分页，返回评价+订单快照的集合） */
    list: 'review/list'
  },
  // 交付（⚠️ detail/items 的 :id = order_id；select/confirm-extra/confirm 的 :id = delivery_id）
  delivery: {
    detail: 'delivery/detail',
    items: 'delivery/items',
    select: 'delivery/select',
    confirmExtra: 'delivery/confirm-extra',
    confirm: 'delivery/confirm',
    /** :item_id = 交付明细 ID */
    feedback: 'delivery/feedback',
    /** 加片费试算（:id = delivery_id） */
    extraQuote: 'delivery/extra-quote'
  },
  // 报价
  quote: {
    list: 'quote/list',
    detail: 'quote/detail',
    accept: 'quote/accept',
    modify: 'quote/modify'
  },
  // 站内通知
  notification: {
    list: 'notification/list',
    unreadCount: 'notification/unread-count',
    read: 'notification/read',
    readAll: 'notification/read-all'
  }
}
