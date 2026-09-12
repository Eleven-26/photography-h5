<template>
  <view class="page-wrap page-rfee">
    <view class="status-bar" />
    <AppNavBar title="调度费支付" />

    <view class="page-rfee__body">
      <!-- ① 金额头（同构 C16，金额=调度费，即时线下支付不并入尾款） -->
      <view class="page-rfee__head">
        <text class="page-rfee__head-label">改期调度费 · {{ resFeeRate }}%</text>
        <text class="page-rfee__head-amount">¥{{ amountText }}</text>
        <text class="page-rfee__head-sub">{{ subText }}</text>
      </view>

      <!-- ② 支付方式（同构 C16 实测三渠道） -->
      <view class="page-rfee__label"><text>选择支付方式</text></view>
      <view
        v-for="m in methods"
        :key="m.key"
        class="page-rfee__method pressable"
        :class="{ 'page-rfee__method--active': form.method === m.key }"
        @click="form.method = m.key"
      >
        <!-- 渠道图标 40px（与 C07/C16 同一组原画板矢量） -->
        <AppIcon class="page-rfee__method-icon" :name="m.icon" :size="40" />
        <view class="page-rfee__method-info">
          <text class="page-rfee__method-name">{{ m.name }}</text>
          <text class="page-rfee__method-sub">{{ m.sub }}</text>
        </view>
        <view class="page-rfee__radio" :class="{ 'page-rfee__radio--on': form.method === m.key }">
          <AppIcon v-if="form.method === m.key" name="pay-selected" :size="20" />
        </view>
      </view>

      <!-- ③ 收款码 / 凭证（同构 C16） -->
      <view v-if="form.method !== 'bank'" class="page-rfee__qr">
        <view class="page-rfee__qr-img"><text>收款码</text></view>
        <text class="page-rfee__qr-name">{{ payeeName }} · {{ form.method === 'wechat' ? '微信' : '支付宝' }}收款码</text>
        <view class="page-rfee__qr-amount">
          <text class="page-rfee__qr-amount-pre">请用{{ form.method === 'wechat' ? '微信' : '支付宝' }}扫码，转账 </text>
          <text class="page-rfee__qr-amount-num">¥{{ amountText }}</text>
        </view>
      </view>
      <!-- ③' 银行卡渠道：收款信息卡 + 凭证上传（同 C07 口径，数据联调后移除） -->
      <view v-else class="page-rfee__qr">
        <text class="page-rfee__qr-name">转账至摄影师银行账户</text>
        <view class="page-rfee__bank-row">
          <text class="page-rfee__bank-label">收款人</text>
          <text class="page-rfee__bank-value">{{ bankInfo.holder }}</text>
        </view>
        <view class="page-rfee__bank-row">
          <text class="page-rfee__bank-label">卡号</text>
          <view class="page-rfee__bank-copy pressable" @click="copyCard">
            <text class="page-rfee__bank-value">{{ bankInfo.card_no }}</text>
            <text class="page-rfee__bank-copy-btn">复制</text>
          </view>
        </view>
        <view class="page-rfee__bank-row">
          <text class="page-rfee__bank-label">开户行</text>
          <text class="page-rfee__bank-value">{{ bankInfo.bank }}</text>
        </view>
        <view class="page-rfee__qr-amount">
          <text class="page-rfee__qr-amount-pre">转账金额 </text>
          <text class="page-rfee__qr-amount-num">¥{{ amountText }}</text>
        </view>
        <view class="page-rfee__upload pressable" @click="chooseVoucher">
          <text v-if="!form.voucher">＋ 上传转账凭证截图</text>
          <text v-else class="page-rfee__upload-done">已选择凭证 ✓</text>
        </view>
      </view>

      <!-- ④ 提示（同构 C16 暗绿条）；文案按渠道区分 -->
      <view class="page-rfee__tip">
        <AppIcon name="alert-red" :size="18" />
        <text class="page-rfee__tip-text">{{ tipText }}</text>
      </view>
    </view>

    <!-- ⑤ 底栏 -->
    <view class="page-rfee__footer">
      <AppButton block :loading="submitting" @click="onMarkPaid">我已转账，通知摄影师</AppButton>
    </view>
  </view>
</template>

<script>
/**
 * 调度费支付登记（C19 确认改期 → 费用 > 0 时进入本页；支付完成 → fee-result = B2 画板 10:1）
 * ⚠️ B12（确认单遗留）：biz_order_payment.type 枚举缺「调度费」档位（仅 deposit/final/addon），
 * 此处暂传 'reschedule'，联调时与后端同学对齐枚举值后统一调整。
 * 金额：后端按 20%×total_amt 计算下发（route query 兜底），前端不计算。
 */
import AppNavBar from '@/components/AppNavBar.vue'
import AppButton from '@/components/AppButton.vue'
import { getOrderDetail } from '@/api/order'
import { submitPaymentMark } from '@/api/pay'
import { DEMO_BANK } from '@/utils/demo'

export default {
  components: { AppNavBar, AppButton },
  data() {
    return {
      orderId: 0,
      order: {},
      fee: 0,
      resFeeRate: 20,
      methods: [
        { key: 'wechat', icon: 'wechat', name: '微信扫码转账', sub: '扫描摄影师收款码 · 无需上传凭证' },
        { key: 'alipay', icon: 'alipay', name: '支付宝扫码转账', sub: '扫描摄影师收款码 · 无需上传凭证' },
        { key: 'bank', icon: 'bank', name: '银行卡转账', sub: '需上传转账凭证 · 摄影师确认收款（登记）' },
      ],
      form: { method: 'wechat', voucher: '' },
      submitting: false,
    }
  },
  computed: {
    amountText() { return this.fee.toLocaleString() },
    subText() {
      return `套餐总额 ¥${this.totalText.toLocaleString()} 的 ${this.resFeeRate}%`
    },
    totalText() {
      return Number(this.order.total_amt || this.order.base_price || 0) || 2680
    },
    payeeName() { return this.order.photographer_name || '路先生' },
    /* 银行卡收款信息：后端摄影师账户字段联调核对，暂用演示数据兜底（联调后移除） */
    bankInfo() {
      return {
        holder: this.order.bank_holder || DEMO_BANK.holder,
        card_no: this.order.bank_card_no || DEMO_BANK.card_no,
        bank: this.order.bank_name || DEMO_BANK.bank,
      }
    },
    /* 提示语按渠道区分：银行卡需传凭证，扫码渠道无需；调度费口径保留 */
    tipText() {
      const tail = '调度费即时支付、即时登记，不计入订单尾款。摄影师确认收款后新档期生效。'
      return this.form.method === 'bank'
        ? `请转账至上方银行账户，转账完成后上传凭证并点击下方按钮通知摄影师。${tail}`
        : `转账完成后点击下方按钮通知摄影师，无需上传凭证。${tail}`
    },
  },
  onLoad(query) {
    this.orderId = Number(query.orderId || 0)
    this.fee = Number(query.fee || 0)
    this.loadData()
  },
  methods: {
    async loadData() {
      if (!this.orderId) return
      try {
        const res = await getOrderDetail(this.orderId)
        this.order = (res && res.data && res.data.order) || (res && res.data) || {}
      } catch (e) { /* 演示兜底：fee 已从路由带入 */ }
    },
    /** 复制银行卡号：去掉空格后写剪贴板 */
    copyCard() {
      uni.setClipboardData({
        data: this.bankInfo.card_no.replace(/\s/g, ''),
        success: () => uni.showToast({ title: '卡号已复制', icon: 'none' }),
      })
    },
    chooseVoucher() {
      uni.chooseImage({
        count: 1,
        success: (res) => {
          this.form.voucher = res.tempFilePaths && res.tempFilePaths[0]
        },
      })
    },
    async onMarkPaid() {
      if (this.submitting) return
      if (this.form.method === 'bank' && !this.form.voucher) {
        uni.showToast({ title: '请先上传转账凭证', icon: 'none' })
        return
      }
      this.submitting = true
      try {
        await submitPaymentMark({
          order_id: this.orderId,
          type: 'reschedule', /* ⚠️ B12：调度费收款 type 后端枚举缺位，联调对齐 */
          amount: this.fee,
          method_id: undefined,
          voucher: this.form.voucher || undefined,
        })
        uni.redirectTo({ url: `/pages/reschedule/fee-result?orderId=${this.orderId}&fee=${this.fee}` })
      } catch (e) {
        uni.showToast({ title: (e && e.message) || '登记失败，请重试', icon: 'none' })
      } finally {
        this.submitting = false
      }
    },
  },
}
</script>

<style lang="scss" scoped>
/* 结构同 C16/C07（画板同构推导，B2 画板仅含支付状态页），样式复用口径不再重复注释 */
.page-rfee {
  padding-bottom: 240rpx;
  &__body { padding: 0 $page-pad; }
  &__head { display: flex; flex-direction: column; align-items: center; padding: 20rpx 0 40rpx; }
  &__head-label { color: $text-2; font-size: 26rpx; }
  &__head-amount { color: $text-1; font-size: 80rpx; font-weight: 600; margin-top: 8rpx; }
  &__head-sub { color: $text-2; font-size: $fs-sm; margin-top: 8rpx; }
  &__label { padding: 8rpx 8rpx 16rpx; text { color: $text-3; font-size: $fs-md; font-weight: 600; } }
  &__method {
    display: flex;
    align-items: center;
    gap: 24rpx;
    padding: 32rpx;
    border-radius: $radius-cell;
    border: 1rpx solid $border-2;
    margin-bottom: 24rpx;
    &--active { background-color: $bg-card; border-color: $gold; }
  }
  &__method-icon { flex: none; } /* 渠道品牌图标 40px，SVG 自带配色 */
  &__method-info { flex: 1; display: flex; flex-direction: column; }
  &__method-name { color: $text-1; font-size: 30rpx; font-weight: 600; }
  &__method-sub { color: $text-2; font-size: $fs-sm; margin-top: 4rpx; }
  &__radio {
    flex: none;
    width: 40rpx;
    height: 40rpx;
    border-radius: 50%;
    border: 1rpx solid $border-2;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  &__qr {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 48rpx;
    background-color: $bg-card;
    border: 1rpx solid $border-1;
    border-radius: 32rpx;
    margin-top: 8rpx;
  }
  &__qr-img {
    width: 320rpx;
    height: 320rpx;
    border-radius: 8rpx;
    background-color: $bg-card-2;
    display: flex;
    align-items: center;
    justify-content: center;
    text { color: $text-2; font-size: $fs-md; }
  }
  &__qr-name { color: $text-1; font-size: 27rpx; font-weight: 600; margin-top: 16rpx; }
  &__qr-amount { margin-top: 16rpx; }
  &__qr-amount-pre { color: $text-2; font-size: $fs-sm; }
  &__qr-amount-num { color: $text-1; font-size: $fs-sm; font-weight: 600; }
  /* 银行卡收款信息行（同 C07 推导样式） */
  &__bank-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 20rpx 0;
    border-bottom: 1rpx solid $border-2;

    &:last-of-type { border-bottom: none; }
  }
  &__bank-label { color: $text-2; font-size: $fs-md; }
  &__bank-value {
    color: $text-1;
    font-size: $fs-md;
    font-weight: 600;
    font-family: $font-family-num;
  }
  &__bank-copy {
    display: flex;
    align-items: center;
    gap: 12rpx;
    &-btn {
      color: $gold;
      font-size: $fs-sm;
      padding: 6rpx 20rpx;
      border: 1rpx solid rgba(217, 167, 53, 0.5);
      border-radius: 999rpx;
    }
  }
  &__upload {
    width: 320rpx;
    height: 320rpx;
    margin-top: 16rpx;
    border: 1rpx dashed $border-2;
    border-radius: 8rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    text { color: $text-2; font-size: $fs-md; }
    &-done { color: $tip-lime; }
  }
  &__tip {
    display: flex;
    align-items: flex-start;
    gap: 20rpx;
    margin-top: 24rpx;
    padding: 24rpx 32rpx;
    background-color: #1B231F;
    border-radius: $radius-cell;
  }
  &__tip-text { flex: 1; color: $text-1; font-size: 26rpx; line-height: 1.6; }
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
    border-top: 1rpx solid $border-1;
  }
}
</style>
