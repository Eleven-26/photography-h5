<template>
  <view class="page-wrap login">
    <!-- 品牌区 -->
    <view class="login__brand">
      <text class="login__logo">SLOT</text>
      <text class="login__slogan">预约你的专属摄影师</text>
    </view>

    <!-- 表单区：手机号 + 验证码（开发环境免验证码，只剩手机号） -->
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

      <!-- 验证码字段：仅当登录需要验证码时渲染（开发环境免验证码，判据见 config/env.js） -->
      <view v-if="smsLoginRequired" class="login__field">
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
      <!-- 免验证码环境提示：让联调时一眼确认开关生效，不必猜"为什么没有验证码框" -->
      <text v-else class="login__dev-hint">开发环境：免验证码，填手机号直接登录</text>

      <!-- 登录按钮：白胶囊主钮；提交中 loading 防重复 -->
      <AppButton class="login__btn" :loading="submitting" @click="onLogin">登录 / 注册</AppButton>

      <!-- 协议提示 -->
      <text class="login__agreement">登录即代表同意《用户协议》与《隐私政策》；未注册手机号将自动创建账号</text>
    </view>
  </view>
</template>

<script>
/**
 * 登录页 —— 全端统一手机号验证码（需求文档 v1.3 §8：H5 双环境不依赖微信授权）
 *
 * ⚠️ 2026-09-15：**开发环境改为免验证码登录**（只填手机号）。
 *   判据在 config/env.js → SMS_LOGIN_REQUIRED，与后端 h5.loginRequireSmsCode() 是同一口径：
 *   仅 dev / docker.dev 放开，test / prod 仍强制验证码 ——
 *   免验证码等价于「知道手机号即可登录该客户账号」，不能在生产开。
 *   本页只是"不显示验证码框"，真正的把关在后端：绕过前端也只会拿到 400「验证码错误或已过期」。
 *
 * 错误处理：校验失败仅高亮提示、绝不清空已输入内容（交互红线）。
 * 接口：api/auth.js（sendSmsCode / loginByCode，路径联调前与后端核对）
 */
import { sendSmsCode, loginByCode } from '@/api/auth'
import { SMS_LOGIN_REQUIRED } from '@/config/env'
import { setSlug } from '@/utils/slug'
import { setStaffId } from '@/utils/referrer'
import { useUserStore } from '@/stores/user'

export default {
  data() {
    return {
      mobile: '',
      smsCode: '',
      /** 是否需要验证码（开发环境为 false；常量注入 data 供模板直接判断） */
      smsLoginRequired: SMS_LOGIN_REQUIRED,
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
    // 工作室短链标识与分享人：小程序端由进入参数携带（H5 端由 utils/slug.js、
    // utils/referrer.js 读 URL，无需处理）
    if (options.slug) setSlug(options.slug)
    if (options.staff_id) setStaffId(options.staff_id)
  },
  beforeUnmount() {
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
      // 免验证码环境跳过格式校验，code 传空串（后端同样跳过校验，见 loginRequireSmsCode）
      if (this.smsLoginRequired && !/^\d{4,6}$/.test(this.smsCode)) {
        return uni.showToast({ title: '请输入验证码', icon: 'none' })
      }
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
  /* 免验证码提示：替代验证码输入框的位置，用次要文字色，不喧宾夺主 */
  &__dev-hint {
    display: block;
    color: $text-2;
    font-size: $fs-xs;
    padding: 0 8rpx;
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
}
</style>
