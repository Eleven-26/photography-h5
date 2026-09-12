<template>
  <view class="page-wrap page-prep">
    <view class="status-bar" />
    <AppNavBar title="拍前准备" />

    <!-- ① 拍摄信息卡：⚠️ C11 实测为「白卡反色」设计（白底黑字，全站唯一），一比一保留 -->
    <view class="page-prep__info">
      <text class="page-prep__info-label">拍摄时间</text>
      <text class="page-prep__info-date">{{ dateText }}</text>
      <text class="page-prep__info-time">{{ timeText }}</text>
      <view class="page-prep__info-divider" />
      <text class="page-prep__info-label">拍摄地点</text>
      <text class="page-prep__info-addr">{{ addressText }}</text>
    </view>

    <!-- ② 拍摄建议（C11 实测 #1D1E22 r16 内四组：图标 + 14 Bold 标题 + 13 建议行） -->
    <view class="page-prep__label"><text>拍摄建议</text></view>
    <view class="page-prep__advice">
      <view v-for="(g, i) in ADVICES" :key="g.title" class="page-prep__advice-row" :class="{ 'page-prep__advice-row--last': i === ADVICES.length - 1 }">
        <!-- C11 实测建议图标 20px：gift/clock/pin/bulb（原画板矢量） -->
        <AppIcon :name="g.icon" :size="20" />
        <view class="page-prep__advice-main">
          <text class="page-prep__advice-title">{{ g.title }}</text>
          <view class="page-prep__advice-lines">
            <text v-for="line in g.lines" :key="line" class="page-prep__advice-line">· {{ line }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- ③ 毛玻璃底栏：确认已阅读 → confirmPrepRead（/order/prep/read） -->
    <AppFooter>
      <AppButton block :loading="submitting" @click="onConfirmRead">确认已阅读</AppButton>
    </AppFooter>
  </view>
</template>

<script>
/**
 * C11 拍前准备（画板 1:1041 一比一还原）
 * 数据源：订单 prep_content（upgrade_client_20260907.sql biz_order.prep_content，摄影师端编辑下发）；
 *   未配置时降级为稿面演示建议（联调后移除）
 * 交互：「确认已阅读」→ confirmPrepRead（/order/prep/read，order.js 已定义）
 * ⚠️ 设计注记：顶部信息卡为白卡反色（C11 实测白底黑字），与全站暗色卡不同，属设计强调手法
 */
import AppNavBar from '@/components/AppNavBar.vue'
import AppFooter from '@/components/AppFooter.vue'
import AppButton from '@/components/AppButton.vue'
import { getOrderDetail, confirmPrepRead } from '@/api/order'

const ADVICES = [
  { icon: 'gift', title: '服装建议', lines: ['浅色系服装更上镜', '家庭成员风格统一', '建议携带1-2套备用服装'] },
  { icon: 'clock', title: '时间建议', lines: ['提前15分钟到达集合点', '拍摄约2.5小时'] },
  { icon: 'pin', title: '交通', lines: ['越秀公园北门', '地铁5号线小北站D出口', '步行约8分钟'] },
  { icon: 'bulb', title: '注意事项', lines: ['可带道具：气球、花束', '自然妆容即可', '保持放松，享受拍摄'] },
]

export default {
  components: { AppNavBar, AppFooter, AppButton },
  data() {
    return {
      ADVICES,
      orderId: 0,
      order: {},
      submitting: false,
    }
  },
  computed: {
    dateText() {
      /* 联调改读 shoot_date 展示（含周几） */
      return this.order.shoot_date ? `${this.order.shoot_date}` : '8月8日 周六'
    },
    timeText() {
      return this.order.shoot_time || '10:00 - 12:30'
    },
    addressText() {
      return this.order.shoot_address ? `${this.order.shoot_address} · 北门集合` : '越秀公园 · 北门集合'
    },
  },
  onLoad(query) {
    this.orderId = Number(query.orderId || 0)
    this.loadData()
  },
  methods: {
    async loadData() {
      if (!this.orderId) return
      try {
        const res = await getOrderDetail(this.orderId)
        const o = (res && res.data && res.data.order) || (res && res.data) || {}
        this.order = o
        /* prep_content 结构联调核对（预期 JSON：{ advices: [{title, lines}] }），为空用演示 */
      } catch (e) { /* 演示兜底 */ }
    },
    async onConfirmRead() {
      this.submitting = true
      try {
        await confirmPrepRead(this.orderId)
        uni.showToast({ title: '已确认', icon: 'success' })
        setTimeout(() => uni.navigateBack({ delta: 1 }), 600)
      } catch (e) {
        /* request 层已 toast */
      } finally {
        this.submitting = false
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.page-prep {
  padding-bottom: 240rpx;

  /* ① 白卡反色信息卡（C11 实测：白底黑字，全站唯一反色卡） */
  &__info {
    display: flex;
    flex-direction: column;
    margin: 24rpx $page-pad 0;
    padding: 40rpx;
    background-color: #FFFFFF; /* C11 实测白卡 */
    border-radius: 32rpx; /* 稿 16px（与并列的建议卡一致） */
  }
  &__info-label { color: rgba(0, 0, 0, 0.6); font-size: 26rpx; }
  /* 稿白卡内节奏：标签→日期/时间行间留白 12px（原 3px 偏紧，卡高 196px） */
  &__info-date { color: $text-on-light; font-size: 44rpx; font-weight: 600; margin-top: 24rpx; }
  &__info-time { color: $text-on-light; font-size: 28rpx; font-weight: 500; margin-top: 24rpx; margin-bottom: 24rpx; }
  &__info-divider {
    height: 1rpx;
    background-color: rgba(0, 0, 0, 0.15);
    margin-bottom: 24rpx;
  }
  &__info-addr { color: $text-on-light; font-size: 28rpx; font-weight: 500; margin-top: 6rpx; }

  &__label {
    padding: 48rpx $page-pad 16rpx; /* 稿：白卡底 y295 → 建议卡顶 y346（标题块总高 51px） */
    text { color: $text-3; font-size: 28rpx; font-weight: 600; }
  }

  /* ② 建议卡（C11 实测 #1D1E22 r16 pad16/10，行间描边分隔） */
  &__advice {
    margin: 0 $page-pad;
    padding: 20rpx 32rpx;
    background-color: $bg-card;
    border: 1rpx solid $border-1;
    border-radius: 32rpx; /* 稿 16px */
  }
  &__advice-row {
    display: flex;
    gap: 24rpx;
    padding: 20rpx 0; /* 稿：组间留白 10px（卡高 420px） */
    border-bottom: 1rpx solid $border-1;

    &--last { border-bottom: none; }
  }
  &__advice-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8rpx;
    min-width: 0;
  }
  &__advice-title { color: $text-1; font-size: 28rpx; font-weight: 600; }
  &__advice-lines {
    display: flex;
    flex-direction: column;
    gap: 4rpx;
  }
  &__advice-line { color: $text-disabled; font-size: 26rpx; line-height: 1.6; } /* C11 实测 #85878D */
}
</style>
