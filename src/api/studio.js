/**
 * 工作室主页模块（公开）—— 预约主页聚合信息
 *
 * 后端路由：POST /h5/studio/info（原前端臆想的 /home 并不存在）
 * 租户定位由 slug 反查，客户端不传 company_id（#29 防遍历）。
 */
import { rpc } from '@/api/common/http'
import { API_PATHS } from '@/api/common/apiPath'

/** 工作室预约主页聚合（slogan/简介/精选作品，画板 C01） */
export const getStudioInfo = () => rpc(API_PATHS.studio.info, {})
