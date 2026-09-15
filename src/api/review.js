/**
 * 评价模块 —— 客户中心「我的评价」（只读）
 *
 * 后端路由：POST /h5/review/list（需登录；归属由令牌内 customer_id 锁定，客户端不传 customer_id）
 * 返回不分页的评价集合，每条带订单快照（order_code / package_name / shoot_date），
 * 客户不必为每条评价再回查一次订单详情。
 *
 * 说明：提交评价接口（POST /h5/review/create/:order_id）后端已就绪，
 * 但本端尚未接提交页（交付页仍是「即将开放」占位），故此处不导出提交方法。
 */
import { rpc } from '@/api/common/http'
import { API_PATHS } from '@/api/common/apiPath'

/**
 * 我的评价
 * @returns {Promise<Array>} [{ id, order_id, rating, content, images, is_anonymous,
 *                              reply, reply_at, created_at, order_code, package_name, shoot_date }]
 */
export const getMyReviews = () => rpc(API_PATHS.review.list)
