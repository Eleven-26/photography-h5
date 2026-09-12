<template>
  <!-- 矢量图标：设计稿 Ardot 原节点导出 SVG（assets 源稿存 .assets-raw/icons/） -->
  <image
    class="app-icon"
    :src="`/static/icons/${name}.svg`"
    :style="styleObj"
    mode="aspectFit"
  />
</template>

<script>
/**
 * AppIcon —— 统一 SVG 图标组件（easycom 自动注册）
 * @prop {String} name  图标名（对应 src/static/icons/<name>.svg，语义命名见 .assets-raw/icons/manifest.json）
 * @prop {Number|String} size 显示尺寸 px（默认 20；设计稿 1x 尺寸见 manifest）
 * 说明：SVG 自带设计稿配色，不需要传色值；
 *      小程序端 image 组件不支持 svg 时可在构建期批量转 PNG，路径不变。
 */
export default {
  name: 'AppIcon',
  props: {
    name: { type: String, required: true },
    size: { type: [Number, String], default: 20 },
  },
  computed: {
    styleObj() {
      const s = Number(this.size) || 20
      return { width: s + 'px', height: s + 'px' }
    },
  },
}
</script>

<style lang="scss" scoped>
.app-icon {
  display: block;
  flex-shrink: 0;
}
</style>
