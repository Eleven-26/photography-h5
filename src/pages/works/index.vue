<template>
  <view class="page-wrap works">
    <!-- ============================================================
         作品列表 · 画板 C24（2026-09-07 Ardot 实测 1:1303 一比一还原）
         结构：导航 → 摄影师信息行（头像/名/简介/联系）→ 分类筛选横滑
               → 双列作品网格 → 毛玻璃底栏（定制需求）
         数据源：getAssets（biz_asset）· getStudioInfo（StudioSetting，信息行文案）
         ============================================================ -->
    <!-- 状态栏占位：设计稿顶部 Iphone 44px（C24 状态栏 0-44，导航行 44-88）。
         H5 由 .status-bar 固定 44px；MP 端 AppNavBar 已用系统值定位，避免双计。 -->
    <!-- #ifdef H5 -->
    <view class="status-bar" />
    <!-- #endif -->
    <AppNavBar title="作品列表" />

    <!-- ① 摄影师信息行：头像 48px 圆 + 名 16 Bold + 简介 12 次级 + 「联系」描边胶囊 -->
    <view class="works__profile">
      <!-- 头像是必显元素：接口未返回 avatar_url 时兜底工程内置头像（自稿 C24 裁出，48px 圆） -->
      <image
        class="works__avatar"
        :src="studio.avatar_url || '/static/img/avatar.jpg'"
        mode="aspectFill"
      />
      <view class="works__profile-main">
        <text class="works__name ellipsis">{{ photographerName }}</text>
        <text class="works__desc ellipsis">{{ profileDesc }}</text>
      </view>
      <AppButton type="secondary" size="hug" class="works__contact" @click="onContact">
        联系
      </AppButton>
    </view>

    <!-- ② 分类筛选：横滑胶囊 36px 高（选中白底黑字 / 未选描边 #383A40 字 #B8B9BF） -->
    <scroll-view class="works__filters" scroll-x :show-scrollbar="false">
      <view
        v-for="cat in categories"
        :key="cat"
        class="works__filter pressable"
        :class="{ 'works__filter--active': cat === activeCat }"
        @click="switchCat(cat)"
      >{{ cat }}</view>
    </scroll-view>

    <!-- ③ 作品双列网格（复用 AppWorkGrid，C01/C24 同规格） -->
    <AppWorkGrid :items="assets" />
    <AppEmpty v-if="!assets.length && !loading" text="暂无作品" />
    <view class="works__bottom-space" />

    <!-- ④ 底栏：白胶囊 56 高「定制需求」→ C27 -->
    <AppFooter>
      <AppButton block @click="goCustom">定制需求</AppButton>
    </AppFooter>
  </view>
</template>

<script>
/**
 * 作品列表（画板 C24）· 2026-09-07 对稿还原
 * 数据源：getAssets（biz_asset，后端 /asset/list 支持 category 过滤 + 分页）
 *        getStudioInfo（/studio/info 直接返回 model.StudioSetting，非 {studio} 包装）
 * 分类筛选：来自真实作品数据的 category 去重，不再内置演示枚举。
 */
import { getStudioInfo } from '@/api/studio'
import { getAssets } from '@/api/asset'
import { contactPhotographer } from '@/utils/format'
import AppNavBar from '@/components/AppNavBar.vue'
import AppButton from '@/components/AppButton.vue'
import AppFooter from '@/components/AppFooter.vue'
import AppWorkGrid from '@/components/AppWorkGrid.vue'
import AppEmpty from '@/components/AppEmpty.vue'

export default {
  components: { AppNavBar, AppButton, AppFooter, AppWorkGrid, AppEmpty },
  data() {
    return {
      studio: {},      // model.StudioSetting（slogan / intro）
      allAssets: [],   // 全量作品（分类来源 + 本地筛选底稿）
      assets: [],      // 当前分类下的展示列表
      loading: false,
      activeCat: '全部',
      categories: ['全部'],
    }
  },
  computed: {
    /** 信息行标题：取作品快照里的摄影师（model.Asset.photographer），无则泛称 */
    photographerName() {
      const hit = this.allAssets.find((a) => a.photographer)
      return (hit && hit.photographer) || '摄影师'
    },
    /** 信息行副标题：工作室宣传语 / 简介（StudioSetting 真实字段，无则不显示该行） */
    profileDesc() {
      const s = this.studio || {}
      return s.slogan || s.intro || ''
    },
  },
  onLoad() {
    this.loadData()
  },
  methods: {
    async loadData() {
      this.loading = true
      try {
        // 工作室信息行（失败不阻塞作品加载）
        getStudioInfo()
          .then((info) => { this.studio = info || {} })
          .catch(() => {})
        // 一次取全量作品：分类胶囊由返回数据的 category 去重得到，切换分类走本地筛选
        const res = await getAssets({ page: 1, page_size: 100 })
        this.allAssets = (res && res.list) || []
        const cats = [...new Set(this.allAssets.map((a) => a.category).filter(Boolean))]
        this.categories = ['全部', ...cats]
        if (this.activeCat !== '全部' && !cats.includes(this.activeCat)) this.activeCat = '全部'
        this.applyFilter()
      } catch (e) {
        // request 层已 toast；保留已有数据不清空
      } finally {
        this.loading = false
      }
    },
    applyFilter() {
      this.assets = this.activeCat === '全部'
        ? this.allAssets
        : this.allAssets.filter((a) => a.category === this.activeCat)
    },
    switchCat(cat) {
      if (cat === this.activeCat) return
      this.activeCat = cat
      this.applyFilter()
    },
    /** 站内不建 IM：联系 = 拨打电话（需求文档 §3.2）；后端未下发工作室电话时由 util 兜底提示 */
    onContact() {
      contactPhotographer(this.studio.mobile)
    },
    goCustom() { uni.navigateTo({ url: '/pages/custom/request' }) },
  },
}
</script>

<style lang="scss" scoped>
.works {
  &__profile {
    display: flex;
    align-items: center;
    gap: 24rpx;
    padding: 40rpx $page-pad 24rpx; /* C24 实测：头像顶 108（nav 底 88+20），行底 168 */
  }
  &__avatar {
    width: 96rpx;
    height: 96rpx;
    border-radius: 50%;
    flex-shrink: 0;
    background-color: $bg-card; /* 头像加载前占位 */
  }
  &__profile-main {
    flex: 1;
    min-width: 0; /* 配合 ellipsis 防溢出 */
    display: flex;
    flex-direction: column;
    gap: 8rpx;
  }
  &__name { color: $text-1; font-size: $fs-lg; font-weight: 700; }
  &__desc { color: $text-2; font-size: $fs-sm; }
  /* 联系胶囊：C24 实测 56×39（字 13 Bold / 水平 pad 15）——覆盖 AppButton 次级默认高 54 */
  &__profile :deep(.app-btn--secondary.works__contact) {
    height: 78rpx;
    padding: 0 30rpx;
    font-size: 26rpx;
    font-weight: 600;
  }

  /* ② 分类筛选：横滑，左缘对齐页边距，胶囊间距 8px（C24 实测 16→86→184→282） */
  &__filters {
    white-space: nowrap;
    padding: 12rpx 0 44rpx; /* C24 实测：胶囊顶 174、网格顶 232 */
  }
  &__filter {
    display: inline-flex;
    align-items: center;
    height: 72rpx;
    padding: 0 32rpx;
    margin-left: 16rpx;
    border: 2rpx solid $border-2;
    border-radius: $radius-btn;
    color: $text-3;
    font-size: $fs-md;
    vertical-align: middle;
    &:first-child { margin-left: $page-pad; } /* C24 实测：首枚左缘 16px，枚间距 8px */
    &--active {
      background-color: $text-1;
      border-color: $text-1;
      color: #17181A; /* 选中白底黑字（C24 实测） */
      font-weight: 500;
    }
  }

  &__bottom-space { height: 200rpx; }
}
</style>
