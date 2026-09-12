<template>
  <view class="cal">
    <!-- ① 月份切换行：箭头 20px + 「YYYY年M月」15px（C03 实测） -->
    <view class="cal__head">
      <!-- C03 实测月份切换箭头 20px（原画板矢量） -->
      <view class="cal__arrow pressable" @click="prevMonth"><AppIcon name="cal-prev" :size="20" /></view>
      <text class="cal__title">{{ year }}年{{ month }}月</text>
      <view class="cal__arrow pressable" @click="nextMonth"><AppIcon name="cal-next" :size="20" /></view>
    </view>
    <!-- ② 星期行：11px 次级灰（C03 实测） -->
    <view class="cal__week">
      <text v-for="w in weekHeads" :key="w" class="cal__week-cell">{{ w }}</text>
    </view>
    <!-- ③ 日期网格：7 列，格 44px r8；态——过去/禁用灰、可选白、选中亮金底黑字、底部状态点（C03 实测） -->
    <view class="cal__grid">
      <view v-for="(cell, i) in cells" :key="i" class="cal__cell-wrap">
        <view
          v-if="cell.day"
          class="cal__cell pressable"
          :class="{ 'cal__cell--disabled': cell.disabled, 'cal__cell--active': isActive(cell), 'cal__cell--current': cell.key === current }"
          @click="pick(cell)"
        >
          <text class="cal__day">{{ cell.day }}</text>
          <view v-if="cell.dot" class="cal__dot" :class="`cal__dot--${cell.dot}`" />
          <text v-if="cell.key === current" class="cal__current">当前</text>
        </view>
      </view>
    </view>
    <!-- ④ 图例插槽：C03 在卡片底部放状态点图例说明 -->
    <slot />
  </view>
</template>

<script>
/**
 * AppCalendar —— 月历选择组件（画板 C03 实测规格，C03 选择日期 / C19 改期选日期复用）
 *
 * 规格来源：C03-选择日期（1:2071）逐节点实测：
 * - 卡内月份行 gap 居中分布，箭头 20px #85878D，标题 15px 白
 * - 星期行 11px #85878D，7 列
 * - 日期格 44.4px r8、字 14px；选中底 #FFDA08 黑字（亮金口径）
 * - 状态点 4px：已约 #E37B76（红）/ 摄影师关闭 #D9A735（金）
 * marks 约定：key=yyyy-MM-dd，value={ dot: 'booked'|'blocked', disabled: Boolean }
 */
export default {
  name: 'AppCalendar',
  props: {
    year: { type: Number, required: true },
    month: { type: Number, required: true },
    /** 已选日期 yyyy-MM-dd（高亮） */
    selected: { type: String, default: '' },
    /** 日期标记：{ '2026-09-10': { dot: 'booked' }, '2026-09-14': { dot: 'blocked', disabled: true } } */
    marks: { type: Object, default: () => ({}) },
    /** 当前预约日期 yyyy-MM-dd（C19 实测：金「当前」小字标注，不可选）—— C19 新增态，C03 不传即可 */
    current: { type: String, default: '' },
  },
  emits: ['select', 'change'],
  data() {
    return {
      weekHeads: ['日', '一', '二', '三', '四', '五', '六'],
      /* 今天零点：早于它的日期一律禁用（C03 过去日期灰字口径） */
      todayStart: new Date(new Date().setHours(0, 0, 0, 0)),
    }
  },
  computed: {
    /** 网格单元：前置空位 + 每日一格；禁用=过去 或 marks.disabled */
    cells() {
      const firstWeekday = new Date(this.year, this.month - 1, 1).getDay()
      const daysInMonth = new Date(this.year, this.month, 0).getDate()
      const cells = Array.from({ length: firstWeekday }, () => ({ day: 0 }))
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(this.year, this.month - 1, d)
        const key = this.formatKey(d)
        const mark = this.marks[key] || {}
        cells.push({
          day: d,
          key,
          dot: mark.dot || '',
          disabled: date < this.todayStart || !!mark.disabled,
        })
      }
      return cells
    },
  },
  methods: {
    formatKey(d) {
      const m = String(this.month).padStart(2, '0')
      const dd = String(d).padStart(2, '0')
      return `${this.year}-${m}-${dd}`
    },
    isActive(cell) {
      return cell.key === this.selected && !cell.disabled
    },
    prevMonth() {
      let { year, month } = this
      month -= 1
      if (month === 0) { month = 12; year -= 1 }
      this.$emit('change', { year, month })
    },
    nextMonth() {
      let { year, month } = this
      month += 1
      if (month === 13) { month = 1; year += 1 }
      this.$emit('change', { year, month })
    },
    pick(cell) {
      if (cell.disabled || cell.key === this.current) return
      this.$emit('select', cell.key, cell.day)
    },
  },
}
</script>

<style lang="scss" scoped>
.cal {
  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  &__arrow {
    width: 40rpx;
    height: 40rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  &__title {
    color: $text-1;
    font-size: 30rpx;
  }
  &__week {
    display: flex;
    padding-top: 16rpx;
  }
  &__week-cell {
    flex: 1;
    text-align: center;
    color: $text-2;
    font-size: $fs-xs; /* 11px */
    padding: 10rpx 0 12rpx;
  }
  &__grid {
    display: flex;
    flex-wrap: wrap;
  }
  &__cell-wrap {
    width: 14.2857%;
    display: flex;
    justify-content: center;
  }
  &__cell {
    position: relative;
    width: 88rpx;   /* 44px 实测 */
    height: 88rpx;
    border-radius: $radius-cell;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 2rpx 0;
  }
  &__day {
    font-size: $fs-md; /* 14px */
    color: $text-1;
  }
  &__cell--disabled &__day {
    color: $text-disabled; /* 过去/不可约 #5A5C61 */
  }
  &__cell--active {
    background-color: $gold-bright; /* 选中亮金（C03 实测） */
    .cal__day { color: #17181A; font-weight: 600; }
  }
  /* 当前预约日期：金「当前」小字（C19 实测 10px #D9A735，日字 #56585D），点击禁用 */
  &__cell--current {
    flex-direction: column;

    .cal__day { color: #56585D; }
    .cal__current { color: $gold; font-size: 20rpx; line-height: 1.2; }
  }
  &__dot {
    position: absolute;
    left: 50%;
    bottom: 8rpx;
    transform: translateX(-50%);
    width: 8rpx;
    height: 8rpx;
    border-radius: 50%;
    &--booked { background-color: $dot-booked; } /* 已被其他客户预约（C03 实测红点） */
    &--blocked { background-color: $gold; }   /* 摄影师临时关闭（C03 实测金点） */
  }
}
</style>
