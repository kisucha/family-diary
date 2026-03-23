#!/bin/bash
# ============================================================================
# backup.sh — MariaDB 자동 백업 스크립트 (Linux 서버용)
#
# 사용법:
#   chmod +x backup.sh
#   ./backup.sh
#
# 자동화 (Linux cron):
#   0 2 * * * /opt/family-diary/deploy/linux/scripts/backup.sh
#   (매일 새벽 2시 실행)
# ============================================================================

set -euo pipefail    # 에러 발생 시 즉시 중단

# ── 설정 ──────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="/opt/family-diary/backups"
CONTAINER_NAME="family-diary-db"
DATE_STAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/family_planner_${DATE_STAMP}.sql.gz"
KEEP_DAYS=7          # 7일 이상 된 백업 자동 삭제

# .env에서 환경변수 로드
if [ -f "${DEPLOY_DIR}/.env" ]; then
    set -a
    # shellcheck disable=SC1091
    source "${DEPLOY_DIR}/.env"
    set +a
else
    echo "[ERROR] .env 파일을 찾을 수 없습니다: ${DEPLOY_DIR}/.env"
    exit 1
fi

# ── 백업 디렉토리 확인 ──────────────────────────────────────────────────
mkdir -p "${BACKUP_DIR}"

# ── 컨테이너 상태 확인 ─────────────────────────────────────────────────
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "[ERROR] 컨테이너 '${CONTAINER_NAME}' 가 실행중이지 않습니다."
    exit 1
fi

# ── mysqldump 실행 + gzip 압축 ──────────────────────────────────────────
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 백업 시작: ${BACKUP_FILE}"

docker exec "${CONTAINER_NAME}" mysqldump \
    -u root \
    -p"${DB_ROOT_PASSWORD}" \
    --single-transaction \
    --routines \
    --triggers \
    --add-drop-database \
    --databases "${DB_NAME}" \
    2>/dev/null \
    | gzip > "${BACKUP_FILE}"

# ── 백업 결과 확인 ──────────────────────────────────────────────────────
BACKUP_SIZE=$(du -sh "${BACKUP_FILE}" | cut -f1)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 백업 완료: ${BACKUP_FILE} (${BACKUP_SIZE})"

# 백업 파일 무결성 검증 (압축 파일 열림 여부)
if ! gzip -t "${BACKUP_FILE}" 2>/dev/null; then
    echo "[ERROR] 백업 파일이 손상되었습니다: ${BACKUP_FILE}"
    rm -f "${BACKUP_FILE}"
    exit 1
fi

# ── 오래된 백업 정리 ────────────────────────────────────────────────────
echo "[$(date '+%Y-%m-%d %H:%M:%S')] ${KEEP_DAYS}일 이상 된 백업 정리 중..."
find "${BACKUP_DIR}" -name "family_planner_*.sql.gz" \
    -mtime "+${KEEP_DAYS}" \
    -delete \
    -print | while read -r deleted; do
    echo "  삭제: $deleted"
done

# ── 현재 백업 목록 출력 ──────────────────────────────────────────────────
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 현재 백업 목록:"
ls -lh "${BACKUP_DIR}"/family_planner_*.sql.gz 2>/dev/null || echo "  (없음)"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 백업 스크립트 완료"
