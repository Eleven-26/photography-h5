<template>
  <view class="page-wrap login">
    <!-- 品牌区 -->
    <view class="login__brand">
      <text class="login__logo">SLOT</text>
      <text class="login__slogan">预约你的专属摄影师</text>
    </view>

    <!-- 表单区：手机号 + 验证码 -->
    <view class="login__form">
      <view class="login__field">
        <text class="login__prefix">+86</text>
        <input
          v-model="mobile"
          class="login__input"
          type="number"
          maxlength="11"
          placeholder="手机号"
          placeholder-class="login__placeholder"
          @input="onMobileInput"
        />
      </view>

      <view class="login__field">
        <input
          v-model="smsCode"
          class="login__input"
          type="number"
          maxlength="6"
          placeholder="验证码"
          placeholder-class="login__placeholder"
        />
        <!-- 发送验证码：60s 倒计时；禁用期间不可点 -->
        <view
          class="login__send pressable"
          :class="{ 'login__send--disabled': counting || !mobileValid }"
          @click="onSendCode"
        >
          <text>{{ counting ? `${countdown}s 后重发` : '获取验证码' }}</text>
        </view>
      </view>

      <!-- 登录按钮：白胶囊主钮；提交中 loading 防重复 -->
      <AppButton class="login__btn" :loading="submitting" @click="onLogin">登录 / 注册</AppButton>

      <!-- 协议提示 -->
      <text class="login__agreement">登录即代表同意《用户协议》与《隐私政策》；未注册手机号将自动创建账号</text>

      <!-- 演示模式：后端未联调时跳过验证码看 UI（联调后移除） -->
      <view class="login__demo pressable" @click="onDemo">
        <text class="login__demo-text">演示模式进入（跳过登录）</text>
      </view>
    </view>
  </view>
</template>

<script>
/**
 * 登录页 —— 全端统一手机号验证码（需求文档 v1.3 §8：H5 双环境不依赖微信授权）
 * 错误处理：校验失败仅高亮提示、绝不清空已输入内容（交互红线）。
 * 接口：api/auth.js（sendSmsCode / loginByCode，路径联调前与后端核对）
 */
import { sendSmsCode, loginByCode } from '@/api/auth'
import { setSlug } from '@/utils/slug'
import { useUserStore } from '@/store/user'

export default {
  data() {
    return {
      mobile: '',
      smsCode: '',
      submitting: false,
      counting: false,
      countdown: 60,
      timer: null,
    }
  },
  computed: {
    /** 手机号 11 位才可发送/登录 */
    mobileValid() {
      return /^1\d{10}$/.test(this.mobile)
    },
  },
  onLoad(options) {
    // 401 跳转携带的回跳地址，登录成功后返回
    this.redirect = options.redirect || '/pages/index/index'
    // 工作室短链标识：小程序端由进入参数携带（H5 端由 utils/slug.js 读 URL，无需处理）
    if (options.slug) setSlug(options.slug)
  },
  beforeDestroy() {
    if (this.timer) clearInterval(this.timer)
  },
  methods: {
    onMobileInput() {
      // 仅保留数字，避免粘贴带入非数字字符
      this.mobile = this.mobile.replace(/\D/g, '').slice(0, 11)
    },
    async onSendCode() {
      if (this.counting || !this.mobileValid) {
        uni.showToast({ title: this.mobileValid ? '验证码发送中' : '请输入正确手机号', icon: 'none' })
        return
      }
      try {
        await sendSmsCode(this.mobile)
        uni.showToast({ title: '验证码已发送', icon: 'none' })
        this.startCountdown()
      } catch (e) {
        // request 层已 toast 错误信息；输入保留
      }
    },
    startCountdown() {
      this.counting = true
      this.countdown = 60
      this.timer = setInterval(() => {
        this.countdown -= 1
        if (this.countdown <= 0) {
          clearInterval(this.timer)
          this.counting = false
        }
      }, 1000)
    },
    async onLogin() {
      if (!this.mobileValid) return uni.showToast({ title: '请输入正确手机号', icon: 'none' })
      if (!/^\d{4,6}$/.test(this.smsCode)) return uni.showToast({ title: '请输入验证码', icon: 'none' })
      this.submitting = true
      try {
        const data = await loginByCode(this.mobile, this.smsCode)
        useUserStore().login(data.token, data.customer)
        uni.reLaunch({ url: this.redirect })
      } catch (e) {
        // 错误提示由 request 层统一 toast；输入保留不清空
      } finally {
        this.submitting = false
      }
    },
    /** 演示模式：写入本地假 token 直接进入（后端未联调时用，联调后移除） */
    onDemo() {
      useUserStore().login('demo-token', { id: 0, code: 'DEMO', name: '演示客户', mobile: '' })
      uni.reLaunch({ url: this.redirect })
    },
  },
}
</script>

<style lang="scss" scoped>
.login {
  padding-top: 200rpx;
  &__brand { text-align: center; }
  &__logo {
    font-size: 96rpx;
    font-weight: 700;
    color: $gold;
    letter-spacing: 8rpx;
  }
  &__slogan {
    display: block;
    margin-top: 16rpx;
    color: $text-2;
    font-size: $fs-md;
  }
  &__form { margin: 120rpx $page-pad 0; }
  &__field {
    display: flex;
    align-items: center;
    background-color: $bg-card;
    border: 1rpx solid $border-1;
    border-radius: $radius-cell;
    padding: 0 32rpx;
    height: $touch-min;
    margin-bottom: $touch-gap + 8rpx;
  }
  &__prefix {
    color: $text-1;
    font-size: $fs-lg;
    margin-right: 24rpx;
    padding-right: 24rpx;
    border-right: 1rpx solid $border-2;
  }
  &__input {
    flex: 1;
    color: $text-1;
    font-size: $fs-lg;
    height: 100%;
  }
  &__placeholder { color: $text-2; }
  &__send {
    color: $gold;
    font-size: $fs-sm;
    padding: 12rpx 0 12rpx 24rpx;
    &--disabled { color: $text-2; }
  }
  &__btn { margin-top: 64rpx; width: 100%; }
  &__agreement {
    display: block;
    margin-top: 32rpx;
    color: $text-2;
    font-size: $fs-xs;
    text-align: center;
    line-height: 1.7;
  }
  /* 演示模式入口（联调后随 onDemo 一并移除） */
  &__demo {
    margin-top: 48rpx;
    display: flex;
    justify-content: center;
    min-height: 88rpx; /* 触摸目标 >= 44px */
    align-items: center;
  }
  &__demo-text {
    color: $text-3;
    font-size: $fs-sm;
    text-decoration: underline;
  }
}
</style>
