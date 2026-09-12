<template>
  <view class="app-section">
    <view class="app-section__head">
      <text class="app-section__title">{{ title }}</text>
      <view v-if="more" class="app-section__more pressable" @click="$emit('more')">
        <text class="app-section__more-text">{{ moreText }}</text>
        <!-- C01 实测：查看全部箭头 14px -->
        <AppIcon name="chevron-all" :size="14" />
      </view>
    </view>
    <text v-if="subtitle" class="app-section__subtitle">{{ subtitle }}</text>
  </view>
</template>

<script>
/**
 * AppSection —— 区块标题（首页/列表页通用）
 * 规格：C01-首页 实测（2026-09-07）——标题 14px Bold #B8B9BF，
 *       区块上边距 20px、标题行下边距 8px、左右页边距 20px（卡片满宽区块为 16px，由页面自行覆盖）。
 */
export default {
  name: 'AppSection',
  props: {
    title: { type: String, required: true },
    subtitle: { type: String, default: '' },
    /** 显示右侧入口 */
    more: { type: Boolean, default: false },
    /** 右侧入口文案（C01 实测「查看全部」+ 箭头图标） */
    moreText: { type: String, default: '查看全部' },
  },
  emits: ['more'],
}
</script>

<style lang="scss" scoped>
.app-section {
  margin-top: 40rpx;
  /* C01 实测：标题左缘 20px / 「查看全部」右缘 16px / 标题行下 8px */
  padding: 0 32rpx 16rpx 40rpx;

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  &__title { color: $text-3; font-size: $fs-md; font-weight: 700; }
  &__more {
    display: flex;
    align-items: center;
    gap: 8rpx;
  }
  &__more-text { color: $text-2; font-size: $fs-sm; font-weight: 500; }
  &__subtitle { display: block; color: $text-2; font-size: $fs-sm; margin-top: 8rpx; }
}
</style>
