# =========================
# 1️⃣ Build Stage
# =========================
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# =========================
# 2️⃣ Production Stage
# =========================
FROM node:20-alpine

ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=2048"

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app .

# Install PM2
RUN npm install -g pm2

EXPOSE 5000

# ✅ Run Node in cluster mode
CMD ["pm2-runtime", "main.js", "-i", "max"]

