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
/* 全局样式：tokens + common（具体变量见 styles/tokens.scss） */
@import '@/styles/tokens.scss';
@import '@/styles/common.scss';

/* uni-app 全局默认文字色与字体（客户端暗色） */
page {
  background-color: $bg-page;
  color: $text-1;
  font-family: $font-family;
  font-size: 28rpx; /* 14px 设计稿基准 */
  line-height: 1.6;
}
</style>
