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

## 파일 역할 맵 & 작업별 최소 읽기 파일

> **원칙**: 아래 표를 먼저 확인하고, 해당 작업에 필요한 파일만 읽는다. 전체 탐색 금지.

### 레이어별 파일 성격

| 레이어 | 경로 패턴 | 성격 및 포함 내용 |
|--------|----------|-----------------|
| **페이지(RSC)** | `app/(app)/[기능]/page.tsx` | 서버 Prisma 조회 + BigInt/Date 직렬화 + `Serialized*` 타입 정의. 타입을 보려면 여기를 읽는다 |
| **클라이언트 UI** | `app/(app)/[기능]/components/*Client.tsx` | TanStack Query(`useQuery`/`useMutation`) + 상태 관리 + API fetch 함수 정의 |
| **순수 UI 컴포넌트** | `app/(app)/[기능]/components/*.tsx` | props 받아서 렌더링만. API 호출 없음 |
| **API 라우트** | `app/api/[기능]/route.ts` | `auth()` 세션 검증 → Zod 파싱 → Prisma CRUD → JSON 반환 |
| **Zod 스키마** | `lib/validations/[기능].ts` | 입력 유효성 스키마 + 타입 추출. API와 항상 쌍으로 읽는다 |
| **공통 유틸** | `lib/prisma.ts` / `lib/utils.ts` | Prisma 싱글톤 / `cn()` 헬퍼. 거의 수정 불필요 |
| **실시간** | `lib/supabase.ts` / `lib/supabase-admin.ts` | 캘린더 실시간 구독 전용. 다른 기능에서 사용 안 함 |
| **DB 모델** | `prisma/schema.prisma` | 전체 Prisma 모델. DB 컬럼 확인 시 우선 참조 |
| **SQL DDL** | `schema/01_create_tables.sql` | 실제 MariaDB 테이블 정의. 마이그레이션 없이 직접 실행 가능 |
| **공통 레이아웃** | `components/layout/*.tsx` | Sidebar, Header, MobileNav — 메뉴 항목 추가 시만 수정 |

### 작업별 최소 읽기 파일

#### 플래너 / 태스크 (`plan_items`, `daily_plans`)

| 작업 | 읽을 파일 |
|------|----------|
| 태스크 카드 UI 수정 | `app/(app)/planner/components/TaskItem.tsx` |
| 태스크 목록/DnD/뮤테이션 수정 | `app/(app)/planner/components/DailyPlanClient.tsx` |
| 드래그 래퍼 수정 | `app/(app)/planner/components/SortableTaskItem.tsx` |
| 태스크 추가 폼 수정 | `app/(app)/planner/components/AddTaskForm.tsx` |
| 연기 다이얼로그 수정 | `app/(app)/planner/components/PostponeDialog.tsx` |
| 태스크 생성/삭제 API | `app/api/plans/tasks/route.ts`, `app/api/tasks/[id]/route.ts` |
| 태스크 순서 변경 API | `app/api/tasks/reorder/route.ts` |
| 일일 계획 헤더 API | `app/api/plans/route.ts` |
| 타입 정의 확인 | `app/(app)/planner/page.tsx` (`SerializedPlanItem`, `SerializedDailyPlan`) |
| Zod 스키마 수정 | `lib/validations/plan.ts` |

#### 캘린더 / 가족 이벤트 (`family_events`)

| 작업 | 읽을 파일 |
|------|----------|
| 캘린더 UI 수정 | `app/(app)/calendar/components/CalendarClient.tsx` |
| 이벤트 다이얼로그 수정 | `app/(app)/calendar/components/EventDialog.tsx` |
| 실시간 구독 수정 | `app/(app)/calendar/components/CalendarRealtime.tsx`, `lib/supabase.ts` |
| 이벤트 CRUD API | `app/api/family/events/route.ts`, `app/api/family/events/[id]/route.ts` |
| Zod 스키마 | `lib/validations/event.ts` |

#### 목표 관리 (`goals`, `family_goals`)

| 작업 | 읽을 파일 |
|------|----------|
| 개인 목표 UI | `app/(app)/goals/components/GoalsClient.tsx` |
| 개인 목표 API | `app/api/goals/route.ts`, `app/api/goals/[id]/route.ts`, `lib/validations/goal.ts` |
| 가족 목표 UI | `app/(app)/family-goals/components/FamilyGoalsClient.tsx` |
| 가족 목표 API | `app/api/family/goals/route.ts`, `app/api/family/goals/[id]/route.ts`, `lib/validations/family-goal.ts` |

#### 노트 & 감정 체크인 (`notes`, `emotion_checkins`)

| 작업 | 읽을 파일 |
|------|----------|
| 노트 편집 UI | `app/(app)/notes/components/NoteEditorClient.tsx` |
| 감정 체크인 UI | `app/(app)/notes/components/EmotionCheckinSection.tsx` |
| 노트 API | `app/api/notes/route.ts`, `lib/validations/note.ts` |
| 감정 API | `app/api/emotion/route.ts`, `lib/validations/emotion.ts` |

#### 프로필 & 내보내기 (`profiles`)

| 작업 | 읽을 파일 |
|------|----------|
| 프로필 편집 UI | `app/(app)/profile/components/ProfileEditClient.tsx` |
| 데이터 내보내기 UI | `app/(app)/profile/components/ExportSection.tsx` |
| 프로필 API | `app/api/profile/route.ts`, `lib/validations/profile.ts` |
| 내보내기 API | `app/api/export/route.ts` |

#### 공지사항 (`family_announcements`)

| 작업 | 읽을 파일 |
|------|----------|
| 공지 UI/API | `app/(app)/announcements/components/AnnouncementsClient.tsx`<br>`app/api/announcements/route.ts`, `lib/validations/announcement.ts` |

#### 인증 (`users`, `invite_tokens`)

| 작업 | 읽을 파일 |
|------|----------|
| 로그인/회원가입 UI | `app/(auth)/login/page.tsx`, `app/(auth)/register/_components/RegisterForm.tsx` |
| 회원가입/초대 API | `app/api/auth/register/route.ts`, `app/api/auth/invite/route.ts` |
| NextAuth 설정 | `auth.ts` (루트), `app/api/auth/[...nextauth]/route.ts` |

#### 관리자 (`users` 역할/상태)

| 작업 | 읽을 파일 |
|------|----------|
| 구성원 관리 UI | `app/(app)/admin/members/components/MembersClient.tsx` |
| 구성원 관리 API | `app/api/admin/members/route.ts`, `app/api/admin/members/[id]/route.ts` |

#### 분석 & 주간 리뷰

| 작업 | 읽을 파일 |
|------|----------|
| 시간 분석 UI | `app/(app)/analytics/components/TimeAnalyticsClient.tsx`, `app/api/analytics/time/route.ts` |
| 주간 리뷰 UI | `app/(app)/review/components/WeeklyReviewClient.tsx`, `app/api/review/weekly/route.ts` |

#### DB 스키마 변경 (컬럼/테이블 추가)

```
항상 읽어야 할 파일:
  prisma/schema.prisma          ← Prisma 모델 수정
  schema/01_create_tables.sql   ← SQL DDL 수정 (실제 MariaDB 반영용)
  lib/validations/[기능].ts     ← Zod 스키마에 필드 추가
  app/api/[기능]/route.ts       ← create/update 데이터에 필드 추가
```

#### 레이아웃 & 공통

| 작업 | 읽을 파일 |
|------|----------|
| 사이드바 메뉴 추가/수정 | `components/layout/Sidebar.tsx`, `components/layout/MobileNav.tsx` |
| 헤더 수정 | `components/layout/Header.tsx` |
| 앱 레이아웃 | `app/(app)/layout.tsx` |
| 전역 Provider | `components/providers.tsx` |
| shadcn/ui 컴포넌트 | `components/ui/[컴포넌트명].tsx` — 직접 수정 자제 |

---

## 파일 구조

```
C:\Develop\다이어리\
├── app/
│   ├── layout.tsx                     루트 레이아웃 (html/body/Provider)
│   ├── page.tsx                       루트 → /dashboard 리다이렉트
│   ├── (app)/                         인증 필요 페이지 그룹
│   │   ├── layout.tsx                 Sidebar + Header 공통 레이아웃
│   │   ├── dashboard/                 대시보드 (요약 위젯)
│   │   ├── planner/                   일일 계획 (A/B/C 태스크, DnD)
│   │   ├── calendar/                  가족 공유 캘린더 (Supabase Realtime)
│   │   ├── goals/                     개인 목표 (주간/월간/연간)
│   │   ├── family-goals/              가족 공동 목표
│   │   ├── notes/                     일일 노트 + 감정 체크인
│   │   ├── announcements/             가족 공지사항
│   │   ├── profile/                   사명서/가치관 + 데이터 내보내기
│   │   ├── review/                    주간 리뷰 (recharts)
│   │   ├── analytics/                 시간 분석 (recharts)
│   │   └── admin/                     관리자 전용 (구성원 관리, 초대)
│   ├── (auth)/                        인증 불필요 페이지 그룹
│   │   ├── login/                     로그인
│   │   └── register/                  초대 코드 회원가입
│   └── api/                           REST API 라우트
│       ├── auth/                      NextAuth + 초대/회원가입
│       ├── plans/                     일일 계획 + tasks/ 태스크 생성
│       ├── tasks/                     [id]/ 수정·삭제, reorder/ 순서
│       ├── family/events/             가족 캘린더 CRUD
│       ├── family/goals/              가족 목표 CRUD
│       ├── goals/                     개인 목표 CRUD
│       ├── notes/                     일일 노트 CRUD
│       ├── emotion/                   감정 체크인 CRUD
│       ├── announcements/             공지사항 CRUD
│       ├── profile/                   프로필 조회·수정
│       ├── export/                    CSV/JSON 내보내기
│       ├── analytics/time/            시간 분석 집계
│       ├── review/weekly/             주간 리뷰 집계
│       ├── admin/members/             구성원 관리 (admin 전용)
│       └── health/                    Docker healthcheck
├── components/
│   ├── layout/                        Sidebar, Header, MobileNav
│   ├── providers.tsx                  TanStack Query + Sonner Provider
│   ├── theme-provider.tsx             다크모드 Provider
│   └── ui/                            shadcn/ui 컴포넌트 17개
├── lib/
│   ├── prisma.ts                      Prisma 클라이언트 싱글톤
│   ├── supabase.ts                    클라이언트용 Supabase (Realtime)
│   ├── supabase-admin.ts              서버용 Supabase
│   ├── utils.ts                       cn() 유틸
│   └── validations/                   Zod 스키마 (기능별 파일)
│       ├── plan.ts                    createTaskSchema, updateTaskSchema
│       ├── event.ts                   createEventSchema
│       ├── goal.ts                    createGoalSchema
│       ├── family-goal.ts             createFamilyGoalSchema
│       ├── note.ts                    createNoteSchema
│       ├── emotion.ts                 createEmotionSchema
│       ├── announcement.ts            createAnnouncementSchema
│       └── profile.ts                 updateProfileSchema
├── prisma/
│   └── schema.prisma                  Prisma 모델 정의 (13개 테이블)
├── schema/
│   ├── 01_create_tables.sql           MariaDB DDL (직접 실행 가능)
│   └── 02_important_queries.sql       핵심 쿼리 패턴 예시
├── deploy/nas/                        NAS Docker 배포 설정
├── docs/                              마이그레이션/설정 가이드
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
