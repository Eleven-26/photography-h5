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

    <!-- 套餐不存在 / 已下架 / id 非法：整页让位给空态 + 返回入口，
         避免停在"半张空白页"让人以为页面坏了（后端 errs 已给出「套餐不存在」文案） -->
    <view v-if="notFound" class="pkg__empty">
      <AppEmpty text="套餐不存在或已下架" />
      <view class="pkg__empty-btn">
        <AppButton block @click="goBack">返回</AppButton>
      </view>
    </view>

    <template v-else>
    <!-- ① 头图 240px + 底部渐变（稿 hero 顶 y98 = 导航底 88 + 10px） -->
    <view class="pkg__hero">
      <image class="pkg__hero-img" :src="pkg.cover" mode="aspectFill" />
      <view class="pkg__hero-mask" />
      <!-- 原「精选推荐」金标已移除：biz_package 无对应字段（2026-09-14 核对 DDL）。
           此前读的是臆想的 is_featured（后端不返回 → undefined → 判断恒真），
           属"看着像真数据其实写死的假元素"，故去掉而不是换成别的硬编码。 -->
    </view>

    <!-- ② 标题 + 价格（名 18 Bold / 价 32 Bold + 「/ 次」13 次级） -->
    <view class="pkg__head">
      <text class="pkg__name">{{ pkg.name }}</text>
      <view class="pkg__price-row">
        <text class="pkg__price">¥{{ formatAmount(pkg.base_price) }}</text>
        <text class="pkg__price-unit">/ 次</text>
      </view>
    </view>

    <!-- ③ 适合人群（biz_package.suitable_for，逗号分隔字符串；前两项为设计稿高亮态） -->
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

    <!-- ⑤ 费用明细（金额一律读 biz_package 落库值：base_price / deposit_amt / addon_unit_price） -->
    <AppSection title="费用明细" />
    <view class="card pkg__panel">
      <view class="pkg__row">
        <text class="pkg__row-label-plain">套餐价格</text>
        <text class="pkg__row-value">¥{{ formatAmount(pkg.base_price) }}</text>
      </view>
      <view class="pkg__row">
        <text class="pkg__row-label-plain">定金（{{ depositPercent }}%）</text>
        <text class="pkg__row-value">¥{{ formatAmount(depositAmount) }}</text>
      </view>
      <view class="pkg__row">
        <text class="pkg__row-label-plain">尾款</text>
        <text class="pkg__row-value">¥{{ formatAmount(finalAmount) }}</text>
      </view>
      <view class="pkg__row">
        <text class="pkg__row-label-plain">加选精修</text>
        <text class="pkg__row-value">{{ pkg.addon_unit_price > 0 ? `¥${formatAmount(pkg.addon_unit_price)}/张` : '—' }}</text>
      </view>
    </view>

    <!-- ⑥ 交付（字段对齐 biz_package.delivery_days / download_days；原文案写的
         download_valid_days 是臆想字段，后端不返回 → 恒显 30 天） -->
    <AppSection title="交付" />
    <view class="card pkg__panel">
      <view class="pkg__row">
        <text class="pkg__row-label-plain">交付时间</text>
        <text class="pkg__row-value">{{ pkg.delivery_days || 7 }}个工作日</text>
      </view>
      <view class="pkg__row">
        <text class="pkg__row-label-plain">下载有效期</text>
        <text class="pkg__row-value">{{ pkg.download_days || 30 }}天</text>
      </view>
    </view>

    <!-- ⑦ 改期 / 取消规则（阈值读 biz_studio_setting.reschedule_*，不再写死 72/20%/24） -->
    <AppSection title="改期 / 取消规则" />
    <view class="card pkg__rules">
      <view class="pkg__rule">
        <view class="pkg__rule-dot pkg__rule-dot--green" />
        <text>提前{{ policy.freeHours }}小时可免费改期</text>
      </view>
      <view class="pkg__rule">
        <view class="pkg__rule-dot pkg__rule-dot--gold" />
        <text>{{ policy.freeHours }}小时内改期收取{{ policy.feeRate }}%调度费</text>
      </view>
      <view class="pkg__rule">
        <view class="pkg__rule-dot pkg__rule-dot--red" />
        <text>{{ policy.minHours }}小时内不可改期</text>
      </view>
    </view>

    <!-- ⑧ 作品参考（该套餐关联作品）—— biz_package 当前**无「关联作品」字段**，
         后端也未提供「按套餐过滤作品」的查询，故此处恒为空 + 空态文案，
         不再用画板图冒充真实作品（2026-09-14 核对 DDL 后的决定）。 -->
    <AppSection title="作品参考" />
    <AppWorkGrid :items="pkg.works || []" />
    <AppEmpty v-if="!(pkg.works || []).length" text="暂无关联作品" />
    <view class="pkg__bottom-space" />

    <!-- ⑨ 底栏双钮：主「选择日期」→ C03（快捷直约入口，套餐须已上架）+ 次「定制需求」→ C27 -->
    <AppFooter>
      <AppButton flex @click="goDate">选择日期</AppButton>
      <AppButton type="secondary" size="hug" @click="goCustom">定制需求</AppButton>
    </AppFooter>
    </template>
  </view>
</template>

<script>
/**
 * 套餐详情（画板 C02）· 2026-09-07 对稿还原
 * 数据源：getPackageDetail（biz_package，仅展示；已下架/不存在由后端拦截）
 *
 * ⚠️ 2026-09-14 字段对齐修正：本页原来读的是一批**后端不存在的臆想字段**——
 *    cover_url / suitable_tags / duration_hours / location_desc / raw_photos /
 *    revisions / download_valid_days / is_featured / works。
 *   真实字段：cover / suitable_for（逗号分隔串）/ shoot_hours / locations（JSON 数组）/
 *   raw_count / revision_count / download_days；且**没有** is_featured，也**没有**
 *   套餐↔作品关联。金额一律读落库值（base_price / deposit_amt / addon_unit_price），
 *   不再由前端自编 30% 规则。
 */
import { getPackageDetail } from '@/api/package'
import { getStudioInfo } from '@/api/studio'
import { formatAmount } from '@/utils/format'
import { allowPlaceholder } from '@/utils/demo'
import AppSection from '@/components/AppSection.vue'
import AppButton from '@/components/AppButton.vue'
import AppFooter from '@/components/AppFooter.vue'
import AppWorkGrid from '@/components/AppWorkGrid.vue'
import AppEmpty from '@/components/AppEmpty.vue'

export default {
  components: { AppSection, AppButton, AppFooter, AppWorkGrid, AppEmpty },
  data() {
    return {
      pkg: {},
      /** 不存在 / 已下架 / id 非法 → 整页空态，不留半张空白页 */
      notFound: false,
      /** 改期政策（biz_studio_setting.reschedule_*）；取不到就用后端同款默认值 */
      policy: { freeHours: 72, minHours: 24, feeRate: 20 },
    }
  },
  computed: {
    /**
     * 定金：优先读落库值 biz_package.deposit_amt（= 基础价 × 比例，与下单口径同源）；
     * 仅在缺失时才按比例推导，避免前端自算与后端算出来的数不一致。
     */
    depositAmount() {
      const amt = Number(this.pkg.deposit_amt)
      if (amt > 0) return amt
      const n = Number(this.pkg.base_price) || 0
      const rate = Number(this.pkg.deposit_rate)
      // deposit_rate 在 DDL 里是「百分数」（如 30.00），异常值退回 30%
      const pct = rate > 0 && rate <= 100 ? rate : 30
      return Math.round(n * (pct / 100) * 100) / 100
    },
    /** 尾款 = 套餐价 − 定金（加选差价由后端并入 final_due，见确认单口径③） */
    finalAmount() {
      const n = Number(this.pkg.base_price) || 0
      return Math.round((n - this.depositAmount) * 100) / 100
    },
    /** 定金百分比：按落库金额反推，绕开 deposit_rate 的单位歧义（DDL 是百分数、PC 表单当小数） */
    depositPercent() {
      const base = Number(this.pkg.base_price) || 0
      const amt = Number(this.pkg.deposit_amt) || 0
      if (base > 0 && amt > 0) return Math.round((amt / base) * 100)
      return 30
    },
    /** 适合人群：biz_package.suitable_for 是**逗号分隔字符串**（不是数组），前两项保留高亮态 */
    suitableTags() {
      const raw = this.pkg.suitable_for
      if (!raw) return []
      return String(raw)
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((name, i) => ({ name, active: i < 2 }))
    },
    /** 服务内容行（五项全部对齐 biz_package 真实列，无值显示 — 而不编造默认值） */
    serviceRows() {
      const p = this.pkg
      return [
        { icon: 'clock-xs', label: '拍摄时长', value: p.shoot_hours ? `${p.shoot_hours}小时` : '—' },
        { icon: 'pin-xs', label: '拍摄地点', value: this.packageLocations || '拍摄时商定' },
        { icon: 'image-xs', label: '精修数量', value: p.photos_included != null ? `${p.photos_included}张` : '—' },
        { icon: 'photo-xs', label: '原片数量', value: p.raw_count ? `${p.raw_count}张` : '—' },
        { icon: 'refresh-xs', label: '修改次数', value: p.revision_count != null ? `${p.revision_count}次` : '—' },
      ]
    },
    /** biz_package.locations 是 JSON 数组 [{name,extra_fee,is_default}]，取出名字拼展示串 */
    packageLocations() {
      const raw = this.pkg.locations
      if (!raw) return ''
      try {
        const arr = JSON.parse(raw)
        if (!Array.isArray(arr)) return ''
        return arr
          .map((x) => (typeof x === 'string' ? x : x && x.name))
          .filter(Boolean)
          .join(' / ')
      } catch {
        return ''
      }
    },
  },
  onLoad(options) {
    this.loadDetail(Number(options && options.id) || 0)
    this.loadPolicy()
  },
  methods: {
    formatAmount,
    async loadDetail(id) {
      if (!id) {
        this.notFound = true
        return
      }
      try {
        const res = await getPackageDetail(id)
        this.pkg = res || {}
      } catch {
        // request 层已 toast 后端文案（如「套餐不存在」）→ 落空态，不再冒充成演示套餐
        this.notFound = true
      }
      this.applyPlaceholder()
    },
    /**
     * 占位兜底：**仅 VITE_ALLOW_DEMO=true 时**生效（见 utils/demo.js）。
     * ⚠️ 绝不伪造 id —— 原来会把 id 兜成字符串 'demo-p2'，点「选择日期」带着它请求真接口，
     * 后端路径参数解析失败直接 400。这正是"点套餐详情报错"的成因之一。
     */
    applyPlaceholder() {
      if (!allowPlaceholder() || this.pkg.id) return
      this.pkg = {
        ...this.pkg,
        name: this.pkg.name || '全套精修套餐',
        base_price: this.pkg.base_price || 2680,
        cover: this.pkg.cover || '/static/img/pkg-2.jpg',
      }
    },
    /** 改期政策：阈值展示口径与后端 domain.ReschedulePolicy 一致 */
    async loadPolicy() {
      try {
        const st = await getStudioInfo()
        if (st) {
          this.policy = {
            freeHours: st.reschedule_free_hours != null ? st.reschedule_free_hours : 72,
            minHours: st.reschedule_min_hours != null ? st.reschedule_min_hours : 24,
            feeRate: st.reschedule_fee_rate != null ? st.reschedule_fee_rate : 20,
          }
        }
      } catch {
        // 静默：政策拿不到就按默认值展示，不阻塞套餐详情
      }
    },
    goBack() {
      const pages = getCurrentPages()
      if (pages.length > 1) uni.navigateBack()
      else uni.reLaunch({ url: '/pages/index/index' })
    },
    /** 快捷直约：仅已上架完整套餐可进（口径②，后端 BookingSubmit 双重校验） */
    goDate() {
      if (!this.pkg.id) {
        uni.showToast({ title: '套餐信息未加载', icon: 'none' })
        return
      }
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
  /* 套餐不存在 / 已下架时的整页空态（模板 v-if="notFound"）。
     ⚠️ 原「精选推荐金标」(&__featured-tag) 样式已随该元素一并移除：
     biz_package 无对应字段，读臆想的 is_featured 会恒为真，属写死的假元素。 */
  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 40rpx;
    padding: 160rpx $page-pad 0;
  }
  &__empty-btn { width: 100%; }

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
