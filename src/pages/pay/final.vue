<template>
  <view class="page-wrap page-fin">
    <!-- 状态栏占位：稿顶部 iPhone 状态栏 44px（C16 y0-44，common.scss .status-bar） -->
    <view class="status-bar" />
    <AppNavBar title="支付尾款" />

    <view class="page-fin__body">
      <!-- ① 金额头（C16 实测 13/40/12 居中）。
           ⚠️ 稿面首行写「定金 · 30%」疑似从 C07 复制残留（本页 ¥2,116 = 尾款1876+差价240），
           按数据口径修正为「尾款 · 结清」，已同步汇报待用户复核 -->
      <view class="page-fin__head">
        <text class="page-fin__head-label">尾款 · 结清</text>
        <text class="page-fin__head-amount">¥{{ amountText }}</text>
        <text class="page-fin__head-sub">{{ subText }}</text>
      </view>

      <!-- ② 选择支付方式（C16 实测与 C07 同构：微信/支付宝/银行卡） -->
      <view class="page-fin__label"><text>选择支付方式</text></view>

      <!-- 方式卡：稿序（C16 实测与 C07 同构）：选中卡 → 该渠道收款码卡 → 转账提示 → 其余方式卡 → 底栏 -->
      <template v-for="m in methods" :key="m.key">
        <view
          class="page-fin__method pressable"
          :class="{ 'page-fin__method--active': form.method === m.key }"
          @click="form.method = m.key"
        >
          <!-- C16 实测：渠道图标 40px（与 C07 同一组原画板矢量） -->
          <AppIcon class="page-fin__method-icon" :name="m.icon" :size="40" />
          <view class="page-fin__method-info">
            <text class="page-fin__method-name">{{ m.name }}</text>
            <text class="page-fin__method-sub">{{ m.sub }}</text>
          </view>
          <view class="page-fin__radio" :class="{ 'page-fin__radio--on': form.method === m.key }">
            <AppIcon v-if="form.method === m.key" name="pay-selected" :size="20" />
          </view>
        </view>

        <!-- 选中渠道的展开区（C16 实测：紧随选中卡，位于其余方式卡之前） -->
        <template v-if="form.method === m.key">
          <!-- 收款码卡（C16 实测：QR 160×160 r4 + 「路先生 · 微信收款码」+ 转账金额行） -->
          <view v-if="form.method !== 'bank'" class="page-fin__qr">
            <view class="page-fin__qr-img">
              <!-- 待切图：biz_payment_method.qr_code_url；当前为占位 -->
              <text>收款码</text>
            </view>
            <text class="page-fin__qr-name">{{ payeeName }} · {{ form.method === 'wechat' ? '微信' : '支付宝' }}收款码</text>
            <view class="page-fin__qr-amount">
              <text class="page-fin__qr-amount-pre">请用{{ form.method === 'wechat' ? '微信' : '支付宝' }}扫码，转账 </text>
              <text class="page-fin__qr-amount-num">¥{{ amountText }}</text>
            </view>
          </view>

          <!-- 银行卡渠道：收款信息卡 + 凭证上传（同 C07 口径，数据联调后移除） -->
          <view v-else class="page-fin__qr">
            <text class="page-fin__qr-name">转账至摄影师银行账户</text>
            <view class="page-fin__bank-row">
              <text class="page-fin__bank-label">收款人</text>
              <text class="page-fin__bank-value">{{ bankInfo.holder }}</text>
            </view>
            <view class="page-fin__bank-row">
              <text class="page-fin__bank-label">卡号</text>
              <view class="page-fin__bank-copy pressable" @click="copyCard">
                <text class="page-fin__bank-value">{{ bankInfo.card_no }}</text>
                <text class="page-fin__bank-copy-btn">复制</text>
              </view>
            </view>
            <view class="page-fin__bank-row">
              <text class="page-fin__bank-label">开户行</text>
              <text class="page-fin__bank-value">{{ bankInfo.bank }}</text>
            </view>
            <view class="page-fin__qr-amount">
              <text class="page-fin__qr-amount-pre">转账金额 </text>
              <text class="page-fin__qr-amount-num">¥{{ amountText }}</text>
            </view>
            <view class="page-fin__upload pressable" @click="chooseVoucher">
              <text v-if="!form.voucher">＋ 上传转账凭证截图</text>
              <text v-else class="page-fin__upload-done">已选择凭证 ✓</text>
            </view>
          </view>

          <!-- 转账提示（C16 实测 #1B2420 + #6DEA00 图标） -->
          <view class="page-fin__tip">
            <AppIcon name="alert-lime" :size="18" />
            <text class="page-fin__tip-text">{{ tipText }}</text>
          </view>
        </template>
      </template>
    </view>

    <!-- ⑤ 底栏（C16 实测与 C07 同文案） -->
    <view class="page-fin__footer">
      <AppButton block :loading="submitting" @click="onMarkPaid">我已转账，通知摄影师</AppButton>
    </view>
  </view>
</template>

<script>
/**
 * C16 支付尾款（画板 1:559 一比一还原，结构同 C07）
 *
 * 差异点（相对 C07）：
 *   - type = final（biz_order_payment.type，差价已并入尾款基数——口径：无独立差价支付环节）
 *   - 金额读 biz_order.final_amt（后端算好：尾款基数 + extra_fee），前端不计算
 *   - 副行拆解展示「尾款 ¥x + 差价 ¥y」（差价=0 时只显示尾款）
 * 流程：确认成片（C15）→ 本页登记 → C16A 等待摄影师确认 → 开放高清下载
 */
import AppNavBar from '@/components/AppNavBar.vue'
import AppButton from '@/components/AppButton.vue'
import { getPaymentMethods } from '@/api/home'
import { getOrderDetail } from '@/api/order'
import { submitPaymentMark } from '@/api/pay'
import { DEMO_BANK } from '@/utils/demo'

export default {
  components: { AppNavBar, AppButton },
  data() {
    return {
      orderId: 0,
      order: {},
      /* 渠道图标底色：与 C07 同（JS 不可读 SCSS 变量，hex 与 tokens 对应） */
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
    /* final_amt 后端算好（含差价）；联调前用稿面演示口径 1876+240 */
    finalNum() {
      return Number(this.order.final_amt || 0) || Number(this.order.final_due || 0) || 2116
    },
    finalBase() {
      /* 尾款基数：优先后端拆解字段，联调核对字段名（final_base / final_amt-addon） */
      const base = Number(this.order.final_base_amt || 0)
      return base || Math.max(0, this.finalNum - this.extraFee)
    },
    extraFee() {
      return Number(this.order.extra_fee || this.order.addon_amount || 0)
    },
    amountText() { return this.finalNum.toLocaleString() },
    subText() {
      return this.extraFee > 0
        ? `尾款 ¥${this.finalBase.toLocaleString()} + 差价 ¥${this.extraFee.toLocaleString()}`
        : '成片确认后一次性结清'
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
    /* 提示语按渠道区分：银行卡需传凭证，扫码渠道无需 */
    tipText() {
      return this.form.method === 'bank'
        ? '请转账至上方银行账户，转账完成后上传凭证并点击下方按钮通知摄影师，摄影师确认收款后即完成登记。'
        : '转账完成后点击下方按钮通知摄影师，无需上传凭证。摄影师确认收款后即完成登记。'
    },
  },
  onLoad(query) {
    this.orderId = Number(query.orderId || 0)
    this.loadData()
  },
  methods: {
    async loadData() {
      try {
        const [orderRes, methodRes] = await Promise.all([
          getOrderDetail(this.orderId),
          getPaymentMethods(),
        ])
        this.order = (orderRes && orderRes.data) || {}
        const list = (methodRes && methodRes.data && methodRes.data.list) || []
        if (list.length) {
          this.methods = list.map((m) => ({
            key: m.code || String(m.id),
            name: m.name,
            sub: m.code === 'bank' ? '需上传转账凭证 · 摄影师确认收款（登记）' : '扫描摄影师收款码 · 无需上传凭证',
            color: m.code === 'bank' ? '#D9A735' : m.code === 'alipay' ? '#0075FF' : '#0AC160',
            icon: m.code === 'alipay' ? 'alipay' : m.code === 'bank' ? 'bank' : 'wechat',
            id: m.id,
          }))
        }
      } catch (e) {
        /* ⚠️ 演示数据（对齐 C16 稿面口径：尾款1876+差价240=2116），联调后移除 */
        this.order = { final_amt: 2116, final_base_amt: 1876, extra_fee: 240, photographer_name: '路先生' }
      }
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
          /* 联调：先上传 OSS 再存 URL；当前暂存本地路径 */
          this.form.voucher = res.tempFilePaths && res.tempFilePaths[0]
        },
      })
    },
    /** 登记尾款已转账：biz_order_payment type=final */
    async onMarkPaid() {
      if (this.submitting) return
      const method = this.methods.find((m) => m.key === this.form.method)
      if (this.form.method === 'bank' && !this.form.voucher) {
        uni.showToast({ title: '请先上传转账凭证', icon: 'none' })
        return
      }
      this.submitting = true
      try {
        await submitPaymentMark({
          order_id: this.orderId,
          type: 'final',
          amount: this.finalNum,
          method_id: method && method.id,
          voucher: this.form.voucher || undefined,
        })
        uni.redirectTo({ url: `/pages/pay/final-result?orderId=${this.orderId}` })
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
/* 结构与 C07 完全同构（画板一比一），类名换 page-fin，不再重复注释 */
.page-fin {
  padding-bottom: 240rpx;
  &__body { padding: 0 $page-pad; }
  /* 金额头（C16 实测与 C07 同构）
     注：稿面三行间距比现码略松（约 10~18rpx），H5 行高不定，硬凑会引入新偏差 → 待真机复核 */
  &__head { display: flex; flex-direction: column; align-items: center; padding: 32rpx 0 40rpx; /* C16 实测头顶距导航 16px */ }
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
    &--active {
      background-color: $bg-card;
      border-color: $gold;
    }
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
    border-radius: 32rpx; /* C16 实测 r16（角部面积法 15.5px） */
    margin-top: 0;
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
  /* 转账提示（C16 实测：暗绿底 #1B2420 r9.5px + 亮绿 #6DEA00 图标）
     与上方收款码卡同组：上距 5px；组尾距下一张方式卡 25px（C16 实测 1402→1452） */
  &__tip {
    display: flex;
    align-items: flex-start;
    gap: 20rpx;
    margin-top: 10rpx;
    margin-bottom: 50rpx;
    padding: 24rpx 32rpx;
    background-color: #1B231F; /* C16 实测 #1B2420（与 C07 同族暗绿，取 C07 既有值） */
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
