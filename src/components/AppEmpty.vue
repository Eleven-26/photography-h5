<template>
  <view class="app-empty">
    <text class="app-empty__icon">{{ icon }}</text>
    <text class="app-empty__text">{{ text }}</text>
  </view>
</template>

<script>
/** AppEmpty —— 空态（列表无数据/无结果；避免整页白屏） */
export default {
  name: 'AppEmpty',
  props: {
    text: { type: String, default: '暂无内容' },
    icon: { type: String, default: '◦' },
  },
}
</script>

<style lang="scss" scoped>
.app-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
  &__icon { font-size: 80rpx; color: $border-2; line-height: 1; }
  &__text { color: $text-2; font-size: $fs-sm; margin-top: 24rpx; }
}
</style>
