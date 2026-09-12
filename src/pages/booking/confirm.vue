<template>
  <view class="page-wrap page-confirm">
    <!-- 状态栏占位：设计稿顶部 Iphone 44px（C05 状态栏 0-44，导航行 44-88）。
         H5 由 .status-bar 固定 44px；MP 端 AppNavBar 已用系统值定位，避免双计。 -->
    <!-- #ifdef H5 -->
    <view class="status-bar" />
    <!-- #endif -->
    <AppNavBar title="确认预约" />

    <view class="page-confirm__body">
      <!-- ① 标题 18px 白（C05 实测 pad y12） -->
      <view class="page-confirm__title">
        <text>请确认预约信息</text>
      </view>

      <!-- ② 预约信息卡：#1D1E22 r16 pad20（C05 实测） -->
      <view class="page-confirm__card">
        <text class="page-confirm__pkg">{{ pkg.name || '套餐' }}</text>
        <text class="page-confirm__date">{{ dateCn }}</text>
        <text class="page-confirm__sub">{{ time }} · {{ answers.shoot_address || '待定' }}</text>
        <view class="page-confirm__divider" />
        <view v-for="row in infoRows" :key="row.label" class="page-confirm__row">
          <text class="page-confirm__row-label">{{ row.label }}</text>
          <text class="page-confirm__row-value">{{ row.value }}</text>
        </view>
        <view class="page-confirm__divider" />
        <view class="page-confirm__row">
          <text class="page-confirm__row-label">套餐价格</text>
          <text class="page-confirm__row-value">¥{{ totalText }}</text>
        </view>
        <view class="page-confirm__row">
          <text class="page-confirm__row-label">定金 (30%)</text>
          <text class="page-confirm__row-value page-confirm__row-value--gold">¥{{ depositText }}</text>
        </view>
        <view class="page-confirm__row">
          <text class="page-confirm__row-label">尾款</text>
          <text class="page-confirm__row-value page-confirm__row-value--dim">¥{{ finalText }}</text>
        </view>
      </view>

      <!-- ③ 提交后会发生什么：三步说明（C05 实测文案，与确认单 A 组口径一致） -->
      <view class="page-confirm__what">
        <text>提交后会发生什么</text>
      </view>
      <view class="page-confirm__flow">
        <view v-for="(item, i) in flowSteps" :key="i" class="page-confirm__flow-row">
          <view class="page-confirm__flow-no">
            <text>{{ i + 1 }}</text>
          </view>
          <text class="page-confirm__flow-text">{{ item }}</text>
        </view>
      </view>

      <!-- ④ 两条绿点提示卡（C05 实测 #9FCB87 图标 + 13px #B8B9BF；锁档口径 2026-09-07 拍板：20 分钟） -->
      <view class="page-confirm__tip">
        <!-- C05 实测：锁档提示用绿锁图标（稿 icon fill #9FCB87，非灰 #B8BABF） -->
        <AppIcon class="page-confirm__tip-icon" name="lock-green" :size="13" />
        <text class="page-confirm__tip-text">提交后档期临时锁定 20 分钟，防止其他客户同时预约；支付定金后正式锁定，超时未支付将自动开放。</text>
      </view>
      <view class="page-confirm__tip">
        <!-- C05 实测：费用提示用绿盾图标 -->
        <AppIcon class="page-confirm__tip-icon" name="shield-green" :size="13" />
        <text class="page-confirm__tip-text">提交预约不产生任何费用，定金在提交后 20 分钟内支付。</text>
      </view>
    </view>

    <!-- ⑤ 底栏：白胶囊「提交预约」fill h56（C05 实测） -->
    <view class="page-confirm__footer">
      <AppButton block :loading="submitting" @click="submit">提交预约</AppButton>
    </view>
  </view>
</template>

<script>
/**
 * C05 预约确认（画板 1:2564 一比一还原；1:2649 白卡变体未采用，客户端以暗色主稿为准）
 *
 * 提交链路（口径②快捷直约）：submitBooking → biz_order(source_type=2 客户预约)
 *   → 后端校验套餐已上架且为完整套餐 → 自动预占档期 → S4 摄影师核对锁档
 * 金额展示：定金 30% 为前端推导（与 C02 一致），联调时改读服务端 deposit/final 字段。
 * 提交失败：保留全部草稿（storage），仅 toast 提示，不清空输入。
 */
import AppNavBar from '@/components/AppNavBar.vue'
import AppButton from '@/components/AppButton.vue'
import { getPackageDetail } from '@/api/home'
import { submitBooking } from '@/api/order'
import { isDemo, DEMO_ORDER } from '@/utils/demo'

const DRAFT_KEY = 'booking_draft'
const WEEKS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export default {
  components: { AppNavBar, AppButton },
  data() {
    return {
      packageId: 0,
      date: '',
      time: '',
      pkg: {},
      answers: { people_count: '', shoot_style: '', shoot_address: '', makeup: '', remark: '' },
      submitting: false,
      /* 锁档口径（2026-09-07 用户拍板）：创建订单→临时锁20分钟；支付定金→正式锁定；20分钟未付→开放档期 */
      flowSteps: [
        '提交预约后，档期为您 临时锁定 20分钟',
        '请在 20分钟内 支付定金，档期即正式锁定',
        '超时未支付，档期将自动开放给其他客户',
      ],
    }
  },
  computed: {
    dateCn() {
      if (!this.date) return '待选日期'
      const d = new Date(`${this.date}T00:00:00`)
      return `${d.getMonth() + 1}月${d.getDate()}日 ${WEEKS[d.getDay()]}`
    },
    infoRows() {
      return [
        { label: '拍摄人数', value: this.answers.people_count },
        { label: '拍摄风格', value: this.answers.shoot_style },
        { label: '摄影师', value: this.pkg.photographer_name || '路先生' },
      ]
    },
    /* 金额展示：后端 DECIMAL 元；30% 前端推导（联调核对——应读后端 deposit 字段） */
    totalNum() {
      return Number(this.pkg.price || 0)
    },
    depositNum() {
      return Math.round(this.totalNum * 0.3)
    },
    finalNum() {
      return this.totalNum - this.depositNum
    },
    totalText() { return this.totalNum.toLocaleString() },
    depositText() { return this.depositNum.toLocaleString() },
    finalText() { return this.finalNum.toLocaleString() },
  },
  onLoad(query) {
    this.packageId = Number(query.packageId || 0)
    this.date = query.date || ''
    this.time = query.time ? decodeURIComponent(query.time) : ''
    this.restoreDraft()
    this.loadPackage()
  },
  methods: {
    /** 恢复 C04 草稿（同套餐同日期） */
    restoreDraft() {
      try {
        const draft = uni.getStorageSync(DRAFT_KEY)
        if (draft && draft.packageId === this.packageId && draft.date === this.date) {
          this.answers = { ...this.answers, ...(draft.answers || {}) }
        }
      } catch (e) { /* 无草稿 */ }
    },
    async loadPackage() {
      if (!this.packageId) return
      try {
        const res = await getPackageDetail(this.packageId)
        this.pkg = (res && res.data) || {}
      } catch (e) {
        /* 详情拉取失败不阻塞确认页：名称/价格展示降级为占位（提交时后端二次校验） */
        this.pkg = {}
      }
    },
    /** 提交预约：payload 严格对齐 BookingSubmit DTO（api/order.js 注释） */
    async submit() {
      if (this.submitting) return
      this.submitting = true
      try {
        /* 演示模式（联调后移除）：跳过接口，直接生成演示订单进入定金支付，保证链路可预览 */
        if (isDemo()) {
          uni.showToast({ title: '预约已提交（演示）', icon: 'success' })
          setTimeout(() => {
            uni.redirectTo({ url: `/pages/pay/deposit?orderId=${DEMO_ORDER.id}` })
          }, 600)
          return
        }
        /* 妆造意愿暂并 remark（B14：BookingSubmit 无 addon 字段，联调核对挂靠方式） */
        const remarkParts = [this.answers.makeup === '需要妆造' ? '需要妆造服务' : '', this.answers.remark].filter(Boolean)
        const res = await submitBooking({
          package_id: this.packageId,
          shoot_date: this.date,
          shoot_time: this.time,
          shoot_address: this.answers.shoot_address,
          people_count: this.answers.people_count,
          shoot_style: this.answers.shoot_style,
          remark: remarkParts.join('；'),
        })
        try { uni.removeStorageSync(DRAFT_KEY) } catch (e) { /* 清草稿失败不阻塞 */ }
        uni.showToast({ title: '预约已提交', icon: 'success' })
        const orderId = res && res.data && (res.data.id || res.data.order_id)
        setTimeout(() => {
          /* 锁档口径：创建订单即临时锁 20 分钟 → 直接引导支付定金（id 缺失时回订单列表兜底） */
          uni.redirectTo({ url: orderId ? `/pages/pay/deposit?orderId=${orderId}` : '/pages/order/list' })
        }, 600)
      } catch (e) {
        /* 失败保留草稿与输入，仅提示（错误恢复原则） */
        uni.showToast({ title: (e && e.message) || '提交失败，请稍后重试', icon: 'none' })
      } finally {
        this.submitting = false
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.page-confirm {
  padding-bottom: 240rpx;
  &__body { padding: 0 $page-pad; }
  &__title {
    padding: 24rpx 8rpx;
    text { color: $text-1; font-size: 36rpx; font-weight: 600; /* 18px 实测 */ }
  }
  /* 信息卡：#1D1E22 r16 pad22（C05 实测：卡 y137-495.5px，首行墨迹 y161.5px） */
  &__card {
    padding: 44rpx;
    background-color: $bg-card;
    border-radius: 32rpx;
  }
  &__pkg { color: rgba(247, 248, 248, 0.6); font-size: 26rpx; /* 白@0.6 实测 */ }
  &__date {
    display: block;
    color: $text-1;
    font-size: 44rpx;
    font-weight: 600; /* 22px 实测 */
    margin-top: 12rpx;
  }
  &__sub {
    display: block;
    color: rgba(247, 248, 248, 0.8); /* 白@0.8 实测 */
    font-size: $fs-md;
    margin: 18rpx 0 28rpx; /* 稿：日期墨迹底 y209px → 副行墨迹顶 y225.5px（16.5px 行距） */
  }
  &__divider {
    height: 1rpx;
    background-color: rgba(247, 248, 248, 0.15); /* 白@0.15 分隔线实测 */
    margin: 16rpx 0; /* 稿：分隔线位于 y256px / y370.5px，行距 30rpx */
  }
  &__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12rpx 0; /* 稿：行墨迹间距 30px（y276→306→336），行高 12rpx×2+18.2px */
  }
  &__row-label { color: rgba(247, 248, 248, 0.5); font-size: $fs-md; /* 白@0.5 实测 */ }
  &__row-value {
    color: $text-1;
    font-size: $fs-md;
    &--gold { color: $gold; }      /* 定金 ¥804 金（C05 实测） */
    &--dim { color: rgba(247, 248, 248, 0.8); } /* 尾款白@0.8 实测 */
  }
  &__what {
    padding: 40rpx 8rpx 16rpx;
    text { color: $text-3; font-size: $fs-md; }
  }
  /* 三步说明卡：r16 pad 17px/28px，行距 18rpx（C05 实测：卡 y545-686.5px） */
  &__flow {
    padding: 34rpx 56rpx;
    background-color: $bg-card;
    border-radius: 32rpx;
  }
  &__flow-row {
    display: flex;
    align-items: flex-start;
    gap: 24rpx;
    padding: 18rpx 0; /* 稿：行墨迹 y572.5→608.5→644px，行距 36px */
  }
  /* 稿：序号为纯文本「1/2/3」（无圆底、无描边），列宽 20px 后接正文 */
  &__flow-no {
    flex: none;
    width: 40rpx;
    text { color: $text-1; font-size: $fs-sm; line-height: 1.6; /* 与正文同基线 */ }
  }
  &__flow-text { flex: 1; color: $text-1; font-size: $fs-md; line-height: 1.6; }
  /* 绿点提示卡（C05 实测：底 #1D1E22 r8，图标 #9FCB87、文字 13px #B8B9BF，
   * 图标与首行文字对齐；稿卡1 y707-774px、卡高 67px、两卡间距 10.5px） */
  &__tip {
    display: flex;
    align-items: flex-start;
    gap: 16rpx;
    margin-top: 40rpx;
    padding: 28rpx 32rpx;
    background-color: $bg-card;
    border-radius: $radius-cell;
  }
  &__tip-icon { margin-top: 8rpx; /* 图标 13px 居首行（行高 20.8px）中线 */}
  &__tip-text { color: $text-3; font-size: 26rpx; line-height: 1.6; }
  /* 毛玻璃底栏（C05 实测：单钮 fill） */
  &__footer {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    padding-top: 24rpx;
    padding-left: $page-pad;
    padding-right: $page-pad;
    padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
    background-color: rgba(23, 24, 28, 0.96);
    backdrop-filter: blur(20px);
  }
}
</style>
