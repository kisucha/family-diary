#!/bin/bash
# ============================================================================
# deploy.sh — family-diary 배포 스크립트
# 실행 위치: /opt/family-diary/
#
# 사용법:
#   ./deploy.sh
# ============================================================================

set -euo pipefail

APP_DIR="/opt/family-diary"
PM2_APP="family-diary"
APP_URL="http://localhost:4000"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

log "=== 배포 시작 ==="

# ── Step 1: 최신 코드 pull ─────────────────────────────────────────────
cd "${APP_DIR}"
git config --global --add safe.directory "${APP_DIR}" 2>/dev/null || true
git fetch origin
git reset --hard origin/main

COMMIT_HASH=$(git rev-parse --short HEAD)
COMMIT_MSG=$(git log -1 --pretty=%s)
log "커밋: ${COMMIT_HASH} — ${COMMIT_MSG}"

# ── Step 2: 의존성 설치 ────────────────────────────────────────────────
log "의존성 확인 중..."
npm install --legacy-peer-deps

# ── Step 3: 빌드 ───────────────────────────────────────────────────────
log "빌드 중... (시간이 걸릴 수 있습니다)"
# next-pwa 서비스 워커가 캐시된 HTML을 serving해 hydration 불일치를 유발하므로 비활성화
NEXT_PWA_DISABLE=true npm run build

# ── Step 5: pm2 재시작 ─────────────────────────────────────────────────
log "pm2 재시작 중..."
if pm2 list | grep -q "${PM2_APP}"; then
    pm2 reload "${PM2_APP}"
else
    pm2 start ecosystem.config.js --only "${PM2_APP}"
    pm2 save
fi

# ── Step 6: 서버 준비 확인 ─────────────────────────────────────────────
log "서버 준비 대기 중..."
RETRY=0
until curl -sf "${APP_URL}/api/health" > /dev/null 2>&1; do
    RETRY=$((RETRY + 1))
    if [ $RETRY -ge 24 ]; then
        log "[WARN] 서버 응답 없음 — warm-up 건너뜀"
        break
    fi
    sleep 5
done

if curl -sf "${APP_URL}/api/health" > /dev/null 2>&1; then
    log "warm-up 중... (주요 페이지 미리 컴파일)"
    for path in "/" "/dashboard" "/planner" "/notes" "/calendar" "/announcements"; do
        curl -sf "${APP_URL}${path}" > /dev/null 2>&1 || true
        log "  컴파일: ${path}"
    done
    log "warm-up 완료"
fi

log "=== 배포 완료: ${COMMIT_HASH} — ${COMMIT_MSG} ==="
