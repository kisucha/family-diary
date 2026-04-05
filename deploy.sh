#!/bin/bash
# ============================================================================
# deploy.sh — family-diary 배포 스크립트
# 실행 위치: /opt/family-diary/
#
# 사용법:
#   chmod +x deploy.sh
#   ./deploy.sh
# ============================================================================

set -euo pipefail

APP_DIR="/opt/family-diary"
PM2_APP="family-diary"

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

# ── Step 3: pm2 재시작 ─────────────────────────────────────────────────
log "pm2 재시작 중..."
if pm2 list | grep -q "${PM2_APP}"; then
    pm2 reload "${PM2_APP}"
else
    pm2 start ecosystem.config.js --only "${PM2_APP}"
    pm2 save
fi

log "=== 배포 완료: ${COMMIT_HASH} — ${COMMIT_MSG} ==="
