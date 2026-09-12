/**
 * 报价模块 —— 报价查看 / 确认（无「拒绝报价」入口，口径①）
 * 后端字段：biz_quote（valid_until 48h 有效期 / accept_at 客户接受时间 / order_id 转化回写）
 * 流程口径：确认报价 → 系统自动生成订单（source_type=3）并预占档期 → 摄影师核对锁档
 * ⚠️ 接口路径联调前以后端 h5.go 实际注册为准。
 */
import { get, post } from '@/utils/request'

/** 报价详情 @param {number} id biz_quote.id（status=2 已发送 且未过 valid_until 才可确认） */
export const getQuoteDetail = (id) => get('/quote/detail', { id })

/**
 * 确认报价（写 accept_at → 后端自动建单回写 order_id）
 * @param {number} id biz_quote.id
 */
export const acceptQuote = (id) => post('/quote/accept', { id })

/**
 * 提出修改（无拒绝流程的唯一异议出口：生成修改意见，谈不拢报价自然过期）
 * @param {number} id    biz_quote.id
 * @param {string} content 修改意见内容
 */
export const requestQuoteRevision = (id, content) =>
  post('/quote/revision', { id, content })
