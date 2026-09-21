<template>
  <view class="page-wrap home">
    <!-- ============================================================
         首页 · 画板 C01（2026-09-07 Ardot 实测 1:55 一比一还原）
         结构：Hero 大图 → 数据统计卡 → 精选服务（套餐横滑）→ 精选作品
               （双列瀑布流）→ 服务流程 → 常见问题 → 毛玻璃底栏（定制需求）
         数据源：getStudioInfo（biz_studio_setting + biz_asset）· getPackages（status=2）
         ============================================================ -->

    <!-- ① Hero：360px 大图 + 渐变（顶部压暗 / 底部融入页面底色）
         稿为沉浸式：Hero 从 y0 全出血，iPhone 状态栏浮在图上，
         故本页不插 .status-bar 占位，顶栏用 absolute 浮层（top 44px 视觉偏移）
         图源：biz_studio_setting.cover_url —— 工作室在 PC / 小程序「我的预约主页」上传的
         分享封面图（2026-09-15 新增字段）。未设置时不渲染 image，仅留纯色底，
         避免空 src 触发一次无意义的图片请求。 -->
    <view class="home__hero">
      <image
        v-if="studio.cover_url"
        class="home__hero-img"
        :src="studio.cover_url"
        mode="aspectFill"
      />
      <view class="home__hero-mask" />
      <!-- 顶栏：返回 + 更多（透明浮层；返回用 C02 实测 back.svg。
           2026-09-15 起「返回」在无上一页时进入客户中心 CC01，见 goBack 注释 -->
      <view class="home__topbar">
        <view class="home__topbar-btn pressable" @click="goBack">
          <AppIcon name="back" :size="44" />
        </view>
        <view class="home__topbar-btn pressable" @click="onMore">
          <!-- 稿面右上角为「分享」图形（三点连线），原为「···」字符占位 -->
          <AppIcon name="share-white" :size="20" />
        </view>
      </view>
      <!-- 工作室信息（数据源 /h5/studio/info → model.StudioSetting）
           ⚠️ StudioSetting 只有 slogan / intro / faq / service_flow 等字段：
           店名在 sys_company.name、封面/评分/服务次数/经验年限后端均未下发 —— 一律不渲染。
           此前模板写死的「本鸡比摄影 / 4.9 / 326 次服务 / 8 年经验」是编造值，已移除。
           若要恢复该区完整视觉，需后端在 studio/info 聚合返回上述字段。 -->
      <view class="home__hero-info">
        <text v-if="studio.slogan" class="home__hero-title">{{ studio.slogan }}</text>
        <text v-if="studio.intro" class="home__hero-slogan">{{ studio.intro }}</text>
      </view>
    </view>

    <!-- ② 数据统计卡：三列 + 竖分割线（数字 20 Bold / 标签 12 次级）
         ⚠️ 三项均无后端数据源（StudioSetting 无 works_count / served_count / positive_rate），
         全为空时隐藏整块，不再用写死的 100+ / 326 / 98% 顶上 -->
    <view v-if="stats.works || stats.clients || stats.rate" class="home__stats-wrap">
      <view class="card home__stats">
        <view class="home__stat">
          <text class="home__stat-num">{{ stats.works }}</text>
          <text class="home__stat-label">原创作品</text>
        </view>
        <view class="home__stats-divider" />
        <view class="home__stat">
          <text class="home__stat-num">{{ stats.clients }}</text>
          <text class="home__stat-label">服务客户</text>
        </view>
        <view class="home__stats-divider" />
        <view class="home__stat">
          <text class="home__stat-num">{{ stats.rate }}</text>
          <text class="home__stat-label">好评率</text>
        </view>
      </view>
    </view>

    <!-- ③ 精选服务：已上架套餐（status=2，口径②）横滑卡片 -->
    <AppSection title="精选服务" />
    <scroll-view class="home__pkgs" scroll-x :show-scrollbar="false">
      <view
        v-for="pkg in packages"
        :key="pkg.id"
        class="home__pkg pressable"
        @click="goPackage(pkg.id)"
      >
        <image
          class="home__pkg-img"
          :src="pkg.cover"
          mode="aspectFill"
          lazy-load
        />
        <view class="home__pkg-info">
          <text class="home__pkg-name ellipsis">{{ pkg.name }}</text>
          <text class="home__pkg-meta ellipsis">{{ pkgMeta(pkg) }}</text>
          <text class="home__pkg-price">¥{{ formatPrice(pkg.base_price) }}</text>
        </view>
      </view>
      <view v-if="!packages.length" class="home__pkgs-empty">
        <AppEmpty text="套餐上架后在此展示" />
      </view>
    </scroll-view>

    <!-- ④ 精选作品：双列瀑布流（3:4 图，右下放大钮）→ C24 作品列表 -->
    <AppSection title="精选作品" more @more="goWorks" />
    <AppWorkGrid :items="featuredWorks" />
    <AppEmpty v-if="!featuredWorks.length" text="作品加载中或暂未发布" />

    <!-- ⑤ 服务流程：7 步两行（flow-1..7 均为 C01 原图矢量导出） -->
    <AppSection title="服务流程" />
    <view class="card home__flow">
      <view class="home__flow-row">
        <template v-for="(step, i) in flowRow1" :key="'r1' + i">
          <view class="home__flow-step">
            <!-- C01 实测流程图标 22px（按步骤顺序 flow-1..4） -->
            <AppIcon :name="`flow-${i + 1}`" :size="22" />
            <text class="home__flow-label">{{ step }}</text>
          </view>
          <AppIcon v-if="i < flowRow1.length - 1" name="chevron-right-xs" :size="13" />
        </template>
      </view>
      <view class="home__flow-row">
        <template v-for="(step, i) in flowRow2" :key="'r2' + i">
          <view class="home__flow-step">
            <!-- 第二行对应 flow-5..7 -->
            <AppIcon :name="`flow-${i + 5}`" :size="22" />
            <text class="home__flow-label">{{ step }}</text>
          </view>
          <AppIcon v-if="i < flowRow2.length - 1" name="chevron-right-xs" :size="13" />
        </template>
      </view>
    </view>

    <!-- ⑥ 常见问题（暂为设计稿静态文案，待接 FAQ 数据，联调核对） -->
    <AppSection title="常见问题" />
    <view class="card home__faq">
      <view v-for="(qa, i) in faqs" :key="i" class="home__qa">
        <text class="home__qa-q">{{ qa.q }}</text>
        <text class="home__qa-a">{{ qa.a }}</text>
      </view>
    </view>

    <!-- ⑦ 底栏：白胶囊 56 高「定制需求」→ C27（口径②：定制一律走报价） -->
    <view class="home__footer-space" />
    <AppFooter>
      <AppButton block @click="goCustom">定制需求</AppButton>
    </AppFooter>
  </view>
</template>

<script>
/**
 * 首页（画板 C01）—— 摄影师主页 · 2026-09-07 对稿还原
 * 数据源：getStudioInfo（biz_studio_setting 工作室信息 + biz_asset 精选作品）、
 *        getPackages（biz_package，仅 status=2 已上架 —— 快捷直约口径②）
 *
 * ⚠️ 2026-09-14 修掉两处会让「套餐列表不是真实数据」的硬伤：
 *   1. **分页结构**：接口返回 {list,total,page,page_size}（后端 response.PageOK），
 *      不是裸数组 —— 原来当数组读，`.filter` 直接抛 TypeError 被 catch 静默吞掉，
 *      列表恒为空、再落到演示数据；
 *   2. **状态口径**：已上架 = status 2（enum.PackageStatus.Active），原来按 1 过滤，
 *      后端返回的真实套餐被整批滤掉。口径见 constants/enums.js。
 * 待联调核对：studio 统计字段（works/clients/rate 后端暂无来源列）、
 *            工作室封面/名称（biz_studio_setting 无对应列，待后端补聚合返回）
 */
import { getStudioInfo } from '@/api/studio'
import { getPackages } from '@/api/package'
import { getAssets } from '@/api/asset'
import { PACKAGE_STATUS } from '@/constants/enums'
import { formatAmount as formatPrice } from '@/utils/format'
import AppSection from '@/components/AppSection.vue'
import AppFooter from '@/components/AppFooter.vue'
import AppButton from '@/components/AppButton.vue'
import AppWorkGrid from '@/components/AppWorkGrid.vue'
import AppEmpty from '@/components/AppEmpty.vue'

/** 解析后端 JSON 数组字符串（biz_studio_setting.faq / service_flow）；空值或非法返回 [] */
function parseList(raw) {
  if (!raw) return []
  try {
    const v = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(v) ? v : []
  } catch (e) {
    return []
  }
}

/** 服务流程兜底：设计稿 C01 的通用步骤文案（纯 UI 文案、非业务数据）；
    后端 studio.service_flow 有值时以后端为准 */
const DEFAULT_FLOW = ['浏览作品', '选择套餐', '预约档期', '拍摄', '在线选片', '精修交付', '下载成片']

export default {
  components: { AppSection, AppFooter, AppButton, AppWorkGrid, AppEmpty },
  data() {
    return {
      studio: {},
      featuredWorks: [],
      packages: [],
    }
  },
  computed: {
    /** 统计数据：后端 StudioSetting **没有** works_count / served_count / positive_rate 字段，
        取不到即返回空串（模板按空隐藏整区），不再用写死的 100+ / 326 / 98% 顶上 */
    stats() {
      const s = this.studio || {}
      return {
        works: s.works_count != null ? `${s.works_count}+` : '',
        clients: s.served_count != null ? String(s.served_count) : '',
        rate: s.positive_rate != null ? `${s.positive_rate}%` : '',
      }
    },
    /** 服务流程：优先后端 studio.service_flow（JSON 数组），为空回退设计稿通用文案 */
    flowRow1() {
      const l = parseList(this.studio.service_flow)
      return (l.length ? l : DEFAULT_FLOW).slice(0, 4)
    },
    flowRow2() {
      const l = parseList(this.studio.service_flow)
      return (l.length ? l : DEFAULT_FLOW).slice(4)
    },
    /** 常见问题：后端 biz_studio_setting.faq（JSON 数组字符串），无数据即空态 */
    faqs() {
      return parseList(this.studio.faq)
    },
  },
  onShow() {
    this.loadData()
  },
  methods: {
    formatPrice,
    pad2(n) { return n < 10 ? '0' + n : String(n) },
    /** 套餐规格行：时长 · 精修张数（字段对齐 biz_package.shoot_hours / photos_included） */
    pkgMeta(pkg) {
      const hours = pkg.shoot_hours != null ? `${pkg.shoot_hours}h` : ''
      const photos = pkg.photos_included != null ? `${pkg.photos_included}张精修` : ''
      return [hours, photos].filter(Boolean).join(' · ') || '详情咨询'
    },
    async loadData() {
      try {
        // ⚠️ /h5/studio/info 返回的是 model.StudioSetting **本身**（后端 response.OK(c, info)），
        // 不是 { studio, featured_assets } —— 此前读 home.studio 恒为空对象，工作室信息从未生效。
        const [home, pkgs, works] = await Promise.all([
          getStudioInfo(),
          getPackages(),
          getAssets({ featured: 1 }),
        ])
        this.studio = home || {}
        /* 精选作品单独取（asset/list 带 featured=1），分页响应 {list,total,...} */
        this.featuredWorks = (works && works.list) || []
        // 分页响应是 {list,total,page,page_size}（后端 response.PageOK），不是裸数组；
        // 只留「已上架」（status=2，口径②，见 constants/enums.js）
        this.packages = ((pkgs && pkgs.list) || []).filter(
          (p) => Number(p.status) === PACKAGE_STATUS.ACTIVE
        )
      } catch (e) {
        // 错误已由 request 层统一 toast，此处保留已有数据不清空
      }
    },
    /**
     * 左上角「<」→ 客户中心（CC01）
     *
     * 2026-09-15 变更：分享页是 H5 的**落地根页**（客户从分享链接直达），页面栈里通常
     * 没有上一页 —— 原实现在栈深=1 时什么都不做，点了像按钮坏了。按产品口径改为进入
     * 客户中心：客户在任何位置都能一键找回自己的订单/定制需求/评价，不依赖浏览器返回。
     * 若确实存在上一页（栈深>1，例如从作品列表回来），仍保留原生返回语义，不劫持。
     */
    goBack() {
      const pages = getCurrentPages()
      if (pages.length > 1) {
        uni.navigateBack()
        return
      }
      uni.navigateTo({ url: '/pages/me/index' })
    },
    onMore() {
      // 更多操作（分享等），待产品定义
      uni.showToast({ title: '敬请期待', icon: 'none' })
    },
    goWorks() { uni.navigateTo({ url: '/pages/works/index' }) },
    goPackage(id) {
      if (id == null) return
      uni.navigateTo({ url: `/pages/package/detail?id=${id}` })
    },
    goCustom() { uni.navigateTo({ url: '/pages/custom/request' }) },
  },
}
</script>

<style lang="scss" scoped>
.home {
  padding-bottom: 0;

  /* ① Hero：375×360px → 720rpx 高 */
  &__hero {
    position: relative;
    height: 720rpx;
    background-color: $bg-card; /* 图未加载时占位，防布局偏移 */
  }
  &__hero-img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  &__hero-mask {
    position: absolute;
    inset: 0;
    background: $hero-gradient;
  }
  /* 顶栏浮层（沉浸式）：Hero 全出血从 y0 起，稿 iPhone 状态栏 44px 浮于图上、
     非占位；故 top 取 44px 视觉偏移，箭头中心落在稿 y66、左缘 34.5px */
  &__topbar {
    position: absolute;
    top: 44px;
    left: 0;
    right: 0;
    display: flex;
    justify-content: space-between;
    padding: 0 24rpx;
  }
  &__topbar-btn {
    width: 88rpx;
    height: 88rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: $radius-cell;
  }
  &__topbar-icon {
    color: $text-1;
    font-size: 48rpx;
    font-weight: 600;
    line-height: 1;
  }
  &__topbar-icon--more { font-size: 40rpx; letter-spacing: 4rpx; }

  /* 工作室信息：距 hero 底部约 114px 内容区，左 20px */
  &__hero-info {
    position: absolute;
    left: 40rpx;
    right: 40rpx;
    bottom: 24rpx;
    display: flex;
    flex-direction: column;
    gap: 12rpx;
  }
  &__hero-title { color: $text-1; font-size: 64rpx; font-weight: 700; line-height: 1.2; }
  &__hero-slogan { color: rgba(255, 255, 255, 0.8); font-size: $fs-md; }
  &__hero-meta {
    display: flex;
    align-items: center;
    gap: 32rpx;
    margin-top: 4rpx;
  }
  &__hero-rate { display: flex; align-items: center; gap: 8rpx; }
  &__hero-score { color: $text-1; font-size: 26rpx; font-weight: 700; }
  &__hero-sub { color: rgba(255, 255, 255, 0.7); font-size: 26rpx; }

  /* ② 数据统计卡：页边距 16px，三列等分 + 分割线
     稿实测：卡 y360-441（高 81px）、上下内边距 20px；圆角 32rpx（角部面积法回读 15.53 ≈ r16） */
  &__stats-wrap { padding: 0 $page-pad; }
  &__stats {
    display: flex;
    align-items: stretch;
    border-radius: 32rpx; /* 稿 r16（角部面积法实测，原判 r12 系旧法偏差） */
    padding: 40rpx 0;     /* 稿 上下各 20px（原 28rpx=14px 偏小） */
  }
  &__stat {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6rpx;
  }
  &__stat-num { color: $text-1; font-size: $fs-xl; font-weight: 700; font-family: $font-family-num; }
  &__stat-label { color: $text-2; font-size: $fs-sm; }
  &__stats-divider { width: 2rpx; background-color: $border-1; }

  /* ③ 精选服务：横滑卡 200×215px（图 120 + 信息区），卡间距 16px，左缘 16px */
  &__pkgs {
    white-space: nowrap;
    width: 100%;
  }
  &__pkg {
    display: inline-flex;
    flex-direction: column;
    width: 400rpx;
    margin-left: 32rpx;
    vertical-align: top;
    background-color: $bg-card;
    border: 2rpx solid $border-1;
    border-radius: $radius-card;
    overflow: hidden;
    white-space: normal;
  }
  &__pkg-img {
    width: 100%;
    height: 240rpx;
    display: block;
    background-color: $bg-card;
  }
  &__pkg-info {
    display: flex;
    flex-direction: column;
    padding: 24rpx;
  }
  &__pkg-name { color: $text-1; font-size: $fs-md; font-weight: 700; }
  &__pkg-meta { color: $text-2; font-size: $fs-sm; margin-top: 4rpx; }
  &__pkg-price {
    color: $text-1;
    font-size: 36rpx;
    font-weight: 700;
    font-family: $font-family-num;
    margin-top: 8rpx;
  }
  &__pkgs-empty {
    display: block;
    margin: 0 32rpx;
    white-space: normal;
  }

  /* ④ 精选作品：双列网格由 AppWorkGrid 承载（C01/C24/C02 同规格复用） */

  /* ⑤ 服务流程：r12 卡两行（C01 实测卡 x=16 pad 16）；步骤宽 120rpx（图标 44 + 标签 22），箭头 28rpx */
  &__flow {
    margin: 0 $page-pad;
    padding: 32rpx;
    display: flex;
    flex-direction: column;
    gap: 16rpx;
  }
  &__flow-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8rpx;
  }
  &__flow-step {
    width: 120rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8rpx;
  }
  &__flow-label { color: $text-2; font-size: $fs-xs; }

  /* ⑥ 常见问题：Q 14 Medium 白 / A 12 次级 */
  &__faq {
    margin: 0 $page-pad;
    padding: $card-pad;
    display: flex;
    flex-direction: column;
    gap: 24rpx;
  }
  &__qa { display: flex; flex-direction: column; gap: 8rpx; }
  &__qa-q { color: $text-1; font-size: $fs-md; font-weight: 500; }
  &__qa-a { color: $text-2; font-size: $fs-sm; line-height: 1.5; }

  /* ⑦ 底栏占位（毛玻璃底栏 + 56 高胶囊由 AppFooter/AppButton 承载） */
  &__footer-space { height: 200rpx; }
}
</style>
