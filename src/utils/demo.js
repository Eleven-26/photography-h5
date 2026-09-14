/**
 * 演示模式数据（联调后整体移除）
 *
 * 背景：后端未联调期间，用登录页「演示模式」（demo-token）进入后，
 * 提交预约 → 定金支付 → 登记结果链路需可走通，否则 C05 提交后卡死无法预览后续页面。
 * 口径对齐统一数据：套餐 ¥2,680 / 定金 30% ¥804 / 尾款基数 ¥1,876。
 *
 * 判定：token === 'demo-token'（useUserStore.login 写入）。
 * 联调切换：删除本文件 + 各页 isDemo() 分支即可，不影响真实接口逻辑。
 */
import { getToken } from '@/utils/auth'

/** 是否演示模式（登录页「演示模式」入口写入的 demo-token） */
export function isDemo() {
  try {
    return getToken() === 'demo-token'
  } catch (e) {
    return false
  }
}

/**
 * 是否允许用「占位（设计稿）数据」兜底 —— **默认关闭**。
 *
 * 打开方式：在 `.env.[mode]` 里设 `VITE_ALLOW_DEMO=true`（仅联调/视觉走查时用）。
 * 页面只在接口确实无数据时才用画板导出的占位图与文案顶上。
 *
 * ⚠️ 为什么必须默认关：占位兜底一旦默认开启，会把「接口没返回真实数据」伪装成
 * 「页面看着正常」。2026-09-14 的套餐列表就是被它掩盖的 —— 列表里显示的是设计稿
 * 假套餐、点进去拿假 id 请求真接口直接报错，排查方向一度被带偏到后端。
 * 排查数据问题时，先确认本开关为 false，再去看空态与接口返回。
 */
export function allowPlaceholder() {
  return import.meta.env.VITE_ALLOW_DEMO === 'true'
}

/**
 * 演示银行卡收款信息（C07/C16/B2 银行卡渠道展示用，联调后移除）
 * 真实数据来源：摄影师收款账户信息（后端字段联调核对，暂读页面内 DEMO_BANK 兜底）。
 */
export const DEMO_BANK = {
  holder: '路先生',
  card_no: '6222 0208 1234 5678 901',
  bank: '中国工商银行 广州越秀支行',
}

/**
 * 演示订单：C05 提交预约后生成（模拟后端 biz_order 返回）
 * status=1 待确认 / payment_status=1 待付定金；金额对齐统一口径（*_cents 分）。
 */
export const DEMO_ORDER = {
  id: 90001,
  code: 'S20260907001',
  package_id: 1,
  package_name: '家庭纪念写真',
  total_amt_cents: 268000,
  deposit_amt_cents: 80400,
  final_amt_cents: 187600,
  total_amt: 2680, /* 展示用元值（C07 总额行读取） */
  deposit_amt: 804, /* 展示用元值（C07 金额卡直接读） */
  final_amt: 1876,
  status: 1,
  payment_status: 1,
  photographer_name: '路先生',
  shoot_date: '2026-08-08',
  shoot_time: '10:00-12:30',
  shoot_address: '越秀公园',
}
