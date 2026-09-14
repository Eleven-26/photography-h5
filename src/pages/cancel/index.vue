<template>
  <view class="page-wrap page-cancel">
    <view class="status-bar" />
    <AppNavBar title="取消订单" />

    <!-- ① 确认头：红圈警示 64 + 20 Bold + 副文（C20 实测居中） -->
    <view class="page-cancel__head">
      <!-- C20 实测 64px 红色警示图标（原画板矢量） -->
      <AppIcon name="alert-red-lg" :size="64" />
      <text class="page-cancel__head-title">确认取消订单？</text>
      <text class="page-cancel__head-sub">取消后无法恢复，已付费用将按退款政策退回</text>
    </view>

    <!-- ② 退款测算卡（C20 实测 #1D1E22 r16：实际退款 18 金；基数=已付金额，红线⑤） -->
    <view class="page-cancel__calc">
      <view class="page-cancel__row">
        <text class="page-cancel__row-label">已付定金</text>
        <text class="page-cancel__row-val">{{ formatAmount(paidAmt) }}</text>
      </view>
      <view class="page-cancel__row">
        <text class="page-cancel__row-label">距拍摄时间</text>
        <text class="page-cancel__row-val">{{ hoursLeftText }}</text>
      </view>
      <view class="page-cancel__row">
        <text class="page-cancel__row-label">退款比例</text>
        <text class="page-cancel__row-val">{{ ratioText }}</text>
      </view>
      <view class="page-cancel__row">
        <text class="page-cancel__row-label">实际退款</text>
        <text class="page-cancel__row-due">{{ formatAmount(refundAmt) }}</text>
      </view>
    </view>

    <!-- ③ 退款政策说明（C20 实测暖棕卡 + 金图标 + 四行政策） -->
    <view class="page-cancel__label"><text>退款明细</text></view>
    <view class="page-cancel__policy">
      <!-- C20 实测金色圆圈信息图标（约 15px；图标库金色 info 缺位，暂用 alert-gold 金圈） -->
      <AppIcon name="alert-gold" :size="16" />
      <view class="page-cancel__policy-body">
        <text class="page-cancel__policy-title">退款政策说明</text>
        <text class="page-cancel__policy-line">· 拍前{{ cancelFreeHours }}小时以上取消：全额退款</text>
        <text class="page-cancel__policy-line">· 拍前48-{{ cancelFreeHours }}小时取消：退款80%</text>
        <text class="page-cancel__policy-line">· 拍前24-48小时取消：退款50%</text>
        <text class="page-cancel__policy-line">· 拍前24小时内取消：不退款</text>
      </view>
    </view>

    <!-- ④ 取消原因（C20 实测四胶囊，选中白底黑字） -->
    <view class="page-cancel__label"><text>取消原因</text></view>
    <view class="page-cancel__reasons">
      <text
        v-for="r in REASONS"
        :key="r"
        class="page-cancel__pill"
        :class="{ 'page-cancel__pill--on': reason === r }"
        @click="reason = r"
      >{{ r }}</text>
    </view>

    <!-- ⑤ 线下退款提示（C20 实测 #1D1E22 r8） -->
    <view class="page-cancel__tip">
      <AppIcon name="shield" :size="13" />
      <text class="page-cancel__tip-text">退款由摄影师线下转账退回，到账时间以转账方式为准，超3个工作日未到账请联系摄影师。</text>
    </view>

    <!-- ⑥ 底栏：再想想（描边）+ 确认取消（红底，C20 实测破坏性主钮） -->
    <AppFooter>
      <!-- C20 实测「再想想」为描边钮（非白胶囊） -->
      <AppButton type="secondary" hug @click="goBack">再想想</AppButton>
      <AppButton flex type="danger" :loading="submitting" @click="onCancel">确认取消</AppButton>
    </AppFooter>
  </view>
</template>

<script>
/**
 * C20 取消订单（画板 1:2359 一比一还原）
 * 退款测算（红线⑤：退款基数 = 已付金额，非订单总额）：
 *   比例按距拍摄时长档位 —— 与后端 domain.RefundRatio 固定档位一一对应
 *   （>=72h 全额 / >=48h 80% / >=24h 50% / <24h 不退；非 studio_setting 可配项）
 *   refund_amt 由后端按 biz_order_refund 规则计算下发，前端金额仅展示预览
 * 提交 → applyCancel（/order/cancel/:id）→ 跳退款进度 C21
 */
import AppNavBar from '@/components/AppNavBar.vue'
import AppFooter from '@/components/AppFooter.vue'
import AppButton from '@/components/AppButton.vue'
import { getOrderDetail } from '@/api/order'
import { applyCancel } from '@/api/order'
import { formatAmount } from '@/utils/format'

const REASONS = ['时间冲突', '预算原因', '找到了其他摄影师', '其他']

export default {
  components: { AppNavBar, AppFooter, AppButton },
  data() {
    return {
      REASONS,
      orderId: 0,
      order: {},
      paidAmt: 0,          // 已付金额（biz_order.paid_amt，基数=已付非总额）
      hoursLeft: null,     // 距拍摄小时（由 order.shoot_date + shoot_time 计算）
      reason: '时间冲突',
      submitting: false,
    }
  },
  computed: {
    ratio() {
      const h = this.hoursLeft
      if (h == null) return null /* 未知：尚在加载，不预设档位 */
      if (h > 72) return 1
      if (h > 48) return 0.8
      if (h > 24) return 0.5
      return 0
    },
    ratioText() {
      if (this.ratio == null) return '—'
      if (this.ratio === 1) return '全额退款'
      if (this.ratio === 0) return '不退款'
      return `退 ${this.ratio * 100}%`
    },
    refundAmt() {
      if (this.ratio == null) return 0
      return Math.round(this.paidAmt * this.ratio)
    },
    hoursLeftText() {
      const h = this.hoursLeft
      if (h == null) return '—'
      if (h > 72) return '72小时以上'
      if (h > 24) return `${Math.round(h)}小时`
      return '24小时内'
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
      const res = await getOrderDetail(this.orderId).catch(() => null)
      const o = (res && res.order) || {}
      this.order = o
      this.paidAmt = Number(o.paid_amt || 0)
      if (o.shoot_date) {
        const dt = new Date(`${o.shoot_date} ${o.shoot_time || '10:00'}`.replace(/-/g, '/'))
        if (!Number.isNaN(dt.getTime())) {
          this.hoursLeft = Math.round((dt - Date.now()) / 3600000)
        }
      }
    },
    async onCancel() {
      if (this.ratio === 0) {
        uni.showModal({
          title: '24小时内不可退款',
          content: '距拍摄不足24小时，取消将无法退款，确认继续？',
          success: (r) => r.confirm && this.doCancel(),
        })
        return
      }
      this.doCancel()
    },
    async doCancel() {
      this.submitting = true
      try {
        await applyCancel({ order_id: this.orderId, reason: this.reason })
        uni.redirectTo({ url: `/pages/refund/progress?orderId=${this.orderId}` })
      } catch (e) {
        /* request 层已 toast */
      } finally {
        this.submitting = false
      }
    },
    goBack() {
      uni.navigateBack({ delta: 1 })
    },
  },
}
</script>

<style lang="scss" scoped>
.page-cancel {
  padding-bottom: 240rpx;

  /* ① 确认头（C20 实测红圈 64@14%） */
  &__head {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 64rpx $page-pad 40rpx;
  }
  &__head-title { color: $text-1; font-size: 40rpx; font-weight: 600; margin-top: 20rpx; }
  &__head-sub { color: $text-2; font-size: 26rpx; margin-top: 10rpx; }

  /* ② 退款测算卡 */
  &__calc {
    margin: 0 $page-pad;
    padding: 20rpx 32rpx;
    background-color: $bg-card;
    border-radius: 32rpx; /* C20 实测 r16（合成标定反算 15.67px，大卡档） */
  }
  &__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20rpx 0;
    & + & { border-top: 1rpx solid $border-1; } /* C20 实测行间 hairline */
  }
  &__row-label { color: $text-2; font-size: 28rpx; }
  &__row-val { color: $text-1; font-size: 28rpx; }
  &__row-due { color: $gold; font-size: 36rpx; font-weight: 600; }

  &__label {
    padding: 40rpx $page-pad 16rpx; /* 2026-09-07 对表修正：原 8rpx 依赖全局页边距，现区块自带 */
    text { color: $text-3; font-size: 26rpx; }
  }

  /* ③ 政策卡（C20 实测 #C29F77@14% + 金图标） */
  &__policy {
    display: flex;
    gap: 20rpx;
    margin: 0 $page-pad;
    padding: 24rpx 32rpx;
    background-color: $warn-bg;
    border-radius: $radius-card; /* C20 实测政策卡 r12（拟合 R≈25@2x） */
  }
  &__policy-body {
    display: flex;
    flex-direction: column;
    gap: 6rpx;
  }
  &__policy-title { color: $text-1; font-size: 26rpx; }
  &__policy-line { color: $text-1; font-size: 26rpx; line-height: 1.6; }

  /* ④ 取消原因胶囊 */
  &__reasons {
    display: flex;
    flex-wrap: wrap;
    gap: 16rpx;
    margin: 0 $page-pad;
  }
  &__pill {
    display: inline-flex;
    align-items: center;
    padding: 16rpx 32rpx;
    color: $text-3;
    font-size: 28rpx;
    border: 1rpx solid $border-2;
    border-radius: 999rpx;

    &--on {
      color: #17181C;
      background-color: $text-1;
      border-color: $text-1;
    }
  }

  /* ⑤ 线下退款提示 */
  &__tip {
    display: flex;
    align-items: flex-start;
    gap: 16rpx;
    margin: 24rpx $page-pad 0;
    padding: 24rpx 32rpx;
    background-color: $bg-card;
    border-radius: $radius-cell;
  }
  &__tip-text { color: $text-3; font-size: 26rpx; line-height: 1.6; }
}
</style>
