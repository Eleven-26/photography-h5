<template>
  <!-- 沉浸式自定义导航栏：状态栏占位 + 内容行（返回 + 标题） -->
  <view class="app-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
    <view class="app-nav__row" :style="{ height: navHeight + 'px' }">
      <!-- 返回：有上一页才显示；无上一页（分享落地首页）自动隐藏 -->
      <view v-if="showBack" class="app-nav__back pressable" @click="handleBack">
        <!-- C02 实测返回钮：44×44 SVG（内含白描边 chevron） -->
        <AppIcon name="back" :size="44" />
      </view>
      <text class="app-nav__title" :class="{ 'app-nav__title--center': showBack }">{{ title }}</text>
      <view v-if="showBack" class="app-nav__ghost" />
    </view>
  </view>
</template>

<script>
/**
 * AppNavBar —— 自定义导航栏（globalStyle navigationStyle=custom 的配套）
 * 暗色沉浸：透明底、白字标题；状态栏高度跨端取值（H5 为 0，小程序取系统值）。
 * ⚠️ 页面须在 <AppNavBar> 前插 <view class="status-bar" />（common.scss，H5 固定 44px）。
 */
export default {
  name: 'AppNavBar',
  props: {
    title: { type: String, default: '' },
    /** 是否显示返回箭头（默认自动判断页面栈） */
    showBack: { type: Boolean, default: true },
  },
  data() {
    return {
      statusBarHeight: 0,
      navHeight: 44, /* 88rpx 定稿口径 */
    }
  },
  mounted() {
    // 跨端状态栏高度：H5 无状态栏为 0；小程序/App 取系统值
    try {
      const sys = uni.getSystemInfoSync()
      this.statusBarHeight = sys.statusBarHeight || 0
    } catch (e) {
      this.statusBarHeight = 0
    }
  },
  methods: {
    handleBack() {
      const pages = getCurrentPages()
      if (pages.length > 1) {
        uni.navigateBack()
      } else {
        // 无上级页面（如分享直达）：回首页
        uni.reLaunch({ url: '/pages/index/index' })
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.app-nav {
  background-color: transparent;
  &__row {
    display: flex;
    align-items: center;
    padding: 0 $page-pad;
    position: relative;
  }
  &__back {
    width: $touch-min;   /* 触摸目标 >= 44px */
    height: $touch-min;
    display: flex;
    align-items: center;
    justify-content: flex-start;
  }
  &__arrow {
    color: $text-1;
    font-size: 56rpx;
    line-height: 1;
    margin-top: -4rpx;
  }
  &__title {
    color: $text-1;
    font-size: $fs-xl;
    font-weight: 600;
    &--center {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
    }
  }
  &__ghost { width: $touch-min; margin-left: auto; }
}
</style>
