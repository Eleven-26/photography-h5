<template>
  <view class="page-wrap page-rres">
    <view class="status-bar" />
    <AppNavBar title="支付状态" />

    <!-- ① 状态头（B2 实测：金圈时钟 72 + 20 Bold + 金额混排，同构 C16A） -->
    <view class="page-rres__head">
      <!-- B2 实测 72px 金圈时钟（原画板矢量，与 C16A 同源） -->
      <AppIcon name="clock-processing" :size="72" />
      <text class="page-rres__head-title">等待摄影师确认调度费收款</text>
      <view class="page-rres__head-sub">
        <text class="page-rres__head-dim">你已通过微信转账 </text>
        <text class="page-rres__head-amt">¥{{ amountText }}</text>
      </view>
      <text v-if="markAt" class="page-rres__head-time">转账时间：{{ markAt }}</text>
    </view>

    <!-- ② 暖棕提示（B2 实测 #C29F77@14% + 红图标） -->
    <view class="page-rres__warn">
      <!-- B2 实测 18px 红色提示图标 -->
      <AppIcon name="alert-red" :size="18" />
      <view class="page-rres__warn-body">
        <text class="page-rres__warn-line">已通知摄影师确认收款（登记）。</text>
        <text class="page-rres__warn-line">确认后新档期 {{ newText }} 生效。</text>
      </view>
    </view>

    <!-- ③ 进度标签 -->
    <view class="page-rres__label"><text>进度</text></view>

    <!-- ④ 五步时间线（B2 实测：申请改期/选择新档期/你已转账调度费/等待确认/改期生效） -->
    <view class="page-rres__tl">
      <view
        v-for="(step, i) in steps"
        :key="i"
        class="page-rres__row"
        :class="{ 'page-rres__row--last': i === steps.length - 1 }"
      >
        <view class="page-rres__node" :class="`page-rres__node--${step.state}`">
          <view v-if="step.state === 'done'" class="page-rres__tick" />
          <text v-else-if="step.state === 'future'" class="page-rres__node-num">{{ i + 1 }}</text>
        </view>
        <view
          v-if="i < steps.length - 1"
          class="page-rres__line"
          :class="{ 'page-rres__line--done': step.state === 'done' }"
        />
        <view class="page-rres__text">
          <text class="page-rres__row-title" :class="`page-rres__row-title--${step.state}`">{{ step.title }}</text>
          <text v-if="step.sub" class="page-rres__row-sub">{{ step.sub }}</text>
        </view>
      </view>
    </view>

    <!-- ⑤ 底栏双钮（同族 C16A 实测：hug 描边返回 + fill 主钮联系摄影师） -->
    <view class="page-rres__footer">
      <AppButton type="secondary" hug @click="goBack">返回改期申请</AppButton>
      <AppButton flex @click="contact">联系摄影师</AppButton>
    </view>
  </view>
</template>

<script>
/**
 * B2 改期调度费支付状态（画板 10:1 一比一还原，结构同 C16A）
 * 流程：C19 确认改期 → fee.vue 支付登记 → 本页等待摄影师确认 → 改期生效
 * 五步：申请改期(done) / 选择新档期(done) / 你已转账调度费(done) / 等待确认(current) / 改期生效(future)
 */
import AppNavBar from '@/components/AppNavBar.vue'
import AppButton from '@/components/AppButton.vue'
import { getRescheduleList } from '@/api/reschedule'
import { formatAmount } from '@/utils/format'

export default {
  components: { AppNavBar, AppButton },
  data() {
    return {
      orderId: 0,
      /* 最新改期单（model.OrderReschedule：new_date / new_time / fee_amount / status） */
      rs: {},
      fee: 0,
    }
  },
  computed: {
    amountText() { return formatAmount(this.fee) },
    /* 申请时间 = 改期单创建时间（TenantBase.created_at） */
    applyAt() { return this.rs.created_at || '' },
    /* 新档期：new_date + new_time */
    newText() {
      return [this.rs.new_date, this.rs.new_time].filter(Boolean).join(' ') || '待确认'
    },
    /* 转账时间：需按改期单关联查 biz_order_payment.client_marked_at，后端暂未聚合 → 无值即不渲染 */
    markAt() { return '' },
    /* status：1-待确认 2-已同意 3-已拒绝 4-已取消（enum.RescheduleStatus） */
    confirmed() { return Number(this.rs.status) === 2 },
    steps() {
      return [
        { state: 'done', title: '申请改期', sub: this.applyAt },
        { state: 'done', title: '选择新档期', sub: this.newText },
        { state: 'done', title: '你已转账调度费', sub: `¥${this.amountText}` },
        this.confirmed
          ? { state: 'done', title: '摄影师已确认收款', sub: '登记完成' }
          : { state: 'current', title: '等待摄影师确认调度费收款', sub: '摄影师将核对收款记录并登记' },
        { state: 'future', title: '改期生效', sub: `确认后新档期 ${this.newText} 生效` },
      ]
    },
  },
  onLoad(query) {
    this.orderId = Number(query.orderId || 0)
    if (query.fee) this.fee = Number(query.fee)
    this.load()
  },
  methods: {
    formatAmount,
    async load() {
      if (!this.orderId) return
      try {
        const list = await getRescheduleList(this.orderId)
        /* rpc 已解包 data；改期单列表不分页 → 后端直接返回数组 */
        const arr = Array.isArray(list) ? list : (list && list.list) || []
        this.rs = arr[0] || {}
        if (this.rs.fee_amount != null) this.fee = Number(this.rs.fee_amount)
      } catch (e) {
        /* request 层已 toast；保留路由带入的 fee，不注入演示数据 */
      }
    },
    goBack() {
      uni.navigateBack({ delta: 1 })
    },
    contact() {
      /* ⚠️ 摄影师联系电话后端未下发（studio/info 无该字段）→ 不用假号码发起拨号 */
      uni.showToast({ title: '联系方式待工作室配置', icon: 'none' })
    },
  },
}
</script>

<style lang="scss" scoped>
/* 与 C16A 同构（B2 画板一比一），节点/线/提示卡规格一致，不再重复注释 */
.page-rres {
  padding-bottom: 240rpx;

  &__head {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 64rpx $page-pad 40rpx;
  }
  &__head-title { color: $text-1; font-size: 40rpx; font-weight: 600; margin-top: 20rpx; }
  &__head-sub { margin-top: 12rpx; }
  &__head-dim { color: $text-2; font-size: 26rpx; }
  &__head-amt { color: $text-1; font-size: 26rpx; }
  &__head-time { color: $text-2; font-size: 26rpx; margin-top: 8rpx; }

  &__warn {
    display: flex;
    gap: 20rpx;
    margin: 0 $page-pad;
    padding: 24rpx 32rpx;
    background-color: $warn-bg;
    border-radius: $radius-cell;
  }
  &__warn-body {
    display: flex;
    flex-direction: column;
    gap: 6rpx;
  }
  &__warn-line { color: $text-1; font-size: 26rpx; line-height: 1.6; }

  &__label {
    padding: 40rpx $page-pad 16rpx; /* 2026-09-07 对表修正：原 8rpx 依赖全局页边距，现区块自带 */
    text { color: $text-3; font-size: 28rpx; }
  }

  &__tl {
    padding: 32rpx;
    background-color: $bg-card;
    border-radius: 32rpx; /* 同族 C16A 实测进度卡 r16（合成标定反算 15.67px） */
  }
  &__row {
    position: relative;
    display: flex;
    align-items: stretch;
    gap: 24rpx;
    padding-bottom: 32rpx;
    &--last { padding-bottom: 0; }
  }
  &__node {
    flex-shrink: 0;
    z-index: 1;
    width: 40rpx;
    height: 40rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;

    &--done { background-color: $text-1; }
    &--current { background-color: $gold; }
    &--future { background-color: $bg-card-2; }
  }
  &__node-num { color: #9E9E9E; font-size: 20rpx; }
  &__tick {
    width: 17rpx;
    height: 12rpx;
    border-left: 4rpx solid #17181C;
    border-bottom: 4rpx solid #17181C;
    transform: rotate(-45deg) translateY(-2rpx);
  }
  &__line {
    position: absolute;
    left: 18.5rpx;
    top: 40rpx;
    width: 3rpx;
    bottom: 0;
    background-color: $border-1;

    &--done { background-color: $text-2; }
  }
  &__text {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
    padding-top: 2rpx;
    min-width: 0;
  }
  &__row-title {
    font-size: 28rpx;

    &--done { color: $text-3; }
    &--current { color: $text-1; }
    &--future { color: $text-disabled; }
  }
  &__row-sub { color: $text-2; font-size: 24rpx; }

  &__footer {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    gap: 16rpx;
    padding: 24rpx $page-pad calc(24rpx + env(safe-area-inset-bottom));
    background-color: rgba(23, 24, 28, 0.96);
    backdrop-filter: blur(20px);
    border-top: 1rpx solid $border-1;
  }
}
</style>
