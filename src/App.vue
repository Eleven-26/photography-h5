<script>
/**
 * 应用根组件 —— 全局生命周期
 * 客户端设计语言：暗色沉浸（底 #17181C），在此统一注入全局样式。
 */
export default {
  onLaunch() {
    // 应用启动：可在此做静默登录态恢复（auth.js 已在请求层处理，这里预留）
  },
  onShow() {},
  onHide() {},
}
</script>

<style lang="scss">
/* 全局样式：设计 token 由 uni.scss 自动注入（见 src/uni.scss），此处只需公共类。
 * 用 @use 取代 @import（Dart Sass 3.0 将移除 @import）；common.scss 内部自行
 * @use tokens —— 模块隔离下它不会继承本文件的作用域。 */
@use '@/styles/common.scss' as *;

/* uni-app 全局默认文字色与字体（客户端暗色） */
page {
  background-color: $bg-page;
  color: $text-1;
  font-family: $font-family;
  font-size: 28rpx; /* 14px 设计稿基准 */
  line-height: 1.6;
}
</style>
