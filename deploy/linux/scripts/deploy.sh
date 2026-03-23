#!/bin/bash
# ============================================================================
# deploy.sh — 무중단 배포 스크립트 (Linux 서버용)
#
# 사용법:
#   chmod +x deploy.sh
#   ./deploy.sh                    # 최신 코드로 배포
#   ./deploy.sh --skip-backup      # 백업 없이 배포 (긴급 패치)
#   ./deploy.sh --branch hotfix    # 특정 브랜치 배포
#
# 동작 순서:
#   1. DB 백업 (배포 전 안전망)
#   2. git pull (최신 코드)
#   3. docker compose build (이미지 재빌드)
#   4. docker compose up -d (서비스 재시작, 롤링 방식)
#   5. 헬스체크 확인
# ============================================================================

set -euo pipefail

# ── 설정 ──────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"
APP_DIR="/opt/family-diary"
SKIP_BACKUP=false
BRANCH="main"

# ── 인수 파싱 ──────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-backup) SKIP_BACKUP=true; shift ;;
        --branch) BRANCH="$2"; shift 2 ;;
        *) echo "알 수 없는 옵션: $1"; exit 1 ;;
    esac
done

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

# ── Step 1: 배포 전 백업 ───────────────────────────────────────────────
if [ "$SKIP_BACKUP" = false ]; then
    log "배포 전 DB 백업 실행..."
    "${SCRIPT_DIR}/backup.sh"
    log "백업 완료"
else
    log "[WARNING] 백업 건너뜀 (--skip-backup 옵션)"
fi

# ── Step 2: 최신 코드 pull ─────────────────────────────────────────────
log "코드 업데이트 중 (branch: ${BRANCH})..."
cd "${APP_DIR}"
git fetch origin
git checkout "${BRANCH}"
git pull origin "${BRANCH}"

COMMIT_HASH=$(git rev-parse --short HEAD)
COMMIT_MSG=$(git log -1 --pretty=%s)
log "현재 커밋: ${COMMIT_HASH} - ${COMMIT_MSG}"

# ── Step 3: 이미지 빌드 ────────────────────────────────────────────────
log "Docker 이미지 빌드 중... (5-15분 소요)"
cd "${DEPLOY_DIR}"
docker compose build --no-cache next-app
log "빌드 완료"

# ── Step 4: 서비스 재시작 ──────────────────────────────────────────────
log "서비스 재시작..."
# --no-deps: 의존 서비스(mariadb) 재시작 없이 앱만 재시작
docker compose up -d --no-deps next-app
docker compose up -d --no-deps nginx
log "서비스 재시작 완료"

# ── Step 5: 헬스체크 ───────────────────────────────────────────────────
log "헬스체크 대기 중..."
RETRY=0
MAX_RETRY=12     # 최대 60초 대기 (5초 * 12회)
until curl -sf "http://localhost/api/health" > /dev/null 2>&1; do
    RETRY=$((RETRY + 1))
    if [ $RETRY -ge $MAX_RETRY ]; then
        log "[ERROR] 헬스체크 실패 — 이전 버전으로 롤백이 필요할 수 있습니다"
        log "  로그 확인: docker compose logs --tail=50 next-app"
        exit 1
    fi
    log "  대기 중... (${RETRY}/${MAX_RETRY})"
    sleep 5
done

log "헬스체크 통과"
log "배포 완료: ${COMMIT_HASH} - ${COMMIT_MSG}"

# ── 사용하지 않는 이미지 정리 ──────────────────────────────────────────
log "미사용 Docker 이미지 정리..."
docker image prune -f
log "정리 완료"
