<template>
  <view class="page-wrap page-cx">
    <!-- 状态栏占位：设计稿顶部 Iphone 44px（C27 状态栏 0-44，导航行 44-88）。
         H5 由 .status-bar 固定 44px；MP 端 AppNavBar 已用系统值定位，避免双计。 -->
    <!-- #ifdef H5 -->
    <view class="status-bar" />
    <!-- #endif -->
    <AppNavBar title="定制需求" />

    <!-- ① 说明头卡（C27 实测 #111216 r12 pad20：13@0.5 / 18 Bold / 12@0.5） -->
    <view class="page-cx__hero">
      <text class="page-cx__hero-label">告诉摄影师你想要什么</text>
      <text class="page-cx__hero-title">定制拍摄方案</text>
      <text class="page-cx__hero-sub">不限套餐 · 按需报价 · 1对1沟通</text>
    </view>

    <!-- ② 拍摄类型（C27 实测六胶囊，单选） -->
    <view class="page-cx__label"><text>拍摄类型</text></view>
    <view class="page-cx__pills">
      <text
        v-for="t in TYPES"
        :key="t"
        class="page-cx__pill"
        :class="{ 'page-cx__pill--on': form.type === t }"
        @click="form.type = t"
      >{{ t }}</text>
    </view>

    <!-- ③ 期望拍摄日期（C27 实测 Input r12 描边，文本输入，支持「8月下旬」这类模糊表述） -->
    <view class="page-cx__label"><text>期望拍摄日期</text></view>
    <view class="page-cx__input">
      <input v-model="form.date" class="page-cx__input-el" placeholder="如：2026年8月下旬" placeholder-class="page-cx__ph" />
    </view>

    <!-- ④ 拍摄地点 -->
    <view class="page-cx__label"><text>拍摄地点</text></view>
    <view class="page-cx__input">
      <input v-model="form.address" class="page-cx__input-el" placeholder="如：广州天河区附近" placeholder-class="page-cx__ph" />
    </view>

    <!-- ⑤ 预算范围（C27 实测四胶囊，单选） -->
    <view class="page-cx__label"><text>预算范围</text></view>
    <view class="page-cx__pills">
      <text
        v-for="b in BUDGETS"
        :key="b"
        class="page-cx__pill"
        :class="{ 'page-cx__pill--on': form.budget === b }"
        @click="form.budget = b"
      >{{ b }}</text>
    </view>

    <!-- ⑥ 详细需求（C27 实测 Textarea h100 r12） -->
    <view class="page-cx__label"><text>详细需求</text></view>
    <view class="page-cx__textarea-box">
      <textarea
        v-model="form.detail"
        class="page-cx__textarea"
        :maxlength="500"
        placeholder="人数、风格、特殊要求等"
        placeholder-class="page-cx__ph"
      />
    </view>

    <!-- ⑦ 参考图片（选填，C27 实测虚线框上传位；联调先传 OSS 再随单提交） -->
    <view class="page-cx__label"><text>参考图片（选填）</text></view>
    <view class="page-cx__upload pressable" @click="chooseRefs">
      <!-- C27 实测 28px 图片+ 图标（原画板矢量） -->
      <AppIcon name="image-plus" :size="28" />
      <text class="page-cx__upload-text">上传你喜欢的风格参考图</text>
    </view>
    <view v-if="form.refImages.length" class="page-cx__refs">
      <image
        v-for="(img, i) in form.refImages"
        :key="i"
        class="page-cx__ref-img"
        :src="img"
        mode="aspectFill"
      />
    </view>

    <!-- ⑧ 提示卡（C27 实测 #1D1E22） -->
    <view class="page-cx__tip">
      <AppIcon name="info-sm" :size="13" />
      <text class="page-cx__tip-text">提交后摄影师将在24小时内给你一份定制报价方案。你可以与摄影师在线沟通确认细节后再支付定金。</text>
    </view>

    <!-- ⑨ 毛玻璃底栏：block 白胶囊（C27 实测） -->
    <AppFooter>
      <AppButton block :loading="submitting" @click="onSubmit">提交定制需求</AppButton>
    </AppFooter>
  </view>
</template>

<script>
/**
 * C27 定制需求（画板 1:1387 一比一还原）
 * 业务口径②：定制需求一律走报价（custom_request → 线索 → 报价），不走快捷直约
 * 数据源：biz_custom_request（type/date/address/budget/detail/ref_images）→ submitCustomRequest
 * 预算/类型为稿面固定枚举；联调时如需 photographers 端可配置再改接口驱动。
 * ⚠️ 摄影师姓名后端未下发（studio/info 无该字段、package 亦无），页内不再写死姓名，
 *    文案统一用「摄影师」泛称。
 */
import AppNavBar from '@/components/AppNavBar.vue'
import AppFooter from '@/components/AppFooter.vue'
import AppButton from '@/components/AppButton.vue'
import { submitCustomRequest } from '@/api/customRequest'

const TYPES = ['家庭纪念', '个人写真', '情侣/婚纱', '儿童写真', '活动跟拍', '其他']
const BUDGETS = ['¥1,000以内', '¥1,000-3,000', '¥3,000-5,000', '¥5,000以上']

export default {
  components: { AppNavBar, AppFooter, AppButton },
  data() {
    return {
      TYPES,
      BUDGETS,
      form: {
        type: '家庭纪念',
        date: '',
        address: '',
        budget: '¥1,000-3,000',
        detail: '',
        refImages: [],
      },
      submitting: false,
    }
  },
  methods: {
    chooseRefs() {
      uni.chooseImage({
        count: 4,
        success: (res) => {
          /* 联调：先上传 OSS 存 URL，当前暂存本地路径（提交前必须完成上传） */
          this.form.refImages = [...this.form.refImages, ...(res.tempFilePaths || [])].slice(0, 4)
        },
      })
    },
    async onSubmit() {
      if (!this.form.detail.trim()) {
        uni.showToast({ title: '请描述你的详细需求', icon: 'none' }) /* 输入保留 */
        return
      }
      this.submitting = true
      try {
        await submitCustomRequest({
          type: this.form.type,
          expect_date: this.form.date,
          address: this.form.address,
          budget: this.form.budget,
          detail: this.form.detail,
          ref_images: this.form.refImages,
        })
        uni.showToast({ title: '需求已提交，等待报价', icon: 'success' })
        /* 定制流程：线索 → 报价 → C06 确认（无直约，口径②） */
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
.page-cx {
  padding-bottom: 240rpx;

  /* ① 说明头卡 */
  &__hero {
    display: flex;
    flex-direction: column;
    margin: 20rpx $page-pad 0;
    box-sizing: border-box;
    height: 236rpx; /* C27 实测头卡 98-215.5，高 118 */
    padding: 40rpx;
    background-color: $bg-deep; /* C27 实测 #111216 */
    border-radius: $radius-card;
  }
  &__hero-label { color: rgba(247, 248, 248, 0.5); font-size: 26rpx; }
  &__hero-title { color: $text-1; font-size: 36rpx; font-weight: 600; margin-top: 16rpx; }
  &__hero-sub { color: rgba(247, 248, 248, 0.5); font-size: 24rpx; margin-top: 16rpx; }

  &__label {
    padding: 40rpx $page-pad 16rpx; /* 2026-09-07 对表修正：原 8rpx 依赖全局页边距，现区块自带 */
    text { color: $text-3; font-size: 26rpx; font-weight: 600; }
  }

  /* ②⑤ 胶囊（C27 实测 h36 pad 16/8/10） */
  &__pills {
    display: flex;
    flex-wrap: wrap;
    gap: 16rpx;
    margin: 0 $page-pad;
  }
  &__pill {
    display: inline-flex;
    align-items: center;
    padding: 16rpx 32rpx;
    color: $text-3;
    font-size: 28rpx;
    border: 2rpx solid $border-2; /* C27 实测描边 1px */
    border-radius: 999rpx;

    &--on {
      color: #17181C;
      background-color: $text-1;
      border-color: $text-1;
    }
  }

  /* ③④ 输入框（C27 实测 343×50，r8 描边 pad 32/16） */
  &__input {
    margin: 0 $page-pad;
    padding: 32rpx;
    border: 2rpx solid $border-2;
    border-radius: $radius-cell;
  }
  &__input-el { width: 100%; color: $text-1; font-size: 30rpx; }
  &__ph { color: $text-disabled; }

  /* ⑥ 详细需求：C27 实测外框 343×100（r8），文本行高 23px */
  &__textarea-box {
    margin: 0 $page-pad;
    padding: 28rpx 32rpx;
    border: 2rpx solid $border-2;
    border-radius: $radius-cell;
  }
  &__textarea {
    box-sizing: border-box;
    width: 100%;
    height: 142rpx; /* C27 实测：外框 100 − 上下 pad 14×2 */
    line-height: 46rpx; /* C27 实测行距 23px */
    color: $text-1;
    font-size: 30rpx;
  }

  /* ⑦ 参考图上传位（C27 实测虚线框 343×98.5） */
  &__upload {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16rpx;
    margin: 0 $page-pad;
    padding: 44rpx;
    border: 2rpx dashed $border-2; /* C27 实测为虚线框 */
    border-radius: $radius-cell;
  }
  &__upload-text { color: $text-disabled; font-size: 26rpx; }
  &__refs {
    display: flex;
    gap: 16rpx;
    margin: 16rpx $page-pad 0;
  }
  &__ref-img {
    width: 140rpx;
    height: 140rpx;
    border-radius: $radius-cell;
    background-color: $bg-card;
  }

  /* ⑧ 提示卡（C27 实测 #1D1E22，顶距 10px） */
  &__tip {
    display: flex;
    align-items: flex-start;
    gap: 16rpx;
    margin: 20rpx $page-pad 0;
    padding: 24rpx 32rpx;
    background-color: $bg-card;
    border-radius: $radius-cell;
  }
  &__tip-text { color: $text-3; font-size: 26rpx; line-height: 1.6; }
}
</style>
