<template>
  <view class="page-wrap page-form">
    <!-- 状态栏占位：设计稿顶部 Iphone 44px（C04 状态栏 0-44，导航行 44-88）。
         H5 由 .status-bar 固定 44px；MP 端 AppNavBar 已用系统值定位，避免双计。 -->
    <!-- #ifdef H5 -->
    <view class="status-bar" />
    <!-- #endif -->
    <AppNavBar title="拍摄需求" />

    <view class="page-form__body">
      <!-- ① 进度：需求 x / 6 + 4px 轨道（#25262A）亮金填充（C04 实测） -->
      <view class="page-form__progress">
        <text class="page-form__progress-text">需求 {{ step + 1 }} / {{ steps.length }}</text>
        <view class="page-form__progress-track">
          <view class="page-form__progress-fill" :style="{ width: progressPercent + '%' }" />
        </view>
      </view>

      <!-- ② 问题区：22px 问题 + 13px 副文案（C04 Step1 实测规格，各步同构） -->
      <view class="page-form__step">
        <text class="page-form__question">{{ current.q }}</text>
        <text v-if="current.hint" class="page-form__hint">{{ current.hint }}</text>

        <!-- 选择题：胶囊 wrap gap8，选中白底黑字（C04 实测） -->
        <view v-if="current.type === 'choice'" class="page-form__options">
          <view
            v-for="opt in current.options"
            :key="opt"
            class="page-form__option pressable"
            :class="{ 'page-form__option--active': answers[current.key] === opt }"
            @click="answers[current.key] = opt"
          >
            <text>{{ opt }}</text>
          </view>
        </view>

        <!-- 输入题 -->
        <view v-if="current.type === 'input'" class="page-form__field">
          <input
            v-model="answers[current.key]"
            class="page-form__input"
            :placeholder="current.placeholder"
            placeholder-class="page-form__ph"
            :maxlength="50"
          />
        </view>

        <!-- 多行题 -->
        <view v-if="current.type === 'textarea'" class="page-form__field">
          <textarea
            v-model="answers[current.key]"
            class="page-form__textarea"
            :placeholder="current.placeholder"
            placeholder-class="page-form__ph"
            :maxlength="200"
            :show-count="false"
          />
        </view>

        <!-- 概要题（第 6 步）：回显全链数据，进入 C05 前的最后自查 -->
        <view v-if="current.type === 'summary'" class="page-form__summary">
          <view v-for="row in summaryRows" :key="row.label" class="page-form__summary-row">
            <text class="page-form__summary-label">{{ row.label }}</text>
            <text class="page-form__summary-value">{{ row.value || '—' }}</text>
          </view>
        </view>
      </view>

      <!-- ③ 草稿自动保存（C04 实测：图标 12 + 文案 12px #85878D） -->
      <view class="page-form__draft">
        <!-- C04 实测 12px 灰勾 -->
        <AppIcon name="check-sm" :size="12" />
        <text>草稿已自动保存</text>
      </view>
    </view>

    <!-- ④ 底栏：上一步（次级 ghost）+ 下一步（白胶囊 fill）（C04 实测双钮） -->
    <view class="page-form__footer">
      <AppButton v-if="step > 0" type="secondary" @click="prevStep">上一步</AppButton>
      <AppButton v-else type="secondary" @click="goBack">上一步</AppButton>
      <AppButton flex :loading="submitting" @click="nextStep">下一步</AppButton>
    </view>
  </view>
</template>

<script>
/**
 * C04 需求填写（画板 1:2734 一比一还原）
 *
 * 稿内完整给出 Step1（拍摄人数）规格；第 2–6 步同构推导（问题/选项文案待产品核对）。
 * 分步问卷：进度条 + 单题作答 + 草稿自动保存（storage key=booking_draft）。
 * 完成后携参数跳 C05 确认；提交统一在 C05 走 /order/submit（本页不产生请求）。
 *
 * 字段映射（对齐 order.js BookingSubmit DTO）：
 * people_count / shoot_style / shoot_address / remark；妆造意愿记入 remark（B14：加项为订单级，
 * BookingSubmit 无 addon 字段，联调时与后端确认妆造挂靠方式）。
 */
import AppNavBar from '@/components/AppNavBar.vue'
import AppButton from '@/components/AppButton.vue'

const DRAFT_KEY = 'booking_draft'

/* 六步配置：key 对齐后端字段；type=choice|input|textarea|summary */
const STEPS = [
  { key: 'people_count', q: '拍摄人数？', hint: '包括所有出镜人员', type: 'choice', options: ['1人', '2人', '3人', '4人', '5人+'] },
  { key: 'shoot_style', q: '想要什么拍摄风格？', hint: '选择最贴近的一种', type: 'choice', options: ['温馨家庭', '清新自然', '复古胶片', '时尚杂志'] },
  { key: 'shoot_address', q: '在哪里拍摄？', hint: '填写拍摄地点或集合地址', type: 'input', placeholder: '如：越秀公园正门' },
  { key: 'makeup', q: '需要妆造服务吗？', hint: '妆造 +¥200，自动计入尾款', type: 'choice', options: ['不需要', '需要妆造'] },
  { key: 'remark', q: '还有什么想告诉摄影师？', hint: '老人小孩、忌口、纪念日等', type: 'textarea', placeholder: '选填' },
  { key: 'summary', q: '确认一下你的需求', hint: '提交后将进入预约确认页', type: 'summary' },
]

export default {
  components: { AppNavBar, AppButton },
  data() {
    return {
      packageId: 0,
      date: '',
      time: '',
      step: 0,
      steps: STEPS,
      answers: { people_count: '', shoot_style: '', shoot_address: '', makeup: '', remark: '' },
      submitting: false,
    }
  },
  computed: {
    current() {
      return this.steps[this.step]
    },
    progressPercent() {
      /* C04 实测：第 1 步填充 ≈1/6 轨道宽 */
      return Math.round(((this.step + 1) / this.steps.length) * 100)
    },
    summaryRows() {
      return [
        { label: '拍摄日期', value: this.date },
        { label: '拍摄时间', value: this.time },
        { label: '拍摄人数', value: this.answers.people_count },
        { label: '拍摄风格', value: this.answers.shoot_style },
        { label: '拍摄地点', value: this.answers.shoot_address },
        { label: '妆造', value: this.answers.makeup },
        { label: '备注', value: this.answers.remark },
      ]
    },
  },
  watch: {
    /* 草稿自动保存：任何作答变更即落 storage（C04「草稿已自动保存」口径） */
    answers: {
      deep: true,
      handler(val) {
        try {
          uni.setStorageSync(DRAFT_KEY, { packageId: this.packageId, date: this.date, time: this.time, answers: val })
        } catch (e) { /* 存储失败不阻塞作答 */ }
      },
    },
  },
  onLoad(query) {
    this.packageId = Number(query.packageId || 0)
    this.date = query.date || ''
    this.time = query.time ? decodeURIComponent(query.time) : ''
    /* 恢复草稿（同套餐同日期才恢复，防止串单） */
    try {
      const draft = uni.getStorageSync(DRAFT_KEY)
      if (draft && draft.packageId === this.packageId && draft.date === this.date) {
        this.answers = { ...this.answers, ...(draft.answers || {}) }
      }
    } catch (e) { /* 无草稿 */ }
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },
    prevStep() {
      if (this.step > 0) this.step -= 1
    },
    /** 下一步：必答校验（错误保留输入，只提示不清理） */
    nextStep() {
      const cur = this.current
      if ((cur.type === 'choice' || cur.type === 'input') && !this.answers[cur.key]) {
        uni.showToast({ title: '请先完成本题', icon: 'none' })
        return
      }
      if (this.step < this.steps.length - 1) {
        this.step += 1
        return
      }
      /* 最后一步 → C05 预约确认 */
      const q = `packageId=${this.packageId}&date=${this.date}&time=${encodeURIComponent(this.time)}`
      uni.navigateTo({ url: `/pages/booking/confirm?${q}` })
    },
  },
}
</script>

<style lang="scss" scoped>
.page-form {
  padding-bottom: 260rpx;
  &__body {
    padding: 0 $page-pad;
  }
  /* 进度条：13px 文案 + 4px 轨道 #25262A 亮金填充（C04 实测）
   * 稿：导航栏底 y88px → 文案墨迹 y118.5px（padding-top 28px=56rpx）、
   *     轨道 x91.5-359px、4px 高；问题行墨迹 y158px（padding-bottom 17px=34rpx） */
  &__progress {
    display: flex;
    align-items: center;
    gap: 24rpx;
    padding: 56rpx 0 34rpx;
  }
  &__progress-text { flex: none; color: $text-2; font-size: 26rpx; }
  &__progress-track {
    flex: 1;
    height: 8rpx;
    border-radius: 4rpx;
    background-color: $track;
    overflow: hidden;
  }
  &__progress-fill {
    height: 100%;
    background-color: $gold-bright;
    border-radius: 4rpx;
    transition: width 0.2s ease;
  }
  /* 问题区（C04 实测：22px 白 / 13px 灰） */
  &__step { display: flex; flex-direction: column; }
  &__question {
    color: $text-1;
    font-size: 44rpx;
    font-weight: 600;
    margin-top: 4rpx;
  }
  &__hint {
    color: $text-2;
    font-size: 26rpx;
    margin-top: 20rpx; /* 稿：问题墨迹底 y178px → 副文案墨迹顶 y197px（19px 行距） */
  }
  /* 选项胶囊：r999 pad x16 y8-10，选中白底黑字（C04 实测）
   * 稿：胶囊 y231-269px（高 38px=76rpx）、左起 x16px、行间距 8px；5 枚单行不换行 */
  &__options {
    display: flex;
    flex-wrap: wrap;
    gap: 16rpx;
    padding-top: 38rpx;
  }
  &__option {
    padding: 18rpx 32rpx; /* 稿 76rpx 高 = 2×18rpx + 行高 40rpx */
    border-radius: $radius-btn;
    border: 1rpx solid $border-2;
    text { color: $text-3; font-size: $fs-md; }
    &--active {
      background-color: $text-1;
      border-color: $text-1;
      text { color: $bg-page; font-weight: 600; }
    }
  }
  /* 输入题 */
  &__field {
    margin-top: 32rpx;
    padding: 24rpx 32rpx;
    background-color: $bg-card;
    border-radius: $radius-cell;
  }
  &__input,
  &__textarea {
    width: 100%;
    color: $text-1;
    font-size: $fs-md;
    line-height: 1.6;
    height: 48rpx;
  }
  &__textarea { height: 200rpx; }
  /* 概要回显 */
  &__summary {
    margin-top: 32rpx;
    padding: 8rpx 32rpx;
    background-color: $bg-card;
    border-radius: $radius-cell;
  }
  &__summary-row {
    display: flex;
    justify-content: space-between;
    padding: 20rpx 0;
    border-bottom: 1rpx solid $border-1;
    &:last-child { border-bottom: none; }
  }
  &__summary-label { color: $text-2; font-size: $fs-md; }
  &__summary-value { color: $text-1; font-size: $fs-md; }
  /* 草稿提示：12px #85878D（C04 实测）
   * 稿：胶囊底 y269px → 提示文字墨迹顶 y294px（25px 间距） */
  &__draft {
    display: flex;
    align-items: center;
    gap: 12rpx;
    padding: 44rpx 0 12rpx;
    text { color: $text-2; font-size: $fs-sm; }
  }
  /* 毛玻璃底栏：ghost「上一步」+ fill「下一步」（C04 实测双钮） */
  &__footer {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    gap: $touch-gap;
    padding-top: 24rpx;
    padding-left: $page-pad;
    padding-right: $page-pad;
    padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
    background-color: rgba(23, 24, 28, 0.96);
    backdrop-filter: blur(20px);
  }
}
</style>
