# ============================================================================
# Franklin Family Diary — Next.js Dockerfile
# Multi-stage 빌드로 최종 이미지 크기 최소화
# Next.js standalone output 모드 사용 (output: 'standalone' in next.config.js 필요)
# ============================================================================

# ── Stage 1: 의존성 설치 ───────────────────────────────────────────────────
FROM node:20-alpine AS deps
LABEL stage=deps

WORKDIR /app

# Alpine 필수 패키지 (Prisma native 바이너리용)
RUN apk add --no-cache libc6-compat openssl

# 패키지 파일만 먼저 복사 (Docker 레이어 캐시 최적화)
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# 전체 의존성 설치 + Prisma 클라이언트 생성 (빌드에 devDependencies 필요)
RUN npm ci && \
    npx prisma generate

# ── Stage 2: 빌드 ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
LABEL stage=builder

WORKDIR /app

# Stage 1에서 node_modules 복사
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma

# 소스 전체 복사
COPY . .

# 빌드 타임 환경변수 (NEXT_PUBLIC_ 은 빌드 시 번들에 포함됨)
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY

ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

# Next.js 빌드 (standalone 모드)
# next.config.js 에 output: 'standalone' 설정 필요
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PWA_DISABLE=true

# 진단: 빌드 전 핵심 파일 존재 확인
RUN echo "=== app/ files ===" && ls app/ && echo "=== app/(app)/ files ===" && ls "app/(app)/" && echo "=== next.config ===" && head -3 next.config.mjs

RUN npm run build

# ── Stage 3: 프로덕션 런타임 ────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# 보안: root 대신 전용 사용자로 실행
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# standalone 빌드 결과물만 복사 (node_modules 불필요)
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma 바이너리 복사
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs

EXPOSE 4000

ENV PORT=4000
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# standalone 모드 진입점
CMD ["node", "server.js"]
