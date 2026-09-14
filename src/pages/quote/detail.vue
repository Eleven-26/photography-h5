<template>
  <view class="page-wrap page-quote">
    <!-- 状态栏占位：设计稿顶部 Iphone 44px（C06 状态栏 0-44，导航行 44-88）。
         H5 由 .status-bar 固定 44px；MP 端 AppNavBar 已用系统值定位，避免双计。 -->
    <!-- #ifdef H5 -->
    <view class="status-bar" />
    <!-- #endif -->
    <AppNavBar title="查看报价" />

    <view class="page-quote__body">
      <!-- ① 报价头：14@0.5 / 24 Bold / 编号+有效期 14@0.4（C06 实测） -->
      <view class="page-quote__head">
        <text class="page-quote__head-tip">摄影师已为你准备报价</text>
        <text class="page-quote__head-name">{{ quoteTitle }}</text>
        <text class="page-quote__head-meta">报价编号 {{ quote.code || '—' }} · 有效期至 {{ validUntilText }}</text>
      </view>

      <!-- ② 拍摄信息卡：#25262A r16 pad16，行 y10 白@0.05 分隔（C06 实测） -->
      <view class="page-quote__card">
        <view v-for="row in infoRows" :key="row.label" class="page-quote__row">
          <text class="page-quote__row-label">{{ row.label }}</text>
          <text class="page-quote__row-value">{{ row.value }}</text>
        </view>
      </view>

      <!-- ③ 服务内容卡（C06 实测：标题 13 Bold@0.7，条目 13@0.6） -->
      <view class="page-quote__card page-quote__card--gap">
        <text class="page-quote__card-title">服务内容</text>
        <view class="page-quote__service">
          <text v-for="(line, i) in serviceLines" :key="i" class="page-quote__service-line">· {{ line }}</text>
        </view>
      </view>

      <!-- ④ 费用卡：套餐金额 14 / 定金 18 Bold 金 / 尾款 14@0.7（C06 实测） -->
      <view class="page-quote__card page-quote__card--fee">
        <view class="page-quote__row">
          <text class="page-quote__row-label">套餐金额</text>
          <text class="page-quote__row-value page-quote__row-value--bold">¥{{ totalText }}</text>
        </view>
        <view class="page-quote__row">
          <text class="page-quote__row-label">定金{{ depositRate ? ` (${depositRate}%)` : '' }}</text>
          <text class="page-quote__row-value page-quote__row-value--deposit">¥{{ depositText }}</text>
        </view>
        <view class="page-quote__row">
          <text class="page-quote__row-label">尾款</text>
          <text class="page-quote__row-value page-quote__row-value--dim">¥{{ finalText }}</text>
        </view>
      </view>

      <!-- ⑤ 提出修改入口：15@0.6 居中链接（C06 实测；无拒绝流程唯一异议出口） -->
      <view class="page-quote__revise pressable" @click="onRevise">
        <text>对报价有疑问？提出修改</text>
      </view>
    </view>

    <!-- ⑥ 底栏：白胶囊「确认报价并预约」h56（C06 实测） -->
    <view class="page-quote__footer">
      <AppButton block :loading="submitting" @click="onAccept">确认报价并预约</AppButton>
    </view>
  </view>
</template>

<script>
/**
 * C06 查看报价（画板 1:416 一比一还原）—— 定制需求 → 报价链路
 *
 * 流程口径①：无「拒绝报价」；有疑问走「提出修改」，谈不拢报价按 valid_until 自然过期。
 * 确认报价 → acceptQuote（写 accept_at，后端自动生成订单回写 order_id）→ 跳定金支付登记。
 * 数据源：biz_quote（标题/编号/拍摄信息/金额）+ biz_package（定金、服务内容口径）。
 * 「服务内容」由套餐真实字段拼装（精修张数 / 原片 / 修改次数 / 交付周期），不写死示例。
 */
import AppNavBar from '@/components/AppNavBar.vue'
import AppButton from '@/components/AppButton.vue'
import { getQuoteDetail, acceptQuote, requestQuoteRevision } from '@/api/quote'
import { getPackageDetail } from '@/api/package'

export default {
  components: { AppNavBar, AppButton },
  data() {
    return {
      quoteId: 0,
      quote: {},        // model.Quote
      pkg: {},          // model.Package（报价关联套餐，服务内容/定金来源）
      submitting: false,
    }
  },
  computed: {
    quoteTitle() {
      return this.quote.title || this.quote.package_name || '定制拍摄报价'
    },
    infoRows() {
      const q = this.quote
      return [
        { label: '拍摄日期', value: q.shoot_date || '—' },
        { label: '拍摄时间', value: q.shoot_time || '—' },
        { label: '拍摄地点', value: q.location || '—' },
        { label: '拍摄人数', value: q.people_count || '—' },
        { label: '拍摄时长', value: q.duration_hours ? `${q.duration_hours}小时` : '—' },
      ]
    },
    /** 服务内容：优先套餐真实字段；套餐缺失时退回报价时长等已下发字段 */
    serviceLines() {
      const p = this.pkg || {}
      const q = this.quote || {}
      const lines = []
      if (p.shoot_hours || q.duration_hours) lines.push(`${p.shoot_hours || q.duration_hours}小时拍摄`)
      if (p.photos_included) lines.push(`${p.photos_included}张精修`)
      if (p.raw_count) lines.push(`${p.raw_count}张原片`)
      if (p.revision_count) lines.push(`${p.revision_count}次修改机会`)
      if (p.delivery_days) lines.push(`${p.delivery_days}个工作日交付`)
      if (p.content_desc) lines.push(p.content_desc)
      /* 报价加项清单（JSON 数组，后端 biz_quote.addons） */
      if (q.addons) {
        try {
          const arr = typeof q.addons === 'string' ? JSON.parse(q.addons) : q.addons
          if (Array.isArray(arr)) {
            arr.forEach((a) => {
              const name = (a && (a.name || a.title)) || ''
              const price = Number((a && (a.price || a.amount)) || 0)
              if (name) lines.push(price > 0 ? `${name} +¥${price.toLocaleString()}` : name)
            })
          }
        } catch (e) { /* addons 非合法 JSON 时忽略该行 */ }
      }
      return lines
    },
    /* 金额：后端 DECIMAL 元，前端只格式化不计算（金额计算一律以服务端返回为准） */
    totalNum() { return Number(this.quote.total_price || 0) },
    /** 定金比例（biz_package.deposit_rate%）；无套餐时不在标签展示百分比 */
    depositRate() { return Number(this.pkg.deposit_rate || 0) },
    /** 定金金额：优先套餐快照 deposit_amt；缺失时按比例兜底（仅展示口径） */
    depositNum() {
      if (this.pkg.deposit_amt) return Number(this.pkg.deposit_amt)
      return this.depositRate ? Math.round(this.totalNum * this.depositRate / 100) : 0
    },
    finalNum() { return Math.max(0, this.totalNum - this.depositNum) },
    totalText() { return this.totalNum.toLocaleString() },
    depositText() { return this.depositNum.toLocaleString() },
    finalText() { return this.finalNum.toLocaleString() },
    validUntilText() {
      const v = this.quote.valid_until
      if (!v) return '—'
      const d = new Date(String(v).replace(/-/g, '/'))
      if (Number.isNaN(d.getTime())) return '—'
      return `${d.getMonth() + 1}月${d.getDate()}日`
    },
  },
  onLoad(query) {
    this.quoteId = Number(query.id || 0)
    this.loadQuote()
  },
  methods: {
    async loadQuote() {
      /* 后端 /quote/detail 返回 model.Quote（rpc 已解包 data） */
      const res = await getQuoteDetail(this.quoteId).catch(() => null)
      this.quote = res || {}
      if (this.quote.package_id) {
        const pkg = await getPackageDetail(this.quote.package_id).catch(() => null)
        this.pkg = pkg || {}
      }
    },
    /** 提出修改：无拒绝流程的唯一异议出口（谈不拢自然过期，X1 仅指超时） */
    onRevise() {
      uni.showModal({
        title: '提出修改',
        editable: true,
        placeholderText: '写下你的修改意见，摄影师会重新报价',
        success: async (res) => {
          if (!res.confirm || !res.content) return
          try {
            await requestQuoteRevision(this.quoteId, res.content)
            uni.showToast({ title: '已提交修改意见', icon: 'success' })
          } catch (e) {
            uni.showToast({ title: (e && e.message) || '提交失败，请重试', icon: 'none' })
          }
        },
      })
    },
    /** 确认报价 → 后端自动生成订单 → 进定金支付（锁档口径：支付定金后正式锁档） */
    async onAccept() {
      if (this.submitting) return
      this.submitting = true
      try {
        const res = await acceptQuote(this.quoteId)
        const orderId = res && res.data && (res.data.order_id || res.data.id)
        uni.redirectTo({ url: orderId ? `/pages/pay/deposit?orderId=${orderId}` : '/pages/order/list' })
      } catch (e) {
        uni.showToast({ title: (e && e.message) || '确认失败，请重试', icon: 'none' })
      } finally {
        this.submitting = false
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.page-quote {
  padding-bottom: 240rpx;
  &__body { padding: 0 $page-pad; }
  &__head { padding: 44rpx 0 26rpx; display: flex; flex-direction: column; }
  &__head-tip { color: rgba(247, 248, 248, 0.5); font-size: $fs-md; /* 白@0.5 实测 */ }
  &__head-name {
    color: $text-1;
    font-size: 48rpx; /* 24px 实测 */
    font-weight: 600;
    margin-top: 20rpx; /* 稿：提示墨迹底 y125px → 标题墨迹顶 y143px（18px 行距） */
  }
  &__head-meta { color: rgba(247, 248, 248, 0.4); font-size: $fs-md; margin-top: 24rpx; /* 白@0.4 实测；稿标题墨迹底 y165px → 编号墨迹顶 y186.5px */ }
  /* 信息/费用卡：#25262A r16（C06 实测二级卡底）
   * 稿：卡1 pad 8px/16px（y214.5-445.5px）、行墨迹间距 43px；
   *     卡2 pad 16px、卡3 pad 12px、三卡间距 23px（y445.5→468.5→621.5→643.5） */
  &__card {
    padding: 16rpx 32rpx;
    background-color: $bg-card-2;
    border-radius: 32rpx;
    &--gap { padding: 32rpx; margin-top: 48rpx; }
    &--fee { padding: 24rpx 32rpx; margin-top: 48rpx; }
  }
  &__card-title { color: rgba(247, 248, 248, 0.7); font-size: 26rpx; font-weight: 600; /* 13 Bold@0.7 实测 */ }
  &__service { margin-top: 16rpx; display: flex; flex-direction: column; } /* 稿：标题墨迹底 y499px → 首行墨迹顶 y517.5px */
  &__service-line { color: rgba(247, 248, 248, 0.6); font-size: 26rpx; line-height: 47rpx; /* 13@0.6 lh23.4 实测 */ }
  &__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 26rpx 0; /* 稿：卡1 行距 86rpx（y236.5→279.5→322.5→365.5→408.5px） */
    border-bottom: 1rpx solid rgba(247, 248, 248, 0.05); /* 白@0.05 分隔实测 */
    &:last-child { border-bottom: none; }
  }
  &__row-label { color: rgba(247, 248, 248, 0.5); font-size: $fs-md; }
  &__row-value {
    color: $text-1;
    font-size: $fs-md;
    font-weight: 500;
    &--bold { font-weight: 600; }
    &--deposit { color: $gold; font-size: 36rpx; font-weight: 600; /* 18 Bold 金 实测 */ }
    &--dim { color: rgba(247, 248, 248, 0.7); }
  }
  &__revise {
    display: flex;
    justify-content: center;
    padding: 60rpx 40rpx 32rpx; /* 稿：费用卡底 y809px → 链接墨迹顶 y842.5px（33.5px 间距） */
    text { color: rgba(247, 248, 248, 0.6); font-size: 30rpx; /* 15@0.6 实测 */ }
  }
  &__footer {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    padding-top: 24rpx;
    padding-left: $page-pad;
    padding-right: $page-pad;
    padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
    background-color: rgba(23, 24, 28, 0.96);
    backdrop-filter: blur(20px);
    border-top: 1rpx solid $border-1; /* C06 底栏描边实测 */
  }
}
</style>
