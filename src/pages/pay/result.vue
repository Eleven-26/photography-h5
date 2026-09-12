<template>
  <view class="page-wrap page-payr">
    <!-- 状态栏占位：稿顶部 iPhone 状态栏 44px（C08 y0-44，common.scss .status-bar） -->
    <view class="status-bar" />
    <AppNavBar title="支付状态" />

    <view class="page-payr__body">
      <!-- ① 状态头：金圈时钟 72（C08 原画板矢量）+ 20 Bold + 金额混排 -->
      <view class="page-payr__head">
        <AppIcon name="clock-processing" :size="72" />
        <text class="page-payr__head-title">{{ statusTitle }}</text>
        <view class="page-payr__head-sub">
          <text class="page-payr__head-pre">你已通过{{ paidMethod }}转账 </text>
          <text class="page-payr__head-num">¥{{ amountText }}</text>
        </view>
        <text v-if="paidAt" class="page-payr__head-time">转账时间：{{ paidAt }}</text>
      </view>

      <!-- ② 暖色提示条：tan@14% 底 r12 + 红点图标（C08 实测） -->
      <view class="page-payr__notice">
        <!-- C08 实测 18px 红色提示图标 -->
        <AppIcon name="alert-red" :size="18" />
        <view class="page-payr__notice-text">
          <text class="page-payr__notice-strong">已通知摄影师确认收款（登记）。</text>
          <text class="page-payr__notice-line">这不是支付失败，通常在2小时内完成确认。</text>
        </view>
      </view>

      <!-- ③ 进度标题（C08 实测 14 Bold #B8B9BF） -->
      <view class="page-payr__label"><text>进度</text></view>

      <!-- ④ 竖向时间线：done 白点/当前金点/未来灰点编号，分隔线 1.5×38（C08 实测） -->
      <view class="page-payr__timeline">
        <view v-for="(row, i) in timeline" :key="i" class="page-payr__tl-row">
          <view class="page-payr__tl-rail">
            <view
              class="page-payr__tl-dot"
              :class="row.state === 'current' ? 'page-payr__tl-dot--current' : row.state === 'future' ? 'page-payr__tl-dot--future' : ''"
            >
            <text v-if="row.state === 'future'">{{ i + 1 }}</text>
            <text v-else-if="row.state !== 'current'">✓</text>
            <!-- C08 实测当前步：金圆内白色时钟（$text-1 clock） -->
            <AppIcon v-else name="clock" :size="14" />
            </view>
            <view
              v-if="i < timeline.length - 1"
              class="page-payr__tl-line"
              :class="{ 'page-payr__tl-line--dim': row.state === 'future' }"
            />
          </view>
          <view class="page-payr__tl-body">
            <text class="page-payr__tl-title" :class="`page-payr__tl-title--${row.state}`">{{ row.title }}</text>
            <text v-if="row.sub" class="page-payr__tl-sub" :class="`page-payr__tl-sub--${row.state}`">{{ row.sub }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- ⑤ 底栏双钮：次级「返回首页」hug + 主钮「联系摄影师」fill（C08 实测） -->
    <view class="page-payr__footer">
      <AppButton type="secondary" @click="goHome">返回首页</AppButton>
      <AppButton flex @click="contact">联系摄影师</AppButton>
    </view>
  </view>
</template>

<script>
/**
 * C08 支付状态（画板 1:1738 一比一还原）—— 定金登记结果页
 *
 * 状态：等待摄影师确认收款（登记）→ 确认后档期正式锁定（2026-09-07 锁档口径）。
 * 数据源：biz_order_payment（status: 1-待确认收款 2-已确认）+ 订单进度（biz_order_log）。
 * 时间线 5 步对齐 C08 稿：提交预约 → 摄影师确认需求 → 你已转账 → 等待确认到账 → 档期正式锁定。
 * 演示数据：接口未联调时的降级（已标注，联调后移除）。
 */
import AppNavBar from '@/components/AppNavBar.vue'
import AppButton from '@/components/AppButton.vue'
import { getOrderDetail } from '@/api/order'
import { getPaymentList } from '@/api/payment'

export default {
  components: { AppNavBar, AppButton },
  data() {
    return {
      orderId: 0,
      payment: {}, /* 最新定金登记记录 */
      timeline: [],
      paidMethod: '微信',
      amountNum: 0,
    }
  },
  computed: {
    statusTitle() {
      /* payment.status: 1-待确认收款 2-已确认（enums.js 口径） */
      return Number(this.payment.status) === 2 ? '定金已确认收款' : '等待摄影师确认收款'
    },
    amountText() { return this.amountNum.toLocaleString() },
    paidAt() { return this.payment.paid_at ? this.payment.paid_at.replace(/-/g, '/') : '' },
  },
  onLoad(query) {
    this.orderId = Number(query.orderId || 0)
    this.loadData()
  },
  methods: {
    async loadData() {
      try {
        const res = await getPaymentList(this.orderId)
        const list = (res && res.data && res.data.list) || []
        this.payment = list.find((p) => p.type === 'deposit') || list[0] || {}
        this.amountNum = Number(this.payment.amount || 0)
      } catch (e) {
        /* ⚠️ 演示数据（对齐 C08 稿：微信 ¥804，8月8日 15:30），联调后移除 */
        this.payment = { status: 1, amount: 804, paid_at: '2026-08-08 15:30', channel_name: '微信' }
        this.amountNum = 804
      }
      this.paidMethod = this.payment.channel_name || this.paidMethod
      this.buildTimeline()
    },
    /** 时间线：done/current/future 三态（对齐 C08 稿 5 步） */
    buildTimeline() {
      const confirmed = Number(this.payment.status) === 2
      this.timeline = [
        { title: '提交预约', sub: this.payment.created_text || '订单已创建', state: 'done' },
        { title: '摄影师确认需求', sub: '路先生已确认', state: 'done' },
        { title: '你已转账', sub: `${this.paidMethod} · ¥${this.amountText}`, state: 'done' },
        { title: confirmed ? '摄影师已确认到账' : '等待摄影师确认到账', sub: confirmed ? '档期已正式锁定' : '进行中... 路先生将核对收款记录并登记', state: confirmed ? 'done' : 'current' },
        { title: '档期正式锁定', sub: '确认后自动锁定拍摄日档期', state: confirmed ? 'done' : 'future' },
      ]
    },
    goHome() {
      uni.reLaunch({ url: '/pages/index/index' })
    },
    contact() {
      /* 联系摄影师：拨号（C24 同款动作）；号码联调时读订单摄影师信息 */
      uni.makePhoneCall({ phoneNumber: this.payment.photographer_mobile || '', fail: () => {} })
    },
  },
}
</script>

<style lang="scss" scoped>
.page-payr {
  padding-bottom: 240rpx;
  &__body { padding: 0 $page-pad; }
  /* 状态头（C08 实测：金圆 72 + 20 Bold + 13 混排；头顶距导航 36px） */
  &__head { display: flex; flex-direction: column; align-items: center; padding: 72rpx 0 40rpx; }
  &__head-title { color: $text-1; font-size: 40rpx; font-weight: 600; margin-top: 38rpx; /* 字号按稿「9 字宽 178px」推算 20px、标题上距亦按稿推算 → 待真机复核；原 $fs-num-xl(28px) 偏大 */ }
  &__head-sub { margin-top: 16rpx; }
  &__head-pre { color: $text-2; font-size: 26rpx; }
  &__head-num { color: $text-1; font-size: 26rpx; font-weight: 600; }
  &__head-time { color: $text-2; font-size: 26rpx; margin-top: 6rpx; }
  /* 暖提示条（C08 实测：tan@14% r12，图标 #E37B76） */
  &__notice {
    display: flex;
    align-items: flex-start;
    gap: 20rpx;
    padding: 26rpx 32rpx;
    background-color: rgba(198, 159, 119, 0.14); /* C08 实测暖棕@14% */
    border-radius: $radius-cell;
  }
  &__notice-text { flex: 1; display: flex; flex-direction: column; }
  &__notice-strong { color: $text-1; font-size: 26rpx; font-weight: 600; }
  &__notice-line { color: $text-1; font-size: 26rpx; margin-top: 6rpx; }
  &__label { padding: 40rpx 8rpx 16rpx; text { color: $text-3; font-size: $fs-md; font-weight: 600; } }
  /* 竖向时间线（C08 实测：点 20 r10 / 线 1.5×38 / 行 gap12 pb16；卡 r16=32rpx） */
  &__timeline {
    padding: 32rpx;
    background-color: $bg-card;
    border: 1rpx solid $border-1;
    border-radius: 32rpx; /* 角部面积法实测 15.5px ≈ r16 */
  }
  &__tl-row { display: flex; gap: 24rpx; }
  &__tl-rail { flex: none; width: 40rpx; display: flex; flex-direction: column; align-items: center; }
  &__tl-dot {
    width: 40rpx;
    height: 40rpx;
    border-radius: 50%;
    background-color: $text-1; /* done 白点实测 */
    display: flex;
    align-items: center;
    justify-content: center;
    text { color: $bg-page; font-size: 20rpx; font-weight: 700; }
    &--current { background-color: $gold; text { color: $bg-page; } }
    &--future {
      background-color: $bg-card-2;
      text { color: #9E9E9E; font-weight: 400; } /* 未来步编号灰实测 */
    }
  }
  &__tl-line {
    width: 3rpx;
    height: 76rpx; /* 38px 实测 */
    background-color: $text-2;
    &--dim { background-color: $border-1; }
  }
  &__tl-body { display: flex; flex-direction: column; padding-bottom: 32rpx; }
  &__tl-title {
    font-size: $fs-md;
    font-weight: 500;
    &--done { color: $text-3; }
    &--current { color: $text-1; }
    &--future { color: $text-disabled; }
  }
  &__tl-sub {
    font-size: $fs-sm;
    margin-top: 4rpx;
    &--done { color: $text-2; }
    &--current { color: $text-2; }
    &--future { color: $text-disabled; }
  }
  &__footer {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    gap: $touch-gap;
    padding-top: 24rpx;
    padding-left: $page-pad;
    padding-right: $page-pad;
    padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
    background-color: rgba(23, 24, 28, 0.96);
    backdrop-filter: blur(20px);
    border-top: 1rpx solid $border-1;
  }
}
</style>
