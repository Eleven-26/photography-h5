<template>
  <view class="page-wrap wd">
    <!-- ============================================================
         作品详情 · 由 C01 首页「精选作品」与 C24 作品列表点击进入
         结构：头图（封面色）→ 标题/分类 → 作品信息（摄影师/模特/地点/日期）
               → 作品图集（全部 images，点击大图预览）→ 毛玻璃底栏（定制需求）
         数据源：getAssetDetail（biz_asset，含 images 逗号分隔多图）· 浏览数 +1 由后端处理
         ============================================================ -->

    <!-- 状态栏占位：与 C02 套餐详情同规格（暗色沉浸式，导航为页面底色行） -->
    <view class="status-bar" />

    <view class="wd__topbar">
      <view class="wd__topbar-btn pressable" @click="goBack">
        <AppIcon name="back" :size="44" />
      </view>
      <text class="wd__topbar-title">作品详情</text>
      <view class="wd__topbar-btn" />
    </view>

    <!-- 作品不存在 / 已下架 / id 非法：整页空态 + 返回入口，不留半张空白页 -->
    <view v-if="notFound" class="wd__empty">
      <AppEmpty text="作品不存在或已下架" />
      <view class="wd__empty-btn">
        <AppButton block @click="goBack">返回</AppButton>
      </view>
    </view>

    <template v-else>
      <!-- ① 头图：封面 3:2（与列表卡同比例，点进去视觉连续）；无封面用纯色底兜底 -->
      <view class="wd__hero" :class="{ 'wd__hero--empty': !heroUrl }">
        <image v-if="heroUrl" class="wd__hero-img" :src="heroUrl" mode="aspectFill" />
        <view class="wd__hero-mask" />
      </view>

      <!-- ② 标题 + 分类标签 -->
      <view class="wd__head">
        <text v-if="asset.title" class="wd__title">{{ asset.title }}</text>
        <view v-if="asset.category" class="wd__tag">{{ asset.category }}</view>
      </view>

      <!-- ③ 作品信息：全部取 biz_asset 真实列，无值整行不渲染（不编造默认值） -->
      <view v-if="infoRows.length" class="card wd__panel">
        <view v-for="row in infoRows" :key="row.label" class="wd__row">
          <text class="wd__row-label">{{ row.label }}</text>
          <text class="wd__row-value">{{ row.value }}</text>
        </view>
      </view>

      <!-- ④ 作品描述（biz_asset.description） -->
      <template v-if="asset.description">
        <AppSection title="作品故事" />
        <view class="card wd__desc">
          <text class="wd__desc-text">{{ asset.description }}</text>
        </view>
      </template>

      <!-- ⑤ 作品图集：展示 images 全部图片（这正是本页存在的意义 ——
           列表卡只给了封面，点进来才能看完一组片）。点击任意一张进大图预览并可左右滑动。 -->
      <view class="wd__sec-title">
        <text class="wd__sec-text">作品图集</text>
        <text class="wd__sec-hint">共 {{ photos.length }} 张 · 点击看大图</text>
      </view>
      <view class="wd__grid">
        <view
          v-for="(url, i) in photos"
          :key="url + i"
          class="wd__cell pressable"
          @click="preview(i)"
        >
          <image class="wd__cell-img" :src="url" mode="aspectFill" lazy-load />
        </view>
      </view>
      <AppEmpty v-if="!photos.length && !loading" text="该作品暂无图片" />

      <!-- ⑥ 底栏：定制需求（与 C01/C24 同口径，站内不建 IM） -->
      <view class="wd__bottom-space" />
      <AppFooter>
        <AppButton block @click="goCustom">定制需求</AppButton>
      </AppFooter>
    </template>
  </view>
</template>

<script>
/**
 * 作品详情 · 2026-09-15 新增
 *
 * 背景：C01 首页「精选作品」与 C24 作品列表原先点击只调 uni.previewImage 预览**封面**，
 * 而 biz_asset 真实存的是 cover（单张封面）+ images（逗号分隔的整组作品图）——
 * 客户只能看到一张封面，看不到这组片子。本页把 images 全量铺出来并提供大图预览。
 *
 * 数据源：getAssetDetail（/h5/asset/detail/:id，返回 model.Asset；后端顺带浏览数 +1）。
 * 作品不存在/已下架时后端返回错误，request 层已 toast 文案 → 本页落空态。
 */
import { getAssetDetail } from '@/api/asset'
import { formatDate } from '@/utils/format'
import AppButton from '@/components/AppButton.vue'
import AppFooter from '@/components/AppFooter.vue'
import AppEmpty from '@/components/AppEmpty.vue'

export default {
  components: { AppButton, AppFooter, AppEmpty },
  data() {
    return {
      asset: {},
      notFound: false,
      loading: false,
    }
  },
  computed: {
    /** 头图：优先 cover；无封面时回退 images 首图 */
    heroUrl() {
      return this.asset.cover || this.photos[0] || ''
    },
    /**
     * 作品图集。biz_asset.images 是**逗号分隔字符串**（不是数组），
     * 空值时回退到 cover —— 老数据常只传封面，此时至少还能看到一张。
     */
    photos() {
      const raw = String(this.asset.images || '').trim()
      const list = raw
        ? raw.split(',').map((s) => s.trim()).filter(Boolean)
        : []
      if (list.length) return list
      return this.asset.cover ? [this.asset.cover] : []
    },
    /** 作品信息行：只渲染有值的项 */
    infoRows() {
      const a = this.asset
      return [
        { label: '摄影师', value: a.photographer },
        { label: '模特', value: a.model },
        { label: '拍摄地点', value: a.location },
        { label: '拍摄日期', value: a.shoot_date ? formatDate(a.shoot_date) : '' },
      ].filter((r) => !!r.value)
    },
  },
  onLoad(options) {
    this.loadDetail(Number(options && options.id) || 0)
  },
  methods: {
    async loadDetail(id) {
      if (!id) {
        this.notFound = true
        return
      }
      this.loading = true
      try {
        const res = await getAssetDetail(id)
        this.asset = res || {}
      } catch {
        // request 层已 toast 后端文案（如「作品不存在」）→ 落空态，不冒充成演示数据
        this.notFound = true
      } finally {
        this.loading = false
      }
    },
    /** 大图预览：把整组作品图作为可滑动序列传入，current 定位到被点的那张 */
    preview(index) {
      if (!this.photos.length) return
      uni.previewImage({ urls: this.photos, current: index })
    },
    goBack() {
      const pages = getCurrentPages()
      if (pages.length > 1) uni.navigateBack()
      else uni.reLaunch({ url: '/pages/index/index' })
    },
    goCustom() { uni.navigateTo({ url: '/pages/custom/request' }) },
  },
}
</script>

<style lang="scss" scoped>
.wd {
  /* ① 头图：375:250 → 750×500rpx（3:2，与列表卡同比例） */
  &__hero {
    position: relative;
    height: 500rpx;
    margin: 0 $page-pad;
    border-radius: $radius-card;
    overflow: hidden;
    background-color: $bg-card;
  }
  &__hero--empty {
    /* 无封面：用二级卡片底色兜底，不留空洞（本端为暗色主题，不用浅色渐变） */
    background-color: $bg-card-2;
  }
  &__hero-img {
    width: 100%;
    height: 100%;
    display: block;
  }
  &__hero-mask {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(0, 0, 0, 0) 55%, rgba(0, 0, 0, 0.35) 100%);
  }

  /* 导航行（非浮层）：与 C02 套餐详情同规格 */
  &__topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 88rpx;
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
  &__topbar-title { color: $text-1; font-size: $fs-lg; font-weight: 700; }

  /* ② 标题 + 分类 */
  &__head {
    display: flex;
    flex-direction: column;
    gap: 16rpx;
    padding: 32rpx $page-pad 8rpx;
  }
  &__title { color: $text-1; font-size: 44rpx; font-weight: 700; line-height: 1.3; }
  &__tag {
    align-self: flex-start;
    padding: 6rpx 20rpx;
    border: 2rpx solid $border-2;
    border-radius: $radius-btn;
    color: $text-3;
    font-size: $fs-sm;
  }

  /* ③ 作品信息 */
  &__panel {
    margin: 24rpx $page-pad 0;
    padding: $card-pad;
    display: flex;
    flex-direction: column;
    gap: 20rpx;
  }
  &__row { display: flex; align-items: flex-start; justify-content: space-between; gap: 24rpx; }
  &__row-label { color: $text-2; font-size: $fs-sm; flex-shrink: 0; }
  &__row-value { color: $text-1; font-size: $fs-md; text-align: right; }

  /* ④ 作品故事 */
  &__desc {
    margin: 0 $page-pad;
    padding: $card-pad;
  }
  &__desc-text { color: $text-2; font-size: $fs-md; line-height: 1.7; }

  /* ⑤ 图集标题行：左「作品图集」右「共 N 张 · 点击看大图」 */
  &__sec-title {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16rpx;
    padding: 8rpx $page-pad 0;
  }
  &__sec-text { color: $text-1; font-size: $fs-lg; font-weight: 700; }
  &__sec-hint { color: $text-3; font-size: $fs-sm; }

  /* 图集：三列方图（一组片子看全、又不至于一屏放不下两张） */
  &__grid {
    display: flex;
    flex-wrap: wrap;
    gap: 12rpx;
    padding: 24rpx $page-pad 0;
  }
  &__cell {
    position: relative;
    width: calc((100% - 24rpx) / 3);
    height: 220rpx;
    border-radius: 12rpx;
    overflow: hidden;
    background-color: $bg-card;
  }
  &__cell-img { width: 100%; height: 100%; display: block; }

  &__bottom-space { height: 200rpx; }

  /* 空态 */
  &__empty { padding: 160rpx $page-pad 0; }
  &__empty-btn { margin-top: 48rpx; }
}
</style>
