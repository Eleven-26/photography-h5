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
├── config/env.js          # 接口基址 / 短信 / 微信环境判定
├── constants/enums.js     # 后端枚举字典（唯一状态文案来源，对齐 photography-server 的 enum）
├── styles/tokens.scss     # 设计变量（暗色 #17181C 体系，页面禁止裸写色值）
├── styles/common.scss     # 公共类（.card / .glass-footer / .pressable …）
├── api/common/http.js     # uni.request 封装（401 跳登录 / 业务错误 toast / 防重复提交）
├── api/common/apiPath.js  # 接口路径注册表（唯一来源，前缀 /h5）
├── utils/auth.js · referrer.js · slug.js  # 登录态存储 / 分享来源 / 短链
├── utils/format.js        # 金额/日期/倒计时（前端不做金额运算，只格式化）
├── api/                   # 16 个领域接口模块（字段严格对齐后端 DTO）
├── components/            # 公共组件（App 前缀，easycom 自动注册，无需 import）
├── stores/user.js         # Pinia 登录态
└── pages/                 # 33 个页面（pages.json 注册，命名对应需求文档 v1.3 第 7 章画板编号）
```

## 环境变量

| 变量 | 说明 |
| --- | --- |
| `VITE_API_BASE_URL` | H5 端接口基址；开发默认走 Vite 代理 `/api` |
| `VITE_MP_API_BASE_URL` | 小程序端接口基址（**上线前必填合法 https 域名**；为空会回退 localhost） |
| `VITE_APP_VERSION` | 版本展示（可选） |

> `.env` 与 `.env.*` 已被 `.gitignore` 忽略，clone 后请复制 `.env.example`。

## 构建与部署

- H5：`npm run build:h5` → `dist/build/h5`；Docker 多阶段构建后由 nginx 托管，`/api` 反代到后端。
- 小程序：`npm run build:mp-weixin` → 微信开发者工具导入 `dist/build/mp-weixin`。
- ⚠️ 当前 Dockerfile 只构建 H5；小程序发布链路（appid / 合法域名 / 提审 / 分包）尚未闭合，详见结构审视文档。

## 鉴权与接口约定

- 全站 POST + JSON body；`Authorization: Bearer <token>`。
- 统一响应 `{ code, msg, data, trace_id }`；分页 `{ list, total, page, page_size }`。
- 401 由 `api/common/http.js` 统一清态并跳登录。
- 本项目**只读后端**，不改动 `photography-server` 任何代码。

## 开发纪律（务必遵守）

1. **一比一还原设计稿**：页面开发前必须先对 Ardot 画板逐节点实测，占位页（标注「待对稿」）按稿替换；
2. **字段纪律**：请求/展示字段一律对齐 `photography-server` 的模型与 DDL（biz_order / biz_quote / biz_delivery …），禁止自造字段与状态值，状态文案统一走 `constants/enums.js`；
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

## 已知限制 / 待办

- 小程序链路未闭合（appid、生产基址、Docker 只建 H5）。
- 登录态双源（store 与 storage 并存）、无路由级登录守卫。
- `vue-i18n`、`AppPrice`、`AppTimeline` 未使用；`notification` 等路径空挂。
- 无测试 / 无 CI / 行尾混用。完整清单见 `photography-server/docs/架构/03-结构审视与整改.md`。

## 架构文档

跨仓架构基线维护在 `photography-server` 仓的 `docs/架构/`：
[目录地图](../photography-server/docs/架构/01-目录地图.md) · [系统架构图](../photography-server/docs/架构/02-系统架构图.md) · [结构审视与整改](../photography-server/docs/架构/03-结构审视与整改.md) · [面试要点](../photography-server/docs/架构/04-面试要点.md)。