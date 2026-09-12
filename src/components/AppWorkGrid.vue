<template>
  <view class="app-work-grid">
    <view
      v-for="(item, index) in items"
      :key="item.id || index"
      class="app-work-grid__item"
    >
      <image
        class="app-work-grid__img"
        :src="item.cover_url || item.url"
        mode="aspectFill"
        lazy-load
        @click="preview(index)"
      />
      <!-- 作品图角标：C01/C24 实测 24px（SVG 含 68% 圆底 + 白心形） -->
      <view
        class="app-work-grid__zoom pressable"
        @click.stop="preview(index)"
      >
        <AppIcon name="like-overlay" :size="24" />
      </view>
    </view>
  </view>
</template>

<script>
/**
 * AppWorkGrid —— 双列作品瀑布流网格（3:4）
 * 规格：C01/C24 实测 —— 双列 165×220px（330×440rpx），列间距 12px（24rpx），
 *       页边距 16px（32rpx），右下放大钮 24px（48rpx）r8（16rpx）。
 * 图片点击 / 放大钮点击 → uni.previewImage 全屏预览。
 */
export default {
  name: 'AppWorkGrid',
  props: {
    /** 作品数组：[{ id, url | cover_url }] */
    items: { type: Array, default: () => [] },
  },
  methods: {
    urls() {
      return (this.items || []).map((i) => i.cover_url || i.url).filter(Boolean)
    },
    preview(index) {
      const list = this.urls()
      if (!list.length) return
      uni.previewImage({ urls: list, current: index })
    },
  },
}
</script>

<style lang="scss" scoped>
.app-work-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 24rpx;
  padding: 0 $page-pad;

  &__item {
    position: relative;
    width: calc(50% - 12rpx);
    height: 440rpx;
    border-radius: 16rpx; /* C01 实测 r8 */
    overflow: hidden;
  }
  &__img {
    width: 100%;
    height: 100%;
    display: block;
    background-color: $bg-card; /* 图片加载前占位，防布局偏移 */
  }
  &__zoom {
    position: absolute;
    left: 24rpx;   /* C01 实测：图标钮在图片左下角，距边 12px */
    bottom: 24rpx;
    width: 48rpx;
    height: 48rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
</style>
