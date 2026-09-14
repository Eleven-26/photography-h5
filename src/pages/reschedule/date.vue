<template>
  <view class="page-wrap page-rd">
    <view class="status-bar" />
    <AppNavBar title="选择新日期" />

    <!-- ① 免费窗口提示（C19 实测位于日历之上，紧贴导航下，非页尾） -->
    <view v-if="fee === 0" class="page-rd__warn">
      <!-- C19 实测金色时钟图标 18px -->
      <AppIcon name="clock-gold" :size="18" />
      <view class="page-rd__warn-body">
        <text class="page-rd__warn-line">免费改期剩余时间：{{ freeHoursLeft }}小时</text>
        <text class="page-rd__warn-line">{{ resFreeHours }}小时内改期将收取{{ resFeeRate }}%调度费（¥{{ feeAtRate.toLocaleString() }}）</text>
      </view>
    </view>

    <!-- ② 日历卡（C19 实测 #1D1E22 r16 pad16，AppCalendar 复用 + 「当前」标记新态） -->
    <view class="page-rd__cal">
      <AppCalendar
        :year="year"
        :month="month"
        :selected="form.date"
        :current="currentDateKey"
        :marks="marks"
        @select="onPickDate"
        @change="onChangeMonth"
      >
        <!-- 内嵌图例说明（C19 实测 #17181C r8） -->
        <view class="page-rd__legend">
          <AppIcon name="info-sm" :size="13" />
          <text class="page-rd__legend-text">{{ legendText }}</text>
        </view>
      </AppCalendar>
    </view>

    <!-- ② 锁定提示（按业务口径 20 分钟，稿面「15分钟」为旧文案，勿改回） -->
    <view class="page-rd__lock">
      <AppIcon name="lock" :size="13" />
      <text class="page-rd__lock-text">选择时间后将临时锁定20分钟，请在锁定时间内完成预约提交。</text>
    </view>

    <!-- ③ 选择时间段（C19 实测胶囊 h34 r999 pad12/8；选中白底黑字 / 禁用 #5A5C61） -->
    <view class="page-rd__label"><text>选择时间段</text></view>
    <view class="page-rd__slots">
      <text
        v-for="s in slots"
        :key="s.label"
        class="page-rd__slot"
        :class="{ 'page-rd__slot--on': form.slot === s.label, 'page-rd__slot--off': s.disabled }"
        @click="!s.disabled && (form.slot = s.label)"
      >{{ s.label }}</text>
    </view>

    <!-- ④ 改期信息卡（C19 实测 #1D1E22 r16：原日期/新日期/改期费用） -->
    <view class="page-rd__summary">
      <view class="page-rd__row">
        <text class="page-rd__row-label">原日期</text>
        <text class="page-rd__row-val">{{ originalText }}</text>
      </view>
      <view class="page-rd__row">
        <text class="page-rd__row-label">新日期</text>
        <text class="page-rd__row-val">{{ newText }}</text>
      </view>
      <view class="page-rd__row">
        <text class="page-rd__row-label">改期费用</text>
        <text class="page-rd__row-val">{{ feeText }}</text>
      </view>
    </view>

    <!-- ⑤ 毛玻璃底栏：左「已选新时间」+ hug 确认改期（C19 实测） -->
    <AppFooter>
      <view class="page-rd__picked">
        <text class="page-rd__picked-label">已选新时间</text>
        <text class="page-rd__picked-val">{{ newText }}</text>
      </view>
      <AppButton hug :loading="submitting" @click="onConfirm">确认改期</AppButton>
    </AppFooter>
  </view>
</template>

<script>
/**
 * C19 选择新日期（画板 9:1518 一比一还原）
 * 日历复用 AppCalendar（新增 current「当前预约日期」态 + 不可选）
 * 改期规则（biz_studio_setting 参数化）：
 *   距拍摄 > 72h 免费 / 24~72h 收 20% 调度费（即时线下支付，不并入尾款）/ < 24h 不可改
 * 确认 → applyReschedule；费用 > 0 时先跳调度费支付（B2 流程）
 */
import AppNavBar from '@/components/AppNavBar.vue'
import AppFooter from '@/components/AppFooter.vue'
import AppButton from '@/components/AppButton.vue'
import AppCalendar from '@/components/AppCalendar.vue'
import { getOrderDetail } from '@/api/order'
import { applyReschedule } from '@/api/reschedule'
import { getAvailableSlots } from '@/api/slot'
import { getStudioInfo } from '@/api/studio'
import { formatAmount } from '@/utils/format'

export default {
  components: { AppNavBar, AppFooter, AppButton, AppCalendar },
  data() {
    return {
      orderId: 0,
      order: {},
      year: 2026,
      month: 8,
      resFreeHours: 0,   // biz_studio_setting.reschedule_free_hours（免费改期剩余小时阈值）
      resFeeRate: 0,     // biz_studio_setting.reschedule_fee_rate（调度费率 %）
      resMinHours: 0,    // biz_studio_setting.reschedule_min_hours（不足该小时数不可改期）
      hoursLeft: null,   // 距拍摄小时数（由 order.shoot_date/shoot_time 实时计算）
      currentDateKey: '', // 原预约日期（日历中标记为「当前」，不可选）
      /* 后端无「整月可约标记」接口（slot/list 仅按单日查询），故不预设任何点标记 */
      marks: {},
      slots: [],         // 选定日期的可约时段（slot/list 真实返回）
      slotsLoading: false,
      form: { date: '', slot: '' },
      originalText: '',
      submitting: false,
    }
  },
  computed: {
    /* 调度费基数 = 订单总额（后端算好为准，前端仅展示；无订单时按 0，不臆造基数） */
    totalAmt() {
      return Number(this.order.total_amt || this.order.base_price || 0)
    },
    feeAtRate() {
      return Math.round(this.totalAmt * this.resFeeRate / 100)
    },
    /* null = 尚未取到拍摄时间，无法判定；-1 = 已进入不可改期窗口 */
    fee() {
      if (this.hoursLeft == null) return null
      if (this.hoursLeft > this.resFreeHours) return 0
      if (this.hoursLeft <= this.resMinHours) return -1
      return this.feeAtRate
    },
    feeText() {
      if (this.fee == null) return '—'
      if (this.fee < 0) return '已不可改期'
      return this.fee > 0 ? formatAmount(this.fee) : '免费'
    },
    freeHoursLeft() {
      if (this.hoursLeft == null) return 0
      return Math.max(0, Math.round(this.hoursLeft - this.resFreeHours))
    },
    /** 图例：按真实改期规则生成（无整月标记接口，故不描述点含义） */
    legendText() {
      const parts = []
      if (this.currentDateKey) parts.push(`${this.currentDateKey} 为当前预约日期，不可选`)
      if (this.resMinHours) parts.push(`距拍摄不足 ${this.resMinHours} 小时不可改期`)
      if (this.resFreeHours) parts.push(`距拍摄超过 ${this.resFreeHours} 小时免费改期`)
      return parts.join(' · ') || '请选择新的拍摄日期'
    },
    newText() {
      if (!this.form.date) return '请选择新日期'
      const [, m, d] = this.form.date.split('-')
      return `${Number(m)}月${Number(d)}日 ${this.form.slot || ''}`.trim()
    },
  },
  onLoad(query) {
    this.orderId = Number(query.orderId || 0)
    const now = new Date()
    this.year = now.getFullYear()
    this.month = now.getMonth() + 1
    this.loadData()
  },
  methods: {
    formatAmount,
    async loadData() {
      if (!this.orderId) return
      /* 改期规则来自工作室设置（公开接口，按 slug 定位租户） */
      getStudioInfo()
        .then((s) => {
          const cfg = s || {}
          this.resFreeHours = Number(cfg.reschedule_free_hours || 0)
          this.resFeeRate = Number(cfg.reschedule_fee_rate || 0)
          this.resMinHours = Number(cfg.reschedule_min_hours || 0)
        })
        .catch(() => {})
      const res = await getOrderDetail(this.orderId).catch(() => null)
      const o = (res && res.order) || {}
      this.order = o
      /* 原日期 + 距拍摄小时数均由订单快照计算（后端无现成剩余小时字段） */
      if (o.shoot_date) {
        const dt = new Date(`${o.shoot_date} ${o.shoot_time || '10:00'}`.replace(/-/g, '/'))
        this.hoursLeft = Math.round((dt - new Date()) / 3600000)
        this.currentDateKey = o.shoot_date
        this.originalText = `${Number(o.shoot_date.split('-')[1])}月${Number(o.shoot_date.split('-')[2])}日 ${o.shoot_time || ''}`.trim()
      }
    },
    /** 选定日期后拉该日真实可约时段（slot/list 按日查询） */
    async loadSlots(date) {
      this.slots = []
      if (!date) return
      this.slotsLoading = true
      try {
        const res = await getAvailableSlots({ date })
        const list = Array.isArray(res) ? res : (res && res.list) || []
        this.slots = list.map((s) => ({
          label: `${s.start_time}-${s.end_time}`,
          disabled: !s.available,
        }))
      } catch (e) {
        /* request 层已 toast；保留空时段列表 */
      } finally {
        this.slotsLoading = false
      }
    },
    onPickDate(key) {
      this.form.date = key
      this.form.slot = ''
      this.loadSlots(key)
    },
    onChangeMonth({ year, month }) {
      this.year = year
      this.month = month
    },
    async onConfirm() {
      if (!this.form.date || !this.form.slot) {
        uni.showToast({ title: '请选择新日期与时间段', icon: 'none' })
        return
      }
      if (this.fee === -1) {
        uni.showToast({ title: `拍摄前${this.resMinHours}小时内不可改期`, icon: 'none' })
        return
      }
      this.submitting = true
      try {
        await applyReschedule({
          order_id: this.orderId,
          new_date: this.form.date,
          new_time: this.form.slot,
        })
        if (this.fee > 0) {
          /* 调度费即时线下支付（不并入尾款），先走 B2 支付流程 */
          uni.redirectTo({ url: `/pages/reschedule/fee?orderId=${this.orderId}&fee=${this.fee}` })
        } else {
          uni.showToast({ title: '改期申请已提交', icon: 'success' })
          setTimeout(() => uni.redirectTo({ url: `/pages/order/detail?id=${this.orderId}` }), 600)
        }
      } catch (e) {
        /* request 层已 toast；选择保留 */
      } finally {
        this.submitting = false
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.page-rd {
  padding-bottom: 240rpx;

  &__cal {
    margin: 24rpx $page-pad 0;
    padding: 32rpx;
    background-color: $bg-card;
    border-radius: 32rpx; /* C19 实测 r16（合成标定反算 15.67px，大卡档） */
  }
  &__legend {
    display: flex;
    align-items: flex-start;
    gap: 16rpx;
    margin-top: 24rpx;
    padding: 24rpx 32rpx;
    background-color: $bg-page; /* C19 实测内嵌说明 #17181C（比日历卡 #1D1E22 深一档，原为白色 4% 叠加方向相反） */
    border-radius: $radius-cell; /* C19 实测 r8 */
  }
  &__legend-text { color: $text-3; font-size: 26rpx; line-height: 1.6; }

  &__lock {
    display: flex;
    align-items: flex-start;
    gap: 16rpx;
    margin: 24rpx $page-pad 0;
    padding: 24rpx 32rpx;
    background-color: $bg-card;
    border-radius: $radius-card; /* C19 实测锁定提示卡 r12 */
  }
  &__lock-text { color: $tip-gray; font-size: 26rpx; line-height: 1.6; } /* C19 实测 #999999 */

  &__label {
    padding: 40rpx $page-pad 16rpx; /* 2026-09-07 对表修正：原 8rpx 依赖全局页边距，现区块自带 */
    text { color: $text-3; font-size: 26rpx; }
  }

  /* ③ 时间段胶囊（C19 实测 h34 pad 12/8） */
  &__slots {
    display: flex;
    flex-wrap: wrap;
    gap: 16rpx;
    margin: 0 $page-pad;
  }
  &__slot {
    display: inline-flex;
    align-items: center;
    padding: 16rpx 24rpx;
    color: $text-3;
    font-size: 26rpx;
    border: 1rpx solid $border-2;
    border-radius: 999rpx;

    &--on {
      color: #17181C;
      background-color: $text-1;
      border-color: $text-1;
    }
    &--off { color: $text-disabled; }
  }

  /* ④ 改期信息卡 */
  &__summary {
    margin: 32rpx $page-pad 0;
    padding: 20rpx 32rpx;
    background-color: $bg-card;
    border-radius: $radius-card;
  }
  &__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20rpx 0;
    & + & { border-top: 1rpx solid $border-1; } /* C19 实测行间 hairline */
  }
  &__row-label { color: $text-2; font-size: 28rpx; }
  &__row-val { color: $text-1; font-size: 28rpx; }

  /* ⑤ 免费窗口提示（C19 实测 #2F2B29 暖深底 + 金图标，位置在日历之上） */
  &__warn {
    display: flex;
    gap: 20rpx;
    margin: 10rpx $page-pad 20rpx; /* C19 实测：距导航 5px，距日历 22px */
    padding: 24rpx 32rpx;
    background-color: #2F2B29; /* C19 实测暖深底 */
    border-radius: $radius-card; /* C19 实测 r12 */
  }
  &__warn-body {
    display: flex;
    flex-direction: column;
    gap: 6rpx;
  }
  &__warn-line { color: $text-1; font-size: 26rpx; line-height: 1.6; }

  /* ⑥ 底栏 */
  &__picked {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;

    .page-rd__picked-label { color: $text-2; font-size: 22rpx; }
    .page-rd__picked-val { color: $text-1; font-size: 30rpx; margin-top: 6rpx; }
  }
}
</style>
