/**
 * 主页模块 —— 摄影师主页 / 作品集 / 套餐 / 档期
 * 后端数据源：biz_asset（作品）、biz_package（套餐，status=1 已上架）、
 *             biz_slot_template + biz_calendar_block（可约档期）、biz_studio_setting（主页设置）
 * ⚠️ 接口路径以后端 h5.go 实际注册为准，联调前逐条核对。
 */
import { get } from '@/utils/request'

/** 主页聚合（工作室 slogan/简介/精选作品，对应画板 C01） */
export const getHome = () => get('/home')

/** 作品列表（画板 C24）@param {Object} params {page, page_size} */
export const getAssets = (params) => get('/asset/list', params)

/** 已上架套餐列表（画板 C02 数据源，仅 status=1） */
export const getPackages = () => get('/package/list')

/** 套餐详情 @param {number} id biz_package.id */
export const getPackageDetail = (id) => get('/package/detail', { id })

/** 可约档期（biz_slot_template 生成规则 + biz_calendar_block 已占用过滤） */
export const getAvailableSlots = (params) => get('/schedule/available', params)

/** 收款方式（biz_payment_method，展示收款码用） */
export const getPaymentMethods = () => get('/payment-method/list')
