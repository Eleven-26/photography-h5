<template>
  <view class="page-wrap page-rc">
    <!-- 状态栏占位：H5 固定 44px；MP 端 AppNavBar 已按系统值定位，避免双计 -->
    <!-- #ifdef H5 -->
    <view class="status-bar" />
    <!-- #endif -->
    <AppNavBar title="我的评价" />

    <view class="page-rc__list">
      <view v-for="item in reviews" :key="item.id" class="card page-rc__card">
        <!-- 头行：订单号 + 评价时间 -->
        <view class="page-rc__head">
          <text class="page-rc__order ellipsis">{{ item.order_code || '订单' }}</text>
          <text class="page-rc__date">{{ formatDate(item.created_at) }}</text>
        </view>

        <!-- 套餐 / 拍摄日期（订单快照，由后端联表下发，客户无需回查订单详情） -->
        <view v-if="item.package_name || item.shoot_date" class="page-rc__meta">
          <text v-if="item.package_name" class="page-rc__meta-text ellipsis">{{ item.package_name }}</text>
          <text v-if="item.shoot_date" class="page-rc__meta-text">{{ item.shoot_date }} 拍摄</text>
        </view>

        <!-- 星级（1-5）+ 匿名标记 -->
        <view class="page-rc__rating">
          <AppIcon
            v-for="i in 5"
            :key="i"
            :name="i <= item.rating ? 'star-gold' : 'star'"
            :size="14"
          />
          <text v-if="item.is_anonymous === 1" class="page-rc__anon">匿名评价</text>
        </view>

        <text class="page-rc__content">{{ item.content || '未填写评价内容' }}</text>

        <!-- 评价图片：逗号分隔串 → 各自成图，点任意一张看整组 -->
        <view v-if="imgList(item).length" class="page-rc__imgs">
          <image
            v-for="(img, i) in imgList(item)"
            :key="i"
            class="page-rc__img"
            :src="img"
            mode="aspectFill"
            @click="preview(item, i)"
          />
        </view>

        <!-- 摄影师回复 -->
        <view v-if="item.reply" class="page-rc__reply">
          <text class="page-rc__reply-label">摄影师回复</text>
          <text class="page-rc__reply-text">{{ item.reply }}</text>
          <text v-if="item.reply_at" class="page-rc__reply-at">{{ formatDate(item.reply_at) }}</text>
        </view>
      </view>
    </view>

    <AppEmpty v-if="!loading && !reviews.length" text="还没有评价，完成拍摄后可以在这里评价" />
  </view>
</template>

<script>
/**
 * 我的评价（客户中心 → 我的评价）—— 只读
 *
 * 接口：POST /h5/review/list（需登录；归属由令牌内 customer_id 锁定，客户端不传 customer_id）
 * 返回**不分页**的评价集合，每条带订单快照 order_code / package_name / shoot_date
 * （后端 ReviewRepo.ListByCustomer 联表 biz_order 下发，客户不必逐单回查）。
 *
 * 只读是产品口径（C1 决策）：提交评价入口仍停在订单交付页，本页不出「修改/删除」，
 * 因为后端只有 review/create（每单一评、不可改），摆出按钮必然点了报错。
 *
 * images 是**逗号分隔字符串**（不是数组），空串代表无图。
 */
import AppNavBar from '@/components/AppNavBar.vue'
import AppEmpty from '@/components/AppEmpty.vue'
import AppIcon from '@/components/AppIcon.vue'
import { getMyReviews } from '@/api/review'
import { formatDate } from '@/utils/format'

export default {
  components: { AppNavBar, AppEmpty, AppIcon },
  data() {
    return {
      loading: false,
      reviews: [],
    }
  },
  onLoad() {
    this.fetchReviews()
  },
  methods: {
    formatDate,
    /** 评价图片：逗号分隔串 → 数组（去空白项） */
    imgList(item) {
      return String(item.images || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    },
    preview(item, index) {
      const urls = this.imgList(item)
      if (!urls.length) return
      uni.previewImage({ urls, current: index })
    },
    async fetchReviews() {
      this.loading = true
      try {
        const res = await getMyReviews()
        this.reviews = Array.isArray(res) ? res : []
      } catch {
        /* request 层已 toast；保持空态，不注入演示评价 */
        this.reviews = []
      } finally {
        this.loading = false
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.page-rc {
  &__list {
    display: flex;
    flex-direction: column;
    gap: 24rpx;
    padding: 24rpx $page-pad 48rpx;
  }
  &__card { display: flex; flex-direction: column; gap: 16rpx; }

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16rpx;
  }
  &__order { color: $text-1; font-size: $fs-md; font-weight: 600; flex: 1; min-width: 0; }
  &__date { color: $text-2; font-size: $fs-xs; flex-shrink: 0; }

  &__meta { display: flex; flex-wrap: wrap; gap: 16rpx; }
  &__meta-text { color: $text-2; font-size: $fs-sm; }

  &__rating { display: flex; align-items: center; gap: 4rpx; }
  &__anon {
    margin-left: 12rpx;
    padding: 0 12rpx;
    height: 32rpx;
    line-height: 32rpx;
    color: $text-2;
    font-size: $fs-xs;
    border: 1rpx solid $border-2;
    border-radius: $radius-btn;
  }

  &__content { color: $text-1; font-size: $fs-md; line-height: 1.7; }

  &__imgs { display: flex; flex-wrap: wrap; gap: 16rpx; }
  &__img {
    width: 176rpx;
    height: 176rpx;
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
  &__reply-at { color: $text-disabled; font-size: $fs-xs; }
}
</style>
