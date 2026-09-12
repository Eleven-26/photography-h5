<template>
  <view class="app-badge" :class="`app-badge--${tone}`">{{ text }}</view>
</template>

<script>
/**
 * AppBadge —— 状态徽章
 * 色调语义：gold 金（进行中/强调）、muted 灰（待操作/中性）、ok 绿（成功/已确认）、bad 红（取消/驳回）
 * 文案一律传 enums.js 的映射值，禁止组件内再写状态文案。
 */
export default {
  name: 'AppBadge',
  props: {
    text: { type: String, required: true },
    tone: { type: String, default: 'muted' },
  },
}
</script>

<style lang="scss" scoped>
.app-badge {
  display: inline-flex;
  align-items: center;
  height: 44rpx;
  padding: 0 18rpx;
  border-radius: $radius-btn;
  font-size: $fs-xs;
  border: 1rpx solid transparent;

  &--gold { color: $gold; border-color: $gold; background-color: rgba(217, 167, 53, 0.08); }
  &--muted { color: $text-2; border-color: $border-2; background-color: transparent; }
  &--ok { color: #4CC38A; border-color: rgba(76, 195, 138, 0.5); background-color: rgba(76, 195, 138, 0.08); }
  &--bad { color: #E5484D; border-color: rgba(229, 72, 77, 0.5); background-color: rgba(229, 72, 77, 0.08); }

  /* ---- soft 软底徽章（C09-2 订单页实测：14% 色底、无描边、11 Medium） ---- */
  &--soft-ok,
  &--soft-gold,
  &--soft-bad {
    height: auto;
    padding: 2rpx 16rpx;
    border: none;
  }
  &--soft-ok { color: $tip-green; background-color: $badge-green-bg; }
  &--soft-gold { color: $gold; background-color: $badge-gold-bg; }
  &--soft-bad { color: $dot-booked; background-color: $badge-red-bg; }
}
</style>
