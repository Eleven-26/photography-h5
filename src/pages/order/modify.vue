<template>
  <view class="page-wrap page-mod">
    <view class="status-bar" />
    <AppNavBar title="提出修改" />

    <!-- ① 原报价头（C10 实测：13@0.5 / 18 白 / 12@0.4） -->
    <view class="page-mod__quote">
      <text class="page-mod__quote-label">原报价</text>
      <text class="page-mod__quote-title">{{ quoteTitle }}</text>
      <text class="page-mod__quote-meta">{{ quoteMeta }}</text>
    </view>

    <!-- ② 修改内容：五类可选卡 #25262A r12（选中项图标金 + 文字白，C10 实测） -->
    <view class="page-mod__label"><text>修改内容</text></view>
    <view class="page-mod__types">
      <view
        v-for="t in MODIFY_TYPES"
        :key="t"
        class="page-mod__type pressable"
        :class="{ 'page-mod__type--on': form.types.includes(t) }"
        @click="toggleType(t)"
      >
        <!-- C10 实测：选项圆圈 20px，选中金勾（原画板矢量） -->
        <AppIcon :name="form.types.includes(t) ? 'radio-checked' : 'radio-off'" :size="20" />
        <text class="page-mod__type-name">{{ t }}</text>
      </view>
    </view>

    <!-- ③ 修改说明（C10 实测 #25262A r12 内嵌 textarea 14 白） -->
    <view class="page-mod__label page-mod__label--sm"><text>修改说明</text></view>
    <view class="page-mod__textarea-box">
      <textarea
        v-model="form.content"
        class="page-mod__textarea"
        :maxlength="300"
        placeholder="描述你想调整的内容，例如更换地点、增减人数…"
        placeholder-class="page-mod__ph"
      />
    </view>

    <!-- ④ 提示卡（C10 实测 #25262A h66：修改后重新报价，无拒绝口径） -->
    <view class="page-mod__tip">
      <AppIcon name="info-sm" :size="13" />
      <text class="page-mod__tip-text">提交修改请求后，摄影师将重新调整报价。订单状态将变为「等待重新报价」，原报价暂时保留。</text>
    </view>

    <!-- ⑤ 毛玻璃底栏：block 白胶囊（C10 实测） -->
    <AppFooter>
      <AppButton block :loading="submitting" @click="onSubmit">提交修改请求</AppButton>
    </AppFooter>
  </view>
</template>

<script>
/**
 * C10 提出修改（画板 1:976 一比一还原；导航标题稿面即「提出修改」）
 * 入口：C06 报价详情「对报价有疑问？提出修改」链接
 * 业务口径①：无拒绝报价——客户有疑问走本页「提出修改」，谈不拢报价自然过期
 * 提交 → requestQuoteRevision（重新报价流程，报价新版本由摄影师端生成）
 * 数据源：biz_quote（id/package_name/total_price）+ 订单拍摄信息
 */
import AppNavBar from '@/components/AppNavBar.vue'
import AppFooter from '@/components/AppFooter.vue'
import AppButton from '@/components/AppButton.vue'
import { getQuoteDetail, requestQuoteRevision } from '@/api/quote'

const MODIFY_TYPES = ['套餐内容调整', '日期 / 时间变更', '地点变更', '人数变更', '其他']

export default {
  components: { AppNavBar, AppFooter, AppButton },
  data() {
    return {
      MODIFY_TYPES,
      quoteId: null,
      quote: {},
      form: { types: [], content: '' },
      submitting: false,
    }
  },
  computed: {
    quoteTitle() {
      const q = this.quote
      if (!q || !q.id) return '—'
      return `${q.package_name || q.title || '拍摄服务'} · ¥${Number(q.total_price || 0).toLocaleString()}`
    },
    quoteMeta() {
      const q = this.quote
      if (!q || !q.id) return '—'
      return [q.shoot_date, q.shoot_time, q.location].filter(Boolean).join(' · ') || '—'
    },
  },
  onLoad(query) {
    this.quoteId = Number(query.quoteId || query.id || 0)
    this.loadData()
  },
  methods: {
    async loadData() {
      if (!this.quoteId) return
      /* 后端 /quote/detail 返回 model.Quote（rpc 已解包 data） */
      const res = await getQuoteDetail(this.quoteId).catch(() => null)
      this.quote = res || {}
    },
    toggleType(t) {
      const i = this.form.types.indexOf(t)
      if (i >= 0) this.form.types.splice(i, 1)
      else this.form.types.push(t)
    },
    async onSubmit() {
      if (!this.form.content.trim()) {
        uni.showToast({ title: '请填写修改说明', icon: 'none' }) /* 输入保留 */
        return
      }
      this.submitting = true
      try {
        await requestQuoteRevision(this.quoteId, this.form.content)
        uni.showToast({ title: '修改请求已提交', icon: 'success' })
        /* 等待重新报价：返回报价列表/详情（重新生成报价后可再确认） */
        setTimeout(() => uni.navigateBack({ delta: 1 }), 600)
      } catch (e) {
        /* request 层已 toast；表单保留 */
      } finally {
        this.submitting = false
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.page-mod {
  padding-bottom: 240rpx;

  /* ① 原报价头（C10 实测 pad 16/16） */
  &__quote {
    display: flex;
    flex-direction: column;
    gap: 8rpx;
    padding: 32rpx $page-pad;
  }
  &__quote-label { color: rgba(247, 248, 248, 0.5); font-size: 26rpx; }
  &__quote-title { color: $text-1; font-size: 36rpx; font-weight: 600; }
  &__quote-meta { color: rgba(247, 248, 248, 0.4); font-size: 24rpx; }

  &__label {
    padding: 40rpx $page-pad 16rpx; /* 2026-09-07 对表修正：原 8rpx 依赖全局页边距，现区块自带 */
    text { color: rgba(247, 248, 248, 0.5); font-size: 28rpx; }
    &--sm text { font-size: 26rpx; }
  }

  /* ② 五类修改卡（C10 实测 #25262A r12 pad16/14，gap 10；选中图标金/字白） */
  &__types {
    display: flex;
    flex-direction: column;
    gap: 16rpx;
  }
  &__type {
    display: flex;
    align-items: center;
    gap: 20rpx;
    padding: 28rpx 32rpx;
    background-color: $bg-card-2;
    border-radius: $radius-card; /* C10 实测卡片 r12（拟合 R≈25@2x），非行卡 r8 */
    box-sizing: border-box;

    &--on { border: 1rpx solid $gold; } /* C10 实测选中卡带描边（Background+Border） */
  }
  &__type-name {
    color: rgba(247, 248, 248, 0.7);
    font-size: 28rpx;

    .page-mod__type--on & { color: $text-1; }
  }

  /* ③ 修改说明 */
  &__textarea-box {
    padding: 28rpx 32rpx;
    background-color: $bg-card-2;
    border-radius: $radius-card; /* C10 实测 r12 */
  }
  &__textarea {
    box-sizing: border-box;
    width: 100%;
    height: 160rpx;
    color: $text-1;
    font-size: 28rpx;
  }
  &__ph { color: $text-disabled; }

  /* ④ 提示卡（C10 实测 #25262A） */
  &__tip {
    display: flex;
    align-items: flex-start;
    gap: 16rpx;
    margin-top: 24rpx;
    padding: 24rpx 32rpx;
    background-color: $bg-card-2;
    border-radius: $radius-card; /* C10 实测 r12 */
  }
  &__tip-text { color: rgba(247, 248, 248, 0.6); font-size: 26rpx; line-height: 1.6; }
}
</style>
