<template>
  <view class="page-wrap page-final">
    <!-- 稿顶部 Iphone 状态栏占位（375×44 @(0,0)），头部容器从 y44 起 -->
    <view class="status-bar" />
    <AppNavBar title="确认成片" />

    <!-- ① 数量头：24 张成片 · 最终成片 V2（C15 实测 32px 数字混排） -->
    <view class="page-final__head">
      <text class="page-final__head-num">{{ items.length }}</text>
      <text class="page-final__head-unit">张成片</text>
      <text class="page-final__head-ver">{{ versionLabel }}</text>
    </view>

    <!-- ② 成片双列网格（C15 实测 165×220 无角标） -->
    <view class="page-final__grid">
      <view
        v-for="(item, index) in previewItems"
        :key="item.id || index"
        class="page-final__cell pressable"
        @click="preview(index)"
      >
        <image class="page-final__img" :src="item.url" mode="aspectFill" lazy-load />
      </view>
    </view>
    <text class="page-final__more" @click="preview(0)">查看全部 {{ items.length }} 张</text>

    <!-- ③ 费用明细卡（C15 实测 #1D1E22 r16，行 14px，待付尾款 18px 金） -->
    <view class="page-final__label"><text>费用明细</text></view>
    <view class="page-final__fee">
      <view class="page-final__fee-row">
        <text class="page-final__fee-label">套餐包含</text>
        <text class="page-final__fee-val">{{ quota }}张精修</text>
      </view>
      <view v-if="extraCount > 0" class="page-final__fee-row">
        <text class="page-final__fee-label">加选</text>
        <text class="page-final__fee-val">{{ extraCount }}张 × ¥{{ extraUnit }}</text>
      </view>
      <view v-if="extraCount > 0" class="page-final__fee-row">
        <text class="page-final__fee-label">加选费用</text>
        <text class="page-final__fee-val">{{ formatAmount(extraFee) }}</text>
      </view>
      <view class="page-final__fee-row">
        <text class="page-final__fee-label">已付定金</text>
        <text class="page-final__fee-val">{{ formatAmount(depositAmt) }}</text>
      </view>
      <view class="page-final__fee-row">
        <text class="page-final__fee-label">待付尾款</text>
        <text class="page-final__fee-due">{{ formatAmount(finalDue) }}</text>
      </view>
    </view>

    <!-- ④ 暖棕提示卡（C15 实测 #C29F77@14% + 金盾图标） -->
    <view class="page-final__warn">
      <!-- C15 实测 18px 金色提示图标 -->
      <AppIcon name="alert-gold" :size="18" />
      <view class="page-final__warn-body">
        <text class="page-final__warn-line">确认成片后进入尾款支付。</text>
        <text class="page-final__warn-line">摄影师确认收到尾款后开放高清成片下载。</text>
      </view>
    </view>

    <!-- ⑥ 申请最后修改入口（C15 实测卡：图标 + 标题 + 次数规则 + 箭头，y1304–1392） -->
    <view class="page-final__label"><text>还有修改需求？</text></view>
    <view class="page-final__revise pressable" @click="onRevise">
      <!-- C15 实测 20px 禁止图标（确认后不可再改） -->
      <AppIcon name="forbid" :size="20" />
      <view class="page-final__revise-main">
        <text class="page-final__revise-title">申请最后修改</text>
        <text class="page-final__revise-desc">规则内修改次数：已使用 {{ reviseUsed }}/{{ reviseQuota }} 次{{ reviseLeft > 0 ? `，剩余 ${reviseLeft} 次` : '' }} · 不额外收费 · 可能延长交付1-2天</text>
      </view>
      <AppIcon name="chevron-right-sm" :size="15" />
    </view>

    <!-- ⑤ 绿点提示卡（C15 实测 #1D1E22 r12 + 绿盾 #9FCB87）
         注：C15 稿内该卡位于「申请最后修改」卡之后（y1410–1476） -->
    <view class="page-final__tip">
      <!-- C15 实测 13px 绿盾图标 -->
      <AppIcon name="shield-green" :size="13" />
      <text class="page-final__tip-text">确认成片表示你对精修结果满意。确认后将无法再修改成片。</text>
    </view>

    <!-- ⑦ 毛玻璃底栏：block 白胶囊（C15 实测 fill_container） -->
    <AppFooter>
      <AppButton block :loading="submitting" @click="onConfirm">确认成片，进入尾款</AppButton>
    </AppFooter>
  </view>
</template>

<script>
/**
 * C15 确认成片（画板 1:1191）
 * 数据源：biz_delivery（stage 4-待确认交付）+ biz_delivery_item（kind=3 精修成品）
 *        套餐口径（张数/单价/修改次数）取 biz_package；金额取 biz_order 快照
 * 金额纪律：待付尾款 = 后端 order.final_amt（加选差价已自动并入，口径③：差价无单独确认环节）
 *   前端费用明细仅展示拆解（final_amt = 尾款基数 + extra_fee），不做加法决策
 * 确认 → confirmDelivery（/delivery/confirm/:delivery_id）→ 跳 C16 支付尾款
 * 「申请最后修改」次数：quota 取 pkg.revision_count，已用取 delivery.retouch_version - 1（精修轮次）
 */
import { getDeliveryDetail, getDeliveryItems, confirmDelivery } from '@/api/delivery'
import { getOrderDetail } from '@/api/order'
import { getPackageDetail } from '@/api/package'
import { formatAmount } from '@/utils/format'

export default {
  data() {
    return {
      orderId: null,
      deliveryId: null,
      versionLabel: '',
      quota: 0,            // biz_package.photos_included
      extraUnit: 0,        // biz_package.addon_unit_price
      extraCount: 0,       // biz_delivery.extra_selected_count
      extraFee: 0,         // biz_delivery.extra_fee
      finalDue: 0,         // biz_order.final_amt
      depositAmt: 0,       // biz_order.deposit_amt
      reviseUsed: 0,       // 已用修改次数（delivery.retouch_version - 1）
      reviseQuota: 0,      // biz_package.revision_count
      items: [],
      submitting: false,
    }
  },
  computed: {
    previewItems() {
      return this.items.slice(0, 6) /* 稿面展示 6 张，其余走「查看全部」 */
    },
    reviseLeft() {
      return Math.max(0, this.reviseQuota - this.reviseUsed)
    },
  },
  onLoad(query) {
    this.orderId = query.orderId || query.id
    this.fetchData()
  },
  methods: {
    formatAmount,
    async fetchData() {
      try {
        /* /delivery/detail/:id 的 :id 是 order_id，返回 { delivery, items } */
        const detail = await getDeliveryDetail(this.orderId)
        const d = (detail && detail.delivery) || null
        this.deliveryId = d && d.id
        if (d) {
          this.extraCount = Number(d.extra_selected_count || 0)
          this.extraFee = Number(d.extra_fee || 0)
          const ver = Number(d.retouch_version || 1)
          this.versionLabel = `最终成片 V${ver}`
          this.reviseUsed = Math.max(0, ver - 1)
        }
        /* 订单快照：尾款 / 定金 / 套餐 ID */
        const orderRes = await getOrderDetail(this.orderId).catch(() => null)
        const order = (orderRes && orderRes.order) || {}
        this.finalDue = Number(order.final_amt || 0)
        this.depositAmt = Number(order.deposit_amt || 0)
        /* 套餐口径：包含精修张数 / 加片单价 / 修改次数 */
        if (order.package_id) {
          const pkg = await getPackageDetail(order.package_id).catch(() => null)
          if (pkg) {
            this.quota = Number(pkg.photos_included || 0)
            this.extraUnit = Number(pkg.addon_unit_price || 0)
            this.reviseQuota = Number(pkg.revision_count || 0)
          }
        }
        const res = await getDeliveryItems(this.orderId)
        const list = Array.isArray(res) ? res : (res && res.list) || []
        /* 成片网格只含精修成品（kind=3） */
        this.items = list
          .filter((it) => Number(it.kind) === 3)
          .map((it) => ({ id: it.id, url: it.url || '' }))
      } catch (e) {
        /* request 层已 toast；不注入演示成片 */
        this.items = []
      }
    },
    preview(index) {
      const urls = this.items.map((it) => it.url).filter(Boolean)
      if (!urls.length) return
      uni.previewImage({ urls, current: urls[index] })
    },
    /** 申请最后修改：进入修图反馈页（次数规则以摄影师端审核为准，此处仅跳转） */
    onRevise() {
      if (this.reviseLeft <= 0) {
        uni.showToast({ title: '修改次数已用完，可联系摄影师协商', icon: 'none' })
        return
      }
      uni.navigateTo({ url: `/pages/select/feedback?orderId=${this.orderId || ''}` })
    },
    async onConfirm() {
      this.submitting = true
      try {
        await confirmDelivery(this.deliveryId)
        /* 确认成片 → 尾款支付（C16）；差价已并入尾款，一次结清 */
        uni.redirectTo({ url: `/pages/pay/final?orderId=${this.orderId}` })
      } catch (e) {
        /* request 层已 toast */
      } finally {
        this.submitting = false
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.page-final {
  &__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between; /* C15 实测「最终成片 V2」贴右（ink x357） */
    gap: 8rpx;
    padding: 32rpx $page-pad 24rpx; /* C15 实测：数字盒 y104 起，网格 y148 */
  }
  &__head-num { color: $text-1; font-size: 64rpx; font-weight: 600; line-height: 1; } /* C15 实测数字 ink y112–134 */
  &__head-unit { color: $text-2; font-size: 32rpx; }
  &__head-ver { color: $text-2; font-size: 26rpx; margin-left: 16rpx; }

  /* ② 网格 */
  &__grid {
    display: flex;
    flex-wrap: wrap;
    gap: 24rpx;
    padding: 0 $page-pad;
  }
  &__cell {
    width: calc(50% - 12rpx);
    height: 440rpx;
    border-radius: $radius-card;
    overflow: hidden;
    background-color: $bg-card;
  }
  &__img { width: 100%; height: 100%; display: block; }
  &__more {
    display: block;
    padding: 50rpx $page-pad 0; /* C15 实测：网格底 y832 → 文本 ink y860.5（25px + 行盒偏移） */
    text-align: center;         /* C15 实测居中（ink x143.5–231） */
    color: $text-2;
    font-size: 26rpx;
  }

  &__label {
    /* C15 实测：标签 ink 左缘 x21（页边距 16 + 4）、上距 28px、下距 10px（原 40rpx 依赖全局页边距） */
    padding: 56rpx 40rpx 20rpx;
    color: $text-3;
    font-size: 26rpx; /* C15 实测费用明细标签 13px */
  }

  /* ③ 费用明细卡 */
  &__fee {
    margin: 0 $page-pad; /* C15 实测卡 x16–359（页边距 16） */
    padding: 24rpx 32rpx; /* C15 实测：卡高 241，行距 43（行内距 12） */
    background-color: $bg-card;
    border-radius: 32rpx; /* C15 角部面积法：R≈31 图px = r16(≈15.5px)，非 r12 */
  }
  &__fee-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24rpx 0; /* C15 实测行高 43px */
  }
  &__fee-label { color: $text-2; font-size: 28rpx; }
  &__fee-val { color: $text-1; font-size: 28rpx; }
  &__fee-due { color: $gold; font-size: 36rpx; font-weight: 600; }

  /* ④ 暖棕提示卡 */
  &__warn {
    display: flex;
    gap: 20rpx;
    margin: 8rpx $page-pad 0; /* C15 实测：费用卡底 y1172 → 提示卡 y1177（4–5px），卡 x16–359 */
    padding: 24rpx 32rpx;
    background-color: $warn-bg; /* C15 实测 #C29F77@14% */
    border-radius: $radius-card; /* C15 角部面积法：R≈23 图px = r12(12px) */
  }
  &__warn-body {
    display: flex;
    flex-direction: column;
    gap: 6rpx;
  }
  &__warn-line { color: $text-1; font-size: 26rpx; line-height: 1.6; }

  /* ⑤ 绿点提示卡 */
  &__tip {
    display: flex;
    align-items: flex-start;
    gap: 16rpx;
    margin: 36rpx $page-pad 0; /* C15 实测：修改卡底 y1392 → 提示卡 y1410（18px），卡 x16–359 */
    padding: 24rpx 32rpx;
    background-color: $bg-card;
    border-radius: $radius-card; /* C15 角部面积法：R≈24 图px = r12(12px) */
  }
  &__tip-text { color: $text-3; font-size: 26rpx; line-height: 1.6; }

  /* ⑥ 申请最后修改卡 */
  &__revise {
    display: flex;
    align-items: center;
    gap: 20rpx;
    margin: 0 $page-pad; /* C15 实测卡 x16–359（页边距 16） */
    padding: 28rpx 32rpx; /* C15 实测卡高 88（标题+两行说明，上下 14px） */
    background-color: $bg-card;
    border-radius: $radius-card; /* C15 角部面积法：R≈23 图px = r12(12px) */
  }
  &__revise-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6rpx;
    min-width: 0;
  }
  &__revise-title { color: $text-1; font-size: 28rpx; }
  &__revise-desc { color: $text-2; font-size: 24rpx; line-height: 1.5; }
}
</style>
