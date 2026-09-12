<template>
  <view class="page-wrap home">
    <!-- ============================================================
         首页 · 画板 C01（2026-09-07 Ardot 实测 1:55 一比一还原）
         结构：Hero 大图 → 数据统计卡 → 精选服务（套餐横滑）→ 精选作品
               （双列瀑布流）→ 服务流程 → 常见问题 → 毛玻璃底栏（定制需求）
         数据源：getStudioInfo（biz_studio_setting + biz_asset）· getPackages（status=1）
         ============================================================ -->

    <!-- ① Hero：360px 大图 + 渐变（顶部压暗 / 底部融入页面底色）
         稿为沉浸式：Hero 从 y0 全出血，iPhone 状态栏浮在图上，
         故本页不插 .status-bar 占位，顶栏用 absolute 浮层（top 44px 视觉偏移） -->
    <view class="home__hero">
      <image
        class="home__hero-img"
        :src="studio.cover_url"
        mode="aspectFill"
      />
      <view class="home__hero-mask" />
      <!-- 顶栏：返回 + 更多（透明浮层；返回用 C02 实测 back.svg，更多无对应原图暂保留字符） -->
      <view class="home__topbar">
        <view class="home__topbar-btn pressable" @click="goBack">
          <AppIcon name="back" :size="44" />
        </view>
        <view class="home__topbar-btn pressable" @click="onMore">
          <!-- 稿面右上角为「分享」图形（三点连线），原为「···」字符占位 -->
          <AppIcon name="share-white" :size="20" />
        </view>
      </view>
      <!-- 工作室信息（biz_studio_setting：名称/口号/评分/服务次数/经验） -->
      <view class="home__hero-info">
        <text class="home__hero-title">{{ studio.name || '本鸡比摄影' }}</text>
        <text class="home__hero-slogan">{{ studio.slogan || '用光影记录值得珍藏的瞬间' }}</text>
        <view class="home__hero-meta">
          <view class="home__hero-rate">
            <AppIcon name="star-gold" :size="13" />
            <text class="home__hero-score">{{ studio.rating || '4.9' }}</text>
          </view>
          <text class="home__hero-sub">{{ studio.served_count || 326 }}次服务</text>
          <text class="home__hero-sub">{{ studio.years_of_exp || 8 }}年经验</text>
        </view>
      </view>
    </view>

    <!-- ② 数据统计卡：三列 + 竖分割线（数字 20 Bold / 标签 12 次级） -->
    <view class="home__stats-wrap">
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

    <!-- ③ 精选服务：已上架套餐（status=1，口径②）横滑卡片 -->
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
          :src="pkg.cover_url"
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
 *        getPackages（biz_package，仅 status=1 已上架——快捷直约口径②）
 * 待联调核对：studio 统计字段（works/clients/rate 的真实来源字段名）、
 *            套餐 cover_url / 时长字段、FAQ 数据接口
 */
import { getStudioInfo } from '@/api/studio'
import { getPackages } from '@/api/package'
import { formatAmount as formatPrice } from '@/utils/format'
import AppSection from '@/components/AppSection.vue'
import AppFooter from '@/components/AppFooter.vue'
import AppButton from '@/components/AppButton.vue'
import AppWorkGrid from '@/components/AppWorkGrid.vue'
import AppEmpty from '@/components/AppEmpty.vue'

/* ============================================================
 * 演示兜底数据（2026-09-07 从画板 C01 导出原图，static/img/）
 * 用途：后端未联调时保证页面视觉与设计稿一致；联调后整体移除
 * ============================================================ */
const DEMO_STUDIO = {
  name: '本鸡比摄影',
  slogan: '用光影记录值得珍藏的瞬间',
  rating: '4.9',
  served_count: 326,
  years_of_exp: 8,
  cover_url: '/static/img/hero.jpg', // 画板 1:59 studio-space
}
const DEMO_PACKAGES = [
  { id: 'demo-p1', name: '轻写真套餐', duration_hours: 1.5, photos_included: 20, base_price: 1680, cover_url: '/static/img/pkg-1.jpg', status: 1 },
  { id: 'demo-p2', name: '全套精修套餐', duration_hours: 2.5, photos_included: 20, base_price: 2680, cover_url: '/static/img/pkg-2.jpg', status: 1 },
]
const DEMO_WORKS = [1, 2, 3, 4, 5, 6].map((n) => ({ id: `demo-w${n}`, cover_url: `/static/img/work-${n}.jpg` }))

export default {
  components: { AppSection, AppFooter, AppButton, AppWorkGrid, AppEmpty },
  data() {
    return {
      studio: {},
      featuredWorks: [],
      packages: [],
      // 服务流程两行（C01 实测文案；图标 flow-1..7 已从画板导出）
      flowRow1: ['浏览作品', '选择套餐', '预约档期', '拍摄'],
      flowRow2: ['在线选片', '精修交付', '下载成片'],
      // 常见问题（C01 实测静态文案，待接接口）
      faqs: [
        { q: '拍摄需要提前多久预约？', a: '建议提前3-5天预约，周末档期较紧张，建议尽早预约。' },
        { q: '如果下雨怎么办？', a: '可免费改期，提前4小时联系即可调整。' },
        { q: '照片多久能拿到？', a: '拍摄后7个工作日内完成精修并交付，高清下载有效期30天。' },
      ],
    }
  },
  computed: {
    /** 统计数据：优先取接口，缺省回退设计稿演示值（联调核对字段名） */
    stats() {
      const s = this.studio || {}
      return {
        works: s.works_count != null ? `${s.works_count}+` : '100+',
        clients: s.served_count != null ? String(s.served_count) : '326',
        rate: s.positive_rate != null ? `${s.positive_rate}%` : '98%',
      }
    },
  },
  onShow() {
    this.loadData()
  },
  methods: {
    formatPrice,
    pad2(n) { return n < 10 ? '0' + n : String(n) },
    /** 套餐规格行：时长 · 精修张数（C01 实测「2.5h · 20张精修」，字段名联调核对） */
    pkgMeta(pkg) {
      const hours = pkg.duration_hours != null ? `${pkg.duration_hours}h` : ''
      const photos = pkg.photos_included != null ? `${pkg.photos_included}张精修` : ''
      return [hours, photos].filter(Boolean).join(' · ') || '详情咨询'
    },
    async loadData() {
      try {
        const [home, pkgs] = await Promise.all([getStudioInfo(), getPackages()])
        this.studio = (home && home.studio) || {}
        this.featuredWorks = (home && home.featured_assets) || []
        // 双保险：仅已上架套餐（status=1，口径②）
        this.packages = (pkgs || []).filter((p) => p.status === 1)
      } catch (e) {
        // 错误已由 request 层统一 toast，此处保留已有数据不清空
      }
      this.applyDemoIfEmpty()
    },
    /** 演示兜底：接口无数据（后端未联调）时用画板原图占位，联调后移除本方法 */
    applyDemoIfEmpty() {
      if (!this.studio.cover_url) this.studio = { ...DEMO_STUDIO, ...this.studio }
      if (!this.packages.length) this.packages = DEMO_PACKAGES
      if (!this.featuredWorks.length) this.featuredWorks = DEMO_WORKS
    },
    goBack() {
      // H5 直达首页时无上级页，回退失败静默
      const pages = getCurrentPages()
      if (pages.length > 1) uni.navigateBack()
    },
    onMore() {
      // 更多操作（分享等），待产品定义
      uni.showToast({ title: '敬请期待', icon: 'none' })
    },
    goWorks() { uni.navigateTo({ url: '/pages/works/index' }) },
    goPackage(id) { uni.navigateTo({ url: `/pages/package/detail?id=${id}` }) },
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
