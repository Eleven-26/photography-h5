<template>
  <view class="page-wrap page-shoot">
    <view class="status-bar" />
    <AppNavBar title="拍摄状态" />

    <!-- ① 状态区：呼吸光晕（C12 实测径向渐变白 12%→0）+ 绿点 + 18 Bold + 三行信息居中 -->
    <view class="page-shoot__stage">
      <view class="page-shoot__halo" />
      <view class="page-shoot__status">
        <view class="page-shoot__dot" />
        <text class="page-shoot__status-text">拍摄进行中</text>
      </view>
      <view class="page-shoot__meta">
        <text class="page-shoot__meta-line">{{ metaLine1 }}</text>
        <text class="page-shoot__meta-line">{{ addressText }}</text>
        <text class="page-shoot__meta-line">摄影师：{{ photographer }}</text>
      </view>
    </view>

    <!-- ② 进行信息卡（C12 实测 #1D1E22 r16：预计结束 / 已拍摄） -->
    <view class="page-shoot__info">
      <view class="page-shoot__row">
        <text class="page-shoot__row-label">预计结束</text>
        <text class="page-shoot__row-val">{{ endTimeText }}</text>
      </view>
      <view class="page-shoot__row">
        <text class="page-shoot__row-label">已拍摄</text>
        <text class="page-shoot__row-val">{{ elapsedText }}</text>
      </view>
    </view>

    <!-- ③ 提示卡（C12 实测 #1D1E22 r12） -->
    <view class="page-shoot__tip">
      <AppIcon name="info-sm" :size="13" />
      <text class="page-shoot__tip-text">拍摄进行中，请享受拍摄过程。拍摄完成后将通知你在线选片。</text>
    </view>

    <!-- ④ 页内返回钮（C12 实测：满宽 343 × 58px 的【描边钮】——白色像素为 0，仅 #383A40 描边环 + 白字） -->
    <view class="page-shoot__back">
      <AppButton block type="secondary" @click="goBack">返回订单</AppButton>
    </view>
  </view>
</template>

<script>
/**
 * C12 拍摄状态（画板 1:1694 一比一还原）
 * 拍摄当天状态页：进行中（绿点+光晕）/ 预计结束 / 已拍摄时长
 * 数据源：订单 shoot_date/shoot_time；「已拍摄」= now - shoot 开始时间（前端算展示，
 *   后端如有拍摄打卡字段则改读——联调核对）；status 5-拍摄中（映射 B11）
 * 顶部光晕：C12 实测径向渐变装饰（尊重 prefers-reduced-motion，不加动画）
 */
import AppNavBar from '@/components/AppNavBar.vue'
import AppButton from '@/components/AppButton.vue'
import { getOrderDetail } from '@/api/order'

export default {
  components: { AppNavBar, AppButton },
  data() {
    return {
      orderId: 0,
      order: {},
      startTime: null, // 拍摄开始时间（Date）
      endTimeText: '—',
    }
  },
  computed: {
    metaLine1() {
      return this.order.shoot_date ? `${this.order.shoot_date} ${this.order.shoot_time || ''}`.trim() : '—'
    },
    addressText() {
      return this.order.shoot_address || '—'
    },
    photographer() {
      return this.order.photographer || '摄影师'
    },
    elapsedText() {
      /* 已拍摄时长 = now - 拍摄开始时间（订单仅存日期+时段，无打卡字段） */
      if (!this.startTime) return '—'
      const mins = Math.max(0, Math.round((Date.now() - this.startTime.getTime()) / 60000))
      return `约${Math.floor(mins / 60)}小时${mins % 60}分钟`
    },
  },
  onLoad(query) {
    this.orderId = Number(query.orderId || 0)
    this.loadData()
  },
  methods: {
    async loadData() {
      if (!this.orderId) return
      const res = await getOrderDetail(this.orderId).catch(() => null)
      const o = (res && res.order) || {}
      this.order = o
      if (o.shoot_date && o.shoot_time) {
        const start = new Date(`${o.shoot_date} ${String(o.shoot_time).split('-')[0].trim()}`.replace(/-/g, '/'))
        this.startTime = Number.isNaN(start.getTime()) ? null : start
        /* 预计结束：时段右端（如 10:00-12:30 → 12:30） */
        const parts = String(o.shoot_time).split('-')
        if (parts[1]) this.endTimeText = parts[1].trim()
      }
    },
    goBack() {
      uni.navigateBack({ delta: 1 })
    },
  },
}
</script>

<style lang="scss" scoped>
.page-shoot {
  /* 稿（C12 / 375×812 视口）：内容不足一屏，「返回订单」锚定底部 */
  display: flex;
  flex-direction: column;
  min-height: 100vh;

  &__stage {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    /* 稿：状态行文字盒顶 y274（导航栏底 y88 起留白 188px）；状态区底 y382 → 与信息卡间距 12px */
    padding: 376rpx $page-pad 24rpx;
  }
  /* 呼吸光晕：C12 实测径向白 12%→透明，240rpx 圆，静态呈现 */
  &__halo {
    position: absolute;
    top: 80rpx;
    left: 50%;
    width: 240rpx;
    height: 240rpx;
    transform: translateX(-50%);
    background: radial-gradient(circle, rgba(247, 248, 248, 0.12) 0%, rgba(247, 248, 248, 0) 60%);
    border-radius: 50%;
  }
  &__status {
    position: relative;
    display: flex;
    align-items: center;
    gap: 16rpx;
  }
  &__dot {
    width: 16rpx;
    height: 16rpx;
    background-color: $tip-green; /* C12 实测 #9FCB87 绿点 */
    border-radius: 50%;
  }
  &__status-text { color: $text-1; font-size: 36rpx; font-weight: 600; }
  &__meta {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4rpx;
    margin-top: 20rpx;
  }
  &__meta-line { color: $text-2; font-size: 28rpx; line-height: 1.6; text-align: center; }

  /* ② 进行信息卡（C12 实测 r16 高 106px） */
  &__info {
    margin: 0 $page-pad;
    padding: 20rpx 32rpx;
    background-color: $bg-card;
    border: 1rpx solid $border-1;
    border-radius: 32rpx; /* 稿 16px */
  }
  &__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24rpx 0; /* 稿：行距 43.5px，行内上下留白 12px */
    border-bottom: 1rpx solid $border-1;

    &:last-child { border-bottom: none; }
  }
  &__row-label { color: $text-2; font-size: 28rpx; }
  &__row-val { color: $text-1; font-size: 28rpx; font-weight: 500; }

  /* ③ 提示卡（C12 实测 r12；与信息卡间距 20px） */
  &__tip {
    display: flex;
    align-items: flex-start;
    gap: 16rpx;
    margin: 40rpx $page-pad 0; /* 稿：信息卡底 y500 → 提示卡顶 y520 */
    padding: 24rpx 32rpx;
    background-color: $bg-card;
    border-radius: $radius-card; /* 稿 12px */
  }
  &__tip-text { color: $text-3; font-size: 26rpx; line-height: 1.6; }

  /* ④ 页内返回钮：稿中按钮底距视口底 = 12px + 安全区（非随内容流，锚定底部） */
  &__back {
    margin: 48rpx $page-pad;
    margin-top: auto; /* 稿：内容不足一屏时按钮锚定底部（稿空档 ~140px） */
    padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  }
}
</style>
