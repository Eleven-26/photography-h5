<template>
  <view class="page-wrap pkg">
    <!-- ============================================================
         套餐详情 · 画板 C02（2026-09-07 Ardot 实测 1:252 一比一还原）
         结构：头图（浮层导航+精选推荐标）→ 标题/价格 → 适合人群 →
               服务内容 → 费用明细 → 交付 → 改期/取消规则 → 作品参考
               → 毛玻璃底栏（选择日期 + 定制需求 双钮）
         数据源：getPackageDetail（biz_package + biz_order_addon 规则）
         金额口径：定金 30% / 尾款基数 / 加选 ¥60/张（全局规则）；
                  前端仅展示推导，联调后以服务端返回字段为准（确认单 B 组）。
         ============================================================ -->

    <!-- 状态栏占位：稿顶部 iPhone 状态栏 44px（C02 y0-44，common.scss .status-bar） -->
    <view class="status-bar" />

    <!-- 导航行（非浮层）：稿 y44-88 底为页面底色，返回 + 居中标题 -->
    <view class="pkg__topbar">
      <view class="pkg__topbar-btn pressable" @click="goBack">
        <AppIcon name="back" :size="44" />
      </view>
      <text class="pkg__topbar-title">套餐详情</text>
      <view class="pkg__topbar-btn" />
    </view>

    <!-- ① 头图 240px + 底部渐变（稿 hero 顶 y98 = 导航底 88 + 10px） -->
    <view class="pkg__hero">
      <image class="pkg__hero-img" :src="pkg.cover_url" mode="aspectFill" />
      <view class="pkg__hero-mask" />
      <!-- 精选推荐金标（biz_package.is_featured，字段名联调核对） -->
      <view v-if="pkg.is_featured !== false" class="pkg__featured-tag">
        <text>精选推荐</text>
      </view>
    </view>

    <!-- ② 标题 + 价格（名 18 Bold / 价 32 Bold + 「/ 次」13 次级） -->
    <view class="pkg__head">
      <text class="pkg__name">{{ pkg.name }}</text>
      <view class="pkg__price-row">
        <text class="pkg__price">¥{{ formatAmount(pkg.base_price) }}</text>
        <text class="pkg__price-unit">/ 次</text>
      </view>
    </view>

    <!-- ③ 适合人群（biz_package.suitable_tags，高亮态数据联调核对） -->
    <template v-if="suitableTags.length">
      <AppSection title="适合人群" />
      <view class="pkg__tags">
        <view
          v-for="(tag, i) in suitableTags"
          :key="i"
          class="pkg__tag"
          :class="{ 'pkg__tag--active': tag.active }"
        >{{ tag.name }}</view>
      </view>
    </template>

    <!-- ④ 服务内容（图标用 C02 原画板矢量 14px；字段名联调核对） -->
    <AppSection title="服务内容" />
    <view class="card pkg__panel">
      <view v-for="(row, i) in serviceRows" :key="i" class="pkg__row">
        <view class="pkg__row-label">
          <!-- C02 实测服务特性图标 14px：clock/pin/image/photo/refresh -->
          <AppIcon :name="row.icon" :size="14" />
          <text>{{ row.label }}</text>
        </view>
        <text class="pkg__row-value">{{ row.value }}</text>
      </view>
    </view>

    <!-- ⑤ 费用明细（定金 30% / 加选 ¥60/张 为全局口径） -->
    <AppSection title="费用明细" />
    <view class="card pkg__panel">
      <view class="pkg__row">
        <text class="pkg__row-label-plain">套餐价格</text>
        <text class="pkg__row-value">¥{{ formatAmount(pkg.base_price) }}</text>
      </view>
      <view class="pkg__row">
        <text class="pkg__row-label-plain">定金 (30%)</text>
        <text class="pkg__row-value">¥{{ formatAmount(depositAmount) }}</text>
      </view>
      <view class="pkg__row">
        <text class="pkg__row-label-plain">尾款</text>
        <text class="pkg__row-value">¥{{ formatAmount(finalAmount) }}</text>
      </view>
      <view class="pkg__row">
        <text class="pkg__row-label-plain">加选精修</text>
        <text class="pkg__row-value">¥60/张</text>
      </view>
    </view>

    <!-- ⑥ 交付 -->
    <AppSection title="交付" />
    <view class="card pkg__panel">
      <view class="pkg__row">
        <text class="pkg__row-label-plain">交付时间</text>
        <text class="pkg__row-value">{{ pkg.delivery_days || 7 }}个工作日</text>
      </view>
      <view class="pkg__row">
        <text class="pkg__row-label-plain">下载有效期</text>
        <text class="pkg__row-value">{{ pkg.download_valid_days || 30 }}天</text>
      </view>
    </view>

    <!-- ⑦ 改期 / 取消规则（三全局规则固定文案；参数读 biz_studio_setting 联调核对） -->
    <AppSection title="改期 / 取消规则" />
    <view class="card pkg__rules">
      <view class="pkg__rule">
        <view class="pkg__rule-dot pkg__rule-dot--green" />
        <text>提前72小时可免费改期</text>
      </view>
      <view class="pkg__rule">
        <view class="pkg__rule-dot pkg__rule-dot--gold" />
        <text>72小时内改期收取20%调度费</text>
      </view>
      <view class="pkg__rule">
        <view class="pkg__rule-dot pkg__rule-dot--red" />
        <text>24小时内不可改期</text>
      </view>
    </view>

    <!-- ⑧ 作品参考（该套餐关联作品，双列网格同 C01/C24 规格） -->
    <AppSection title="作品参考" />
    <AppWorkGrid :items="pkg.works || []" />
    <view class="pkg__bottom-space" />

    <!-- ⑨ 底栏双钮：主「选择日期」→ C03（快捷直约入口，套餐须已上架）+ 次「定制需求」→ C27 -->
    <AppFooter>
      <AppButton flex @click="goDate">选择日期</AppButton>
      <AppButton type="secondary" size="hug" @click="goCustom">定制需求</AppButton>
    </AppFooter>
  </view>
</template>

<script>
/**
 * 套餐详情（画板 C02）· 2026-09-07 对稿还原
 * 数据源：getPackageDetail（biz_package，仅展示；status!==1 时后端拦截）
 * ⚠️ 金额口径：deposit/final 为 30% 规则的展示推导（DECIMAL 元直读，不做
 *    分转换单独运算）；联调后如服务端返回 deposit_amount 等字段则改为直读。
 */
import { getPackageDetail } from '@/api/home'
import { formatAmount } from '@/utils/format'
import AppSection from '@/components/AppSection.vue'
import AppButton from '@/components/AppButton.vue'
import AppFooter from '@/components/AppFooter.vue'
import AppWorkGrid from '@/components/AppWorkGrid.vue'

export default {
  components: { AppSection, AppButton, AppFooter, AppWorkGrid },
  data() {
    return {
      pkg: {},
    }
  },
  computed: {
    /** 定金 = 套餐价 × 30%（展示推导，联调核对服务端字段） */
    depositAmount() {
      const n = Number(this.pkg.base_price) || 0
      return Math.round(n * 0.3 * 100) / 100
    },
    /** 尾款 = 套餐价 − 定金（同上；加选差价由后端并入 final_due，见确认单口径③） */
    finalAmount() {
      const n = Number(this.pkg.base_price) || 0
      return Math.round((n - this.depositAmount) * 100) / 100
    },
    /** 适合人群标签（C02 实测前两项白底高亮；active 字段联调核对） */
    suitableTags() {
      const tags = this.pkg.suitable_tags || ['家庭', '亲子', '纪念日', '孕妇']
      return tags.map((t, i) => ({
        name: typeof t === 'string' ? t : t.name,
        active: typeof t === 'object' ? !!t.active : i < 2,
      }))
    },
    /** 服务内容行（C02 实测五项；字段名联调核对） */
    serviceRows() {
      const p = this.pkg
      return [
        { icon: 'clock-xs', label: '拍摄时长', value: p.duration_hours ? `${p.duration_hours}小时` : '2.5小时' },
        { icon: 'pin-xs', label: '拍摄地点', value: p.location_desc || '越秀公园 / 室内' },
        { icon: 'image-xs', label: '精修数量', value: p.photos_included ? `${p.photos_included}张` : '20张' },
        { icon: 'photo-xs', label: '原片数量', value: p.raw_photos ? `${p.raw_photos}张` : '100+张' },
        { icon: 'refresh-xs', label: '修改次数', value: p.revisions != null ? `${p.revisions}次` : '2次' },
      ]
    },
  },
  onLoad(options) {
    this.loadDetail(options && options.id)
  },
  methods: {
    formatAmount,
    async loadDetail(id) {
      try {
        const res = await getPackageDetail(id)
        this.pkg = res || {}
      } catch (e) {
        // request 层已 toast；保留空态，用户可返回
      }
      // 演示兜底：后端未联调时用画板导出原图占位（联调后移除）
      if (!this.pkg.cover_url) {
        this.pkg = {
          ...this.pkg,
          id: this.pkg.id || id || 'demo-p2',
          name: this.pkg.name || '全套精修套餐',
          base_price: this.pkg.base_price || 2680,
          cover_url: '/static/img/pkg-2.jpg',
          works: ['/static/img/work-2.jpg', '/static/img/work-3.jpg', '/static/img/work-4.jpg', '/static/img/work-5.jpg'].map((u, i) => ({ id: `demo-g${i}`, cover_url: u })),
        }
      }
    },
    goBack() {
      const pages = getCurrentPages()
      if (pages.length > 1) uni.navigateBack()
      else uni.reLaunch({ url: '/pages/index/index' })
    },
    /** 快捷直约：仅已上架完整套餐可进（口径②，后端 BookingSubmit 双重校验） */
    goDate() {
      uni.navigateTo({ url: `/pages/booking/date?package_id=${this.pkg.id}` })
    },
    goCustom() { uni.navigateTo({ url: '/pages/custom/request' }) },
  },
}
</script>

<style lang="scss" scoped>
.pkg {
  /* ① 头图 240px；稿 hero 顶 y98 = 导航底 88 + 10px */
  &__hero {
    position: relative;
    height: 480rpx;
    margin-top: 20rpx;
    background-color: $bg-card;
  }
  &__hero-img { position: absolute; inset: 0; width: 100%; height: 100%; }
  &__hero-mask {
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 0.5) 100%);
  }
  /* 导航行：稿 y44-88 为常规流式行（非浮层，底=页面底色），行高 44px */
  &__topbar {
    position: relative;
    height: $nav-height;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24rpx; /* 稿返回箭头中心 ≈34.5px */
  }
  &__topbar-btn {
    width: 88rpx;
    height: 88rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: $radius-cell;
  }
  &__topbar-title { color: $text-1; font-size: $fs-xl; font-weight: 700; } /* 稿 20px（原 16px 偏小） */
  /* 精选推荐金标：稿实测底 #D9A735（$gold）+ 白字 11 Medium r999，
     尺寸 x16.5-75 / y301-324（高 23px），头图左下 16px */
  &__featured-tag {
    position: absolute;
    left: 32rpx;
    bottom: 24rpx;
    padding: 10rpx 16rpx; /* 稿 高 23px */
    background-color: $gold;
    border-radius: $radius-btn;
    text { color: $text-1; font-size: $fs-xs; font-weight: 500; }
  }

  /* ② 标题 + 价格 */
  &__head {
    display: flex;
    flex-direction: column;
    gap: 12rpx;
    padding: 24rpx $page-pad;
  }
  &__name { color: $text-1; font-size: 36rpx; font-weight: 700; }
  &__price-row { display: flex; align-items: baseline; gap: 12rpx; }
  &__price {
    color: $text-1;
    font-size: 64rpx;
    font-weight: 700;
    font-family: $font-family-num;
  }
  &__price-unit { color: $text-2; font-size: 26rpx; }

  /* ③ 适合人群：wrap 胶囊（间距 8px，选中白底 / 未选描边） */
  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 16rpx;
    padding: 0 $page-pad;
  }
  &__tag {
    display: inline-flex;
    align-items: center;
    height: 80rpx; /* 稿实测胶囊 y494-533 高 40px（原 72rpx=36px） */
    padding: 0 32rpx;
    border: 2rpx solid $border-2;
    border-radius: $radius-btn;
    color: $text-3;
    font-size: $fs-md;
    &--active {
      background-color: $text-1;
      border-color: $text-1;
      color: #17181A;
    }
  }

  /* ④⑤⑥ 信息卡：r16 pad 16/10，行分隔线 #2B2C30
     圆角按稿取 32rpx（角部面积法回读服务内容卡 15.53 ≈ r16；.card 默认 24rpx 偏小） */
  &__panel {
    margin: 0 $page-pad;
    padding: 20rpx $card-pad;
    border-radius: 32rpx;
  }
  &__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20rpx 0;
    border-bottom: 2rpx solid $border-1;
    &:last-child { border-bottom: none; }
  }
  &__row-label {
    display: flex;
    align-items: center;
    gap: 12rpx;
    color: $text-2;
    font-size: $fs-md;
  }
  &__row-label-plain { color: $text-2; font-size: $fs-md; }
  &__row-value { color: $text-1; font-size: $fs-md; font-weight: 500; text-align: right; }

  /* ⑦ 改期/取消规则：彩点 + 13px 白字 */
  &__rules {
    margin: 0 $page-pad;
    padding: 32rpx $card-pad;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
  }
  &__rule {
    display: flex;
    align-items: center;
    gap: 16rpx;
    padding: 12rpx 0;
    color: $text-1;
    font-size: 26rpx;
  }
  &__rule-dot {
    width: 24rpx;
    height: 24rpx;
    border-radius: 50%;
    flex-shrink: 0;
    &--green { background-color: #9FCB87; }
    &--gold { background-color: $gold; }
    &--red { background-color: #E37B76; }
  }

  &__bottom-space { height: 200rpx; }
}
</style>
