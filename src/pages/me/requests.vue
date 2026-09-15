<template>
  <view class="page-wrap page-rq">
    <!-- 状态栏占位：H5 固定 44px；MP 端 AppNavBar 已按系统值定位，避免双计 -->
    <!-- #ifdef H5 -->
    <view class="status-bar" />
    <!-- #endif -->
    <AppNavBar title="定制需求" />

    <view class="page-rq__list">
      <view v-for="item in list" :key="item.id" class="card page-rq__card">
        <!-- 头行：状态 + 提交时间 -->
        <view class="page-rq__head">
          <text class="page-rq__status" :class="`page-rq__status--${item.status}`">
            {{ statusText(item.status) }}
          </text>
          <text class="page-rq__date">{{ formatDate(item.created_at) }}</text>
        </view>

        <!-- 拍摄类型 + 期望日期 -->
        <view class="page-rq__meta">
          <text v-if="item.project_type" class="page-rq__meta-text">{{ item.project_type }}</text>
          <text v-if="item.expected_date" class="page-rq__meta-text">期望 {{ item.expected_date }}</text>
        </view>

        <view class="page-rq__rows">
          <view v-if="item.location" class="page-rq__row">
            <text class="page-rq__row-label">地点</text>
            <text class="page-rq__row-value ellipsis">{{ item.location }}</text>
          </view>
          <view class="page-rq__row">
            <text class="page-rq__row-label">预算</text>
            <text class="page-rq__row-value">{{ budgetText(item) }}</text>
          </view>
        </view>

        <text v-if="item.detail" class="page-rq__detail ellipsis-2">{{ item.detail }}</text>

        <!-- 参考图：只渲染服务端/绝对地址（历史数据里存的是本机临时路径，渲染必裂，故跳过） -->
        <view v-if="imgList(item).length" class="page-rq__imgs">
          <image
            v-for="(img, i) in imgList(item)"
            :key="i"
            class="page-rq__img"
            :src="img"
            mode="aspectFill"
            @click="preview(item, i)"
          />
        </view>

        <!-- 工作室响应 -->
        <view v-if="item.response" class="page-rq__reply">
          <text class="page-rq__reply-label">工作室回复</text>
          <text class="page-rq__reply-text">{{ item.response }}</text>
        </view>
      </view>
    </view>

    <AppEmpty v-if="!loading && !list.length" text="还没有提交过定制需求" />
    <view v-if="!loading && !list.length" class="page-rq__empty-btn">
      <AppButton type="secondary" size="hug" @click="goSubmit">去提交定制需求</AppButton>
    </view>

    <view v-if="list.length && !hasMore" class="page-rq__end">
      <text class="page-rq__end-text">没有更多了</text>
    </view>
  </view>
</template>

<script>
/**
 * 我的定制需求（客户中心 → 定制需求）
 *
 * 接口：POST /h5/custom-request/list（需登录，后端 response.PageOK → {list,total,page,page_size}）
 * 归属由令牌内 customer_id 锁定（后端 ClientCustomRequests）。
 *
 * 说明：该接口后端早已就绪、H5 却一直没有页面（本次补齐），
 * 此前客户提交完定制需求后在端内**看不到任何记录**。
 *
 * images 是逗号分隔字符串；提交页当前仍存本机临时路径（H5 尚无上传接口，见 custom/request.vue
 * 的 TODO），这类路径在别的会话里渲染必然失败 —— 故列表只渲染 `/` 或 http(s) 开头或 data: 的地址，
 * 历史脏数据直接不显示，不摆一排裂图。
 *
 * 状态取 constants/enums.js 的 CUSTOM_REQUEST_STATUS（1-待处理 2-已响应 3-已关闭），不自造状态值。
 */
import AppNavBar from '@/components/AppNavBar.vue'
import AppEmpty from '@/components/AppEmpty.vue'
import AppButton from '@/components/AppButton.vue'
import { getCustomRequests } from '@/api/customRequest'
import { CUSTOM_REQUEST_STATUS } from '@/constants/enums'
import { formatAmount, formatDate } from '@/utils/format'

const PAGE_SIZE = 20

export default {
  components: { AppNavBar, AppEmpty, AppButton },
  data() {
    return {
      loading: false,
      list: [],
      page: 1,
      total: 0,
    }
  },
  computed: {
    hasMore() {
      return this.list.length < this.total
    },
  },
  onLoad() {
    this.fetchList(true)
  },
  onReachBottom() {
    if (this.hasMore && !this.loading) this.fetchList(false)
  },
  methods: {
    formatDate,
    statusText(status) {
      return CUSTOM_REQUEST_STATUS[status] || '待处理'
    },
    /** 预算文案：两值都是 0 表示未设预算（后端 decimal 默认 0，非「免费」） */
    budgetText(item) {
      const min = Number(item.budget_min || 0)
      const max = Number(item.budget_max || 0)
      if (!min && !max) return '待沟通'
      if (min && max) return `¥${formatAmount(min)} - ¥${formatAmount(max)}`
      if (min) return `¥${formatAmount(min)} 以上`
      return `¥${formatAmount(max)} 以内`
    },
    /** 参考图：过滤掉本机临时路径（file:// / wxfile:// / blob: / _doc/ 等，渲染必裂） */
    imgList(item) {
      return String(item.images || '')
        .split(',')
        .map((s) => s.trim())
        .filter((s) => /^(https?:)?\/\//.test(s) || s.startsWith('/') || s.startsWith('data:'))
    },
    preview(item, index) {
      const urls = this.imgList(item)
      if (!urls.length) return
      uni.previewImage({ urls, current: index })
    },
    goSubmit() {
      uni.navigateTo({ url: '/pages/custom/request' })
    },
    async fetchList(reset) {
      this.loading = true
      const page = reset ? 1 : this.page + 1
      try {
        const res = await getCustomRequests({ page, page_size: PAGE_SIZE })
        const rows = (res && res.list) || []
        this.list = reset ? rows : this.list.concat(rows)
        this.total = Number((res && res.total) || 0)
        this.page = page
      } catch {
        /* request 层已 toast；重置时保持空态，不注入演示数据 */
        if (reset) {
          this.list = []
          this.total = 0
        }
      } finally {
        this.loading = false
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.page-rq {
  &__list {
    display: flex;
    flex-direction: column;
    gap: 24rpx;
    padding: 24rpx $page-pad 0;
  }
  &__card { display: flex; flex-direction: column; gap: 16rpx; }

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16rpx;
  }
  &__status {
    padding: 4rpx 16rpx;
    border-radius: $radius-btn;
    font-size: $fs-xs;
    &--1 { color: $gold; background-color: $badge-gold-bg; }
    &--2 { color: $tip-green; background-color: $badge-green-bg; }
    &--3 { color: $text-2; background-color: $bg-card-2; }
  }
  &__date { color: $text-2; font-size: $fs-xs; }

  &__meta { display: flex; flex-wrap: wrap; gap: 16rpx; }
  &__meta-text { color: $text-1; font-size: $fs-md; font-weight: 600; }

  &__rows { display: flex; flex-direction: column; gap: 8rpx; }
  &__row { display: flex; align-items: center; gap: 16rpx; }
  &__row-label { color: $text-2; font-size: $fs-sm; width: 80rpx; flex-shrink: 0; }
  &__row-value { color: $text-3; font-size: $fs-sm; flex: 1; min-width: 0; }

  &__detail { color: $text-3; font-size: $fs-sm; line-height: 1.7; }

  &__imgs { display: flex; flex-wrap: wrap; gap: 16rpx; }
  &__img {
    width: 160rpx;
    height: 160rpx;
    border-radius: $radius-cell;
    background-color: $bg-card-2;
  }

  &__reply {
    display: flex;
    flex-direction: column;
    gap: 8rpx;
    padding: 20rpx 24rpx;
    background-color: $bg-card-2;
    border-radius: $radius-cell;
  }
  &__reply-label { color: $gold; font-size: $fs-xs; font-weight: 600; }
  &__reply-text { color: $text-3; font-size: $fs-sm; line-height: 1.6; }

  &__empty-btn { display: flex; justify-content: center; margin-top: 16rpx; }
  &__end { padding: 40rpx 0 56rpx; text-align: center; }
  &__end-text { color: $text-disabled; font-size: $fs-xs; }
}
</style>
