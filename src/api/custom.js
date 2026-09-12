/**
 * 定制需求模块（画板 C27）
 * 口径②：定制需求一律走报价流程 —— 提交后进 biz_custom_request（status 1-待处理），
 *         可转化线索（lead_id），不产生直约订单。
 * ⚠️ 接口路径联调前以后端 h5.go 实际注册为准。
 */
import { post } from '@/utils/request'

/**
 * 提交定制需求
 * @param {Object} payload 字段严格对齐 biz_custom_request：
 *   name           称呼
 *   mobile         联系电话
 *   project_type   拍摄类型（家庭纪念/个人写真/情侣/婚纱/儿童写真/活动跟拍/其他）
 *   expected_date  期望拍摄日期（如 "2026年8月下旬"）
 *   location       期望拍摄地点
 *   budget_min     预算下限（元）
 *   budget_max     预算上限（元）
 *   detail         详细需求
 *   images         参考图片 URL（逗号分隔）
 */
export const submitCustomRequest = (payload) => post('/custom-request/submit', payload)
