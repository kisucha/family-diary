#!/bin/bash
# ============================================================================
# logs.sh — 로그 조회 유틸리티
#
# 사용법:
#   ./logs.sh               # 전체 로그 (최근 100줄)
#   ./logs.sh app           # Next.js 로그만
#   ./logs.sh db            # MariaDB 로그만
#   ./logs.sh nginx         # Nginx 로그만
#   ./logs.sh app -f        # Next.js 로그 실시간 팔로우
#   ./logs.sh errors        # 모든 서비스 ERROR 로그 검색
# ============================================================================

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

case "${1:-all}" in
    app|next)
        docker compose -f "${DEPLOY_DIR}/docker-compose.yml" \
            logs "${@:2}" --tail=100 next-app
        ;;
    db|mariadb)
        docker compose -f "${DEPLOY_DIR}/docker-compose.yml" \
            logs "${@:2}" --tail=100 mariadb
        ;;
    nginx)
        docker compose -f "${DEPLOY_DIR}/docker-compose.yml" \
            logs "${@:2}" --tail=100 nginx
        ;;
    errors)
        echo "=== Next.js 에러 ==="
        docker compose -f "${DEPLOY_DIR}/docker-compose.yml" \
            logs --tail=200 next-app 2>&1 | grep -i "error\|warn\|exception" || true
        echo ""
        echo "=== Nginx 에러 ==="
        docker compose -f "${DEPLOY_DIR}/docker-compose.yml" \
            logs --tail=200 nginx 2>&1 | grep -v "200\|304" | grep -E "^.*\[error\]|5[0-9]{2}" || true
        ;;
    status)
        docker compose -f "${DEPLOY_DIR}/docker-compose.yml" ps
        echo ""
        echo "=== 디스크 사용량 ==="
        docker system df
        echo ""
        echo "=== DB 볼륨 크기 ==="
        docker volume inspect family-diary-deploy_family-diary-db-data \
            --format '{{.Mountpoint}}' | xargs du -sh 2>/dev/null || \
            echo "볼륨 크기 확인 불가 (권한 필요)"
        ;;
    all|*)
        docker compose -f "${DEPLOY_DIR}/docker-compose.yml" \
            logs --tail=100
        ;;
esac
