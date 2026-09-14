<template>
  <view class="page-wrap page-dv">
    <!-- 稿顶部 Iphone 状态栏占位（375×44 @(0,0)），头部容器从 y44 起 -->
    <view class="status-bar" />
    <AppNavBar title="成片交付" />

    <!-- ① 交付头卡（C17 实测 #1D1E22：已交付+绿数量 / 下载已开放 / 有效期） -->
    <view class="page-dv__head">
      <view class="page-dv__head-top">
        <text class="page-dv__head-title">成片已交付</text>
        <text class="page-dv__head-count">共{{ items.length }}张</text>
      </view>
      <text class="page-dv__head-sub">精修成片 · 高清下载已开放</text>
      <view class="page-dv__head-divider" />
      <view class="page-dv__head-valid">
        <text class="page-dv__head-valid-label">高清下载有效期至</text>
        <!-- C17 实测：日期与「剩余 n天」同行、分列左右（标签独行于其上） -->
        <view class="page-dv__head-valid-row">
          <text class="page-dv__head-valid-date">{{ expireDate }}</text>
          <text class="page-dv__head-valid-left">剩余 {{ daysLeft }}天</text>
        </view>
      </view>
    </view>

    <!-- ② 成片预览（C17 实测标签行 + 右侧张数） -->
    <view class="page-dv__label">
      <text>成片预览</text>
      <text class="page-dv__label-count">{{ items.length }}张</text>
    </view>

    <!-- ③ 双列网格：24×24 暗角下载钮（C17 实测 #17181C@68% r12，白下载图标） -->
    <view class="page-dv__grid">
      <view
        v-for="(item, index) in previewItems"
        :key="item.id || index"
        class="page-dv__cell pressable"
        @click="downloadOne(item)"
      >
        <image class="page-dv__img" :src="item.url" mode="aspectFill" lazy-load />
        <!-- C17 实测：金圆下载钮 24px（原画板矢量） -->
        <view class="page-dv__dl">
          <AppIcon name="download" :size="24" />
        </view>
      </view>
    </view>
    <text class="page-dv__more" @click="previewAll">查看全部 {{ items.length }} 张</text>

    <!-- ④ 有效期提示（C17 实测 #1D1E22 r12） -->
    <view class="page-dv__tip">
      <AppIcon name="info-sm" :size="13" />
      <text class="page-dv__tip-text">高清成片将在 {{ expireDate }} 后自动清理。请在有效期内下载保存。如需延期，请联系摄影师。</text>
    </view>

    <!-- ⑤ 评价入口（C17 实测卡：星标 + 标题副文 + 箭头；评价页稿未出，联调后接 biz_order_review） -->
    <view class="page-dv__label"><text>评价</text></view>
    <view class="page-dv__review pressable" @click="onReview">
      <!-- C17 实测 20px 星形图标 -->
      <AppIcon name="star" :size="20" />
      <view class="page-dv__review-main">
        <text class="page-dv__review-title">给{{ photographerLabel }}评价</text>
        <text class="page-dv__review-sub">分享你的拍摄体验</text>
      </view>
      <AppIcon name="chevron-right-sm" :size="15" />
    </view>

    <!-- ⑥ 毛玻璃底栏：block 白胶囊 + 下载图标（C17 实测） -->
    <AppFooter>
      <AppButton block :loading="downloading" @click="downloadAll">下载全部成片</AppButton>
    </AppFooter>
  </view>
</template>

<script>
/**
 * C17 成片交付（画板 1:1973 一比一还原）
 * 数据源：biz_delivery（stage 5-已交付）+ biz_delivery_item（kind=3 精修成品）+ biz_order 快照
 * 下载：高清包地址联调对接（biz_asset / 打包下载接口）；当前 H5 用 previewImage 降级 +
 *       downloadFile 单张下载；批量下载建议后端出 zip 链接（联调确认）
 * 有效期：订单快照 order.delivery_expire_at（后端落库，前端只格式化与计算剩余天数）
 * 评价：biz_order_review 表已建，评价页设计稿未出——入口先占位 toast
 */
import AppNavBar from '@/components/AppNavBar.vue'
import AppFooter from '@/components/AppFooter.vue'
import AppButton from '@/components/AppButton.vue'
import { getDeliveryDetail, getDeliveryItems } from '@/api/delivery'
import { getOrderDetail } from '@/api/order'
import { formatAmount } from '@/utils/format'

export default {
  components: { AppNavBar, AppFooter, AppButton },
  data() {
    return {
      orderId: 0,
      deliveryId: null,
      photographer: '',    // 订单快照摄影师（未指派时用泛称）
      expireAt: '',        // biz_order.delivery_expire_at
      items: [],
      downloading: false,
    }
  },
  computed: {
    previewItems() {
      return this.items.slice(0, 6)
    },
    /** 摄影师称谓：未指派时用泛称，避免出现「给评价」 */
    photographerLabel() {
      return this.photographer || '摄影师'
    },
    /** 下载有效期（MM月dd日）；后端未下发时为「—」 */
    expireDate() {
      if (!this.expireAt) return '—'
      const d = new Date(String(this.expireAt).replace(/-/g, '/'))
      if (Number.isNaN(d.getTime())) return '—'
      return `${d.getMonth() + 1}月${d.getDate()}日`
    },
    /** 剩余天数（按有效期截止日与今日之差，向上取整） */
    daysLeft() {
      if (!this.expireAt) return 0
      const d = new Date(String(this.expireAt).replace(/-/g, '/'))
      if (Number.isNaN(d.getTime())) return 0
      return Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86400000))
    },
  },
  onLoad(query) {
    this.orderId = Number(query.orderId || 0)
    this.loadData()
  },
  methods: {
    formatAmount,
    async loadData() {
      /* /delivery/detail/:id 的 :id 是 order_id，返回 { delivery, items } */
      const [detail, orderRes] = await Promise.all([
        getDeliveryDetail(this.orderId).catch(() => null),
        getOrderDetail(this.orderId).catch(() => null),
      ])
      const d = (detail && detail.delivery) || null
      this.deliveryId = d && d.id
      const order = (orderRes && orderRes.order) || {}
      this.photographer = order.photographer || ''
      this.expireAt = order.delivery_expire_at || ''
      const res = await getDeliveryItems(this.orderId).catch(() => [])
      const list = Array.isArray(res) ? res : (res && res.list) || []
      /* 成片网格只含精修成品（kind=3） */
      this.items = list.filter((it) => Number(it.kind) === 3).map((it) => ({ id: it.id, url: it.url || '' }))
    },
    previewAll() {
      const urls = this.items.map((it) => it.url).filter(Boolean)
      if (!urls.length) return
      uni.previewImage({ urls })
    },
    /** 单张下载（H5 a 标签 / 小程序 downloadFile） */
    downloadOne(item) {
      if (!item.url) return
      uni.downloadFile({
        url: item.url,
        success: (res) => uni.openDocument({ filePath: res.tempFilePath, showMenu: true, fail: () => {} }),
        fail: () => uni.showToast({ title: '下载失败，请重试', icon: 'none' }),
      })
    },
    async downloadAll() {
      /* 联调：批量下载建议后端出 zip 打包链接；当前逐张降级 */
      const urls = this.items.map((it) => it.url).filter(Boolean)
      if (!urls.length) {
        uni.showToast({ title: '成片准备中，请稍候', icon: 'none' })
        return
      }
      this.downloading = true
      try {
        /* H5 端可整包下载；小程序端逐张有并发限制，联调时切 zip 方案 */
        for (const url of urls.slice(0, 1)) {
          await new Promise((resolve) => {
            uni.downloadFile({ url, success: resolve, fail: resolve })
          })
        }
        uni.showToast({ title: '批量下载联调后开放，可先单张保存', icon: 'none' })
      } finally {
        this.downloading = false
      }
    },
    onReview() {
      uni.showToast({ title: '评价功能即将开放', icon: 'none' }) /* biz_order_review 联调后接评价页 */
    },
  },
}
</script>

<style lang="scss" scoped>
.page-dv {
  padding-bottom: 240rpx;

  /* ① 交付头卡 */
  &__head {
    margin: 24rpx $page-pad 0;
    padding: 32rpx;
    background-color: $bg-card;
    border-radius: 32rpx; /* C17 角部面积法：R≈31 图px = r16(≈15.5px)，非 r12 */
  }
  &__head-top {
    display: flex;
    align-items: baseline;
    gap: 16rpx; /* C17 实测「共24张」紧随标题（ink 连续至 x193.5），非两端对齐 */
  }
  &__head-title { color: $text-1; font-size: 40rpx; font-weight: 600; }
  &__head-count { color: $count-green; font-size: 40rpx; font-weight: 600; } /* C17 实测 #07C160 */
  &__head-sub { color: $text-2; font-size: 26rpx; margin-top: 8rpx; }
  &__head-divider {
    height: 1rpx;
    background-color: $border-1; /* C17 实测 #2B2C30，卡内 y186 */
    margin: 32rpx 0; /* C17 实测：副行盒底 y168 → 分隔线 y186，线后至标签 y199.5 */
  }
  &__head-valid {
    display: block; /* C17 实测：标签独行、日期与「剩余」同行为下一行 */
  }
  &__head-valid-label { display: block; color: $text-3; font-size: 26rpx; }
  &__head-valid-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-top: 24rpx; /* C17 实测标签盒底 y217.5 → 日期盒 y229.5（12px） */
  }
  &__head-valid-date { color: $text-3; font-size: 36rpx; font-weight: 500; }
  &__head-valid-left { color: $text-2; font-size: 26rpx; }

  &__label {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    /* C17 实测：标签 ink 左缘 x20.5（页边距 16 + 4）、下距至网格 12px */
    padding: 40rpx 40rpx 24rpx;
    text { color: $text-3; font-size: 28rpx; }
  }
  &__label-count { color: $text-2; font-size: 24rpx; }

  /* ③ 网格（与 C15 同构，多了下载角标） */
  &__grid {
    display: flex;
    flex-wrap: wrap;
    gap: 24rpx;
    padding: 0 40rpx; /* C17 水平剖面：单元左缘 x40 图px（设计 20px），与标签同边距，非 $page-pad 16 */
  }
  &__cell {
    position: relative;
    width: calc(50% - 12rpx);
    height: 440rpx;
    border-radius: $radius-card;
    overflow: hidden;
    background-color: $bg-card;
  }
  &__img { width: 100%; height: 100%; display: block; }
  &__dl {
    position: absolute;
    right: 24rpx;
    bottom: 24rpx;
    width: 48rpx;
    height: 48rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  &__more {
    display: block;
    padding: 32rpx $page-pad 0; /* C17 实测：网格底 y1005 → 文本 ink y1024.5（16px + 行盒偏移） */
    text-align: center;         /* C17 实测居中（ink x143.5–231） */
    color: $text-2;
    font-size: 26rpx;
  }

  /* ④ 有效期提示 */
  &__tip {
    display: flex;
    align-items: flex-start;
    gap: 16rpx;
    margin: 52rpx $page-pad 0; /* C17 实测：「查看全部」盒底 y1039 → 提示卡 y1065（26px） */
    padding: 24rpx 32rpx;
    background-color: $bg-card;
    border-radius: $radius-card; /* C17 角部面积法：R≈23 图px = r12(12px) */
  }
  &__tip-text { color: $text-3; font-size: 26rpx; line-height: 1.6; }

  /* ⑤ 评价卡 */
  &__review {
    display: flex;
    align-items: center;
    gap: 20rpx;
    margin: 0 $page-pad;
    padding: 32rpx; /* C17 实测卡高 72（标题+副文，上下 16px） */
    background-color: $bg-card;
    border-radius: $radius-card; /* C17 角部面积法：R≈24 图px = r12(12px) */
  }
  &__review-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
    min-width: 0;
  }
  &__review-title { color: $text-1; font-size: 28rpx; }
  &__review-sub { color: $text-2; font-size: 24rpx; }
}
</style>
