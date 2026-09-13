# ============================================================
# h5 站点（客户端 · SLOT 摄影预约）— 生产镜像
# 两阶段构建：node 编译 uni-app → nginx 托管静态站点
# 产物路径：uni build 输出到 dist/build/h5（uni-app 的 H5 平台目录，非 dist 根目录）
# ============================================================

# ---------- 构建阶段 ----------
FROM node:20-alpine AS builder

# uni-app / esbuild 等依赖在 alpine(musl) 下需要 glibc 兼容层
RUN apk add --no-cache libc6-compat

WORKDIR /app

# 先单独拷贝清单安装依赖：源码变动不会让依赖层缓存失效
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build:h5

# ---------- 运行阶段 ----------
FROM nginx:1.27-alpine

# uni-app 的 H5 产物目录是 dist/build/h5（不是 dist）
COPY --from=builder /app/dist/build/h5 /usr/share/nginx/html
COPY build/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
