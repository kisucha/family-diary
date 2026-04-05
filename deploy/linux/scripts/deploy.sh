#!/bin/bash
# ============================================================================
# deploy.sh — family-diary 배포 스크립트
# 실행 위치: /opt/family-diary/deploy/linux/scripts/
#
# 사용법:
#   chmod +x deploy.sh
#   ./deploy.sh
# ============================================================================

set -euo pipefail

APP_DIR="/opt/family-diary"
COMPOSE_DIR="${APP_DIR}/deploy/linux"

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

# ── Step 2: Docker 이미지 빌드 ─────────────────────────────────────────
log "Docker 이미지 빌드 중... (3~10분 소요)"
cd "${COMPOSE_DIR}"
docker compose build --no-cache next-app
log "빌드 완료"

# ── Step 3: 컨테이너 재시작 ────────────────────────────────────────────
log "컨테이너 재시작 중..."
docker compose up -d --no-deps next-app
log "재시작 완료"

# ── Step 4: 헬스체크 ───────────────────────────────────────────────────
log "헬스체크 대기 중..."
RETRY=0
MAX_RETRY=12
until curl -sf "http://localhost:4000/api/health" > /dev/null 2>&1; do
    RETRY=$((RETRY + 1))
    if [ $RETRY -ge $MAX_RETRY ]; then
        log "[ERROR] 헬스체크 실패"
        log "로그 확인: docker compose logs --tail=50 next-app"
        exit 1
    fi
    log "  대기 중... (${RETRY}/${MAX_RETRY})"
    sleep 5
done

log "=== 배포 완료: ${COMMIT_HASH} — ${COMMIT_MSG} ==="
