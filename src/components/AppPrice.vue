<template>
  <text class="app-price t-num" :class="`app-price--${size}`">
    <text v-if="withSymbol" class="app-price__symbol">¥</text>{{ display }}
  </text>
</template>

<script>
/**
 * AppPrice —— 金额展示
 * 金额仅格式化（format.js），不做任何运算；数字用 Space Grotesk 口径字体（需求文档 §7.3）。
 */
import { formatAmount } from '@/utils/format'

export default {
  name: 'AppPrice',
  props: {
    /** 金额（元）—— 后端 DECIMAL(12,2) 原值 */
    value: { type: [Number, String], default: 0 },
    withSymbol: { type: Boolean, default: false },
    keepDecimal: { type: Boolean, default: false },
    /** md 常规 | xl 卡片金额 | hero 大金额 */
    size: { type: String, default: 'md' },
  },
  computed: {
    display() {
      return formatAmount(this.value, false, this.keepDecimal)
    },
  },
}
</script>

<style lang="scss" scoped>
.app-price {
  font-weight: 700;
  color: $text-1;
  &--md { font-size: $fs-lg; }
  &--xl { font-size: $fs-num-xl; }
  &--hero { font-size: 72rpx; }
  &__symbol { font-size: 0.6em; margin-right: 4rpx; }
}
</style>
