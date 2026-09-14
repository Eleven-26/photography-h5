<template>
  <view class="page-wrap page-prep">
    <view class="status-bar" />
    <AppNavBar title="拍前准备" />

    <!-- ① 拍摄信息卡：⚠️ C11 实测为「白卡反色」设计（白底黑字，全站唯一），一比一保留 -->
    <view class="page-prep__info">
      <text class="page-prep__info-label">拍摄时间</text>
      <text class="page-prep__info-date">{{ dateText }}</text>
      <text class="page-prep__info-time">{{ timeText }}</text>
      <view class="page-prep__info-divider" />
      <text class="page-prep__info-label">拍摄地点</text>
      <text class="page-prep__info-addr">{{ addressText }}</text>
    </view>

    <!-- ② 拍摄建议（C11 实测 #1D1E22 r16 内四组：图标 + 14 Bold 标题 + 13 建议行） -->
    <view class="page-prep__label"><text>拍摄建议</text></view>
    <view class="page-prep__advice">
      <view v-for="(g, i) in advices" :key="g.title || i" class="page-prep__advice-row" :class="{ 'page-prep__advice-row--last': i === advices.length - 1 }">
        <!-- C11 实测建议图标 20px：gift/clock/pin/bulb（原画板矢量） -->
        <AppIcon :name="g.icon" :size="20" />
        <view class="page-prep__advice-main">
          <text class="page-prep__advice-title">{{ g.title }}</text>
          <view class="page-prep__advice-lines">
            <text v-for="line in g.lines" :key="line" class="page-prep__advice-line">· {{ line }}</text>
          </view>
        </view>
      </view>
    </view>
    <text v-if="!advices.length" class="page-prep__empty">摄影师尚未下发拍前准备内容</text>

    <!-- ③ 毛玻璃底栏：确认已阅读 → confirmPrepRead（/order/prep/read/:id） -->
    <AppFooter>
      <AppButton block :loading="submitting" @click="onConfirmRead">确认已阅读</AppButton>
    </AppFooter>
  </view>
</template>

<script>
/**
 * C11 拍前准备（画板 1:1041 一比一还原）
 * 数据源：订单 prep_content（biz_order.prep_content，摄影师端编辑下发）
 *   JSON 结构：{ advices: [{ icon?, title, lines: string[] }] }（亦兼容直接给数组）
 *   未下发内容时展示空态提示，不再回落到设计稿示例文案
 * 交互：「确认已阅读」→ confirmPrepRead（/order/prep/read/:id）
 * ⚠️ 设计注记：顶部信息卡为白卡反色（C11 实测白底黑字），与全站暗色卡不同，属设计强调手法
 */
import AppNavBar from '@/components/AppNavBar.vue'
import AppFooter from '@/components/AppFooter.vue'
import AppButton from '@/components/AppButton.vue'
import { getOrderDetail, confirmPrepRead } from '@/api/order'

/* prep_content 未带 icon 字段时的兜底图标（按序循环） */
const DEFAULT_ICONS = ['gift', 'clock', 'pin', 'bulb']

export default {
  components: { AppNavBar, AppFooter, AppButton },
  data() {
    return {
      orderId: 0,
      order: {},
      advices: [],
      submitting: false,
    }
  },
  computed: {
    dateText() {
      return this.order.shoot_date || '—'
    },
    timeText() {
      return this.order.shoot_time || '—'
    },
    addressText() {
      return this.order.shoot_address || '—'
    },
  },
  onLoad(query) {
    this.orderId = Number(query.orderId || 0)
    this.loadData()
  },
  methods: {
    async loadData() {
      if (!this.orderId) return
      const res = await getOrderDetail(this.orderId).catch(() => null)
      const o = (res && res.order) || {}
      this.order = o
      this.advices = this.parseAdvices(o.prep_content)
    },
    /** 解析拍前准备内容（JSON 字符串/对象均可）；无法解析或为空则返回空数组 */
    parseAdvices(raw) {
      if (!raw) return []
      let data = raw
      if (typeof raw === 'string') {
        try { data = JSON.parse(raw) } catch (e) { return [] }
      }
      const list = Array.isArray(data) ? data : (data && data.advices) || []
      if (!Array.isArray(list)) return []
      return list
        .map((g, i) => ({
          icon: (g && g.icon) || DEFAULT_ICONS[i % DEFAULT_ICONS.length],
          title: (g && g.title) || '',
          lines: Array.isArray(g && g.lines)
            ? g.lines
            : String((g && g.lines) || '').split('\n').filter(Boolean),
        }))
        .filter((g) => g.title || g.lines.length)
    },
    async onConfirmRead() {
      this.submitting = true
      try {
        await confirmPrepRead(this.orderId)
        uni.showToast({ title: '已确认', icon: 'success' })
        setTimeout(() => uni.navigateBack({ delta: 1 }), 600)
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
.page-prep {
  padding-bottom: 240rpx;

  /* ① 白卡反色信息卡（C11 实测：白底黑字，全站唯一反色卡） */
  &__info {
    display: flex;
    flex-direction: column;
    margin: 24rpx $page-pad 0;
    padding: 40rpx;
    background-color: #FFFFFF; /* C11 实测白卡 */
    border-radius: 32rpx; /* 稿 16px（与并列的建议卡一致） */
  }
  &__info-label { color: rgba(0, 0, 0, 0.6); font-size: 26rpx; }
  /* 稿白卡内节奏：标签→日期/时间行间留白 12px（原 3px 偏紧，卡高 196px） */
  &__info-date { color: $text-on-light; font-size: 44rpx; font-weight: 600; margin-top: 24rpx; }
  &__info-time { color: $text-on-light; font-size: 28rpx; font-weight: 500; margin-top: 24rpx; margin-bottom: 24rpx; }
  &__info-divider {
    height: 1rpx;
    background-color: rgba(0, 0, 0, 0.15);
    margin-bottom: 24rpx;
  }
  &__info-addr { color: $text-on-light; font-size: 28rpx; font-weight: 500; margin-top: 6rpx; }

  &__label {
    padding: 48rpx $page-pad 16rpx; /* 稿：白卡底 y295 → 建议卡顶 y346（标题块总高 51px） */
    text { color: $text-3; font-size: 28rpx; font-weight: 600; }
  }

  /* ② 建议卡（C11 实测 #1D1E22 r16 pad16/10，行间描边分隔） */
  &__advice {
    margin: 0 $page-pad;
    padding: 20rpx 32rpx;
    background-color: $bg-card;
    border: 1rpx solid $border-1;
    border-radius: 32rpx; /* 稿 16px */
  }
  &__advice-row {
    display: flex;
    gap: 24rpx;
    padding: 20rpx 0; /* 稿：组间留白 10px（卡高 420px） */
    border-bottom: 1rpx solid $border-1;

    &--last { border-bottom: none; }
  }
  &__advice-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8rpx;
    min-width: 0;
  }
  &__advice-title { color: $text-1; font-size: 28rpx; font-weight: 600; }
  &__advice-lines {
    display: flex;
    flex-direction: column;
    gap: 4rpx;
  }
  &__advice-line { color: $text-disabled; font-size: 26rpx; line-height: 1.6; } /* C11 实测 #85878D */
  /* 无拍前准备内容时的空态提示 */
  &__empty {
    display: block;
    margin: 0 $page-pad;
    padding: 32rpx;
    text-align: center;
    color: $text-3;
    font-size: 26rpx;
    background-color: $bg-card;
    border-radius: 32rpx;
  }
}
</style>
