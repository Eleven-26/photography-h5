<template>
  <view class="page-od">
    <view class="status-bar" />
    <AppNavBar title="我的订单" />

    <scroll-view class="page-od__body" scroll-y>
      <view class="page-od__inner">
        <!-- ① 标题块：套餐名 20 Bold + 单号 + 状态软徽章（C09-2 三变体实测一致） -->
        <view class="page-od__head">
          <view class="page-od__head-left">
            <text class="page-od__title">{{ order.package_name }}</text>
            <text class="page-od__no">#{{ order.code }}</text>
          </view>
          <AppBadge :text="badgeText" :tone="badgeTone" />
        </view>

        <!-- ② 流程进度条：6 步（预约/定金/拍摄/选片/后期/交付）——改期态沿用，退款态不显示 -->
        <view v-if="mode !== 'refund'" class="page-od__steps-card">
          <view class="page-od__steps">
            <template v-for="(step, i) in STEPS" :key="i">
              <!-- 节点列：done 白圆金勾 / current 金圆数字+光晕 / future 暗圆编号（C09-2 实测） -->
              <view class="page-od__step">
                <view class="page-od__step-icon" :class="`page-od__step-icon--${stepState(i)}`">
                  <view v-if="stepState(i) === 'done'" class="page-od__check" />
                  <text
                    v-else
                    class="page-od__step-num"
                    :class="{ 'page-od__step-num--future': stepState(i) === 'future' }"
                  >{{ i + 1 }}</text>
                </view>
                <text class="page-od__step-label" :class="`page-od__step-label--${stepState(i)}`">{{ step }}</text>
              </view>
              <!-- 步间分隔线 12×2：已完成白 / 未完成暗 -->
              <view
                v-if="i < STEPS.length - 1"
                class="page-od__divider"
                :class="{ 'page-od__divider--done': i + 1 < currentStep }"
              />
            </template>
          </view>
        </view>

        <!-- ③ 当前任务卡（普通态；稿内仅「拍摄准备中」态完整，其余状态文案推导） -->
        <template v-if="mode === 'normal'">
          <view class="page-od__sec-title"><text>当前任务</text></view>
          <view class="page-od__card page-od__card--task">
            <view class="page-od__task-row">
              <!-- C09 实测任务图标（原画板矢量 20×24） -->
              <AppIcon name="clipboard" :size="24" />
              <view class="page-od__task-text">
                <text class="page-od__task-title">{{ task.title }}</text>
                <text class="page-od__task-desc">{{ task.desc }}</text>
              </view>
            </view>
            <view v-if="task.actions && task.actions.length" class="page-od__task-actions">
              <AppButton
                v-for="(act, i) in task.actions"
                :key="i"
                :type="act.type"
                :flex="act.type === 'primary'"
                @click="act.handler"
              >{{ act.text }}</AppButton>
            </view>
          </view>
        </template>

        <!-- ④ 改期块（改期态）：改期详情卡 + 暖棕提示（C09-2 改期变体实测） -->
        <template v-if="mode === 'reschedule'">
          <view class="page-od__sec-title"><text>改期详情</text></view>
          <view class="page-od__card">
            <view v-for="(row, i) in rescheduleRows" :key="i" class="page-od__row" :class="{ 'page-od__row--last': i === rescheduleRows.length - 1 }">
              <text class="page-od__row-label">{{ row.label }}</text>
              <text class="page-od__row-value">{{ row.value }}</text>
            </view>
          </view>
          <view class="page-od__warn">
            <AppIcon name="alert-gold" :size="18" />
            <view class="page-od__warn-text">
              <text class="page-od__warn-strong">改期申请已提交，等待摄影师确认。</text>
              <text class="page-od__warn-line">通常2小时内处理。新档期暂时为你保留。</text>
            </view>
          </view>
        </template>

        <!-- ⑤ 退款块（退款态）：暖棕提示 + 退款进度竖向时间线 + 退款明细卡（C09-2 退款变体实测） -->
        <template v-if="mode === 'refund'">
          <view class="page-od__warn">
            <AppIcon name="alert-gold" :size="18" />
            <view class="page-od__warn-text">
              <text class="page-od__warn-strong">订单已取消，退款处理中。</text>
              <text class="page-od__warn-line">退款金额 {{ formatAmount(order.refund_amt) }} 将由摄影师线下转账退回</text>
            </view>
          </view>

          <view class="page-od__sec-title"><text>退款进度</text></view>
          <view class="page-od__card">
            <view
              v-for="(step, i) in refundSteps"
              :key="i"
              class="page-od__tl-row"
              :class="{ 'page-od__tl-row--last': i === refundSteps.length - 1 }"
            >
              <view class="page-od__tl-node" :class="`page-od__tl-node--${step.state}`">
                <view v-if="step.state === 'done'" class="page-od__check page-od__check--sm" />
                <text v-else-if="step.state === 'future'" class="page-od__tl-num">{{ i + 1 }}</text>
              </view>
              <view v-if="i < refundSteps.length - 1" class="page-od__tl-line" :class="{ 'page-od__tl-line--done': step.state === 'done' }" />
              <view class="page-od__tl-text">
                <text class="page-od__tl-title" :class="`page-od__tl-title--${step.state}`">{{ step.title }}</text>
                <text class="page-od__tl-sub" :class="`page-od__tl-sub--${step.state}`">{{ step.sub }}</text>
              </view>
            </view>
          </view>

          <view class="page-od__sec-title"><text>退款明细</text></view>
          <view class="page-od__card">
            <view class="page-od__row">
              <text class="page-od__row-label">退款金额</text>
              <text class="page-od__row-value">{{ formatAmount(order.refund_amt) }}</text>
            </view>
            <view class="page-od__row page-od__row--last">
              <text class="page-od__row-label">退款方式</text>
              <text class="page-od__row-value">摄影师线下退回</text>
            </view>
          </view>
        </template>

        <!-- ⑥ 拍摄信息卡（三态通用，C09-2 实测 4 行） -->
        <view class="page-od__sec-title"><text>拍摄信息</text></view>
        <view class="page-od__card">
          <view class="page-od__row">
            <text class="page-od__row-label">拍摄日期</text>
            <text class="page-od__row-value">{{ order.shoot_date }}</text>
          </view>
          <view class="page-od__row">
            <text class="page-od__row-label">拍摄时间</text>
            <text class="page-od__row-value page-od__row-value--mono">{{ order.shoot_time }}</text>
          </view>
          <view class="page-od__row">
            <text class="page-od__row-label">拍摄地点</text>
            <text class="page-od__row-value">{{ order.shoot_address }}</text>
          </view>
          <view class="page-od__row page-od__row--last">
            <text class="page-od__row-label">摄影师</text>
            <text class="page-od__row-value">{{ order.photographer }}</text>
          </view>
        </view>

        <!-- ⑦ 付款状态卡（三态通用，C09-2 实测 3 行） -->
        <view class="page-od__sec-title"><text>付款状态</text></view>
        <view class="page-od__card">
          <view class="page-od__row">
            <text class="page-od__row-label">套餐总额</text>
            <text class="page-od__row-value page-od__row-value--mono">{{ formatAmount(order.total_amt) }}</text>
          </view>
          <view class="page-od__row">
            <text class="page-od__row-label">定金 ({{ depositPaid ? '已付' : '待付' }})</text>
            <text class="page-od__row-value page-od__row-value--mono">{{ formatAmount(order.deposit_amt) }}{{ depositPaid ? ' ✓' : '' }}</text>
          </view>
          <view class="page-od__row page-od__row--last">
            <text class="page-od__row-label">尾款 ({{ finalPaid ? '已付' : '待付' }})</text>
            <text class="page-od__row-value page-od__row-value--mono">{{ formatAmount(order.final_amt) }}</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- ⑧ 底栏毛玻璃（仅普通态有底栏；改期/退款变体稿内无底栏） -->
    <AppFooter v-if="mode === 'normal'">
      <AppButton type="secondary" @click="goHome">返回首页</AppButton>
      <AppButton type="primary" flex @click="contactPhotographer">联系摄影师</AppButton>
    </AppFooter>
  </view>
</template>

<script>
import AppNavBar from '@/components/AppNavBar.vue'
import AppFooter from '@/components/AppFooter.vue'
import AppButton from '@/components/AppButton.vue'
import AppBadge from '@/components/AppBadge.vue'
import { getOrderDetail } from '@/api/order'
import { ORDER_VIEW_STATE, FEE_TYPE } from '@/constants/enums'
import { formatAmount } from '@/utils/format'

/** 流程 6 步标签（C09-2 实测：预约/定金/拍摄/选片/后期/交付） */
const STEPS = ['预约', '定金', '拍摄', '选片', '后期', '交付']

/**
 * 后端 status(0-7) → 进度条当前步（1 起）映射。
 * ⚠️ 展示层映射，权威以确认单 B11 回勾为准；status 7 走退款视图不进进度条。
 */
const STEP_BY_STATUS = { 0: 1, 1: 2, 2: 3, 3: 3, 4: 4, 5: 5, 6: 6 }

/**
 * 当前任务卡文案表（key = status）。
 * ⚠️ 稿内仅 status=2「档期已锁定」有完整设计；其余状态文案与按钮为推导，联调时按需求文档对齐。
 * status=1 的「20 分钟」来自锁档口径：订单创建临时锁档 20 分钟，超时未付定金自动开放。
 */
const TASK_BY_STATUS = {
  0: { title: '待摄影师确认', desc: '摄影师确认后进入定金支付环节' },
  1: {
    title: '待支付定金',
    desc: '请在 20 分钟内完成定金转账，超时档期将自动开放',
    actions: [{ text: '支付定金', type: 'primary', handler: 'goPayDeposit' }],
  },
  2: {
    title: '档期已锁定',
    desc: '请查看拍前准备清单，拍摄前1天会再次提醒',
    actions: [
      { text: '申请改期', type: 'secondary', handler: 'goReschedule' },
      { text: '查看拍前准备', type: 'primary', handler: 'goPrep' },
    ],
  },
  3: { title: '拍摄进行中', desc: '摄影师正在为你记录美好瞬间' },
  4: { title: '精修中', desc: '精修完成后将通知你选片' },
  5: { title: '待交付', desc: '成片确认后进行交付' },
  6: { title: '已完成', desc: '感谢你的信任，欢迎评价本次拍摄' },
}

/**
 * 退款时间线：固定 4 步（C09-2 退款变体实测文案）。
 * refund.status(1申请中/2已通过/3已退款/4已驳回) → 当前步。
 */
const REFUND_STEPS = [
  { title: '取消申请已提交', sub: '' },
  { title: '摄影师已确认', sub: '' },
  { title: '退款处理中', sub: '摄影师线下转账退回 · 预计1-3个工作日' },
  { title: '退款到账', sub: '退至微信原账户' },
]
const REFUND_CURRENT_BY_STATUS = { 1: 2, 2: 3, 3: 4, 4: 4 }

export default {
  components: { AppNavBar, AppFooter, AppButton, AppBadge },
  data() {
    return {
      STEPS,
      order: {},
      reschedule: null,
      refund: null,
    }
  },
  computed: {
    /** 视图模式：normal 正常 / reschedule 改期处理中 / refund 退款处理中（C09-2 三变体） */
    mode() {
      /* 联调后移除：?demo=reschedule|refund 便于评审三态 */
      const demo = this.$root.$mp ? this.$root.$mp.query : {}
      if (demo === 'reschedule' || demo === 'refund') return demo
      if (this.order.status === 7) return 'refund'
      return this.reschedule && this.reschedule.status === 1 ? 'reschedule' : 'normal'
    },
    badgeText() {
      if (this.mode === 'refund') return '退款处理中'
      if (this.mode === 'reschedule') return '改期处理中'
      return ORDER_VIEW_STATE[this.order.status] || ''
    },
    badgeTone() {
      if (this.mode === 'refund') return 'soft-bad'
      if (this.mode === 'reschedule') return 'soft-gold'
      return this.order.status === 0 || this.order.status === 1 ? 'soft-gold' : 'soft-ok'
    },
    currentStep() {
      return STEP_BY_STATUS[this.order.status] || 1
    },
    task() {
      const conf = TASK_BY_STATUS[this.order.status] || TASK_BY_STATUS[2]
      const actions = (conf.actions || []).map((a) => ({ ...a, handler: () => this[a.handler]() }))
      return { ...conf, actions }
    },
    rescheduleRows() {
      const r = this.reschedule || {}
      return [
        { label: '原日期', value: r.old_time || `${r.old_shoot_date || ''} ${r.old_shoot_time || ''}` },
        { label: '新日期', value: r.new_time || `${r.new_shoot_date || ''} ${r.new_shoot_time || ''}` },
        { label: '改期费用', value: FEE_TYPE[r.fee_type] || '免费' },
      ]
    },
    refundSteps() {
      const current = this.refund
        ? REFUND_CURRENT_BY_STATUS[this.refund.status] || 1
        : 3 /* 演示态对齐稿件 */
      return REFUND_STEPS.map((s, i) => ({
        ...s,
        state: i + 1 < current ? 'done' : i + 1 === current ? 'current' : 'future',
      }))
    },
    depositPaid() {
      /* payment_status：1-待确认收款 2-已确认 3-已全额（enums.PAYMENT_STATUS） */
      return [2, 3].includes(this.order.payment_status)
    },
    finalPaid() {
      return this.order.payment_status === 3
    },
  },
  onLoad(query) {
    this.orderId = query.id
    this.demoMode = query.demo || ''
    this.fetchDetail()
  },
  methods: {
    formatAmount,
    stepState(i) {
      const n = i + 1
      if (n < this.currentStep) return 'done'
      if (n === this.currentStep) return 'current'
      return 'future'
    },
    async fetchDetail() {
      try {
        const res = await getOrderDetail(this.orderId)
        const data = (res && res.data) || {}
        this.order = data.order || data
        /* 改期/退款单由后端聚合返回（字段名联调核对） */
        this.reschedule = data.reschedule || null
        this.refund = data.refund || null
      } catch (e) {
        /* 接口未联调：降级为 C09-2 主稿演示数据（拍摄准备中态），联调后移除 */
        this.order = {
          code: 'S20260729018', package_name: '家庭纪念写真',
          shoot_date: '8月8日 周六', shoot_time: '10:00 - 12:30', shoot_address: '越秀公园',
          photographer: '路先生', total_amt: 2680, deposit_amt: 804, final_amt: 1876,
          refund_amt: 804, status: 2, payment_status: 2,
        }
        this.reschedule = {
          old_time: '8月8日 10:00-12:30', new_time: '8月19日 10:00-12:30', fee_type: 1,
        }
        this.refund = { status: 2 }
      }
    },
    goHome() {
      uni.switchTab({
        url: '/pages/index/index',
        fail: () => uni.redirectTo({ url: '/pages/index/index' }),
      })
    },
    goPayDeposit() {
      uni.navigateTo({ url: `/pages/pay/deposit?order_id=${this.order.id || this.orderId}` })
    },
    goReschedule() {
      uni.navigateTo({ url: `/pages/reschedule/apply?order_id=${this.order.id || this.orderId}` })
    },
    goPrep() {
      /* 拍前准备页（C11）尚未还原，先提示 */
      uni.showToast({ title: '拍前准备页开发中', icon: 'none' })
    },
    contactPhotographer() {
      /* 摄影师联系方式联调后从订单/门店数据取（biz_store 联系电话） */
      uni.showToast({ title: '客服接入后支持一键联系', icon: 'none' })
    },
  },
}
</script>

<style lang="scss" scoped>
.page-od {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: $bg-page;

  &__body {
    flex: 1;
    min-height: 0;
  }
  &__inner {
    padding: 24rpx $page-pad 96rpx;
  }

  /* ① 标题块 */
  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $touch-gap;
    padding-bottom: 24rpx;
  }
  &__head-left {
    display: flex;
    flex-direction: column;
    gap: 4rpx;
    min-width: 0;
  }
  &__title {
    color: $text-1;
    font-size: $fs-xl; /* 20px Bold */
    font-weight: 700;
  }
  &__no {
    color: $text-2;
    font-size: $fs-sm;
  }

  /* ② 进度条卡：6 步列宽 88rpx，圆 56rpx，分隔线 24×4rpx（C09-2 实测；卡高 115px → 上下留白 32px） */
  &__steps-card {
    padding: 64rpx 20rpx;
    background-color: $bg-card;
    border: 1rpx solid $border-1;
    border-radius: 32rpx;
  }
  &__steps {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
  }
  &__step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12rpx;
    width: 88rpx;
  }
  &__step-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 56rpx;
    height: 56rpx;
    border-radius: 50%;

    &--done { background-color: $text-1; }
    &--current {
      background-color: $gold;
      box-shadow: 0 0 0 8rpx $gold-glow; /* C09-2 实测光晕 spread 4 @14% */
    }
    &--future { background-color: $bg-card-2; }
  }
  &__step-num {
    color: $text-1;
    font-size: 24rpx; /* 12px Bold */
    font-weight: 700;
    &--future { color: $text-disabled; }
  }
  &__check {
    position: relative;
    width: 20rpx;
    height: 12rpx;
    border-left: 3rpx solid $gold;
    border-bottom: 3rpx solid $gold;
    transform: rotate(-45deg) translate(1rpx, -2rpx);

    /* 退款时间线小号勾（节点 40rpx） */
    &--sm { width: 17rpx; height: 10rpx; }
  }
  &__step-label {
    font-size: 22rpx; /* 11px */
    font-weight: 700;
    color: $text-1;

    &--future {
      font-weight: 400;
      color: $text-2;
    }
  }
  &__divider {
    width: 24rpx;
    height: 4rpx;
    margin-top: 26rpx;
    background-color: $border-1;

    &--done { background-color: $text-1; }
  }

  /* 区块标题：14 Bold #B8B9BF，pad 左右 4 · 上 24 下 8（C09-2 实测：标题块总高 52px） */
  &__sec-title {
    padding: 48rpx 8rpx 16rpx;
    text {
      color: $text-3;
      font-size: $fs-md;
      font-weight: 700;
    }
  }

  /* 信息卡通用：r16 #1D1E22 pad 16/10，行内上下留白 12（稿行距 43px） */
  &__card {
    padding: 20rpx $card-pad;
    background-color: $bg-card;
    border: 1rpx solid $border-1;
    border-radius: 32rpx;
  }
  &__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24rpx 0; /* 稿：行距 43px（4 行卡高 190px / 3 行卡高 149px） */
    border-bottom: 1rpx solid $border-1;

    &--last { border-bottom: none; }
  }
  &__row-label {
    color: $text-2;
    font-size: $fs-md;
  }
  &__row-value {
    color: $text-1;
    font-size: $fs-md;
    font-weight: 500;

    &--mono { font-family: $font-family-num; }
  }

  /* ③ 当前任务卡（C09-2 实测卡高 150px：上下留白 18px · 文本→按钮间距 20px） */
  &__card--task {
    display: flex;
    flex-direction: column;
    gap: 40rpx;
    padding: 36rpx;
  }
  &__task-row {
    display: flex;
    gap: 20rpx;
  }
  &__task-text {
    display: flex;
    flex-direction: column;
    gap: 8rpx;
  }
  &__task-title {
    color: $text-3;
    font-size: 30rpx; /* 15px Bold */
    font-weight: 700;
  }
  &__task-desc {
    color: $text-3;
    font-size: $fs-sm;
  }
  &__task-actions {
    display: flex;
    gap: 16rpx;
  }

  /* ⑤ 暖棕提示条：r12 #C29F77@14%，金图标 18 + 13 白（C09-2 实测） */
  &__warn {
    display: flex;
    gap: 20rpx;
    padding: 24rpx $card-pad;
    background-color: $warn-bg;
    border-radius: $radius-card;
  }
  /* 提示图标用 alert-gold.svg（C09-2 原画板矢量 18px） */
  &__warn-text {
    display: flex;
    flex-direction: column;
    gap: 6rpx;
  }
  &__warn-strong {
    color: $text-1;
    font-size: 26rpx; /* 13px */
    font-weight: 700;
  }
  &__warn-line {
    color: $text-1;
    font-size: 26rpx;
  }

  /* 退款竖向时间线：节点 40rpx / 线 3×76rpx（C09-2 实测 1.5×38） */
  &__tl-row {
    position: relative;
    display: flex;
    align-items: flex-start;
    gap: 24rpx;
    padding: 16rpx 0 64rpx;

    &:last-child { padding-bottom: 0; }
  }
  &__tl-node {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40rpx;
    height: 40rpx;
    border-radius: 50%;

    &--done { background-color: $text-1; }
    &--current {
      background-color: $gold;
      /* 退款当前步节点白色图标：CSS 实心小圆占位（待切图） */
      &::after {
        content: '';
        width: 16rpx;
        height: 16rpx;
        border-radius: 50%;
        background-color: $text-1;
      }
    }
    &--future { background-color: $bg-card-2; }
  }
  &__tl-num {
    color: $text-disabled;
    font-size: 20rpx;
  }
  /* 连接线：绝对定位于节点中轴（节点 40rpx → 轴心 18.5rpx），从节点下沿连到下一节点 */
  &__tl-line {
    position: absolute;
    left: 18.5rpx;
    top: 60rpx;   /* 行 pad 16 + 节点 40 + 4rpx 缝隙 */
    bottom: 4rpx;
    width: 3rpx;
    background-color: $border-1;

    &--done { background-color: $text-2; }
  }
  &__tl-text {
    display: flex;
    flex-direction: column;
    gap: 4rpx;
    padding-bottom: 2rpx;
  }
  &__tl-title {
    font-size: $fs-md;
    font-weight: 500;
    color: $text-3;

    &--current { color: $text-1; }
    &--future { color: $text-disabled; }
  }
  &__tl-sub {
    font-size: $fs-sm;
    color: $text-2;

    &--future { color: $text-disabled; }
  }
}
</style>
