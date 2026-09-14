/**
 * 定制需求模块（画板 C27）
 *
 * 口径②：定制需求一律走报价流程 —— 提交后进 biz_custom_request（status 1-待处理），
 *         可转化线索（lead_id），不产生直约订单。
 * 后端路由：POST /h5/custom-request/submit（公开）、POST /h5/custom-request/list（登录）
 */
import { rpc } from '@/api/common/http'
import { API_PATHS } from '@/api/common/apiPath'

/**
 * 提交定制需求
 * @param {Object} payload 字段严格对齐 biz_custom_request：
 *   name / mobile / project_type / expected_date / location /
 *   budget_min / budget_max / detail / images(逗号分隔字符串)
 * ⚠️ 该接口为**公开路由**（无 CustomerAuth）：后端 GetClientUser 恒为 nil，一律按游客处理，
 *    故 mobile 必填（name 可空）；预算为两个数字，不用档位文案；参考图不是数组。
 */
export const submitCustomRequest = (payload) => rpc(API_PATHS.customRequest.submit, payload)

/** 我的定制需求列表（分页） */
export const getCustomRequests = (params) => rpc(API_PATHS.customRequest.list, params)
