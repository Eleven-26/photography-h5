<template>
  <view class="app-cell pressable" @click="$emit('click')">
    <!-- 左：标题/副标题 -->
    <view class="app-cell__main">
      <text class="app-cell__title" :class="{ 'app-cell__title--strong': strong }">{{ title }}</text>
      <text v-if="desc" class="app-cell__desc">{{ desc }}</text>
    </view>
    <!-- 右：值 + 箭头 -->
    <view class="app-cell__side">
      <text v-if="value" class="app-cell__value">{{ value }}</text>
      <!-- 列表行箭头：C15/C17/C18 实测 15px（原画板矢量） -->
      <AppIcon v-if="arrow" name="chevron-right-sm" :size="15" />
    </view>
  </view>
</template>

<script>
/**
 * AppCell —— 行卡（列表/设置项/表单行复用）
 * 触摸目标 ≥ 44px（common.scss .cell 统一保障）。
 */
export default {
  name: 'AppCell',
  props: {
    title: { type: String, required: true },
    desc: { type: String, default: '' },
    value: { type: String, default: '' },
    arrow: { type: Boolean, default: false },
    strong: { type: Boolean, default: false },
  },
  emits: ['click'],
}
</script>

<style lang="scss" scoped>
.app-cell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: $touch-min;
  padding: 24rpx 32rpx;
  background-color: $bg-card;
  border: 1rpx solid $border-1;
  border-radius: $radius-cell;

  &__main { flex: 1; min-width: 0; margin-right: 24rpx; }
  &__title { display: block; color: $text-1; font-size: $fs-md; }
  &__title--strong { font-weight: 600; font-size: $fs-lg; }
  &__desc { display: block; color: $text-2; font-size: $fs-sm; margin-top: 4rpx; }
  &__side { display: flex; align-items: center; gap: 8rpx; }
  &__value { color: $text-2; font-size: $fs-md; }
}
</style>
