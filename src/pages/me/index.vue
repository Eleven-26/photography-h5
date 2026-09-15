<template>
  <view class="page-wrap page-me">
    <!-- 状态栏占位：H5 固定 44px；MP 端 AppNavBar 已按系统值定位，避免双计 -->
    <!-- #ifdef H5 -->
    <view class="status-bar" />
    <!-- #endif -->
    <AppNavBar title="我的" />

    <!-- ① 资料头卡
         已登录 → 头像（姓名首字占位，D1 决策：本轮不做头像上传）+ 姓名 + 手机号 + 编辑入口
         未登录 → 登录引导（A2 口径：匿名能进来看结构，功能要点才拦登录） -->
    <view class="page-me__head">
      <template v-if="loggedIn">
        <view class="page-me__avatar">
          <text class="page-me__avatar-text">{{ initial }}</text>
        </view>
        <view class="page-me__head-main">
          <text class="page-me__name ellipsis">{{ profile.name || '未填写姓名' }}</text>
          <text class="page-me__mobile">{{ profile.mobile || '—' }}</text>
        </view>
        <view class="page-me__edit pressable" @click="go('/pages/me/profile')">
          <text class="page-me__edit-text">编辑资料</text>
          <AppIcon name="chevron-right-xs" :size="13" />
        </view>
      </template>

      <template v-else>
        <view class="page-me__avatar page-me__avatar--guest">
          <AppIcon name="lock" :size="24" />
        </view>
        <view class="page-me__head-main">
          <text class="page-me__name">还没有登录</text>
          <text class="page-me__mobile">登录后可查看订单、定制需求与评价</text>
        </view>
        <view class="page-me__edit pressable" @click="goLogin('/pages/me/index')">
          <text class="page-me__edit-text page-me__edit-text--gold">登录</text>
        </view>
      </template>
    </view>

    <!-- ② 拍摄偏好（已登录且有值才显示；这两项会在提交定制需求时自动带入） -->
    <view v-if="loggedIn && (profile.prefer_style || profile.prefer_scene)" class="page-me__prefer card">
      <text class="page-me__prefer-label">我的拍摄偏好</text>
      <view class="page-me__prefer-row">
        <text v-if="profile.prefer_style" class="page-me__tag">风格 · {{ profile.prefer_style }}</text>
        <text v-if="profile.prefer_scene" class="page-me__tag">场景 · {{ profile.prefer_scene }}</text>
      </view>
      <text class="page-me__prefer-hint">提交定制需求时会自动带入，可在「编辑资料」中修改</text>
    </view>

    <!-- ③ 功能入口：未登录时**整列可见但点击拦登录**（A2）—— 让访客先看到能做什么 -->
    <view class="page-me__menu">
      <AppCell
        title="我的订单"
        desc="预约记录、拍摄进度与支付状态"
        :value="countText(counts.orders)"
        arrow
        @click="go('/pages/order/list')"
      />
      <AppCell
        title="定制需求"
        desc="我提交的定制需求与报价进度"
        :value="countText(counts.requests)"
        arrow
        @click="go('/pages/me/requests')"
      />
      <AppCell
        title="我的评价"
        desc="我给出的评价与摄影师回复"
        :value="countText(counts.reviews)"
        arrow
        @click="go('/pages/me/reviews')"
      />
      <AppCell
        title="个人资料"
        desc="姓名、联系方式与拍摄偏好"
        arrow
        @click="go('/pages/me/profile')"
      />
    </view>

    <!-- ④ 退出登录（仅已登录） -->
    <view v-if="loggedIn" class="page-me__logout pressable" @click="onLogout">
      <text class="page-me__logout-text">退出登录</text>
    </view>

    <view class="page-me__bottom-space" />
  </view>
</template>

<script>
/**
 * 客户中心（画板 CC01）—— 客户从分享页左上角「<」进入
 *
 * 定位：客户自己的主页，能看到「我的订单 / 定制需求 / 我的评价」并修改个人资料；
 *       资料中的姓名、手机、偏好风格、常用场景会在提交定制需求时自动带入（见 C27）。
 *
 * 登录策略（2026-09-15 与产品确认的口径）：
 *   A2 —— 匿名**可以打开**本页看结构（功能入口整列可见），点具体功能时才拦登录；
 *   拦截后走 A1 的整页登录流程：弹确认 → 登录页 → 登录成功 reLaunch 回目标页。
 *   因此本页**未登录时不发任何请求**：/customer/profile、/order/list 等都在鉴权路由组内，
 *   匿名调用会拿到 401，被 request 层统一踢去登录页 —— 那就不叫「匿名可看」了。
 *
 * 数据源（均需登录，字段以后端 DTO 为准）：
 *   POST /h5/customer/profile       → 资料（白名单：不含 remark/tags/level 等内部字段）
 *   POST /h5/order/list             → 只取 total 作为「我的订单」角标（page_size=1）
 *   POST /h5/custom-request/list    → 同上
 *   POST /h5/review/list            → 评价不分页，直接取长度
 * 角标数字失败时保持空（只影响角标，不阻断页面；不显示 0 以免与「加载失败」混淆的观感问题）。
 */
import AppNavBar from '@/components/AppNavBar.vue'
import AppCell from '@/components/AppCell.vue'
import AppIcon from '@/components/AppIcon.vue'
import { getProfile } from '@/api/customer'
import { getMyOrders } from '@/api/order'
import { getCustomRequests } from '@/api/customRequest'
import { getMyReviews } from '@/api/review'
import { isLoggedIn } from '@/utils/auth'
import { useUserStore } from '@/stores/user'

export default {
  components: { AppNavBar, AppCell, AppIcon },
  data() {
    return {
      loggedIn: isLoggedIn(),
      profile: {},
      counts: { orders: null, requests: null, reviews: null },
    }
  },
  computed: {
    /** 头像占位字：姓名首字（中文取第一个字，英文取首字母大写） */
    initial() {
      const name = (this.profile.name || '').trim()
      return name ? name.charAt(0).toUpperCase() : '客'
    },
  },
  onShow() {
    /* onShow 而非 onLoad：从「编辑资料」「我的订单」返回时都要刷新（资料可能已改） */
    this.loggedIn = isLoggedIn()
    if (this.loggedIn) {
      this.load()
    } else {
      this.profile = {}
      this.counts = { orders: null, requests: null, reviews: null }
    }
  },
  methods: {
    /** 角标文案：未取到（null）不显示，0 显示「0」 */
    countText(n) {
      return n == null ? '' : String(n)
    },

    /**
     * 入口跳转 —— A2 的唯一拦截点。
     * 已登录直接进；未登录弹确认（而不是静默踢去登录页），确认后走登录页并回跳目标页。
     * ⚠️ target 必须是**不带 query** 的页面路径：登录页用 `?redirect=` 明文透传（见
     *    pages/login/index.vue 的 onLoad），带 query 会在拼接处歧义。
     */
    go(target) {
      if (this.loggedIn) {
        uni.navigateTo({ url: target })
        return
      }
      uni.showModal({
        title: '登录后可用',
        content: '手机号登录即可查看你的订单、定制需求与评价',
        confirmText: '去登录',
        cancelText: '再看看',
        success: (res) => {
          if (res.confirm) this.goLogin(target)
        },
      })
    },

    /** 直接进登录页（登录成功由登录页 reLaunch 回 redirect） */
    goLogin(target) {
      uni.navigateTo({ url: `/pages/login/index?redirect=${target}` })
    },

    async load() {
      /* 并发取数：任一失败只影响对应角标，不阻断其它（资料用 allSettled 单独兜底） */
      const [profile, orders, requests, reviews] = await Promise.allSettled([
        getProfile(),
        getMyOrders({ page: 1, page_size: 1 }),
        getCustomRequests({ page: 1, page_size: 1 }),
        getMyReviews(),
      ])
      if (profile.status === 'fulfilled' && profile.value) {
        this.profile = profile.value
        /* 顺手把本地缓存对齐（其它页读 getCustomer() 拿姓名/偏好） */
        useUserStore().patchCustomer({
          name: profile.value.name,
          mobile: profile.value.mobile,
          prefer_style: profile.value.prefer_style,
          prefer_scene: profile.value.prefer_scene,
        })
      }
      this.counts = {
        orders: orders.status === 'fulfilled' ? Number(orders.value?.total || 0) : null,
        requests: requests.status === 'fulfilled' ? Number(requests.value?.total || 0) : null,
        reviews: reviews.status === 'fulfilled' ? (reviews.value || []).length : null,
      }
    },

    onLogout() {
      uni.showModal({
        title: '退出登录',
        content: '退出后需重新用手机号验证码登录',
        success: (res) => {
          if (!res.confirm) return
          useUserStore().logout()
          this.loggedIn = false
          this.profile = {}
          this.counts = { orders: null, requests: null, reviews: null }
          uni.showToast({ title: '已退出登录', icon: 'none' })
        },
      })
    },
  },
}
</script>

<style lang="scss" scoped>
.page-me {
  padding-bottom: 0;

  /* ① 资料头卡 */
  &__head {
    display: flex;
    align-items: center;
    gap: 24rpx;
    margin: 20rpx $page-pad 0;
    padding: 40rpx $card-pad;
    background-color: $bg-card;
    border: 1rpx solid $border-1;
    border-radius: $radius-card;
  }
  &__avatar {
    flex-shrink: 0;
    width: 112rpx;
    height: 112rpx;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: $gold-glow;
    border: 1rpx solid $gold;
    &--guest {
      background-color: $bg-card-2;
      border-color: $border-2;
    }
  }
  &__avatar-text {
    color: $gold;
    font-size: 44rpx;
    font-weight: 600;
    line-height: 1;
  }
  &__head-main { flex: 1; min-width: 0; }
  &__name {
    display: block;
    color: $text-1;
    font-size: $fs-lg;
    font-weight: 600;
  }
  &__mobile {
    display: block;
    margin-top: 8rpx;
    color: $text-2;
    font-size: $fs-sm;
  }
  &__edit {
    display: flex;
    align-items: center;
    gap: 4rpx;
    flex-shrink: 0;
    padding: 12rpx 0 12rpx 16rpx;
  }
  &__edit-text {
    color: $text-2;
    font-size: $fs-sm;
    &--gold { color: $gold; font-size: $fs-md; font-weight: 600; }
  }

  /* ② 拍摄偏好卡 */
  &__prefer {
    margin: 24rpx $page-pad 0;
    display: flex;
    flex-direction: column;
    gap: 16rpx;
  }
  &__prefer-label { color: $text-3; font-size: $fs-sm; font-weight: 600; }
  &__prefer-row { display: flex; flex-wrap: wrap; gap: 16rpx; }
  &__tag {
    padding: 8rpx 20rpx;
    border: 1rpx solid $border-2;
    border-radius: $radius-btn;
    color: $text-3;
    font-size: $fs-sm;
  }
  &__prefer-hint { color: $text-disabled; font-size: $fs-xs; line-height: 1.6; }

  /* ③ 功能入口 */
  &__menu {
    display: flex;
    flex-direction: column;
    gap: $touch-gap;
    margin: 24rpx $page-pad 0;
  }

  /* ④ 退出登录 */
  &__logout {
    margin: 48rpx $page-pad 0;
    height: $touch-min;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1rpx solid $border-2;
    border-radius: $radius-cell;
  }
  &__logout-text { color: $text-2; font-size: $fs-md; }

  &__bottom-space { height: 64rpx; }
}
</style>
