/**
 * 套餐模块（公开）—— 已上架套餐列表与详情
 *
 * 后端路由：POST /h5/package/list、POST /h5/package/detail/:id
 * 只出 status=2（已上架，见 constants/enums.js 的 PACKAGE_STATUS.ACTIVE）套餐；快捷直约同样仅对已上架完整套餐开放（后端 BookingSubmit 校验）。
 */
import { rpc } from '@/api/common/http'
import { API_PATHS } from '@/api/common/apiPath'

/** 已上架套餐列表（画板 C02）@param {Object} params { page, page_size, category? } */
export const getPackages = (params) => rpc(API_PATHS.package.list, params)

/** 套餐详情 @param {number} id biz_package.id */
export const getPackageDetail = (id) => rpc(API_PATHS.package.detail, {}, id)
