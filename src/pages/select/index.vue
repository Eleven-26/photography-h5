<template>
  <view class="page-wrap page-select">
    <!-- 稿顶部 Iphone 状态栏占位（375×44 @(0,0)），头部容器从 y44 起 -->
    <view class="status-bar" />
    <AppNavBar title="在线选片" />

    <!-- ① 计数栏：左「已选 / 套餐张数」，右「加选 n张 + 差价」（C13 实测 343 行，pad 16/12） -->
    <view class="page-select__counter">
      <view class="page-select__count">
        <text class="page-select__count-num">{{ selectedIds.length }}</text>
        <text class="page-select__count-unit"> / {{ quota }}张</text>
      </view>
      <view class="page-select__extra">
        <text class="page-select__extra-label">加选 {{ extraCount }}张</text>
        <text class="page-select__extra-fee">{{ extraCount > 0 ? '+' + formatAmount(extraCount * extraUnit) : '¥0' }}</text>
      </view>
    </view>

    <!-- ② 筛选页签：全部 / 已选 n（C13 实测 15px，选中白、未选灰） -->
    <view class="page-select__tabs">
      <text
        class="page-select__tab"
        :class="{ 'page-select__tab--on': tab === 'all' }"
        @click="tab = 'all'"
      >全部</text>
      <text
        class="page-select__tab"
        :class="{ 'page-select__tab--on': tab === 'picked' }"
        @click="tab = 'picked'"
      >已选 {{ selectedIds.length }}</text>
    </view>

    <!-- ③ 样片双列网格：165×220（330×440rpx）间距 12px；已选金圆勾 20×20 右上（C13 实测）
         外层为通栏 #1D1E22 选片底板（C13 实测 y214–707，左右通栏 + 上下内距 20/16） -->
    <view class="page-select__board">
      <view class="page-select__grid">
        <view
          v-for="(item, index) in visibleItems"
          :key="item.id || index"
          class="page-select__cell pressable"
          @click="toggle(item)"
        >
          <image
            class="page-select__img"
            :src="item.url"
            mode="aspectFill"
            lazy-load
          />
          <view v-if="isSelected(item)" class="page-select__pick">
            <view class="page-select__pick-tick" />
          </view>
        </view>
      </view>
    </view>
    <AppEmpty v-if="!visibleItems.length" text="样片上传中，请稍候" />

    <!-- ④ 毛玻璃底栏：左两行汇总 + hug 白胶囊「确认提交」（C13 实测 0.96 模糊底） -->
    <AppFooter>
      <view class="page-select__summary">
        <text class="page-select__summary-line1">已选 {{ selectedIds.length }}张{{ extraCount > 0 ? `（含加选${extraCount}张）` : '' }}</text>
        <text class="page-select__summary-fee">{{ extraCount > 0 ? '+' + formatAmount(extraCount * extraUnit) : '按套餐张数，无加选' }}</text>
      </view>
      <AppButton hug :loading="submitting" @click="onSubmit">确认提交</AppButton>
    </AppFooter>
  </view>
</template>

<script>
/**
 * C13 在线选片（画板 1:1619）
 * 数据源：biz_delivery + biz_delivery_item（后端无独立选片表）
 *   - 勾选即选片：item.is_selected；超套餐张数 = 加选，差价由后端按单价计算写入 extra_fee
 *   - 套餐张数/加片单价取 biz_package：photos_included（包含精修张数）+ addon_unit_price（加片单价），
 *     与后端 ClientSelectPhotos → domain.ExtraRetouchFee 的口径一致
 *   - 只列 kind=1（样片）明细参与勾选；已选/精修成品（kind 2/3）不进选片网格
 *   - 业务口径③：选片超时【不】自动确认，本页无倒计时压力文案
 *   - 确认提交 → submitSelect（/delivery/select 已确认路由）
 * 金额纪律：加选差价仅做「张数 × 单价」的展示预览，提交后以后端返回为准，前端不落库
 */
import { getDeliveryDetail, getDeliveryItems, submitSelect } from '@/api/delivery'
import { getOrderDetail } from '@/api/order'
import { getPackageDetail } from '@/api/package'
import { formatAmount } from '@/utils/format'

export default {
  data() {
    return {
      orderId: null,
      deliveryId: null,
      quota: 0,           // 套餐包含精修张数（biz_package.photos_included）
      extraUnit: 0,       // 加选单价（biz_package.addon_unit_price）
      tab: 'all',
      items: [],          // { id, url, is_selected }
      selectedIds: [],    // 已勾选样片 ID（勾选即写，提交时整包上报）
      submitting: false,
    }
  },
  computed: {
    /** 加选张数 = 超出套餐部分（预览值，提交时以后端 extra_selected_count 为准） */
    extraCount() {
      return Math.max(0, this.selectedIds.length - this.quota)
    },
    /** 页签过滤：全部 / 已选 */
    visibleItems() {
      return this.tab === 'picked' ? this.items.filter((it) => this.isSelected(it)) : this.items
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
        /* 套餐张数/加片单价：订单 → 套餐（biz_package），与后端计价口径同源 */
        const orderRes = await getOrderDetail(this.orderId).catch(() => null)
        const pkgId = orderRes && orderRes.order && orderRes.order.package_id
        if (pkgId) {
          const pkg = await getPackageDetail(pkgId).catch(() => null)
          if (pkg) {
            this.quota = Number(pkg.photos_included || 0)
            this.extraUnit = Number(pkg.addon_unit_price || 0)
          }
        }
        const res = await getDeliveryItems(this.orderId)
        const list = Array.isArray(res) ? res : (res && res.list) || []
        /* 选片网格只含样片（kind=1） */
        this.items = list
          .filter((it) => Number(it.kind) === 1)
          .map((it) => ({ id: it.id, url: it.url || '', is_selected: Number(it.is_selected) === 1 }))
        this.selectedIds = this.items.filter((it) => it.is_selected).map((it) => it.id)
      } catch (e) {
        /* request 层已 toast；不注入演示样片（避免把接口异常伪装成「有片可选」） */
        this.items = []
        this.selectedIds = []
      }
    },
    isSelected(item) {
      return this.selectedIds.includes(item.id)
    },
    /** 勾选/取消：取消已选加选张不限制（客户可反复调整，提交时后端校验与计价） */
    toggle(item) {
      const i = this.selectedIds.indexOf(item.id)
      if (i >= 0) this.selectedIds.splice(i, 1)
      else this.selectedIds.push(item.id)
    },
    async onSubmit() {
      if (!this.selectedIds.length) {
        uni.showToast({ title: '请先选择照片', icon: 'none' })
        return
      }
      this.submitting = true
      try {
        await submitSelect({ delivery_id: this.deliveryId, item_ids: this.selectedIds })
        uni.showToast({ title: '选片已提交', icon: 'success' })
        /* 有加选时差价自动计入尾款（口径：无单独差价确认环节），确认后回订单详情 */
        setTimeout(() => uni.redirectTo({ url: `/pages/order/detail?id=${this.orderId}` }), 600)
      } catch (e) {
        /* request 层已 toast；勾选结果保留在 selectedIds，不清空（错误可恢复纪律） */
      } finally {
        this.submitting = false
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.page-select {
  &__counter {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 32rpx $page-pad; /* C13 实测 pad 16/16（计数区 y88–157） */
    border-bottom: 1rpx solid $border-1; /* C13 实测 y157 通栏分隔线 1px #2B2C30 */

    .page-select__count-num { color: $text-1; font-size: 40rpx; font-weight: 600; }
    .page-select__count-unit { color: $text-2; font-size: 26rpx; }
  }
  &__extra {
    display: flex;
    flex-direction: column;
    align-items: flex-end;

    .page-select__extra-label { color: $text-2; font-size: 22rpx; }
    .page-select__extra-fee { color: $gold; font-size: 30rpx; font-weight: 500; }
  }

  &__tabs {
    display: flex;
    gap: 48rpx;
    padding: 24rpx $page-pad 16rpx; /* C13 实测：文本盒 y170 起、下划线 y199–201 */
  }
  &__tab {
    position: relative;
    color: $text-2;
    font-size: 30rpx;
    padding-bottom: 16rpx;

    &--on { color: $text-1; font-weight: 500; }
    /* C13 实测选中态底部 2px 白下划线（宽=文本宽） */
    &--on::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 4rpx;
      border-radius: 2rpx;
      background-color: $text-1;
    }
  }

  /* 选片底板：C13 实测通栏 #1D1E22（y214–707），上距 tab 13px、内距 20/16 */
  &__board {
    margin-top: 26rpx;
    padding: 40rpx $page-pad;
    background-color: $bg-card;
  }

  /* 样片网格：2 列 165×220px，间距 12px（与 C01/C24/C15 同构，因含勾选交互不复用 AppWorkGrid） */
  &__grid {
    display: flex;
    flex-wrap: wrap;
    gap: 24rpx;
  }
  &__cell {
    position: relative;
    width: calc(50% - 12rpx);
    height: 440rpx;
    border-radius: $radius-card;
    overflow: hidden;
    background-color: $bg-card-2; /* 图加载前占位，防布局偏移 */
  }
  &__img {
    width: 100%;
    height: 100%;
    display: block;
  }
  /* 已选标记：20×20 金圆 + 黑勾（C13 实测 #D9A735 r10，右上 inset 10） */
  &__pick {
    position: absolute;
    top: 20rpx;
    right: 20rpx;
    width: 40rpx;
    height: 40rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: $gold;
    border-radius: 50%;
  }
  &__pick-tick {
    width: 17rpx;
    height: 12rpx;
    border-left: 4rpx solid #17181C; /* 勾为稿内黑矢量，此处用 border 拼角（待切图） */
    border-bottom: 4rpx solid #17181C;
    transform: rotate(-45deg) translateY(-2rpx);
  }

  /* 底栏左侧汇总 */
  &__summary {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;

    .page-select__summary-line1 { color: $text-2; font-size: 22rpx; }
    .page-select__summary-fee { color: $text-1; font-size: 36rpx; font-weight: 600; margin-top: 4rpx; }
  }
}
</style>
