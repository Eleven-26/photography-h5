// ESLint 扁平配置 —— lint 底线：只拦真实问题，不做风格强制
//
// 与 SLOT 管理端 photography-frontend/eslint.config.js 同一套底线，
// 差异只有两点（uni-app 项目特性）：
//   1. 纯 JS（无 TypeScript），因此去掉 typescript-eslint；
//   2. 追加 uni-app 全局变量（uni / wx / plus / getCurrentPages / getApp）。
//
// 目标：把「未使用变量 / 未定义标识符 / debugger 残留 / Vue 基础反模式」这类会造成
// 运行期问题或调试残留的代码拦在提交前。**不启用格式类规则**（不引入 Prettier），
// 避免对既有页面一次性产生数千行无意义 diff。
//
// 用法：npm run lint（只报不改） / npm run lint:fix（自动修可修项） / npm run verify
import js from '@eslint/js'
import globals from 'globals'
import pluginVue from 'eslint-plugin-vue'

export default [
  // 忽略产物、依赖与设计稿原始素材
  {
    ignores: [
      'dist/**',
      'unpackage/**',
      'node_modules/**',
      '.assets-raw/**',
      '**/*.d.ts',
    ],
  },

  js.configs.recommended,
  // 只取 Vue 3 essential（基础正确性规则）；不用 recommended，避免风格规则淹没真实问题
  ...pluginVue.configs['flat/essential'],

  {
    files: ['**/*.{js,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        // ── uni-app 全局对象（小程序 / H5 双端）────────────────
        uni: 'readonly',
        wx: 'readonly',
        plus: 'readonly',
        getCurrentPages: 'readonly',
        getApp: 'readonly',
        UniApp: 'readonly',
        __uniConfig: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // 运行期风险 / 调试残留：直接报错
      'no-debugger': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // 本项目的页面组件按页面命名（如 index.vue），不强制多词
      'vue/multi-word-component-names': 'off',
    },
  },

  // 配置文件按 Node 环境处理
  {
    files: ['*.{js,mjs,cjs}'],
    languageOptions: { globals: { ...globals.node } },
  },
]
