/**
 * 报价模块 —— 查看 / 接受 / 提出修改（无「拒绝报价」入口，口径①）
 *
 * 后端路由：POST /h5/quote/{list,detail/:id,accept/:id,modify/:id}
 * 流程口径：接受报价 → 后端自动建单（source_type=3）并预占档期 → 摄影师核对锁档。
 * 「提出修改」是唯一异议出口（谈不拢报价自然过期），不是「拒绝」。
 */
import { rpc } from '@/api/common/http'
import { API_PATHS } from '@/api/common/apiPath'

/** 我的报价单列表（含明细字段，前端按 id 取单条即可） */
export const getQuoteList = () => rpc(API_PATHS.quote.list, {})

/** 报价详情 @param {number} id biz_quote.id */
export const getQuoteDetail = (id) => rpc(API_PATHS.quote.detail, {}, id)

/** 接受报价（写 accept_at → 后端自动建单回写 order_id）@param {number} id biz_quote.id */
export const acceptQuote = (id) => rpc(API_PATHS.quote.accept, {}, id)

/**
 * 提出修改意见
 * @param {number} id biz_quote.id
 * @param {string} content 修改意见内容
 */
export const requestQuoteRevision = (id, content) => rpc(API_PATHS.quote.modify, { content }, id)
