<template>
  <view class="app-timeline">
    <view
      v-for="(step, i) in steps"
      :key="i"
      class="app-timeline__item"
    >
      <!-- 节点圆点：已完成=金底勾 / 当前=金描边脉冲 / 未到=灰描边 -->
      <view class="app-timeline__dot" :class="dotClass(i)">
        <text v-if="i < current" class="app-timeline__check">✓</text>
        <text v-else-if="i === current" class="app-timeline__check app-timeline__check--current">{{ i + 1 }}</text>
      </view>
      <view v-if="i < steps.length - 1" class="app-timeline__line" :class="{ 'app-timeline__line--done': i < current }" />
      <!-- 文案 -->
      <text class="app-timeline__label" :class="{ 'app-timeline__label--active': i <= current }">{{ step }}</text>
    </view>
  </view>
</template>

<script>
/**
 * AppTimeline —— 横向步骤时间线（C08 登记结果 / C16A 尾款时间线 / B2 调度费登记 复用）
 * 数据结构：steps=['申请改期','选择新档期','已转账调度费','等待确认','改期生效']，current=当前步索引
 */
export default {
  name: 'AppTimeline',
  props: {
    /** 步骤文案数组 */
    steps: { type: Array, required: true },
    /** 当前进行到第几步（0 起；已完成步 < current） */
    current: { type: Number, default: 0 },
  },
  methods: {
    dotClass(i) {
      return {
        'app-timeline__dot--done': i < this.current,
        'app-timeline__dot--active': i === this.current,
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.app-timeline {
  display: flex;
  align-items: flex-start;
  &__item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
  }
  &__dot {
    width: 40rpx;
    height: 40rpx;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1rpx solid $border-2;
    background-color: transparent;
    z-index: 1;
    &--done { background-color: $gold; border-color: $gold; }
    &--active { border-color: $gold; }
  }
  &__check { font-size: $fs-xs; color: #17181A; font-weight: 700; }
  &__check--current { color: $gold; }
  &__line {
    position: absolute;
    top: 20rpx;
    left: 50%;
    width: 100%;
    height: 2rpx;
    background-color: $border-2;
    &--done { background-color: $gold; }
  }
  &__label {
    margin-top: 12rpx;
    font-size: $fs-xs;
    color: $text-2;
    text-align: center;
    &--active { color: $text-1; }
  }
}
</style>
