<template>
  <view class="page-wrap page-fb">
    <!-- 稿顶部 Iphone 状态栏占位（375×44 @(0,0)），头部容器从 y44 起 -->
    <view class="status-bar" />
    <AppNavBar title="修图反馈" />

    <view class="page-fb__body">
      <!-- ① 进度行：「已反馈 n / 总数」+ 4px 轨道金填充（C14 实测） -->
      <view class="page-fb__progress">
        <text class="page-fb__progress-label">已反馈</text>
        <text class="page-fb__progress-num">{{ feedbackDone }}</text>
        <text class="page-fb__progress-label">/ {{ items.length }}张</text>
        <view class="page-fb__track">
          <view class="page-fb__track-fill" :style="{ width: progressPct + '%' }" />
        </view>
      </view>

      <!-- ② 上一张 / 序号 / 下一张（C14 实测胶囊钮 pad 14/9/10） -->
      <view class="page-fb__nav">
        <view class="page-fb__nav-btn" @click="prev">
          <AppIcon name="chevron-left-xs" :size="13" />
          <text>上一张</text>
        </view>
        <text class="page-fb__nav-pos">{{ current.no }} · {{ cursor + 1 }}/{{ items.length }}</text>
        <view class="page-fb__nav-btn" @click="next">
          <text>下一张</text>
          <AppIcon name="chevron-right-xs" :size="13" />
        </view>
      </view>

      <!-- ③ 照片卡：r16 #1D1E22 内图 440rpx r12；已反馈红点 20×20 左上；底行「照片 #xxx + 待反馈徽章」 -->
      <view class="page-fb__card">
        <view class="page-fb__photo">
          <image class="page-fb__photo-img" :src="current.url" mode="aspectFill" />
          <view v-if="current.fb_content" class="page-fb__photo-dot" />
        </view>
        <view class="page-fb__meta">
          <text class="page-fb__meta-name">照片 {{ current.no }}</text>
          <text class="page-fb__meta-badge" :class="{ 'page-fb__meta-badge--done': current.fb_content }">
            {{ current.fb_content ? '已反馈' : '待反馈' }}
          </text>
        </view>
      </view>

      <!-- ④ 修改类型（C14 实测四类胶囊，选中白底黑字） -->
      <view class="page-fb__label">
        <text>修改类型</text>
      </view>
      <view class="page-fb__options">
        <text
          v-for="t in FEEDBACK_TYPES"
          :key="t"
          class="page-fb__pill"
          :class="{ 'page-fb__pill--on': form.types.includes(t) }"
          @click="toggleType(t)"
        >{{ t }}</text>
      </view>

      <!-- ⑤ 修改说明（textarea r12，错误/为空不清输入） -->
      <view class="page-fb__label">
        <text>修改说明</text>
      </view>
      <textarea
        v-model="form.content"
        class="page-fb__textarea"
        :maxlength="200"
        placeholder="描述需要修改的位置和期望效果"
        placeholder-class="page-fb__ph"
      />

      <!-- ⑥ 优先级（C14 实测三档，默认「重要」为稿面选中态，实际默认「一般」，见注释） -->
      <view class="page-fb__label">
        <text>优先级</text>
      </view>
      <view class="page-fb__options page-fb__options--pri">
        <text
          v-for="p in PRIORITIES"
          :key="p.key"
          class="page-fb__pill"
          :class="{ 'page-fb__pill--on': form.priority === p.key }"
          @click="form.priority = p.key"
        >{{ p.label }}</text>
      </view>

      <!-- ⑦ 提示卡（C14 实测 #1D1E22 r12） -->
      <view class="page-fb__tip">
        <AppIcon name="info-sm" :size="13" />
        <text class="page-fb__tip-text">反馈将直接发送给摄影师作为逐图修改任务。每张照片可单独反馈，也可跳过不需要修改的照片。</text>
      </view>

      <!-- ⑧ 页内双钮（C14 实测在内容流底部而非毛玻璃栏：跳过描边 168.5 / 提交白底 166.5） -->
      <view class="page-fb__actions">
        <AppButton hug @click="skip">跳过此张</AppButton>
        <AppButton flex :loading="submitting" @click="submit">提交反馈</AppButton>
      </view>
    </view>
  </view>
</template>

<script>
/**
 * C14 修图反馈（画板 1:1105）
 * 逐张反馈模式：上一张/下一张切换，表单状态按照片 id 缓存（切图不丢输入）
 * 后端：biz_delivery_item 反馈四件套 feedback_content / feedback_types / feedback_priority（feedback_status）
 * 提交 → submitFeedback（/delivery/feedback，路径联调核对）
 * 稿内优先级默认选中「重要」为视觉示例，产品默认应为「一般」，此处按产品口径
 */
import { getDeliveryItems, submitFeedback } from '@/api/delivery'

const FEEDBACK_TYPES = ['局部修饰', '颜色调整', '构图裁剪', '其他']
const PRIORITIES = [
  { key: 'normal', label: '一般' },
  { key: 'important', label: '重要' },
  { key: 'urgent', label: '紧急' },
]

export default {
  data() {
    return {
      FEEDBACK_TYPES,
      PRIORITIES,
      deliveryId: null,
      items: [],      // [{ id, no, url, fb_content, fb_types, fb_priority }]
      cursor: 0,      // 当前照片下标
      form: { types: [], content: '', priority: 'normal' }, // 当前张的编辑态（切换时同步回 items）
      submitting: false,
    }
  },
  computed: {
    current() {
      return this.items[this.cursor] || { no: '-', url: '' }
    },
    feedbackDone() {
      return this.items.filter((it) => it.fb_content).length
    },
    progressPct() {
      return this.items.length ? Math.round((this.feedbackDone / this.items.length) * 100) : 0
    },
  },
  onLoad(query) {
    this.deliveryId = query.deliveryId || query.id
    this.fetchData()
  },
  methods: {
    async fetchData() {
      try {
        const res = await getDeliveryItems(this.deliveryId)
        const list = Array.isArray(res) ? res : (res && res.data) || []
        /* 仅精修中的样片参与逐张反馈（kind=2 已选 → 精修对象），字段联调核对 */
        this.items = list.map((it, i) => ({
          id: it.id,
          no: it.code || `#${String(i + 1).padStart(3, '0')}`,
          url: it.url || it.file_url,
          fb_content: it.feedback_content || '',
          fb_types: it.feedback_types ? String(it.feedback_types).split(',') : [],
          fb_priority: it.feedback_priority || 'normal',
        }))
      } catch (e) {
        /* 联调后移除：演示 5 张（复现稿面「已反馈 3/5」） */
        this.items = Array.from({ length: 5 }, (_, i) => ({
          id: i + 1,
          no: `#0${38 + i}`,
          url: '',
          fb_content: i < 3 ? '示例反馈' : '',
          fb_types: [],
          fb_priority: 'normal',
        }))
      }
      this.loadForm()
    },
    /** 切换照片：先把编辑态写回当前张，再载入目标张 */
    saveForm() {
      const it = this.items[this.cursor]
      if (!it) return
      it.fb_content = this.form.content
      it.fb_types = [...this.form.types]
      it.fb_priority = this.form.priority
    },
    loadForm() {
      const it = this.items[this.cursor] || {}
      this.form = {
        types: [...(it.fb_types || [])],
        content: it.fb_content || '',
        priority: it.fb_priority || 'normal',
      }
    },
    toggleType(t) {
      const i = this.form.types.indexOf(t)
      if (i >= 0) this.form.types.splice(i, 1)
      else this.form.types.push(t)
    },
    prev() {
      if (!this.items.length) return
      this.saveForm()
      this.cursor = (this.cursor - 1 + this.items.length) % this.items.length
      this.loadForm()
    },
    next() {
      if (!this.items.length) return
      this.saveForm()
      this.cursor = (this.cursor + 1) % this.items.length
      this.loadForm()
    },
    /** 跳过：不提交，仅保存草稿并到下一张 */
    skip() {
      this.saveForm()
      uni.showToast({ title: '已跳过，可稍后再反馈', icon: 'none' })
      this.next()
    },
    async submit() {
      if (!this.form.content.trim()) {
        uni.showToast({ title: '请填写修改说明', icon: 'none' }) /* 输入保留不清空 */
        return
      }
      this.submitting = true
      try {
        this.saveForm()
        await submitFeedback({
          item_id: this.current.id,
          feedback_content: this.form.content,
          feedback_types: this.form.types.join(','),
          feedback_priority: this.form.priority,
        })
        uni.showToast({ title: '反馈已提交', icon: 'success' })
        this.next()
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
.page-fb {
  &__body {
    padding: 0 $page-pad 40rpx; /* C14 实测 Section pad 16 / bottom 40 */
  }

  /* ① 进度行 */
  &__progress {
    display: flex;
    align-items: center;
    gap: 8rpx;
    padding: 24rpx 0 32rpx; /* C14 实测：文本盒 y100 起 / 胶囊行 y135 起（下距 16px） */
  }
  &__progress-label { color: $text-2; font-size: 26rpx; }
  &__progress-num { color: $text-1; font-size: 30rpx; font-weight: 500; }
  &__track {
    flex: 1;
    height: 8rpx;
    margin-left: 24rpx; /* C14 实测轨道与文字间距 12px */
    border-radius: 4rpx;
    background-color: $track;
    overflow: hidden;
  }
  &__track-fill {
    height: 100%;
    background-color: $gold;
    border-radius: 4rpx;
    transition: width 0.25s ease;
  }

  /* ② 上一张/下一张 */
  &__nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 16rpx;
  }
  &__nav-btn {
    display: flex;
    align-items: center;
    gap: 12rpx;
    padding: 18rpx 28rpx; /* C14 实测 pad 14/9/10 → rpx */
    color: $text-1;
    font-size: 26rpx;
    border: 1rpx solid $border-2;
    border-radius: 999rpx;
  }
  &__nav-pos { color: $text-2; font-size: 26rpx; }

  /* ③ 照片卡 */
  &__card {
    background-color: $bg-card;
    border-radius: 32rpx; /* C14 角部面积法：R≈31 图px = r16(≈15.5px)，非 r12 */
    overflow: hidden;
  }
  &__photo {
    position: relative;
    height: 880rpx; /* C14 实测 440px */
    background-color: $bg-card-2;
  }
  &__photo-img { width: 100%; height: 100%; display: block; }
  &__photo-dot {
    position: absolute;
    top: 24rpx;
    left: 24rpx;
    width: 40rpx;
    height: 40rpx;
    border-radius: 50%;
    background-color: $dot-booked; /* C14 实测已反馈红点 #E37B76 */
  }
  &__meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 32rpx; /* C14 实测：照片卡总高 490 = 图440 + meta50（上下各16px） */
  }
  &__meta-name { color: $text-2; font-size: 26rpx; }
  &__meta-badge {
    color: $gold;
    font-size: 22rpx;
    padding: 2rpx 16rpx;
    background-color: $badge-gold-bg; /* 金 14% 软底（C14 实测 D9A735@14%） */
    border-radius: 999rpx;

    &--done { color: $tip-green; background-color: $badge-green-bg; }
  }

  /* ④⑥ 标签与选项 */
  &__label {
    padding: 40rpx 8rpx 16rpx; /* C14 实测 pad 4/20/8 */
    color: $text-3;
    font-size: 28rpx;
  }
  &__options {
    display: flex;
    flex-wrap: wrap;
    gap: 16rpx;

    /* C14 实测：优先级行胶囊 h40（修改类型行 h36），故内距 +4rpx */
    &--pri .page-fb__pill { padding: 20rpx 32rpx; }
  }
  &__pill {
    display: inline-flex;
    align-items: center;
    padding: 16rpx 32rpx; /* C14 实测 h36 pad 16/8/10 */
    color: $text-3;
    font-size: 28rpx;
    border: 1rpx solid $border-2;
    border-radius: 999rpx;

    &--on {
      color: #17181C;
      font-weight: 500;
      background-color: $text-1;
      border-color: $text-1;
    }
  }

  /* ⑤ 修改说明 */
  &__textarea {
    box-sizing: border-box;
    width: 100%;
    height: 160rpx;
    padding: 28rpx 32rpx; /* C14 实测 16/14/14 */
    color: $text-1;
    font-size: 30rpx;
    background-color: rgba(247, 248, 248, 0.05); /* C14 实测 Textarea 底为描边极淡底，取白 5% */
    border: 1rpx solid $border-2;
    border-radius: $radius-card; /* C14 描边外缘法：R≈20 图px ≈ r12(12px) */
  }
  &__ph { color: #666666; } /* C14 实测占位灰 #666（稿面唯一裸值，来源注释） */

  /* ⑦ 提示卡 */
  &__tip {
    display: flex;
    align-items: flex-start;
    gap: 16rpx;
    margin-top: 24rpx; /* C14 实测优先级胶囊底 y1025 → 提示卡 y1037（12px） */
    padding: 24rpx 32rpx;
    background-color: $bg-card;
    border-radius: $radius-card; /* C14 角部面积法：R≈24 图px = r12(12px) */
  }
  &__tip-text { color: $text-3; font-size: 26rpx; line-height: 1.6; }

  /* ⑧ 页内双钮（C14 实测在内容流底部而非毛玻璃栏：跳过描边 168.5 / 提交白底 166.5）
     稿按钮高 50px（y1115–1164），小于底栏主钮口径，故本页内联覆写 */
  &__actions {
    display: flex;
    gap: 16rpx;
    margin-top: 24rpx;

    /* 底栏主钮高 58px（116rpx，稿 C11/C05 实测）；次钮减 4rpx 与主钮含描边等齐。
       2026-09-11 口径：$btn-height 已由 112rpx 改为 116rpx，此处原为硬编码 100rpx 需同步。 */
    :deep(.app-btn) { height: 116rpx; }
    :deep(.app-btn--secondary) { height: calc(116rpx - 4rpx); }
  }
}
</style>
