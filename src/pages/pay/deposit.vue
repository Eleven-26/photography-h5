<template>
  <view class="page-wrap page-dep">
    <!-- 状态栏占位：稿顶部 iPhone 状态栏 44px（C07 y0-44，common.scss .status-bar） -->
    <view class="status-bar" />
    <AppNavBar title="支付定金" />

    <view class="page-dep__body">
      <!-- ① 金额头：13 灰 / 40 Bold 白 / 12 灰（C07 实测居中） -->
      <view class="page-dep__head">
        <text class="page-dep__head-label">定金 · 30%</text>
        <text class="page-dep__head-amount">¥{{ amountText }}</text>
        <text class="page-dep__head-sub">套餐总额 ¥{{ totalText }} 的 30%</text>
      </view>

      <!-- ② 选择支付方式：14 Bold #B8B9BF（C07 实测） -->
      <view class="page-dep__label"><text>选择支付方式</text></view>

      <!-- 方式卡：选中=卡底+金描边+白 radio；未选=透明+#383A40 描边+空 radio（C07 实测）
           稿序（C07 实测）：选中卡 → 该渠道收款码卡 → 转账提示 → 其余方式卡 → 底栏 -->
      <template v-for="m in methods" :key="m.key">
        <view
          class="page-dep__method pressable"
          :class="{ 'page-dep__method--active': form.method === m.key }"
          @click="form.method = m.key"
        >
          <!-- C07 实测：渠道图标 40px（微信绿/支付宝蓝/银行卡金，原画板矢量导出） -->
          <AppIcon class="page-dep__method-icon" :name="m.icon" :size="40" />
          <view class="page-dep__method-info">
            <text class="page-dep__method-name">{{ m.name }}</text>
            <text class="page-dep__method-sub">{{ m.sub }}</text>
          </view>
          <view class="page-dep__radio" :class="{ 'page-dep__radio--on': form.method === m.key }">
            <!-- C07 实测选中态：白圆底金勾 20px -->
            <AppIcon v-if="form.method === m.key" name="pay-selected" :size="20" />
          </view>
        </view>

        <!-- 选中渠道的展开区（C07 实测：紧随选中卡，位于其余方式卡之前） -->
        <template v-if="form.method === m.key">
          <!-- 收款码卡（扫码渠道）：#1D1E22 + #2B2C30 描边 r16 pad24，QR 160（C07 实测） -->
          <view v-if="form.method !== 'bank'" class="page-dep__qr">
            <view class="page-dep__qr-img">
              <!-- 待切图：biz_payment_method.qr_code_url；当前为占位 -->
              <text>收款码</text>
            </view>
            <text class="page-dep__qr-name">{{ payeeName }} · {{ form.method === 'wechat' ? '微信' : '支付宝' }}收款码</text>
            <view class="page-dep__qr-amount">
              <text class="page-dep__qr-amount-pre">请用{{ form.method === 'wechat' ? '微信' : '支付宝' }}扫码，转账 </text>
              <text class="page-dep__qr-amount-num">¥{{ amountText }}</text>
            </view>
          </view>

          <!-- 银行卡渠道：收款信息卡 + 凭证上传（稿未给出该 UI；2026-09-07 用户口径：展示收款人/卡号/开户行，数据联调后移除） -->
          <view v-else class="page-dep__qr">
            <text class="page-dep__qr-name">转账至摄影师银行账户</text>
            <view class="page-dep__bank-row">
              <text class="page-dep__bank-label">收款人</text>
              <text class="page-dep__bank-value">{{ bankInfo.holder }}</text>
            </view>
            <view class="page-dep__bank-row">
              <text class="page-dep__bank-label">卡号</text>
              <view class="page-dep__bank-copy pressable" @click="copyCard">
                <text class="page-dep__bank-value">{{ bankInfo.card_no }}</text>
                <text class="page-dep__bank-copy-btn">复制</text>
              </view>
            </view>
            <view class="page-dep__bank-row">
              <text class="page-dep__bank-label">开户行</text>
              <text class="page-dep__bank-value">{{ bankInfo.bank }}</text>
            </view>
            <view class="page-dep__qr-amount">
              <text class="page-dep__qr-amount-pre">转账金额 </text>
              <text class="page-dep__qr-amount-num">¥{{ amountText }}</text>
            </view>
            <view class="page-dep__upload pressable" @click="chooseVoucher">
              <text v-if="!form.voucher">＋ 上传转账凭证截图</text>
              <text v-else class="page-dep__upload-done">已选择凭证 ✓</text>
            </view>
          </view>

          <!-- 转账提示：暗绿底 + 亮绿图标 + 13 白（C07 实测）；文案按渠道区分 -->
          <view class="page-dep__tip">
            <!-- C07 实测 18px 亮绿提示图标（$tip-lime #6DEA00） -->
            <AppIcon name="alert-lime" :size="18" />
            <text class="page-dep__tip-text">{{ tipText }}</text>
          </view>
        </template>
      </template>
    </view>

    <!-- ⑤ 底栏：「我已完成转账，通知摄影师」h56（C07 实测） -->
    <view class="page-dep__footer">
      <AppButton block :loading="submitting" @click="onMarkPaid">我已完成转账，通知摄影师</AppButton>
    </view>
  </view>
</template>

<script>
/**
 * C07 支付定金（画板 1:488 一比一还原）
 *
 * 流程：客户线下扫码/银行转账 → 点「我已完成转账，通知摄影师」（登记）→ 摄影师确认收款
 * → 正式锁档（2026-09-07 拍板：支付定金后档期正式锁定；订单创建后临时锁 20 分钟）。
 * 数据源：biz_payment_method（收款方式）+ biz_order.deposit_amt（前端不计算金额）。
 * 银行卡渠道凭证上传 UI 为推导（稿内仅微信选中态）。
 */
import AppNavBar from '@/components/AppNavBar.vue'
import AppButton from '@/components/AppButton.vue'
import { getPaymentMethods, submitPaymentMark } from '@/api/payment'
import { getOrderDetail } from '@/api/order'
import { isDemo, DEMO_ORDER, DEMO_BANK } from '@/utils/demo'

export default {
  components: { AppNavBar, AppButton },
  data() {
    return {
      orderId: 0,
      order: {},
      /* 渠道图标底色：JS 内无法读 SCSS 变量，用与 tokens 同值的 hex（$wechat-green/$alipay-blue/$gold） */
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
    /* 金额优先读后端 deposit_amt；联调前演示推导 30%（已标注） */
    totalNum() { return Number(this.order.total_amt || this.order.base_price || 0) },
    depositNum() { return Number(this.order.deposit_amt || 0) || Math.round(this.totalNum * 0.3) },
    amountText() { return this.depositNum.toLocaleString() },
    totalText() { return this.totalNum.toLocaleString() },
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
      /* 演示模式（联调后移除）：读本地演示订单，渠道卡用默认三项 */
      if (isDemo()) {
        this.order = DEMO_ORDER
        return
      }
      try {
        const [orderRes, methodRes] = await Promise.all([
          getOrderDetail(this.orderId),
          getPaymentMethods(),
        ])
        this.order = (orderRes && orderRes.data) || {}
        const list = (methodRes && methodRes.data && methodRes.data.list) || []
        if (list.length) {
          /* 后端收款方式驱动渠道卡（icon 颜色按 key 映射，联调核对字段名） */
          this.methods = list.map((m) => ({
            key: m.code || String(m.id),
            /* 渠道图标按 code 映射（wechat/alipay/bank 均有原画板 SVG） */
            icon: m.code === 'alipay' ? 'alipay' : m.code === 'bank' ? 'bank' : 'wechat',
            name: m.name,
            sub: m.code === 'bank' ? '需上传转账凭证 · 摄影师确认收款（登记）' : '扫描摄影师收款码 · 无需上传凭证',
            id: m.id,
          }))
        }
      } catch (e) {
        /* ⚠️ 演示数据（对齐 C07 稿），联调后移除 */
        this.order = { total_amt: 2680, deposit_amt: 804, photographer_name: '路先生' }
      }
    },
    /** 银行卡渠道：选择凭证截图 */
    /** 复制银行卡号：去掉空格后写剪贴板（H5/小程序 setClipboardData 通用） */
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
          /* 联调：先上传 OSS 再存 URL；当前暂存本地路径（提交前必须完成上传） */
          this.form.voucher = res.tempFilePaths && res.tempFilePaths[0]
        },
      })
    },
    /** 登记已转账：submitPaymentMark（biz_order_payment type=deposit） */
    async onMarkPaid() {
      if (this.submitting) return
      const method = this.methods.find((m) => m.key === this.form.method)
      if (this.form.method === 'bank' && !this.form.voucher) {
        uni.showToast({ title: '请先上传转账凭证', icon: 'none' })
        return
      }
      this.submitting = true
      try {
        /* 演示模式（联调后移除）：跳过登记接口直接进结果页 */
        if (isDemo()) {
          uni.redirectTo({ url: `/pages/pay/result?orderId=${this.orderId}` })
          return
        }
        await submitPaymentMark({
          order_id: this.orderId,
          type: 'deposit',
          amount: this.depositNum, /* 展示值与订单 deposit_amt 一致，前端不另算 */
          method_id: method && method.id,
          voucher: this.form.voucher || undefined,
        })
        uni.redirectTo({ url: `/pages/pay/result?orderId=${this.orderId}` })
      } catch (e) {
        /* 失败保留所选方式与凭证，仅提示 */
        uni.showToast({ title: (e && e.message) || '登记失败，请重试', icon: 'none' })
      } finally {
        this.submitting = false
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.page-dep {
  padding-bottom: 240rpx;
  &__body { padding: 0 $page-pad; }
  /* 金额头（C07 实测 13/40/12 居中，头顶距导航 16px）
     注：稿面三行间距比现码略松（约 10~18rpx），H5 行高不定，硬凑会引入新偏差 → 待真机复核 */
  &__head { display: flex; flex-direction: column; align-items: center; padding: 32rpx 0 40rpx; }
  &__head-label { color: $text-2; font-size: 26rpx; }
  &__head-amount { color: $text-1; font-size: 80rpx; font-weight: 600; margin-top: 8rpx; /* 40 Bold 实测 */ }
  &__head-sub { color: $text-2; font-size: $fs-sm; margin-top: 8rpx; }
  &__label { padding: 8rpx 8rpx 16rpx; text { color: $text-3; font-size: $fs-md; font-weight: 600; } }
  /* 方式卡（C07 实测 r12 pad16 gap12；选中金描边+卡底） */
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
  &__method-name { color: $text-1; font-size: 30rpx; font-weight: 600; /* 15 Bold 实测 */ }
  &__method-sub { color: $text-2; font-size: $fs-sm; margin-top: 4rpx; }
  /* radio：选中态直接用 pay-selected.svg（白圆底金勾 20px），未选描边圆（C07 实测） */
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
  /* 收款码卡（C07 实测 r16、#2B2C30 描边；紧随选中卡，间距由方式卡 margin-bottom 提供）
     圆角口径：角部面积法（带描边卡专用）实测 15.5px ≈ r16=32rpx */
  &__qr {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 48rpx;
    background-color: $bg-card;
    border: 1rpx solid $border-1;
    border-radius: 32rpx;
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
    text { color: $text-2; font-size: $fs-md; } /* 待切图：收款码图片 */
  }
  &__qr-name { color: $text-1; font-size: 27rpx; font-weight: 600; margin-top: 16rpx; /* 13.7 Bold 实测 */ }
  &__qr-amount { margin-top: 16rpx; }
  &__qr-amount-pre { color: $text-2; font-size: $fs-sm; }
  &__qr-amount-num { color: $text-1; font-size: $fs-sm; font-weight: 600; }
  /* 凭证上传（推导：稿内无银行卡选中态 UI） */
  /* 银行卡收款信息行（稿未定义，推导样式：与卡片同族暗底行） */
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
    font-family: $font-family-num; /* 卡号等数字用等宽字族 */
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
  /* 转账提示（C07 实测：暗绿底 #1B2420 r9.5px + 亮绿图标 18 + 13 白）
     与上方收款码卡同组：上距 5px；组尾距下一张方式卡 25px（C07 实测 1402→1452） */
  &__tip {
    display: flex;
    align-items: flex-start;
    gap: 20rpx;
    margin-top: 10rpx;
    margin-bottom: 50rpx;
    padding: 24rpx 32rpx;
    background-color: #1B231F; /* C07 实测暗绿底 */
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
