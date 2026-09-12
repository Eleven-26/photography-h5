/**
 * 作品集模块（公开）—— 只出「已发布 + 公开」作品
 *
 * 后端路由：POST /h5/asset/list、POST /h5/asset/detail/:id
 */
import { rpc } from '@/api/common/http'
import { API_PATHS } from '@/api/common/apiPath'

/** 作品列表（画板 C24）@param {Object} params { page, page_size, category?, featured? } */
export const getAssets = (params) => rpc(API_PATHS.asset.list, params)

/** 作品详情（浏览数 +1）@param {number} id biz_asset.id */
export const getAssetDetail = (id) => rpc(API_PATHS.asset.detail, {}, id)
