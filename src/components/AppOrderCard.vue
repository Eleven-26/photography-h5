<template>
  <!--
    AppOrderCard —— 订单卡（客户端）
    来源：组件库「Card-订单卡」画布实测：宽 343 · r16 · #1D1E22 · pad 16 · 行距 12
    结构：头部（套餐名 20 Bold + 单号 12 灰 / 右侧软徽章）→ 信息行 13 → 金额行（13 灰 + 18 金）
    点击整卡进入订单详情（C09-2）。
  -->
  <view class="order-card pressable" @click="$emit('click')">
    <!-- ① 头部：左列标题+单号，右列状态徽章 -->
    <view class="order-card__head">
      <view class="order-card__head-left">
        <text class="order-card__title">{{ order.package_name }}</text>
        <text class="order-card__no">#{{ order.code }}</text>
      </view>
      <AppBadge :text="statusText" :tone="tone" />
    </view>

    <!-- ② 信息行：拍摄时间 -->
    <view class="order-card__info">
      <text class="order-card__label">拍摄时间</text>
      <text class="order-card__value">{{ order.shoot_date }} {{ order.shoot_time }}</text>
    </view>

    <!-- ③ 金额行：尾款提示 + 总额金色 -->
    <view class="order-card__amount">
      <text class="order-card__label">{{ amountHint }}</text>
      <text class="order-card__total">{{ formatAmount(order.total_amt) }}</text>
    </view>
  </view>
</template>

<script>
import AppBadge from '@/components/AppBadge.vue'
import { ORDER_VIEW_STATE } from '@/config/enums'
import { formatAmount } from '@/utils/format'

/**
 * 订单卡状态徽章色调映射（后端 status 0-7 → soft 徽章三色）
 * ⚠️ 文案权威来源 = enums.ORDER_VIEW_STATE（B11 映射回勾后如有出入以服务端为准）
 */
const TONE_BY_STATUS = {
  0: 'soft-gold',
  1: 'soft-gold',
  2: 'soft-ok',
  3: 'soft-ok',
  4: 'soft-ok',
  5: 'soft-ok',
  6: 'soft-ok',
  7: 'soft-bad',
}

export default {
  name: 'AppOrderCard',
  components: { AppBadge },
  props: {
    /** biz_order 行数据（code/package_name/shoot_date/shoot_time/total_amt/status） */
    order: { type: Object, required: true },
  },
  computed: {
    statusText() {
      return ORDER_VIEW_STATE[this.order.status] || '未知状态'
    },
    tone() {
      return TONE_BY_STATUS[this.order.status] || 'soft-gold'
    },
    /** 金额行提示：未付定金/尾款未清 → 「尾款 ¥x」；已全额 → 「已付清」 */
    amountHint() {
      if (this.order.payment_status === 3) return '已付清'
      return `尾款 ${formatAmount(this.order.final_amt)}`
    },
  },
  methods: { formatAmount },
}
</script>

<style lang="scss" scoped>
.order-card {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  padding: $card-pad;
  background-color: $bg-card;
  border: 1rpx solid $border-1;
  border-radius: 32rpx; /* 稿 16px */

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $touch-gap;
  }
  &__head-left {
    display: flex;
    flex-direction: column;
    gap: 4rpx;
    min-width: 0;
  }
  &__title {
    color: $text-1;
    font-size: $fs-xl; /* 20px Bold */
    font-weight: 700;
  }
  &__no {
    color: $text-2;
    font-size: $fs-sm; /* 12px */
  }
  &__info,
  &__amount {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $touch-gap;
  }
  &__label {
    color: $text-2;
    font-size: 26rpx; /* 13px */
  }
  &__value {
    color: $text-1;
    font-size: 26rpx;
  }
  &__total {
    color: $gold;
    font-size: 36rpx; /* 18px */
    font-weight: 700;
    font-family: $font-family-num;
  }
}
</style>
