<template>
  <button
    class="app-btn pressable"
    :class="[`app-btn--${type}`, `app-btn--${size}`, { 'app-btn--disabled': disabled, 'app-btn--block': block, 'app-btn--flex': flex }]"
    :disabled="disabled || loading"
    :hover-start-time="0"
    :hover-stay-time="60"
    @click="handleClick"
  >
    <!-- loading 态：异步操作必须有反馈（>1s 操作不得无响应） -->
    <text v-if="loading" class="app-btn__loading">…</text>
    <text v-else class="app-btn__text"><slot /></text>
  </button>
</template>

<script>
/**
 * AppButton —— 客户端统一按钮
 *
 * 规格（Ardot 组件库 13:288 实测口径，2026-09-07 定稿）：
 * - 主钮 primary：白底黑字胶囊，高 58px（116rpx，C11/C05 底栏实测），块级默认宽 343px（686rpx）
 * - 次级钮 secondary：透明底 + 二级描边 #383A40 白字，hug 宽，pad 32/17/19
 * - 按下态：透明度反馈（100ms 内响应）；禁用态：降透明
 * 禁止：页面内裸写 button 高度/圆角，一律复用本组件。
 */
export default {
  name: 'AppButton',
  props: {
    /** primary 主钮 | secondary 次级描边钮 */
    type: { type: String, default: 'primary' },
    /** block 满宽（主钮默认）| hug 内容宽（次级默认） */
    size: { type: String, default: '' },
    block: { type: Boolean, default: false },
    /** 在底栏双钮行（C02 实测：主钮伸展 + 次级 hug）中主钮自动伸展 */
    flex: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    /** 异步提交中：转 loading 并禁点，防重复提交 */
    loading: { type: Boolean, default: false },
  },
  emits: ['click'],
  methods: {
    handleClick(e) {
      if (this.disabled || this.loading) return
      this.$emit('click', e)
    },
  },
}
</script>

<style lang="scss" scoped>
.app-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: $btn-height;               /* 58px（116rpx）定稿口径 */
  border-radius: $radius-btn;
  margin: 0;
  padding: 0 $card-pad;
  border: none;
  line-height: 1;
  font-size: $btn-fs;
  font-weight: 600;
  /* 去除小程序 button 默认边框 */
  &::after { border: none; }

  &--primary {
    background-color: $white;        /* 白胶囊（需求文档：客户端 CTA） */
    color: #17181A;
  }
  &--secondary {
    background-color: transparent;
    border: 1rpx solid $border-2;    /* 二级描边 #383A40 */
    color: $text-1;
    width: fit-content;              /* hug 宽 */
    height: calc(#{$btn-height} - 4rpx); /* 含描边总高与主钮一致 */
  }
  &--danger {
    background-color: $btn-danger;   /* 破坏性红钮（C20「确认取消」实测） */
    color: $white;
  }
  &--block { width: $btn-width-main; max-width: 100%; }
  &--flex { flex: 1; width: auto; min-width: 0; }
  &--hug { width: fit-content; }
  &--disabled { opacity: 0.4; }
  &__loading { font-size: $fs-lg; }
  &__text { line-height: 1.2; }
}
</style>
