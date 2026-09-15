<template>
  <view class="page-wrap page-mp">
    <!-- 状态栏占位：H5 固定 44px；MP 端 AppNavBar 已按系统值定位，避免双计 -->
    <!-- #ifdef H5 -->
    <view class="status-bar" />
    <!-- #endif -->
    <AppNavBar title="个人资料" />

    <!-- 手机号：登录凭据，只读。换绑必须走短信验证（后端 dto.ClientProfileUpdateReq 白名单不含 mobile） -->
    <view class="page-mp__note">
      <AppIcon name="info-sm" :size="13" />
      <text class="page-mp__note-text">手机号是登录凭据，如需更换请联系工作室</text>
    </view>

    <view class="page-mp__label"><text>手机号</text></view>
    <view class="page-mp__readonly"><text class="page-mp__readonly-text">{{ form.mobile || '—' }}</text></view>

    <view class="page-mp__label"><text>姓名</text></view>
    <view class="page-mp__input">
      <input
        v-model="form.name"
        class="page-mp__input-el"
        :maxlength="20"
        placeholder="怎么称呼你"
        placeholder-class="page-mp__ph"
      />
    </view>

    <view class="page-mp__label"><text>性别</text></view>
    <view class="page-mp__pills">
      <text
        v-for="g in GENDERS"
        :key="g.value"
        class="page-mp__pill"
        :class="{ 'page-mp__pill--on': form.gender === g.value }"
        @click="form.gender = g.value"
      >{{ g.label }}</text>
    </view>

    <view class="page-mp__label"><text>生日</text></view>
    <view class="page-mp__picker-row">
      <picker
        class="page-mp__picker"
        mode="date"
        :value="form.birthday || ''"
        :end="today"
        @change="onBirthday"
      >
        <view class="page-mp__readonly page-mp__readonly--tappable">
          <text :class="form.birthday ? 'page-mp__readonly-text' : 'page-mp__ph'">
            {{ form.birthday || '选择生日' }}
          </text>
        </view>
      </picker>
      <text v-if="form.birthday" class="page-mp__clear pressable" @click="form.birthday = ''">清除</text>
    </view>

    <view class="page-mp__label"><text>微信号</text></view>
    <view class="page-mp__input">
      <input
        v-model="form.wechat"
        class="page-mp__input-el"
        :maxlength="20"
        placeholder="选填，便于工作室联系你"
        placeholder-class="page-mp__ph"
      />
    </view>

    <view class="page-mp__label"><text>偏好风格</text></view>
    <view class="page-mp__input">
      <input
        v-model="form.prefer_style"
        class="page-mp__input-el"
        :maxlength="20"
        placeholder="如：自然·生活感"
        placeholder-class="page-mp__ph"
      />
    </view>

    <view class="page-mp__label"><text>常用场景</text></view>
    <view class="page-mp__input">
      <input
        v-model="form.prefer_scene"
        class="page-mp__input-el"
        :maxlength="20"
        placeholder="如：户外公园"
        placeholder-class="page-mp__ph"
      />
    </view>

    <view class="page-mp__tip">
      <AppIcon name="bulb" :size="13" />
      <text class="page-mp__tip-text">「偏好风格 / 常用场景」会在提交定制需求时自动带入，省去每次重填。</text>
    </view>

    <view class="page-mp__bottom-space" />
    <AppFooter>
      <AppButton block :loading="saving" @click="onSave">保存</AppButton>
    </AppFooter>
  </view>
</template>

<script>
/**
 * 个人资料（客户中心 → 个人信息）
 *
 * 接口：POST /h5/customer/profile（读）、POST /h5/customer/profile/update（写）—— 均需登录
 * 可改字段**严格对齐后端 dto.ClientProfileUpdateReq**：
 *   name / wechat / gender(male|female|unknown) / birthday(YYYY-MM-DD) / prefer_style / prefer_scene
 * 不包含 mobile —— 手机号是登录凭据（验证码按手机号匹配客户），换绑必须走短信验证；
 * 也不包含 avatar —— 本端尚无上传能力（D1 决策：本轮不做头像上传）。
 *
 * 更新语义（后端按「指针非 nil」判定，见 dto.ClientProfileUpdateReq 注释）：
 *   字段**省略** = 保持原值；传空串 = 清空。
 *   所以本页**每次都提交全部可改字段**（可能有空串）—— 这样才能让客户清掉自己填错的内容。
 *   若只提交非空字段，客户永远删不掉已填的偏好。
 *
 * 校验（后端同源，前端先拦一道以免白跑一趟）：
 *   name 不可为空（后端 BadRequest「姓名不能为空」）；birthday 只收 2006-01-02。
 */
import AppNavBar from '@/components/AppNavBar.vue'
import AppFooter from '@/components/AppFooter.vue'
import AppButton from '@/components/AppButton.vue'
import AppIcon from '@/components/AppIcon.vue'
import { getProfile, updateProfile } from '@/api/customer'
import { useUserStore } from '@/stores/user'

/** 性别取值对齐 crm_customer.gender 列注释（male-男 female-女 unknown-未知） */
const GENDERS = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
  { value: 'unknown', label: '保密' },
]

export default {
  components: { AppNavBar, AppFooter, AppButton, AppIcon },
  data() {
    return {
      GENDERS,
      saving: false,
      form: {
        mobile: '',
        name: '',
        gender: '',
        birthday: '',
        wechat: '',
        prefer_style: '',
        prefer_scene: '',
      },
    }
  },
  computed: {
    /** 生日上限 = 今天（生日不可能在未来） */
    today() {
      const d = new Date()
      const p = (n) => (n < 10 ? '0' + n : String(n))
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
    },
  },
  onLoad() {
    this.load()
  },
  methods: {
    async load() {
      try {
        const p = await getProfile()
        this.form = {
          mobile: p.mobile || '',
          name: p.name || '',
          gender: p.gender || '',
          birthday: p.birthday || '',
          wechat: p.wechat || '',
          prefer_style: p.prefer_style || '',
          prefer_scene: p.prefer_scene || '',
        }
      } catch {
        /* request 层已 toast；401 会被统一带去登录页 */
      }
    },
    onBirthday(e) {
      this.form.birthday = e.detail.value || ''
    },
    async onSave() {
      const name = this.form.name.trim()
      if (!name) {
        uni.showToast({ title: '请填写姓名', icon: 'none' })
        return
      }
      this.saving = true
      try {
        const p = await updateProfile({
          name,
          wechat: this.form.wechat.trim(),
          gender: this.form.gender,
          birthday: this.form.birthday,
          prefer_style: this.form.prefer_style.trim(),
          prefer_scene: this.form.prefer_scene.trim(),
        })
        /* 回写本地缓存：定制需求页等直接读 getCustomer()，不回写会一直用旧值 */
        useUserStore().patchCustomer({
          name: p.name,
          mobile: p.mobile,
          prefer_style: p.prefer_style,
          prefer_scene: p.prefer_scene,
        })
        uni.showToast({ title: '已保存', icon: 'success' })
        setTimeout(() => uni.navigateBack({ delta: 1 }), 600)
      } catch {
        /* request 层已 toast；已填内容保留不清空 */
      } finally {
        this.saving = false
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.page-mp {
  padding-bottom: 240rpx;

  &__note {
    display: flex;
    align-items: flex-start;
    gap: 12rpx;
    margin: 20rpx $page-pad 0;
    padding: 20rpx 24rpx;
    background-color: $bg-card-2;
    border-radius: $radius-cell;
  }
  &__note-text { color: $text-3; font-size: $fs-xs; line-height: 1.6; flex: 1; }

  &__label {
    padding: 40rpx $page-pad 16rpx;
    text { color: $text-3; font-size: 26rpx; font-weight: 600; }
  }

  /* 只读行 & 输入行同规格（描边 r8 pad32），视觉上一致、可读性靠文字色区分 */
  &__readonly {
    margin: 0 $page-pad;
    padding: 32rpx;
    border: 2rpx solid $border-1;
    border-radius: $radius-cell;
    background-color: $bg-card;
    &--tappable { margin: 0; border-color: $border-2; background-color: transparent; }
  }
  &__readonly-text { color: $text-2; font-size: 30rpx; }

  &__input {
    margin: 0 $page-pad;
    padding: 32rpx;
    border: 2rpx solid $border-2;
    border-radius: $radius-cell;
  }
  &__input-el { width: 100%; color: $text-1; font-size: 30rpx; }
  &__ph { color: $text-disabled; }

  &__pills { display: flex; flex-wrap: wrap; gap: 16rpx; margin: 0 $page-pad; }
  &__pill {
    display: inline-flex;
    align-items: center;
    padding: 16rpx 32rpx;
    color: $text-3;
    font-size: 28rpx;
    border: 2rpx solid $border-2;
    border-radius: 999rpx;
    &--on {
      color: #17181C;
      background-color: $text-1;
      border-color: $text-1;
    }
  }

  &__picker-row {
    display: flex;
    align-items: center;
    gap: 24rpx;
    margin: 0 $page-pad;
  }
  &__picker { flex: 1; min-width: 0; }
  &__clear { color: $gold; font-size: $fs-sm; flex-shrink: 0; padding: 16rpx 0; }

  &__tip {
    display: flex;
    align-items: flex-start;
    gap: 16rpx;
    margin: 24rpx $page-pad 0;
    padding: 24rpx 32rpx;
    background-color: $bg-card;
    border-radius: $radius-cell;
  }
  &__tip-text { color: $text-3; font-size: 26rpx; line-height: 1.6; }

  &__bottom-space { height: 32rpx; }
}
</style>
