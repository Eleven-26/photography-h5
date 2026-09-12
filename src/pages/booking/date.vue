<template>
  <view class="page-wrap page-date">
    <!-- 状态栏占位：稿顶部 iPhone 状态栏 44px（C03 y0-44，common.scss .status-bar）；
         占位后 AppNavBar 的 44px 导航行落在稿的 y44-88 上 -->
    <view class="status-bar" />
    <AppNavBar title="选择日期" />

    <!-- ① 日历卡：343 宽 r16 pad16，月历 + 图例（C03 实测） -->
    <view class="page-date__calendar">
      <AppCalendar
        :year="year"
        :month="month"
        :selected="form.shoot_date"
        :marks="calendarMarks"
        @change="onMonthChange"
        @select="onSelectDate"
      >
        <!-- 图例卡：底 #17181C r8（C03 实测 65.6px 高） -->
        <view class="page-date__legend">
          <AppIcon name="info-sm" :size="13" />
          <text class="page-date__legend-text">
            10日、14日已被其他客户预约 · 18日摄影师临时关闭（外出拍摄）
          </text>
        </view>
      </AppCalendar>
    </view>

    <!-- ② 锁定提示卡：r12 h68，13px #999999（C03 实测） -->
    <view class="page-date__lock">
      <!-- 按锁档口径：临时锁 20 分钟（原稿 15 分钟已修正）；稿该短语为金色强调 -->
      <AppIcon name="lock" :size="13" />
      <text class="page-date__lock-text">
        选择时间后将<text class="page-date__lock-em">临时锁定20分钟</text>，请在锁定时间内完成预约提交。
      </text>
    </view>

    <!-- ③ 可选时间：日期标题 + 时段胶囊（C03 实测 h34 r999 pad x12） -->
    <view v-if="form.shoot_date" class="page-date__slot-label">
      <text>{{ slotLabelTitle }}</text>
    </view>
    <view v-if="form.shoot_date" class="page-date__slots">
      <view
        v-for="s in daySlots"
        :key="s.range"
        class="page-date__slot pressable"
        :class="{
          'page-date__slot--active': form.shoot_time === s.range,
          'page-date__slot--disabled': s.disabled,
        }"
        @click="onSelectSlot(s)"
      >
        <text>{{ s.range }}</text>
      </view>
    </view>
    <!-- 时段关闭提示卡（C03 实测：16:00 后光线较弱） -->
    <view v-if="hasClosedSlot" class="page-date__closed">
      <AppIcon name="asterisk" :size="13" />
      <text class="page-date__closed-text">16:00后光线较弱，摄影师已关闭该时段。推荐选择上午或下午早些时候。</text>
    </view>

    <!-- ④ 底栏（毛玻璃）：已选时间 + 「下一步」白胶囊 h56（C03 实测） -->
    <view class="page-date__footer">
      <view class="page-date__footer-info">
        <text class="page-date__footer-label">已选时间</text>
        <text class="page-date__footer-value">{{ selectedSummary }}</text>
      </view>
      <AppButton size="hug" :disabled="!form.shoot_time" @click="goForm">下一步</AppButton>
    </view>
  </view>
</template>

<script>
/**
 * C03 选择日期（画板 1:2071 一比一还原）
 *
 * 数据链路：套餐详情 C02「选择日期」→ 本页 → C04 需求填写
 * 档期数据：getAvailableSlots（biz_slot_template 规则 + biz_calendar_block 已占用过滤），
 *          接口路径待联调核对；请求失败降级为演示数据（已标注），保证页面可预览。
 */
import AppNavBar from '@/components/AppNavBar.vue'
import AppCalendar from '@/components/AppCalendar.vue'
import AppButton from '@/components/AppButton.vue'
import { getAvailableSlots } from '@/api/slot'

/* 时段模板：与 C03 稿一致；16:00-18:00 稿内为禁用态 */
const DEMO_SLOTS = [
  { range: '09:00-11:00', disabled: false },
  { range: '11:00-14:00', disabled: false },
  { range: '14:00-16:00', disabled: false },
  { range: '16:00-18:00', disabled: true },
]

export default {
  components: { AppNavBar, AppCalendar, AppButton },
  data() {
    const now = new Date()
    return {
      packageId: 0,
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      calendarMarks: {}, /* key yyyy-MM-dd → { dot, disabled } */
      daySlots: [],
      form: { shoot_date: '', shoot_time: '' },
      loading: false,
    }
  },
  computed: {
    /** 选中日期的星期标题：「8月8日 周六 · 可选时间」 */
    slotLabelTitle() {
      if (!this.form.shoot_date) return ''
      const d = new Date(`${this.form.shoot_date}T00:00:00`)
      const weeks = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      return `${d.getMonth() + 1}月${d.getDate()}日 ${weeks[d.getDay()]} · 可选时间`
    },
    selectedSummary() {
      const { shoot_date: date, shoot_time: time } = this.form
      return date && time ? `${date} ${time}` : '尚未选择'
    },
    hasClosedSlot() {
      return this.daySlots.some((s) => s.disabled)
    },
  },
  onLoad(query) {
    this.packageId = Number(query.packageId || 0)
    this.loadMonth()
  },
  methods: {
    /** 拉取当月档期标记；失败降级演示数据（联调时删除降级分支） */
    async loadMonth() {
      if (this.loading) return
      this.loading = true
      try {
        const res = await getAvailableSlots({
          package_id: this.packageId,
          year: this.year,
          month: this.month,
        })
        this.applySlots(res)
      } catch (e) {
        /* ⚠️ 演示数据：对齐 C03 稿口径（红点=已约 / 金点=摄影师关闭），联调后移除 */
        this.calendarMarks = this.demoMarks()
        if (this.form.shoot_date) this.daySlots = DEMO_SLOTS
      } finally {
        this.loading = false
      }
    },
    /** 期望返回 { days: [{date, status}], slots: [{range, disabled}] } —— 字段联调核对 */
    applySlots(res) {
      const data = res && res.data ? res.data : {}
      const marks = {}
      ;(data.days || []).forEach((d) => {
        marks[d.date] = { dot: d.status === 1 ? 'booked' : d.status === 2 ? 'blocked' : '', disabled: d.status === 1 || d.status === 2 }
      })
      this.calendarMarks = marks
      if (data.slots) this.daySlots = data.slots
      else if (this.form.shoot_date) this.daySlots = DEMO_SLOTS
    },
    /* 演示标记：本月 10/14 已约、18 关闭（对齐 C03 图例文案） */
    demoMarks() {
      const mk = (day, dot) => ({
        [`${this.year}-${String(this.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`]: { dot, disabled: true },
      })
      return { ...mk(10, 'booked'), ...mk(14, 'booked'), ...mk(18, 'blocked') }
    },
    onMonthChange({ year, month }) {
      this.year = year
      this.month = month
      this.loadMonth()
    },
    onSelectDate(key) {
      this.form.shoot_date = key
      this.form.shoot_time = ''
      /* 切日重取该日时段；演示数据直接用模板 */
      this.daySlots = DEMO_SLOTS
    },
    onSelectSlot(s) {
      if (s.disabled) return
      this.form.shoot_time = s.range
    },
    goForm() {
      const q = `packageId=${this.packageId}&date=${this.form.shoot_date}&time=${encodeURIComponent(this.form.shoot_time)}`
      uni.navigateTo({ url: `/pages/booking/form?${q}` })
    },
  },
}
</script>

<style lang="scss" scoped>
.page-date {
  padding-bottom: 260rpx; /* 给毛玻璃底栏留位 */
  &__calendar {
    /* 稿：导航底 y88 → 卡顶 y108 = 20px；卡底 y502 → 锁定卡顶 y524 = 22px */
    margin: 40rpx $page-pad 44rpx;
    padding: 32rpx;
    background-color: $bg-card;
    border-radius: 32rpx; /* C03 实测 r16 */
  }
  /* 图例：icon 13px 灰 + 文案 13px #B8B9BF（C03 实测） */
  &__legend {
    display: flex;
    align-items: flex-start;
    gap: 16rpx;
    margin-top: 20rpx;
    padding: 20rpx 24rpx;
    background-color: $bg-page;
    border-radius: $radius-cell;
  }
  &__legend-text {
    color: $text-3;
    font-size: 26rpx;
    line-height: 1.6;
  }
  /* 锁定提示卡：稿圆角 r12（角部面积法回读 12.16）、高 68px */
  &__lock,
  &__closed {
    display: flex;
    align-items: center;
    gap: 16rpx;
    margin: 0 $page-pad 24rpx;
    padding: 0 24rpx;
    min-height: 136rpx;
    background-color: $bg-card;
    border-radius: 24rpx; /* 稿 r12（原 $radius-cell=16rpx/r8 偏小） */
  }
  &__lock-text { color: $tip-gray; font-size: 26rpx; line-height: 1.6; }
  &__lock-em { color: $gold; } /* 稿「临时锁定X分钟」金色强调 */
  /* 时段关闭提示卡：稿 chips 底 y718 → 卡顶 y736 = 18px */
  &__closed { margin-top: 38rpx; }
  &__closed-text { color: $text-3; font-size: 26rpx; line-height: 1.6; }
  /* 可选时间标题 14px #B8B9BF（C03 实测 pad l4 t20 b8） */
  &__slot-label {
    padding: 40rpx 40rpx 16rpx;
    text { color: $text-3; font-size: $fs-md; }
  }
  /* 时段胶囊：稿 h32 r999 pad x12，13px；块间距 14px */
  &__slots {
    display: flex;
    flex-wrap: wrap;
    gap: 28rpx; /* 稿胶囊块间距 14px（原 16rpx=8px 偏紧） */
    padding: 0 $page-pad;
  }
  &__slot {
    height: 64rpx; /* 稿 y644-676 高 32px（原 68rpx=34px） */
    padding: 0 24rpx;
    display: flex;
    align-items: center;
    border-radius: $radius-btn;
    border: 1rpx solid $border-2;
    text { color: $text-3; font-size: 26rpx; }
    &--active {
      background-color: $text-1; /* 选中白底黑字（C03 实测） */
      border-color: $text-1;
      text { color: $bg-page; font-weight: 600; }
    }
    &--disabled {
      border-color: transparent;
      text { color: $text-disabled; } /* 禁用 #5A5C61（C03 实测） */
    }
  }
  /* 毛玻璃底栏：#17181C@0.96 pad 16/12（C03 实测） */
  &__footer {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $touch-gap;
    padding-top: 24rpx;
    padding-left: $page-pad;
    padding-right: $page-pad;
    padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
    background-color: rgba(23, 24, 28, 0.96);
    backdrop-filter: blur(20px);
  }
  &__footer-info { display: flex; flex-direction: column; }
  &__footer-label { color: $text-2; font-size: $fs-xs; /* 11px */ }
  &__footer-value { color: $text-1; font-size: 30rpx; margin-top: 10rpx; /* 15px 实测 */ }
}
</style>
