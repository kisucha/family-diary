# NAS 배포 셋업 체크리스트

마이그레이션 시작 전 이 체크리스트를 순서대로 완료하세요.

---

## Phase 0. 코드 수정 (PC에서)

### Next.js standalone 빌드 설정

`next.config.js` (또는 `next.config.ts`) 에 아래 추가:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',    // Docker 배포에 필수
  // 기존 설정들...
};

module.exports = nextConfig;
```

standalone 모드란: Next.js가 프로덕션 실행에 필요한 최소 파일만
`.next/standalone/` 디렉토리에 패키징합니다.
`node_modules` 전체를 복사할 필요 없어 Docker 이미지가 대폭 작아집니다.

### .gitignore 확인

```
# 아래 항목이 .gitignore에 있는지 확인
.env
.env.local
.env.production
deploy/nas/.env
```

### API 헬스체크 엔드포인트 추가

`app/api/health/route.ts` 파일 생성:

```typescript
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
}
```

이 엔드포인트는 docker-compose healthcheck 와 deploy.sh 에서 사용됩니다.

---

## Phase 1. NAS 준비

- [ ] NAS Docker 지원 확인 (Synology: Container Manager, QNAP: Container Station)
- [ ] NAS SSH 접근 활성화 확인
- [ ] NAS IP 주소 고정 설정 (공유기에서 MAC 기반 고정 IP 할당)
- [ ] NAS 디스크 여유 공간 확인 (최소 10GB 권장)

---

## Phase 2. 파일 전송

- [ ] 프로젝트 코드를 NAS로 전송 (git clone 또는 SCP)
- [ ] `deploy/nas/` 디렉토리를 NAS로 복사
- [ ] `.env.example` 을 `.env` 로 복사하고 실제 값 입력
- [ ] 스크립트 실행 권한 부여:
  ```bash
  chmod +x /volume1/docker/family-diary/deploy/scripts/*.sh
  ```

---

## Phase 3. 환경변수 설정 (.env)

`.env` 파일에서 확인해야 할 항목:

- [ ] `DB_ROOT_PASSWORD` — 강력한 랜덤 문자열 (20자 이상)
- [ ] `DB_PASSWORD` — root와 다른 비밀번호
- [ ] `NEXTAUTH_SECRET` — `openssl rand -base64 32` 로 생성
- [ ] `NEXTAUTH_URL` — 접속할 실제 URL
- [ ] `NEXT_PUBLIC_SUPABASE_URL` — Supabase 프로젝트 URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key

---

## Phase 4. 데이터 마이그레이션

- [ ] 로컬 PC에서 mysqldump 실행
- [ ] 덤프 파일 NAS로 전송
- [ ] MariaDB 컨테이너만 기동 (`docker compose up -d mariadb`)
- [ ] 헬스체크 통과 확인 (`docker compose ps`)
- [ ] 덤프 파일 임포트
- [ ] 테이블 수 및 데이터 수 검증

---

## Phase 5. 전체 스택 기동

- [ ] `docker compose build` 실행 (초기 5-15분 소요)
- [ ] `docker compose up -d` 실행
- [ ] 모든 컨테이너 healthy 상태 확인
- [ ] 내부망 접속 테스트 (http://NAS_IP)
- [ ] 로그인 기능 확인
- [ ] 기존 데이터 정상 표시 확인
- [ ] 가족 캘린더 실시간 기능 확인 (Supabase Realtime)

---

## Phase 6. 외부 접근 설정

### Cloudflare Tunnel 선택 시

- [ ] Cloudflare 계정 생성 및 도메인 추가
- [ ] Cloudflare Zero Trust > Tunnels 에서 터널 생성
- [ ] 터널 토큰으로 cloudflared 컨테이너 실행
- [ ] Public Hostname 설정 (http://nginx:80 연결)
- [ ] 외부 모바일에서 접속 테스트

### DDNS + 포트포워딩 선택 시

- [ ] DDNS 서비스 가입 및 도메인 설정
- [ ] 공유기 포트포워딩 설정 (80, 443)
- [ ] Let's Encrypt 인증서 발급
- [ ] Nginx conf.d/app.conf 도메인 교체
- [ ] 외부 모바일에서 접속 테스트

---

## Phase 7. 운영 자동화

- [ ] 백업 스크립트 cron 등록:
  ```
  # NAS Task Scheduler (또는 crontab)
  0 2 * * * /volume1/docker/family-diary/deploy/scripts/backup.sh >> /volume1/docker/family-diary/backups/backup.log 2>&1
  ```
- [ ] NAS 재부팅 테스트: `restart: unless-stopped` 동작 확인
- [ ] 백업 파일 정상 생성 확인

---

## Phase 8. PC 개발 환경 유지

NAS 이전 후에도 PC 개발 환경은 그대로 유지합니다.

개발 시: `npm run dev` + 로컬 MariaDB
배포 시: `deploy.sh` → NAS Docker 업데이트

`.env.local` (개발용) 과 `.env` (NAS용) 을 분리 관리하세요:

```env
# .env.local (PC 개발용 — git 미포함)
DATABASE_URL="mysql://root:devpassword@localhost:3306/family_planner"
NEXTAUTH_URL="http://localhost:3000"

# deploy/nas/.env (NAS 운영용 — git 미포함)
DATABASE_URL="mysql://diary_app:prodpassword@mariadb:3306/family_planner"
NEXTAUTH_URL="https://diary.yourdomain.com"
```
