<template>
  <view class="page-wrap page-ra">
    <view class="status-bar" />
    <AppNavBar title="改期/取消" />

    <!-- ① 当前订单 + 改期政策卡（C18 实测 #111216 r16 pad20） -->
    <view class="page-ra__order">
      <text class="page-ra__order-label">当前订单</text>
      <text class="page-ra__order-title">{{ orderTitle }}</text>
      <text class="page-ra__order-meta">{{ orderMeta }}</text>
      <view class="page-ra__order-divider" />
      <text class="page-ra__order-label">改期政策</text>
      <view class="page-ra__policy">
        <text class="page-ra__policy-line">· 拍摄前{{ resFreeHours }}小时可免费改期</text>
        <text class="page-ra__policy-line">· {{ resFreeHours }}小时内改期收取{{ resFeeRate }}%调度费（¥{{ feeDemo }}）</text>
        <text class="page-ra__policy-line">· {{ resMinHours }}小时内不可改期</text>
      </view>
    </view>

    <!-- ② 选择操作（C18 实测标签 13 #B8BABF） -->
    <view class="page-ra__label"><text>选择操作</text></view>

    <!-- ③ 双操作卡（C18 实测 #1D1E22 r16 内两行：44 图标底 r12 + 15 标题 + 12 副文 + 箭头） -->
    <view class="page-ra__actions">
      <view class="page-ra__action pressable" @click="goReschedule">
        <!-- C18 实测 44px 金色日历图标（原画板矢量） -->
        <AppIcon name="calendar-gold-lg" :size="44" />
        <view class="page-ra__action-main">
          <text class="page-ra__action-title">申请改期</text>
          <text class="page-ra__action-sub">更换拍摄日期或时间</text>
        </view>
        <AppIcon name="chevron-right-sm" :size="15" />
      </view>
      <view class="page-ra__action pressable" @click="goCancel">
        <!-- C18 实测 44px 红叉图标（原画板矢量） -->
        <AppIcon name="x-red-lg" :size="44" />
        <view class="page-ra__action-main">
          <text class="page-ra__action-title">取消订单</text>
          <text class="page-ra__action-sub">取消预约并申请退款</text>
        </view>
        <AppIcon name="chevron-right-sm" :size="15" />
      </view>
    </view>

    <!-- ④ 提示卡（C18 实测 #1D1E22 r12） -->
    <view class="page-ra__tip">
      <AppIcon name="shield" :size="13" />
      <text class="page-ra__tip-text">改期或取消不会影响你在SLOT的信用记录。已支付的费用将由摄影师线下退回。</text>
    </view>

    <!-- ⑤ 返回订单：页内描边钮（C18 实测描边胶囊，非白胶囊/非毛玻璃栏） -->
    <view class="page-ra__back">
      <AppButton type="secondary" block @click="goBack">返回订单</AppButton>
    </view>
  </view>
</template>

<script>
/**
 * C18 改期/取消（画板 1:1915 一比一还原）
 * 改期政策三行 = biz_studio_setting 参数化（reschedule_free_hours / reschedule_fee_rate / reschedule_min_hours），
 * 调度费预览 = 订单总额 × 费率（与后端改期计费同源；最终以后端返回为准）
 * 跳转：申请改期 → C19 选择新日期；取消订单 → C20 取消订单
 */
import AppNavBar from '@/components/AppNavBar.vue'
import AppButton from '@/components/AppButton.vue'
import { getOrderDetail } from '@/api/order'
import { getStudioInfo } from '@/api/studio'

export default {
  components: { AppNavBar, AppButton },
  data() {
    return {
      orderId: 0,
      order: {},
      resFreeHours: 0, // biz_studio_setting.reschedule_free_hours
      resFeeRate: 0,   // biz_studio_setting.reschedule_fee_rate
      resMinHours: 0,  // biz_studio_setting.reschedule_min_hours
    }
  },
  computed: {
    /** 调度费预览：订单总额 × 费率（费率未配置时为 0） */
    feeDemo() {
      const base = Number(this.order.total_amt || this.order.base_price || 0)
      return Math.round(base * this.resFeeRate / 100)
    },
    orderTitle() {
      const o = this.order
      if (!o || !o.id) return '—'
      return `${o.package_name || '拍摄服务'} · ¥${Number(o.total_amt || o.base_price || 0).toLocaleString()}`
    },
    orderMeta() {
      const o = this.order
      if (!o || !o.id) return '—'
      return [o.shoot_date, o.shoot_time, o.shoot_address].filter(Boolean).join(' · ') || '—'
    },
  },
  onLoad(query) {
    this.orderId = Number(query.orderId || 0)
    this.loadData()
  },
  methods: {
    async loadData() {
      if (!this.orderId) return
      /* 改期规则来自工作室设置（公开接口，按 slug 定位租户） */
      getStudioInfo()
        .then((s) => {
          const cfg = s || {}
          this.resFreeHours = Number(cfg.reschedule_free_hours || 0)
          this.resFeeRate = Number(cfg.reschedule_fee_rate || 0)
          this.resMinHours = Number(cfg.reschedule_min_hours || 0)
        })
        .catch(() => {})
      const res = await getOrderDetail(this.orderId).catch(() => null)
      this.order = (res && res.order) || {}
    },
    goReschedule() {
      uni.navigateTo({ url: `/pages/reschedule/date?orderId=${this.orderId}` })
    },
    goCancel() {
      uni.navigateTo({ url: `/pages/cancel/index?orderId=${this.orderId}` })
    },
    goBack() {
      uni.navigateBack({ delta: 1 })
    },
  },
}
</script>

<style lang="scss" scoped>
.page-ra {
  &__order {
    display: flex;
    flex-direction: column;
    margin: 24rpx $page-pad 0;
    padding: 40rpx; /* C18 实测 pad 20 */
    background-color: $bg-deep; /* C18 实测 #111216（比卡底更深） */
    border-radius: 32rpx; /* C18 实测 r16（拟合 R≈31@2x），大于普通卡 r12 */
  }
  &__order-label { color: rgba(247, 248, 248, 0.5); font-size: 26rpx; }
  &__order-title { color: $text-1; font-size: 32rpx; font-weight: 600; margin-top: 8rpx; }
  &__order-meta { color: rgba(247, 248, 248, 0.7); font-size: 26rpx; margin-top: 6rpx; margin-bottom: 20rpx; }
  &__order-divider {
    height: 1rpx;
    background-color: rgba(247, 248, 248, 0.15); /* C18 实测 0.5px @15% */
    margin-bottom: 20rpx;
  }
  &__policy {
    display: flex;
    flex-direction: column;
    gap: 6rpx;
    margin-top: 10rpx;
  }
  &__policy-line { color: rgba(247, 248, 248, 0.8); font-size: 28rpx; line-height: 1.6; }

  &__label {
    padding: 56rpx $page-pad 16rpx; /* C18 实测 top 28 */
    text { color: $text-3; font-size: 26rpx; }
  }

  /* ③ 双操作卡 */
  &__actions {
    margin: 0 $page-pad;
    padding-bottom: 24rpx;
    background-color: $bg-card;
    border-radius: 32rpx; /* C18 实测 r16（合成标定反算 15.67px，与订单深卡 15.99px 同档） */
  }
  &__action {
    display: flex;
    align-items: center;
    gap: 24rpx;
    padding: 32rpx; /* C18 实测 16/16 */

    & + & { border-top: 1rpx solid $border-1; }
  }
  &__action-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
    min-width: 0;
  }
  &__action-title { color: $text-1; font-size: 30rpx; }
  &__action-sub { color: $text-2; font-size: 24rpx; }

  /* ④ 提示卡 */
  &__tip {
    display: flex;
    align-items: flex-start;
    gap: 16rpx;
    margin: 24rpx $page-pad 0;
    padding: 24rpx 32rpx;
    background-color: $bg-card;
    border-radius: $radius-card; /* C18 实测提示卡 r12 */
  }
  &__tip-text { color: $text-3; font-size: 26rpx; line-height: 1.6; }

  /* ⑤ 页内返回钮（C18 实测描边钮，非白胶囊） */
  &__back {
    margin: 24rpx $page-pad;
    padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  }
}
</style>
