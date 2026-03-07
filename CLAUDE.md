# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

**FamilyPlanner** — 가족 전용 프랭클린 다이어리 웹사이트.
프랭클린 플래너(사명 기반 계획 시스템)를 가족 공동체에 적용한 폐쇄형 웹 플랫폼.
초대 코드로만 가입 가능하며 가족 구성원만 접근한다.

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind CSS |
| UI 컴포넌트 | shadcn/ui |
| 상태 관리 | Zustand (클라이언트) + TanStack Query (서버 상태) |
| Backend | Next.js API Routes |
| ORM | Prisma (mysql provider — MariaDB 호환) |
| 인증 | NextAuth.js v5 (Credentials Provider + 초대 토큰) |
| 데이터베이스 | MariaDB (로컬 설치) |
| 실시간 | Supabase Realtime WebSocket (가족 공유 캘린더만) |
| 배포 | Vercel (프론트/API) + Supabase (PostgreSQL 대안) |

### DB 연결 설정

```env
DATABASE_URL="mysql://root:password@localhost:3306/family_planner"
```

Prisma datasource provider는 `mysql` (MariaDB는 MySQL 프로토콜 호환).

## 주요 명령어

```bash
# Prisma 클라이언트 생성
npx prisma generate

# DB 마이그레이션
npx prisma migrate dev

# Prisma Studio (DB GUI)
npx prisma studio

# DB 스키마 직접 적용 (초기 셋업)
mysql -u root -p < schema/01_create_tables.sql
```

## 데이터베이스 설계

### 테이블 목록 (13개)

| 테이블 | 역할 |
|--------|------|
| `families` | 가족 그룹 (단일) |
| `users` | 가족 구성원 (admin / parent / child) |
| `invite_tokens` | 초대 코드 (48시간 유효) |
| `profiles` | 개인 사명서, 가치관, 역할 정보 |
| `goals` | 개인 역할별 목표 (weekly / monthly / yearly) |
| `daily_plans` | 일별 계획 헤더 (user + date 당 1개, UNIQUE) |
| `plan_items` | A/B/C 우선순위 태스크 (sequence_order로 정렬) |
| `appointments` | 개인 약속/일정 |
| `family_events` | 가족 공유 캘린더 이벤트 (실시간 구독 대상) |
| `notes` | 일일 메모 마크다운 (user + date 당 1개, UNIQUE) |
| `family_announcements` | 가족 공지사항 (pin 기능 포함) |
| `emotion_checkins` | 일일 감정 기록 (user + date 당 1개, UNIQUE) |
| `family_goals` | 가족 공동 목표 |

### 엔티티 관계

```
families
  ├── users (1:N)
  │     ├── profiles (1:1)
  │     ├── goals (1:N)
  │     ├── daily_plans (1:N) ── plan_items (1:N)
  │     ├── appointments (1:N)
  │     ├── notes (1:N)
  │     └── emotion_checkins (1:N)
  ├── family_events (1:N)  ← Supabase Realtime 구독
  ├── family_announcements (1:N)
  ├── family_goals (1:N)
  └── invite_tokens (1:N)
```

### 핵심 인덱스

- `daily_plans`: `UNIQUE (user_id, plan_date)` — 날짜별 계획 조회 핵심
- `plan_items`: 복합 `(daily_plan_id, priority, is_completed)` — A/B/C 필터링
- `family_events`: 복합 `(family_id, start_at, end_at)` — 월간 캘린더
- `goals`: 복합 `(user_id, goal_type, period_start_date)` — 기간별 목표
- `notes`, `emotion_checkins`: `UNIQUE (user_id, note_date/checkin_date)`

### MariaDB 주의사항

- `TIMESTAMPTZ` 없음 → `DATETIME` 사용, 날짜 컬럼은 `DATE` 타입으로 분리
- `plan_date`는 순수 `DATE` 타입으로 저장 (timezone 이슈 방지)
- JSON 컬럼 (MariaDB 10.2+): `core_values`, `tags`, `attendee_user_ids` 등
- InnoDB 엔진, `utf8mb4_unicode_ci` 문자 집합 필수

## 아키텍처

```
[브라우저]
    │ HTTPS
    ▼
[Vercel — Next.js 14]
  ├── React Server Components (초기 렌더링)
  ├── Client Components (인터랙션 + Supabase Realtime 구독)
  └── API Routes /api/*
        ├── NextAuth.js (인증/세션)
        ├── Prisma → MariaDB (CRUD)
        └── Zod (입력 검증)
```

### 인증 흐름

1. admin이 `/api/auth/invite` 호출 → `invite_tokens` 생성 (48시간)
2. 가족 구성원이 초대 링크로 접속 → 토큰 검증 → 계정 생성
3. NextAuth.js Credentials Provider → JWT (HttpOnly Cookie)
4. 모든 API 라우트: 미들웨어에서 세션 검증 → `userId` 강제 조건

### 실시간

- **구독 대상**: `family_events` 테이블만
- **개인 데이터**(plans, goals, notes)는 실시간 불필요 — 일반 REST API

## 주요 API 엔드포인트

```
POST  /api/auth/invite          초대 토큰 생성 (admin 전용)
POST  /api/auth/register        초대 코드로 회원가입

GET   /api/plans?date=YYYY-MM-DD   일일 계획 + 태스크 조회
POST  /api/plans                   계획 생성
PUT   /api/tasks/:id               태스크 완료/수정
PATCH /api/tasks/reorder           순서 변경

GET   /api/family/events?month=    월간 가족 캘린더
POST  /api/family/events           이벤트 생성

GET   /api/goals                   목표 목록
GET   /api/profile                 사명서/가치관/역할
```

## 개발 로드맵

| Phase | 내용 |
|-------|------|
| **Phase 1 MVP** | 인증(초대 코드), A/B/C 일일 계획, 가족 공유 캘린더(실시간) |
| **Phase 2** | 사명서/역할/목표 관리, 주간 계획 뷰, 드래그 정렬 |
| **Phase 3** | 가족 헌장, 감정 체크인, 가족 회의 자동 생성, 기념일 추적 |
| **Phase 4** | PWA, 역할별 시간 분석, 주간 리뷰, 데이터 내보내기 |

## NAS 마이그레이션 계획

개발 완료 후 가정 내 NAS 장비(Synology / QNAP)로 전환 예정.

### 목표 아키텍처

```
[브라우저 / 모바일]
       │
       │ 내부망: http://NAS-IP
       │ 외부망: https://diary.yourdomain.com (Cloudflare Tunnel 경유)
       ▼
  NAS Docker Compose
  ├── nginx (80/443 → 리버스 프록시)          [diary-external 네트워크]
  ├── next-app (:3000, 내부망 only)           [diary-internal 네트워크]
  └── mariadb (:3306, 내부망 only)            [diary-internal 네트워크]
        └── named volume (family-diary-db-data)  ← 데이터 영속
```

`diary-internal` 네트워크는 `internal: true` — MariaDB에 외부 직접 접근 불가.

### 외부 접근 방법 비교

| 방법 | 보안 | 설정 | 권장 |
|------|------|------|------|
| **Cloudflare Tunnel** | 높음 (CF 보호, 포트 개방 불필요) | 쉬움 | ✅ 권장 |
| Tailscale (VPN) | 최고 | 쉬움 | 가족 전원 앱 설치 필요 |
| DDNS + 포트포워딩 | 중간 (포트 노출) | 중간 | 공유기 설정 필요 |

**Cloudflare Tunnel 채택 이유**: 공유기에 포트를 전혀 열지 않아도 되고, HTTPS를 Cloudflare가 자동 처리. NAS에서 outbound 연결만 사용.

### 핵심 배포 파일

- `Dockerfile` — Next.js multi-stage 빌드 (`output: 'standalone'` 필수)
- `deploy/nas/docker-compose.yml` — 3-서비스 전체 스택
- `deploy/nas/.env.example` — 환경변수 템플릿
- `deploy/nas/nginx/conf.d/app.conf` — 리버스 프록시 설정
- `deploy/nas/mariadb/my.cnf` — MariaDB 커스텀 설정
- `deploy/nas/scripts/backup.sh` — 매일 새벽 자동 백업
- `deploy/nas/scripts/deploy.sh` — git pull → build → restart
- `docs/NAS_MIGRATION_GUIDE.md` — 전체 마이그레이션 절차서

### 마이그레이션 절차 요약

```
1. NAS Docker 환경 확인 (docker compose version)
2. NAS 디렉토리 생성 + 프로젝트 파일 전송 (scp 또는 git clone)
3. 로컬 PC mysqldump → NAS로 전송
4. NAS에서 mariadb 컨테이너만 먼저 기동 → 덤프 임포트
5. 전체 스택 기동 (docker compose up -d)
6. 내부망 접근 테스트 (http://NAS-IP)
7. Cloudflare Tunnel 설정 → 외부망 접근 확인
```

예상 다운타임: **15~30분** (취침 시간대 작업 권장).

### 코드 수정 필수 사항 (마이그레이션 전)

```javascript
// next.config.js — 이 옵션 없으면 Dockerfile 동작 안 함
const nextConfig = { output: 'standalone' };
```

```typescript
// app/api/health/route.ts — docker-compose healthcheck 기준점
export async function GET() {
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
}
```

### 운영 명령어 (NAS SSH)

```bash
docker compose up -d                  # 전체 기동
docker compose down                   # 중지
docker compose logs -f next-app       # 앱 로그
docker compose ps                     # 상태 확인
bash deploy/nas/scripts/deploy.sh     # 코드 업데이트 배포
bash deploy/nas/scripts/backup.sh     # 수동 백업
```

---

## 파일 구조

```
C:\Develop\다이어리\
├── Dockerfile                         Next.js multi-stage 빌드
├── schema/
│   ├── 01_create_tables.sql           MariaDB DDL (즉시 실행 가능)
│   └── 02_important_queries.sql       핵심 쿼리 패턴 예시
├── prisma/
│   └── schema.prisma                  Prisma 모델 정의
├── deploy/nas/
│   ├── docker-compose.yml             NAS 전체 스택
│   ├── .env.example                   환경변수 템플릿
│   ├── nginx/conf.d/app.conf          리버스 프록시 설정
│   ├── mariadb/my.cnf                 MariaDB 설정
│   └── scripts/
│       ├── backup.sh                  자동 백업
│       └── deploy.sh                  배포 스크립트
├── docs/
│   ├── NAS_MIGRATION_GUIDE.md         마이그레이션 전체 절차서
│   ├── SETUP_GUIDE.md                 MariaDB + Prisma 초기 설정
│   ├── PERFORMANCE_OPTIMIZATION.md    인덱스 전략 및 튜닝
│   └── INDEX_DESIGN.md                인덱스 설계 상세
└── .claude/
    ├── agents/                        커스텀 서브에이전트 정의
    └── agent-memory/                  에이전트 영구 기억 저장소
```

## 커스텀 서브에이전트

| 에이전트 | 모델 | 용도 |
|----------|------|------|
| `creative-project-planner` | haiku | 기능 기획, 브레인스토밍 |
| `senior-dev-mentor` | sonnet | 코드 리뷰, 아키텍처 결정, 디버깅 |
| `tester-debugger` | — | 테스트 작성, 버그 추적 |
| `expert-dba` | — | 쿼리 최적화, 스키마 변경 |

모든 에이전트는 한국어로 소통하며 `.claude/agent-memory/<name>/` 에 영구 기억을 저장한다.
