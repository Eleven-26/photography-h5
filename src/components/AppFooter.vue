<template>
  <view class="app-footer">
    <!-- 具名插槽：默认放主按钮（白胶囊 CTA 位）；footer 前置说明文字用 hint -->
    <text v-if="hint" class="app-footer__hint">{{ hint }}</text>
    <view class="app-footer__row">
      <slot />
    </view>
  </view>
</template>

<script>
/**
 * AppFooter —— 毛玻璃底栏（设计稿：白胶囊 CTA 承载位）
 * 规格：rgba(23,24,28,.72) + blur + 上描边；安全区由 common.scss .glass-footer 统一处理。
 * 用法：<AppFooter><AppButton :loading="submitting" @click="onSubmit">确认</AppButton></AppFooter>
 */
export default {
  name: 'AppFooter',
  props: {
    /** 底栏内提示文字（如「资金不经平台」说明） */
    hint: { type: String, default: '' },
  },
}
</script>

<style lang="scss" scoped>
/* 毛玻璃底栏：scoped 上下文无法 @extend 全局 .glass-footer，此处自持样式（与 common.scss 保持同步） */
.app-footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  background-color: $glass-bg;
  -webkit-backdrop-filter: blur(24rpx);
  backdrop-filter: blur(24rpx);
  border-top: 1rpx solid $border-1;
  padding: $footer-safe $page-pad;
  padding-bottom: calc(#{$footer-safe} + constant(safe-area-inset-bottom));
  padding-bottom: calc(#{$footer-safe} + env(safe-area-inset-bottom));

  &__hint {
    display: block;
    color: $text-2;
    font-size: $fs-xs;
    text-align: center;
    margin-bottom: $footer-safe;
  }
  &__row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $touch-gap; /* 相邻按钮间距 >= 8px */
  }
}
</style>
