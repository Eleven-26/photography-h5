<template>
  <view class="page-orders">
    <!-- ⚠️ 画布无「订单列表」独立画板；本页由组件库实测「Card-订单卡」组装，
         导航/布局沿用 C09-2 头部实测规格，列表结构为推导，已标注。 -->
    <view class="status-bar" />
    <AppNavBar title="我的订单" />

    <scroll-view class="page-orders__body" scroll-y>
      <view class="page-orders__list">
        <AppOrderCard
          v-for="item in orders"
          :key="item.id"
          :order="item"
          @click="goDetail(item)"
        />
      </view>
      <AppEmpty v-if="!loading && !orders.length" text="暂无订单，去首页挑选心仪套餐吧" />
    </scroll-view>
  </view>
</template>

<script>
import AppNavBar from '@/components/AppNavBar.vue'
import AppOrderCard from '@/components/AppOrderCard.vue'
import AppEmpty from '@/components/AppEmpty.vue'
import { getMyOrders } from '@/api/order'

export default {
  components: { AppNavBar, AppOrderCard, AppEmpty },
  data() {
    return {
      loading: false,
      orders: [],
    }
  },
  onShow() {
    this.fetchOrders()
  },
  methods: {
    async fetchOrders() {
      this.loading = true
      try {
        const res = await getMyOrders({ page: 1, page_size: 20 })
        /* 后端 /order/list 走 response.PageOK → { list, total, page, page_size }（rpc 已解包 data） */
        this.orders = (res && res.list) || []
      } catch (e) {
        /* request 层已 toast；保持空态，不注入演示订单 */
        this.orders = []
      } finally {
        this.loading = false
      }
    },
    goDetail(order) {
      uni.navigateTo({ url: `/pages/order/detail?id=${order.id}` })
    },
  },
}
</script>

<style lang="scss" scoped>
.page-orders {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: $bg-page;

  &__body {
    flex: 1;
    min-height: 0;
  }
  /* 列表区：pad 16/12（推导），卡间距 24rpx */
  &__list {
    display: flex;
    flex-direction: column;
    gap: 24rpx;
    padding: 24rpx $page-pad 48rpx;
  }
}
</style>
