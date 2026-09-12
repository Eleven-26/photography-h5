/**
 * 档期模块（公开）—— 可约时段
 *
 * 后端路由：POST /h5/slot/list（原前端臆想的 /schedule/available 并不存在）
 * body: { date, photographer_id? }
 */
import { rpc } from '@/api/common/http'
import { API_PATHS } from '@/api/common/apiPath'

/** 可约档期（biz_slot_template 生成规则 + biz_calendar_block 已占用过滤） */
export const getAvailableSlots = (params) => rpc(API_PATHS.slot.list, params)
