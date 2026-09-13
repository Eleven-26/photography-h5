<script>
import { captureSlug } from '@/utils/slug'
import { captureStaffId } from '@/utils/referrer'

/**
 * 应用根组件 —— 全局生命周期
 * 客户端设计语言：暗色沉浸（底 #17181C），在此统一注入全局样式。
 */
export default {
  onLaunch() {
    // 分享链接形如 https://host/?slug=xxx&staff_id=12（由员工端「我的预约主页」分享出来）：
    // 启动即捕获并落缓存，保证访客（未登录）直接打开链接浏览预约主页时也能定位租户，
    // 且登录后下单能归到分享人名下。
    // 请求层（api/common/http.js）另会注入 X-Slug / X-Staff-Id 头，此处是更早的兜底捕获。
    captureSlug()
    captureStaffId()
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
