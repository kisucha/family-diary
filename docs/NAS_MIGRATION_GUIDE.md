# NAS 마이그레이션 절차서

Franklin Family Diary — 로컬 PC (Windows 11) → NAS Docker 전환 가이드

작성일: 2026-03-02

---

## 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────┐
│                    현재 구성 (마이그레이션 전)                    │
│                                                             │
│  Windows 11 PC                                              │
│  ├── Next.js (dev server, npm run dev)                      │
│  ├── MariaDB (로컬 설치, port 3306)                          │
│  └── Supabase Realtime (외부 클라우드)                        │
└─────────────────────────────────────────────────────────────┘

                          ↓ 마이그레이션

┌─────────────────────────────────────────────────────────────┐
│                    목표 구성 (마이그레이션 후)                    │
│                                                             │
│  Synology / QNAP NAS                                        │
│  └── Docker Compose                                         │
│        ├── nginx (80/443 → 리버스 프록시)                    │
│        ├── next-app (port 3000, 내부망)                      │
│        └── mariadb (named volume, 내부망)                    │
│                                                             │
│  외부 접근 ──────────────────────────────────────────────    │
│  [옵션 A] 인터넷 → 공유기 포트포워딩 → NAS:443 → Nginx        │
│  [옵션 B] 인터넷 → Tailscale VPN → NAS:443 → Nginx           │
│  [옵션 C] 인터넷 → Cloudflare Tunnel → NAS:80 → Nginx        │
└─────────────────────────────────────────────────────────────┘
```

---

## 외부 접근 방법 비교

| 항목 | A. DDNS + 포트포워딩 | B. Tailscale (VPN) | C. Cloudflare Tunnel |
|------|---------------------|-------------------|---------------------|
| 비용 | 무료 (DDNS 서비스) | 무료 (개인 플랜) | 무료 |
| 설정 난이도 | 중간 | 쉬움 | 쉬움 |
| 보안 수준 | 중간 (포트 노출) | 높음 (VPN 암호화) | 높음 (CF 보호) |
| HTTPS | Let's Encrypt 직접 설정 | VPN 내부 HTTP 가능 | CF가 자동 처리 |
| 공유기 설정 필요 | 있음 | 없음 | 없음 |
| 외부 서비스 의존 | DDNS 서버 | Tailscale 서버 | Cloudflare |
| IP 변경 대응 | DDNS 클라이언트 | 자동 | 자동 |
| 비가족원 초대 | URL 공유 가능 | 앱 설치 필요 | URL 공유 가능 |
| 추천 대상 | 고정IP or DDNS 경험자 | 기술에 익숙한 가족 | 가장 간편하게 |

### 권장 선택: Cloudflare Tunnel

이유:
- 공유기 포트 개방 불필요 → 공격 표면 최소화
- 무료 + HTTPS 자동 처리
- NAS에서 outbound 연결만 사용 (방화벽 통과 용이)
- Synology/QNAP 패키지 지원 있음

---

## Part 1. NAS 사전 준비

### 1-1. NAS Docker 환경 확인

```bash
# SSH로 NAS 접속 후 확인
docker --version          # Docker 20.x 이상 권장
docker compose version    # Compose V2 (docker compose, 하이픈 없음)

# Synology: Container Manager 패키지 설치 (DSM 7.2+)
# QNAP: Container Station 설치
```

### 1-2. NAS 디렉토리 구조 생성

```bash
# Synology 기준 경로 (공유 폴더: docker)
sudo mkdir -p /volume1/docker/family-diary/deploy
sudo mkdir -p /volume1/docker/family-diary/deploy/nginx/conf.d
sudo mkdir -p /volume1/docker/family-diary/deploy/nginx/certs
sudo mkdir -p /volume1/docker/family-diary/deploy/nginx/html
sudo mkdir -p /volume1/docker/family-diary/deploy/mariadb
sudo mkdir -p /volume1/docker/family-diary/deploy/init-db
sudo mkdir -p /volume1/docker/family-diary/deploy/scripts
sudo mkdir -p /volume1/docker/family-diary/backups

# QNAP 기준 경로
# /share/Container/family-diary/ 하위에 동일하게 생성
```

### 1-3. 프로젝트 파일 NAS로 전송

```bash
# Windows PC에서 실행 (Git 사용)
# 방법 1: git 저장소를 NAS에 클론
# NAS SSH에서:
cd /volume1/docker/family-diary
git clone https://github.com/your-repo/family-diary.git app
cd app

# 방법 2: SCP로 직접 전송 (Git 없는 경우)
# Windows PowerShell에서:
scp -r "C:\Develop\다이어리\deploy\nas\*" nas-user@192.168.0.100:/volume1/docker/family-diary/deploy/
scp -r "C:\Develop\다이어리\Dockerfile" nas-user@192.168.0.100:/volume1/docker/family-diary/app/
```

---

## Part 2. MariaDB 데이터 마이그레이션

### 2-1. 로컬 PC 데이터 덤프 (Windows)

```cmd
# Windows 명령 프롬프트에서 실행

# 방법 A: mysqldump (MariaDB 설치된 경우)
"C:\Program Files\MariaDB 11.x\bin\mysqldump.exe" ^
  -u root -p ^
  --single-transaction ^
  --routines ^
  --triggers ^
  --databases family_planner ^
  > C:\Develop\다이어리\deploy\migration\backup_20260302.sql

# 방법 B: Docker를 이미 사용 중인 경우
docker exec family-diary-db mysqldump \
  -u root -p${DB_ROOT_PASSWORD} \
  --single-transaction \
  --routines \
  --triggers \
  --databases family_planner \
  > backup_20260302.sql
```

덤프 파일 검증:

```cmd
# 파일 크기 확인
dir C:\Develop\다이어리\deploy\migration\backup_20260302.sql

# 내용 일부 확인 (처음 30줄)
type C:\Develop\다이어리\deploy\migration\backup_20260302.sql | more
```

### 2-2. 덤프 파일을 NAS로 전송

```bash
# Windows PowerShell에서
scp "C:\Develop\다이어리\deploy\migration\backup_20260302.sql" \
    nas-user@192.168.0.100:/volume1/docker/family-diary/backups/

# 또는 Synology File Station / QNAP File Manager로 업로드
```

### 2-3. NAS에서 MariaDB 컨테이너 기동 (앱 없이 DB만)

```bash
# NAS SSH에서
cd /volume1/docker/family-diary/deploy

# .env 파일 생성
cp .env.example .env
vi .env    # 실제 값으로 수정

# DB 서비스만 먼저 기동
docker compose up -d mariadb

# 헬스체크 통과 확인 (healthy 상태가 될 때까지 대기)
docker compose ps
# 출력 예시:
# family-diary-db   Up (healthy)
```

### 2-4. 덤프 파일 임포트

```bash
# 방법 A: docker exec 사용 (권장)
docker exec -i family-diary-db mysql \
  -u root -p${DB_ROOT_PASSWORD} \
  < /volume1/docker/family-diary/backups/backup_20260302.sql

# 방법 B: 컨테이너 내부로 파일 복사 후 임포트
docker cp /volume1/docker/family-diary/backups/backup_20260302.sql \
    family-diary-db:/tmp/backup.sql

docker exec family-diary-db bash -c \
    "mysql -u root -p\${MARIADB_ROOT_PASSWORD} < /tmp/backup.sql"
```

### 2-5. 임포트 검증

```bash
# DB 접속해서 확인
docker exec -it family-diary-db mysql \
  -u root -p${DB_ROOT_PASSWORD} \
  family_planner

# MySQL 프롬프트에서:
SHOW TABLES;
# 예상 출력: 13개 테이블 확인
# families, users, invite_tokens, profiles, goals,
# daily_plans, plan_items, appointments, family_events,
# notes, family_announcements, emotion_checkins, family_goals

SELECT COUNT(*) FROM users;         -- 기존 사용자 수 확인
SELECT COUNT(*) FROM daily_plans;   -- 기존 계획 수 확인
SELECT COUNT(*) FROM family_events; -- 기존 이벤트 수 확인

EXIT;
```

---

## Part 3. 전체 스택 기동

### 3-1. Prisma 마이그레이션 상태 확인

```bash
# NAS에서 (앱 빌드 전)
cd /volume1/docker/family-diary/app

# Prisma migrate deploy: 미적용 마이그레이션 적용
# (로컬에서 prisma migrate dev로 생성한 마이그레이션 파일 필요)
docker run --rm \
  --network family-diary-deploy_diary-internal \
  -e DATABASE_URL="mysql://${DB_USER}:${DB_PASSWORD}@mariadb:3306/${DB_NAME}" \
  -v $(pwd)/prisma:/app/prisma \
  node:20-alpine \
  sh -c "npm install prisma && npx prisma migrate deploy"

# 주의: mysqldump로 가져온 경우 테이블이 이미 존재하므로
# baseline 마이그레이션 설정이 필요할 수 있음
# 이 경우: npx prisma migrate resolve --applied "migration_name"
```

### 3-2. Docker 이미지 빌드 및 전체 스택 기동

```bash
cd /volume1/docker/family-diary/deploy

# 이미지 빌드 (초기 빌드는 5-15분 소요)
docker compose build

# 전체 기동
docker compose up -d

# 기동 상태 확인
docker compose ps

# 로그 확인 (각 서비스)
docker compose logs -f next-app    # Next.js 로그
docker compose logs -f mariadb     # MariaDB 로그
docker compose logs -f nginx       # Nginx 로그
```

### 3-3. 내부망 접근 테스트

```bash
# NAS에서 직접 테스트
curl -I http://localhost/api/health

# 다른 PC/스마트폰에서 (같은 WiFi)
# 브라우저에서 http://192.168.0.100 접속
# (192.168.0.100은 NAS IP로 교체)
```

---

## Part 4. 외부 접근 설정

### 4A. Cloudflare Tunnel 설정 (권장)

```bash
# 전제: Cloudflare에 도메인 등록 완료

# Step 1: NAS에서 cloudflared 설치
# Synology: cloudflared를 Docker로 실행
docker run -d \
  --name cloudflared \
  --restart unless-stopped \
  --network family-diary-deploy_diary-external \
  cloudflare/cloudflared:latest \
  tunnel --no-autoupdate run \
  --token YOUR_CLOUDFLARE_TUNNEL_TOKEN

# Step 2: Cloudflare Dashboard에서
# Zero Trust > Networks > Tunnels > Create Tunnel
# Public Hostname 설정:
#   Subdomain: diary
#   Domain: yourdomain.com
#   Service: http://nginx:80
#             (컨테이너 서비스명으로 접근)
```

Cloudflare Tunnel 사용 시 nginx.conf 변경:
- `nginx/conf.d/app.conf` 에서 MODE B 섹션 활성화
- MODE A (HTTPS) 블록 주석 처리

### 4B. DDNS + 포트포워딩 설정

```bash
# Step 1: DDNS 설정
# 무료 서비스: DuckDNS (duckdns.org), 내도메인.한국
# Synology 내장: DSM > 제어판 > 외부 액세스 > DDNS

# Step 2: 공유기 포트포워딩
# 공유기 관리 페이지 접속 (보통 192.168.0.1)
# 포트포워딩 규칙 추가:
#   외부포트 443 → NAS IP:443 (HTTPS)
#   외부포트 80  → NAS IP:80  (ACME 챌린지용)

# Step 3: Let's Encrypt 인증서 발급 (NAS에서)
docker run --rm \
  -v /volume1/docker/family-diary/deploy/nginx/certs:/etc/letsencrypt \
  -v /volume1/docker/family-diary/deploy/nginx/html:/var/www/html \
  -p 80:80 \
  certbot/certbot certonly \
  --webroot \
  --webroot-path=/var/www/html \
  --email your@email.com \
  --agree-tos \
  --no-eff-email \
  -d diary.yourdomain.com

# 발급된 인증서 복사
cp /volume1/docker/family-diary/deploy/nginx/certs/live/diary.yourdomain.com/fullchain.pem \
   /volume1/docker/family-diary/deploy/nginx/certs/fullchain.pem
cp /volume1/docker/family-diary/deploy/nginx/certs/live/diary.yourdomain.com/privkey.pem \
   /volume1/docker/family-diary/deploy/nginx/certs/privkey.pem
```

### 4C. Tailscale 설정

```bash
# Step 1: NAS에 Tailscale 설치
# Synology: SynoCommunity 패키지 또는 Docker 방식
docker run -d \
  --name tailscaled \
  --restart unless-stopped \
  --cap-add NET_ADMIN \
  --cap-add NET_RAW \
  --network host \
  -v /var/lib/tailscale:/var/lib/tailscale \
  tailscale/tailscale:latest

docker exec tailscaled tailscale up

# Step 2: Tailscale IP 확인 후 접속
# 각 가족 구성원 스마트폰에 Tailscale 앱 설치
# 같은 계정으로 로그인 시 VPN 터널 자동 생성
# 접속: http://100.x.x.x (Tailscale IP)
```

---

## Part 5. 마이그레이션 완료 검증

### 기능 체크리스트

```
로그인 관련
[ ] 기존 계정으로 로그인 성공
[ ] JWT 세션이 정상 발급되는지 확인
[ ] 초대 토큰 생성 기능 동작 확인

데이터 정합성
[ ] 기존 일일 계획 데이터 정상 조회
[ ] 기존 가족 이벤트 정상 표시
[ ] 프로필/사명서 데이터 유지

실시간 기능
[ ] Supabase Realtime 연결 성공 (가족 캘린더)
[ ] 다른 기기에서 이벤트 추가 시 실시간 반영

외부 접근
[ ] 모바일 데이터(WiFi 끄고) 에서 접속 확인
[ ] HTTPS 인증서 유효 확인 (브라우저 자물쇠 아이콘)
```

---

## 다운타임 최소화 전략

가족 5명 소규모 앱이므로 유지보수 시간을 미리 공지하는 방식으로 충분합니다.
예상 다운타임: mysqldump 완료 후 NAS 기동까지 약 15-30분.

```
1. 저녁 취침 시간대 작업 (예: 23:00)
2. 가족 단톡방에 "30분 다이어리 점검" 공지
3. mysqldump 실행 (데이터 크기에 따라 1-5분)
4. NAS로 파일 전송 (1-2분)
5. docker compose up -d (5-10분, 빌드 포함)
6. 접속 확인 후 완료 공지
```
