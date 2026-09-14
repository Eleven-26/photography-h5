<template>
  <view class="page-wrap page-rp">
    <!-- 状态栏占位：设计稿顶部 Iphone 44px（C21 状态栏 0-44，导航行 44-88）。
         H5 由 .status-bar 固定 44px；MP 端 AppNavBar 已用系统值定位，避免双计。 -->
    <!-- #ifdef H5 -->
    <view class="status-bar" />
    <!-- #endif -->
    <AppNavBar :title="done ? '退款完成' : '取消订单'" />

    <!-- ═══ 态一：退款处理中（C21 1:2434） ═══ -->
    <template v-if="!done">
      <!-- 状态头：金币图标 72（C21 原图矢量）+ 20 Bold + 金额混排 -->
      <view class="page-rp__head">
        <AppIcon name="coin-lg" :size="72" />
        <text class="page-rp__head-title">退款处理中</text>
        <view class="page-rp__head-sub">
          <text class="page-rp__head-dim">退款金额 </text>
          <text class="page-rp__head-amt">¥{{ formatAmount(refundAmt) }}</text>
          <text class="page-rp__head-dim"> 将在1-3个工作日内由摄影师线下退回</text>
        </view>
        <text class="page-rp__head-time">退回：线下转账</text>
      </view>

      <!-- 四步时间线（C21 实测：取消申请/摄影师已确认/退款处理中/退款到账） -->
      <view class="page-rp__tl">
        <view
          v-for="(step, i) in refundSteps"
          :key="i"
          class="page-rp__row"
          :class="{ 'page-rp__row--last': i === refundSteps.length - 1 }"
        >
          <view class="page-rp__node" :class="`page-rp__node--${step.state}`">
            <view v-if="step.state === 'done'" class="page-rp__tick" />
            <text v-else-if="step.state === 'future'" class="page-rp__node-num">{{ i + 1 }}</text>
          </view>
          <view
            v-if="i < refundSteps.length - 1"
            class="page-rp__line"
            :class="{ 'page-rp__line--done': step.state === 'done' }"
          />
          <view class="page-rp__text">
            <text class="page-rp__row-title" :class="`page-rp__row-title--${step.state}`">{{ step.title }}</text>
            <text v-if="step.sub" class="page-rp__row-sub">{{ step.sub }}</text>
          </view>
        </view>
      </view>

      <!-- 线下退款提示 -->
      <view class="page-rp__tip">
        <AppIcon name="clock-sm" :size="13" />
        <text class="page-rp__tip-text">退款由摄影师线下转账退回，到账时间以转账方式为准。如超过3个工作日未到账，请联系摄影师协商。</text>
      </view>

      <!-- 底栏：满宽描边胶囊「返回订单」（C21 实测：透明底 + #383A40 描边 1px，非白胶囊） -->
      <AppFooter>
        <AppButton type="secondary" block @click="goOrder">返回订单</AppButton>
      </AppFooter>
    </template>

    <!-- ═══ 态二：退款完成（C21 1:2509） ═══ -->
    <template v-else>
      <!-- 状态头：绿勾 72（C21B 原图矢量）+ 20 Bold + 32 绿金额 -->
      <view class="page-rp__head page-rp__head--done">
        <AppIcon name="check-lg-green" :size="72" />
        <text class="page-rp__head-title">退款已到账</text>
        <text class="page-rp__head-amount">¥{{ formatAmount(refundAmt) }}</text>
        <text class="page-rp__head-sub-dim">已线下退回，请自行核对到账</text>
      </view>

      <!-- 退款明细卡（C21 实测：金额/到账时间/渠道/订单编号） -->
      <view class="page-rp__detail">
        <view class="page-rp__row">
          <text class="page-rp__row-label">退款金额</text>
          <text class="page-rp__row-val">{{ formatAmount(refundAmt) }}</text>
        </view>
        <view class="page-rp__row">
          <text class="page-rp__row-label">到账时间</text>
          <text class="page-rp__row-val">{{ doneAt || '待记录' }}</text>
        </view>
        <view class="page-rp__row">
          <text class="page-rp__row-label">退款渠道</text>
          <text class="page-rp__row-val">摄影师线下转账退回</text>
        </view>
        <view class="page-rp__row">
          <text class="page-rp__row-label">订单编号</text>
          <text class="page-rp__row-val">{{ orderCode }}</text>
        </view>
      </view>

      <!-- 收尾提示 -->
      <view class="page-rp__tip page-rp__tip--flow">
        <AppIcon name="info-sm" :size="13" />
        <text class="page-rp__tip-text">订单已取消。如需重新预约，可以再次浏览摄影师的服务页面。</text>
      </view>

      <!-- 页内双钮：返回首页（白 block）+ 看看其他作品（描边 r12，C21 实测） -->
      <view class="page-rp__done-actions">
        <AppButton block @click="goHome">返回首页</AppButton>
        <view class="page-rp__works pressable" @click="goWorks">
          <text>看看摄影师的其他作品</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script>
/**
 * C21 退款进度（画板 1:2434 处理中 / 1:2509 完成两态）
 * 数据源：getRefundList（biz_order_refund，裸数组）→ status 驱动两态：
 *   1-申请中 / 2-已通过 → 处理中态（时间线按节点点亮）；3-已退款 → 完成态
 * 退款纪律：线下转账退回，客户自行核对到账；「摄影师已确认」不落单独字段，按 status 推导
 */
import AppNavBar from '@/components/AppNavBar.vue'
import AppFooter from '@/components/AppFooter.vue'
import AppButton from '@/components/AppButton.vue'
import { getOrderDetail } from '@/api/order'
import { getRefundList } from '@/api/refund'
import { formatAmount, formatDate } from '@/utils/format'

export default {
  components: { AppNavBar, AppFooter, AppButton },
  data() {
    return {
      orderId: 0,
      done: false,
      status: 0,          // 1-申请中 2-已通过 3-已退款 4-已驳回
      refundAmt: 0,
      orderCode: '',
      applyAt: '',
      confirmAt: '',
      doneAt: '',         // 到账时间（refund_at，仅已退款才有）
    }
  },
  computed: {
    refundSteps() {
      const s = this.status
      /* 节点点亮：申请(≥1) → 确认(≥2) → 退款处理中(2) / 已退款(3) → 到账(3) */
      const applied = s >= 1
      const approved = s >= 2
      const refunded = s === 3
      return [
        { state: applied ? 'done' : 'current', title: '取消申请已提交', sub: this.applyAt },
        { state: approved ? 'done' : 'future', title: '摄影师已确认', sub: this.confirmAt },
        {
          state: refunded ? 'done' : approved ? 'current' : 'future',
          title: refunded ? '已线下退回' : '退款处理中',
          sub: '摄影师线下转账退回 · 以双方确认为准',
        },
        { state: refunded ? 'done' : 'future', title: '退款到账', sub: '退至原支付渠道' },
      ]
    },
  },
  onLoad(query) {
    this.orderId = Number(query.orderId || 0)
    this.loadData()
  },
  methods: {
    formatAmount,
    async loadData() {
      if (!this.orderId) return
      const [orderRes, refundRes] = await Promise.all([
        getOrderDetail(this.orderId).catch(() => null),
        getRefundList(this.orderId).catch(() => []),
      ])
      const o = (orderRes && orderRes.order) || {}
      this.orderCode = o.code || ''
      /* 后端 /refund/list 出裸数组（response.OK(c, list)） */
      const list = Array.isArray(refundRes) ? refundRes : (refundRes && refundRes.list) || []
      const rec = list[0] || {}
      this.refundAmt = Number(rec.amount || 0)
      this.applyAt = formatDate(rec.created_at, 'MM月dd日 HH:mm')
      this.confirmAt = rec.audit_at ? formatDate(rec.audit_at, 'MM月dd日 HH:mm') : ''
      this.status = Number(rec.status || 0)
      this.done = this.status === 3
      this.doneAt = rec.refund_at ? formatDate(rec.refund_at, 'MM月dd日 HH:mm') : ''
    },
    goOrder() {
      uni.redirectTo({ url: `/pages/order/detail?id=${this.orderId}` })
    },
    goHome() {
      uni.reLaunch({ url: '/pages/index/index' })
    },
    goWorks() {
      uni.redirectTo({ url: '/pages/works/index' })
    },
  },
}
</script>

<style lang="scss" scoped>
.page-rp {
  padding-bottom: 240rpx;

  &__head {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 72rpx $page-pad 48rpx; /* C21 实测：图标顶 124（nav 底 88+36）；末行底 291.5→卡顶 319 */

    &--done { padding-bottom: 0; } /* C21B 实测：末行底 326→明细卡顶 342（间距由卡 margin 提供） */
  }
  /* 状态头大图标直接用原画板 SVG：coin-lg 72 / check-lg-green 72 */
  &__head-title { color: $text-1; font-size: 40rpx; font-weight: 600; margin-top: 36rpx; } /* C21 实测标题顶 218.5 */
  &__head-sub { margin-top: 26rpx; max-width: 600rpx; } /* C21 实测副行顶 258 */
  &__head-dim { color: $text-2; font-size: 26rpx; }
  &__head-amt { color: $text-1; font-size: 26rpx; }
  &__head-time { color: $text-2; font-size: 26rpx; margin-top: 10rpx; }
  &__head-amount { color: $tip-green; font-size: 64rpx; font-weight: 600; margin-top: 48rpx; } /* C21B 实测：标题底 236.5→金额顶 274.5，间距 38px */
  &__head-sub-dim { color: $text-2; font-size: 26rpx; margin-top: 6rpx; }

  /* 时间线（C21 实测卡 319-590.5，高 272；左右内缩 16px；行距 60px） */
  &__tl {
    margin: 0 $page-pad;
    padding: 52rpx;
    background-color: $bg-card;
    border-radius: $radius-card;
    .page-rp__row {
      align-items: flex-start;                 /* C21 实测：节点顶 345 ≈ 标题顶 346.5 */
      padding: 0 0 44rpx;                      /* 行距 60px = 内容 + 22px */
    }
    .page-rp__row--last { padding-bottom: 0; }
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
  &__node-num { color: $text-disabled; font-size: 20rpx; }
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

  /* 明细卡（完成态 C21B 实测：卡 342-533.5 高 191.5，行距 43.5px，行间 1px 分隔线） */
  &__detail {
    margin: 24rpx $page-pad 0;
    padding: 16rpx 40rpx;
    background-color: $bg-card;
    border-radius: $radius-card;

    .page-rp__row {
      padding: 24rpx 0;                        /* 行距 43.5px = 24 + 行高 19.5 */
      border-bottom: 1rpx solid $border-1;     /* 稿：行间 1px 分隔线 */
      &:last-child { border-bottom: none; }    /* 末行无线 */
    }
  }
  &__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20rpx 0;
  }
  &__row-label { color: $text-2; font-size: 28rpx; }
  &__row-val { color: $text-1; font-size: 28rpx; }

  /* 提示卡 */
  &__tip {
    display: flex;
    align-items: flex-start;
    gap: 16rpx;
    margin: 24rpx $page-pad 0;
    padding: 24rpx 32rpx;
    background-color: $bg-card;
    border-radius: $radius-cell;

    &--flow { margin-top: 24rpx; } /* C21B 实测：明细卡底 533.5→提示卡顶 546 */
  }
  &__tip-text { color: $text-3; font-size: 26rpx; line-height: 1.6; }

  /* 完成态页内双钮（C21B 实测：白胶囊 56 + 纯文字链，无描边框） */
  &__done-actions {
    display: flex;
    flex-direction: column;
    gap: 40rpx; /* C21B 实测：白钮底 722.5→文字链顶 746.5，间距 24px */
    margin: 48rpx $page-pad;
    padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  }
  &__works {
    text-align: center;
    color: $text-3;   /* C21B 实测文字 #B8B9BF */
    font-size: 28rpx;
  }
}
</style>
