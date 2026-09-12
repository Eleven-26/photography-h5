# photography-h5 —— SLOT 摄影预约 · 客户端

uni-app（Vue 3）一套代码 → **H5（微信内 + 普通浏览器）+ 微信小程序** 双端编译。

## 启动

```bash
npm install          # 版本号已锁定（dist-tag vue3，2026-09-07 实测）
npm run dev:h5       # H5 开发（http://localhost:5173）
npm run dev:mp-weixin # 小程序开发 → 用微信开发者工具导入 dist/dev/mp-weixin
```

> 小程序端需在 `src/manifest.json` 的 `mp-weixin.appid` 填入真实 AppID。

## 目录约定

```
src/
├── config/enums.js     # 后端枚举字典（唯一状态文案来源，对齐 photography-server DDL）
├── config/env.js       # 接口基址 / 微信环境判定
├── styles/tokens.scss  # 设计变量（暗色 #17181C 体系，页面禁止裸写色值）
├── styles/common.scss  # 公共类（.card / .glass-footer / .pressable …）
├── utils/request.js    # uni.request 封装（401 跳登录 / 业务错误 toast / 防重复提交）
├── utils/format.js     # 金额/日期/倒计时（前端不做金额运算，只格式化）
├── api/                # 接口模块（字段严格对齐后端 DTO，注释标注来源表）
├── components/         # 公共组件（App 前缀，easycom 自动注册，无需 import）
├── store/user.js       # Pinia 登录态
└── pages/              # 页面（pages.json 注册，命名对应需求文档 v1.3 第 7 章画板编号）
```

## 开发纪律（务必遵守）

1. **一比一还原设计稿**：页面开发前必须先对 Ardot 画板逐节点实测，占位页（标注「待对稿」）按稿替换；
2. **字段纪律**：请求/展示字段一律对齐 `photography-server` DDL（biz_order / biz_quote / biz_delivery …），禁止自造字段与状态值，状态文案统一走 `config/enums.js`；
3. **禁词**：核验 / 原路退回 / 平台支付 / 拒绝报价 —— 全链路不得出现（确认单 B9）；
4. **三口径**：①无拒绝报价（只有「提出修改」）②直约仅限已上架完整套餐 ③选片超时不自动确认，通知双方；
5. **资金边界**：支付只做「客户标记已转账」登记，无支付接口调用；
6. **交互底线**：触摸目标 ≥ 44px、异步必有 loading、出错保留输入、`prefers-reduced-motion`；
7. **只读后端**：本项目不改动 photography-server 任何代码。

## 设计 token 速查

| 变量 | 值 | 用途 |
|---|---|---|
| `$bg-page` | `#17181C` | 页面底 |
| `$bg-card` | `#1D1E22` | 卡片底 |
| `$gold` | `#D9A735` | 点缀/强调 |
| `$text-1 / $text-2` | `#F7F8F8 / #85878D` | 主/次文字 |
| `$btn-height` | `112rpx` | 底栏按钮统一高 56px |
| `$btn-width-main` | `686rpx` | 主钮宽 343px |
