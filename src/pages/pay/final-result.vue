<template>
  <view class="page-wrap page-fr">
    <!-- 状态栏占位：稿顶部 iPhone 状态栏 44px（C16A y0-44，common.scss .status-bar） -->
    <view class="status-bar" />
    <AppNavBar title="尾款确认" />

    <!-- ① 状态头：金圈时钟 72 + 20 Bold + 金额混排（C16A 实测居中） -->
    <view class="page-fr__head">
      <!-- C16A 实测 72px 金圈时钟（原画板矢量） -->
      <AppIcon name="clock-processing" :size="72" />
      <text class="page-fr__head-title">等待摄影师确认收款</text>
      <view class="page-fr__head-sub">
        <text class="page-fr__head-dim">{{ payMethodText ? `你已通过${payMethodText}转账 ` : '你已转账 ' }}</text>
        <text class="page-fr__head-amt">¥{{ amountText }}</text>
      </view>
      <text v-if="markAt" class="page-fr__head-time">转账时间：{{ markAt }}</text>
    </view>

    <!-- ② 暖棕提示卡（C16A 实测：位于状态头与「进度」之间，#C29F77@14% + 红图标 #E37B76） -->
    <view class="page-fr__warn">
      <AppIcon name="alert-red" :size="18" />
      <text class="page-fr__warn-text">已通知摄影师确认收款。确认收款后将开放高清成片下载。这不是支付失败，通常在2小时内完成确认。</text>
    </view>

    <!-- ③ 进度标签（C16A 实测 14 #B8BABF） -->
    <view class="page-fr__label"><text>进度</text></view>

    <!-- ④ 竖向时间线卡（C16A 实测 #1D1E22 r16 pad16：节点 20 / 线 1.5×38） -->
    <view class="page-fr__tl">
      <view
        v-for="(step, i) in steps"
        :key="i"
        class="page-fr__row"
        :class="{ 'page-fr__row--last': i === steps.length - 1 }"
      >
        <view class="page-fr__node" :class="`page-fr__node--${step.state}`">
          <view v-if="step.state === 'done'" class="page-fr__tick" />
          <text v-else-if="step.state === 'future'" class="page-fr__node-num">{{ i + 1 }}</text>
          <!-- C16A 实测当前步：金圆内白色时钟 -->
          <AppIcon v-else name="clock" :size="14" />
        </view>
        <view
          v-if="i < steps.length - 1"
          class="page-fr__line"
          :class="{ 'page-fr__line--done': step.state === 'done' }"
        />
        <view class="page-fr__text">
          <text class="page-fr__row-title" :class="`page-fr__row-title--${step.state}`">{{ step.title }}</text>
          <text v-if="step.sub" class="page-fr__row-sub">{{ step.sub }}</text>
        </view>
      </view>
    </view>

    <!-- ⑤ 信息卡（C16A 实测 #1D1E22 h66；图标实测为锁） -->
    <view class="page-fr__info">
      <AppIcon name="lock" :size="13" />
      <text class="page-fr__info-text">确认收款前，暂不开放高清成片下载，请耐心等待摄影师确认。</text>
    </view>

    <!-- ⑥ 毛玻璃底栏：hug 返回首页 + fill 联系摄影师（C16A 实测双钮） -->
    <view class="page-fr__footer">
      <AppButton hug @click="goHome">返回首页</AppButton>
      <AppButton flex @click="contact">联系摄影师</AppButton>
    </view>
  </view>
</template>

<script>
/**
 * C16A 尾款确认（画板 1:1829 一比一还原）
 * 状态头 + 五步时间线 + 暖棕提示 + 信息卡 + 双钮底栏
 * 数据源：biz_order_payment（type=final 的登记记录）→ getPaymentList；steps 由记录推导：
 *   1 确认成片（done）2 差价自动计入尾款（done，差价=0 时隐藏）3 你已转账尾款（done）
 *   4 等待摄影师确认尾款收款（current）5 开放成片下载（future）
 * 金额与差价取订单快照：order.final_amt（尾款）/ order.addon_amount（加选差价）。
 */
import AppNavBar from '@/components/AppNavBar.vue'
import AppButton from '@/components/AppButton.vue'
import { getOrderDetail } from '@/api/order'
import { getPaymentList } from '@/api/payment'
import { formatAmount } from '@/utils/format'

export default {
  components: { AppNavBar, AppButton },
  data() {
    return {
      orderId: 0,
      order: {},           // 订单主体（金额快照 + 摄影师姓名）
      amount: 0,           // biz_order_payment.amount（type=final）
      payMethodText: '',   // 收款方式名称快照（model.OrderPayment.method_name）
      markAt: '',          // 转账时间（model.OrderPayment.paid_at）
      extraFee: 0,         // 加选差价（order.addon_amount，=0 时第 2 步隐藏）
      confirmed: false,    // 摄影师是否已确认收款（payment.status=2）
      steps: [],
    }
  },
  computed: {
    amountText() { return formatAmount(this.amount) },
  },
  onLoad(query) {
    this.orderId = Number(query.orderId || 0)
    this.loadData()
  },
  methods: {
    formatAmount,
    async loadData() {
      /* 两个接口互不依赖，并行取；任一失败不影响另一侧的渲染 */
      const [payRes, orderRes] = await Promise.all([
        getPaymentList(this.orderId).catch(() => []),
        getOrderDetail(this.orderId).catch(() => null),
      ])
      /* 后端 response.OK(c, list) 直接出数组（见 h5.go → PaymentList → response.OK） */
      const list = Array.isArray(payRes) ? payRes : (payRes && payRes.list) || []
      const finalRec = list.find((p) => p.type === 'final') || {}
      this.order = (orderRes && orderRes.order) || {}
      this.amount = Number(finalRec.amount || this.order.final_amt || 0)
      this.markAt = finalRec.paid_at || ''
      this.payMethodText = finalRec.method_name || ''
      this.extraFee = Number(this.order.addon_amount || 0)
      this.confirmed = Number(finalRec.status) === 2
      this.buildSteps()
    },
    buildSteps() {
      /* 摄影师姓名取自订单快照；未指派时为「摄影师」泛称 */
      const who = this.order.photographer || '摄影师'
      this.steps = [
        { state: 'done', title: '确认成片', sub: '精修结果已确认' },
        ...(this.extraFee > 0 ? [{ state: 'done', title: '差价自动计入尾款', sub: `加选差价 ¥${formatAmount(this.extraFee)} 已并入尾款` }] : []),
        { state: 'done', title: '你已转账尾款', sub: [this.markAt, this.payMethodText, `¥${this.amountText}`].filter(Boolean).join(' · ') },
        this.confirmed
          ? { state: 'done', title: '摄影师已确认收款', sub: '登记完成' }
          : { state: 'current', title: '等待摄影师确认尾款收款', sub: `进行中... ${who}将核对收款记录并登记` },
        { state: 'future', title: '开放成片下载', sub: '确认收款后开放高清成片下载' },
      ]
    },
    goHome() {
      uni.reLaunch({ url: '/pages/index/index' })
    },
    contact() {
      /* 后端订单/工作室设置均不下发摄影师手机号（model.Order 无 mobile 字段），
         不做假号码兜底，改为引导走工作室客服 */
      uni.showToast({ title: '请通过工作室客服联系摄影师', icon: 'none' })
    },
  },
}
</script>

<style lang="scss" scoped>
.page-fr {
  padding-bottom: 240rpx;

  /* ① 状态头（C16A 实测居中，金圈 72@14%） */
  &__head {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 72rpx $page-pad 40rpx; /* C16A 实测：金圈顶距导航 36px（原 64rpx） */
  }
  &__head-title { color: $text-1; font-size: 40rpx; font-weight: 600; margin-top: 38rpx; /* C16A 实测：金圈底→标题字形顶 22.75px（原 20rpx） */ }
  &__head-sub { margin-top: 12rpx; }
  &__head-dim { color: $text-2; font-size: 26rpx; }
  &__head-amt { color: $text-1; font-size: 26rpx; }
  &__head-time { color: $text-2; font-size: 26rpx; margin-top: 8rpx; }

  &__label {
    padding: 40rpx $page-pad 16rpx; /* 2026-09-07 对表修正：原 8rpx 依赖全局页边距，现区块自带 */
    text { color: $text-3; font-size: 28rpx; }
  }

  /* ③ 时间线（C16A 实测卡宽 343px＝左右各 16px 内缩；节点 40rpx / 线 3×76rpx）
     圆角口径：角部面积法实测 15.5px ≈ r16=32rpx（原 $radius-card 24rpx 偏小） */
  &__tl {
    margin: 0 $page-pad; /* 稿 x16-358.5（原无内缩，卡片通栏到 375px） */
    padding: 32rpx;
    background-color: $bg-card;
    border-radius: 32rpx;
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
  &__node-num { color: #9E9E9E; font-size: 20rpx; } /* C16A 实测灰编号 */
  &__tick {
    width: 17rpx;
    height: 12rpx;
    border-left: 4rpx solid #17181C;
    border-bottom: 4rpx solid #17181C;
    transform: rotate(-45deg) translateY(-2rpx);
  }
  &__line {
    position: absolute;
    left: 18.5rpx; /* 节点 40rpx 中轴（1.5 宽线） */
    top: 40rpx;
    width: 3rpx;
    bottom: 0;
    background-color: $border-1;

    &--done { background-color: $text-2; } /* C16A 实测已完成段 #85878D */
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
    &--future { color: $text-disabled; } /* C16A 实测 #5A5C61 */
  }
  &__row-sub { color: $text-2; font-size: 24rpx; }

  /* ④ 暖棕提示卡（C16A 实测 x16-358.5，h87） */
  &__warn {
    display: flex;
    gap: 20rpx;
    margin: 24rpx $page-pad 0; /* 稿左右各 16px 内缩 */
    padding: 24rpx 32rpx;
    background-color: $warn-bg;
    border-radius: $radius-cell;
  }
  &__warn-text { flex: 1; color: $text-1; font-size: 26rpx; line-height: 1.6; }

  /* ⑤ 信息卡（C16A 实测 x16-358.5 h66） */
  &__info {
    display: flex;
    gap: 16rpx;
    margin: 24rpx $page-pad 0; /* 稿左右各 16px 内缩 */
    padding: 24rpx 32rpx;
    background-color: $bg-card;
    border-radius: $radius-cell; /* C16A 实测 r8，取组件既有值 */
  }
  &__info-text { color: $text-3; font-size: 26rpx; line-height: 1.6; }

  /* ⑥ 底栏双钮 */
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
