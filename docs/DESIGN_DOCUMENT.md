# FamilyPlanner — 종합 설계 문서 (Design Document)

> **버전**: 1.0.0 | **작성일**: 2026-03-03 | **대상**: 개발자, 기여자

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [시스템 아키텍처](#2-시스템-아키텍처)
3. [인증 및 보안 설계](#3-인증-및-보안-설계)
4. [데이터베이스 설계](#4-데이터베이스-설계)
5. [API 설계](#5-api-설계)
6. [UI/UX 설계](#6-uiux-설계)
7. [실시간 기능 설계](#7-실시간-기능-설계)
8. [프론트엔드 아키텍처](#8-프론트엔드-아키텍처)
9. [배포 아키텍처](#9-배포-아키텍처)
10. [개발 로드맵](#10-개발-로드맵)
11. [보안 고려사항](#11-보안-고려사항)
12. [성능 최적화 전략](#12-성능-최적화-전략)

---

## 1. 프로젝트 개요

### 1.1 배경 및 목적

**FamilyPlanner**는 프랭클린 플래너(Franklin Planner)의 사명 기반 계획 철학을 가족 공동체에 적용한 폐쇄형 웹 플랫폼이다.

프랭클린 플래너의 핵심 철학은 **사명서(Mission Statement)에서 시작해 일상으로 내려오는 하향식(Top-down) 계획 구조**다. 개인의 가치관에서 역할이 도출되고, 역할에서 목표가, 목표에서 주간/일간 계획이 흘러내려온다. 이를 단순히 개인이 아닌 **가족 단위**에 적용함으로써 개인의 성장과 가족의 유대를 동시에 추구한다.

### 1.2 대상 사용자 및 규모

- **단일 가족** 단위, 최대 10명
- **폐쇄형 플랫폼**: 초대 코드 없이는 접근 불가
- **역할 계층**: admin(가족 관리자) 1명 · parent(부모) 1-2명 · child(자녀) 2-7명
- **NAS 자가 호스팅**: 가정 내 Synology/QNAP NAS에서 구동

### 1.3 핵심 가치 및 설계 원칙

| 가치 | 설명 |
|------|------|
| **프라이버시 우선** | 외부 공개 없는 완전한 가족 전용 공간 |
| **사명 기반 계획** | 개인 사명서 → 역할 → 목표 → 일일 계획의 계층 구조 |
| **단순함** | 모든 가족 구성원(어린이 포함)이 쉽게 사용 가능한 UI |
| **지속가능성** | NAS 자가 호스팅으로 클라우드 의존도 최소화, 월정액 없음 |

### 1.4 프랭클린 플래너 계층 모델

```
┌─────────────────────────────────────────────┐
│       개인 사명서 (Personal Mission)          │
│  "나는 무엇을 위해 사는가?"                     │
└──────────────────────┬──────────────────────┘
                       │ 도출
┌──────────────────────▼──────────────────────┐
│  핵심 가치관 (Core Values)                     │
│  + 역할 (Roles: 부모, 직장인, 자녀...)          │
└──────────────────────┬──────────────────────┘
                       │ 도출
┌──────────────────────▼──────────────────────┐
│  장기 목표 → 연간 목표 → 월간 목표 → 주간 목표  │
└──────────────────────┬──────────────────────┘
                       │ 도출
┌──────────────────────▼──────────────────────┐
│  일일 A/B/C 우선순위 태스크                     │
│  A: 반드시 완수 · B: 중요 · C: 선택             │
└──────────────────────┬──────────────────────┘
                       │ 실행 후
┌──────────────────────▼──────────────────────┐
│  일일 성찰 (Reflection) + 감정 체크인           │
└─────────────────────────────────────────────┘
```

### 1.5 기술 스택 요약

| 영역 | 기술 | 선택 이유 |
|------|------|-----------|
| **Frontend** | Next.js 14 (App Router) + TypeScript | SSR + API Routes 통합, 풀스택 단일 코드베이스 |
| **UI 컴포넌트** | shadcn/ui + Tailwind CSS | 접근성 보장, 커스터마이징 용이, 복사 기반 설계 |
| **클라이언트 상태** | Zustand | 경량, 직관적 API |
| **서버 상태** | TanStack Query | 캐싱, 자동 refetch, 낙관적 업데이트 |
| **Backend** | Next.js API Routes | 별도 서버 불필요, TypeScript 공유 |
| **ORM** | Prisma | 타입 안전 쿼리, 마이그레이션 관리 |
| **Database** | MariaDB 11.2 | NAS(Synology/QNAP) 환경 최적 호환성, 안정성 |
| **인증** | NextAuth.js v5 | Credentials + 초대 토큰 커스텀 플로우 |
| **실시간** | Supabase Realtime | 별도 서버 없이 WebSocket 구독, 가족 캘린더 전용 |
| **컨테이너** | Docker Compose | NAS 자가 호스팅 환경에서 재현 가능한 배포 |
| **외부 접근** | Cloudflare Tunnel | 포트 개방 불필요, HTTPS 자동 처리 |

---

## 2. 시스템 아키텍처

### 2.1 전체 아키텍처 다이어그램

```
[가족 구성원 브라우저 / 모바일]
              │
              │ HTTPS
              │
    ┌─────────▼──────────┐
    │  Cloudflare Tunnel  │  ← DDoS 방어, HTTPS 자동 처리
    │  (포트 개방 불필요)   │    공유기 설정 변경 없음
    └─────────┬──────────┘
              │ HTTP (내부망)
              │
┌─────────────▼──────────────────────────────────────┐
│               NAS Docker Compose                    │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │  diary-external 네트워크 (일반 bridge)         │   │
│  │                                              │   │
│  │  ┌─────────────────────────────────────┐    │   │
│  │  │  nginx:1.26-alpine  :80/:443        │    │   │
│  │  │  리버스 프록시 + SSL 종단              │    │   │
│  │  └─────────────────┬───────────────────┘    │   │
│  └────────────────────│────────────────────────┘   │
│                       │ proxy_pass                  │
│  ┌────────────────────▼────────────────────────┐   │
│  │  diary-internal 네트워크 (internal: true)    │   │
│  │  (외부 인터넷 접근 완전 차단)                  │   │
│  │                                              │   │
│  │  ┌─────────────────────────────────────┐    │   │
│  │  │  next-app  :3000 (expose only)      │    │   │
│  │  │  React Server Components            │    │   │
│  │  │  Next.js API Routes (/api/*)        │    │   │
│  │  │   ├── NextAuth.js (인증/세션)         │    │   │
│  │  │   ├── Prisma ORM                    │    │   │
│  │  │   └── Zod (입력 검증)                │    │   │
│  │  └─────────────────┬───────────────────┘    │   │
│  │                    │ mysql://mariadb:3306    │   │
│  │  ┌─────────────────▼───────────────────┐    │   │
│  │  │  mariadb:11.2  (expose 없음)        │    │   │
│  │  │  named volume: family-diary-db-data │    │   │
│  │  └─────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────┘

[Supabase Realtime Cloud]  ← 외부 서비스
         ▲
         │ WebSocket (WSS) — family_events 채널만
         │
[Client Component - FamilyCalendar.tsx]
```

### 2.2 네트워크 레이어 설명

| 네트워크 | 타입 | 연결된 서비스 | 목적 |
|---------|------|-------------|------|
| `diary-external` | bridge (일반) | nginx | 외부 트래픽 진입점. Cloudflare Tunnel이 연결되는 지점 |
| `diary-internal` | bridge (`internal: true`) | nginx, next-app, mariadb | 컨테이너 간 통신 전용. **외부 인터넷 접근 완전 차단** |

> **핵심 보안 설계**: MariaDB는 `diary-internal`에만 소속되므로 외부에서 직접 접근 불가. Nginx만 두 네트워크에 모두 연결되어 트래픽을 중계한다.

### 2.3 레이어별 책임 분리

| 레이어 | 컴포넌트 | 책임 |
|--------|----------|------|
| **접근 제어** | Cloudflare Tunnel | DDoS 방어, HTTPS 인증서 자동 관리, 포트 노출 불필요 |
| **프록시** | Nginx | SSL 종단, 정적 파일 캐시, 헬스체크, WebSocket 업그레이드 |
| **애플리케이션** | Next.js | 렌더링(SSR/CSR), API Routes, 인증 미들웨어 |
| **ORM** | Prisma | 타입 안전 쿼리, DB 마이그레이션, 파라미터화 쿼리(SQL Injection 방지) |
| **데이터베이스** | MariaDB | 데이터 영속화, 트랜잭션, 외래키 무결성 |
| **실시간** | Supabase | family_events 전용 WebSocket 채널 브로드캐스트 |

### 2.4 요청 흐름 추적 예시

**일일 계획 조회 (`GET /api/plans?date=2026-03-03`)**:

```
1. 브라우저
     │ HTTPS GET /api/plans?date=2026-03-03
2. Cloudflare Tunnel → Nginx (HTTP proxy)
     │ Header 전달: X-Forwarded-For, X-Real-IP
3. Next.js API Route (/app/api/plans/route.ts)
     │ NextAuth 미들웨어: 세션 쿠키 검증
     │   └─ 미인증 시 → 401 Unauthorized 즉시 반환
     │ Zod: date 파라미터 형식 검증 (YYYY-MM-DD)
     │   └─ 형식 오류 시 → 400 Bad Request
4. Prisma ORM
     │ dailyPlan.findUnique({
     │   where: { userId_planDate: { userId: session.id, planDate } },
     │   include: { planItems: { orderBy: { sequenceOrder: 'asc' } } }
     │ })
5. MariaDB (daily_plans UNIQUE 인덱스 히트)
     │ → 결과 반환 (메모리 히트, ~1ms)
6. Next.js → JSON 직렬화 → 응답
     │ { data: { dailyPlan: { ... } } }
7. 브라우저 TanStack Query 캐시 업데이트
```

---

## 3. 인증 및 보안 설계

### 3.1 초대 코드 시스템 흐름

```
┌─────── 초대 코드 발급 ───────────────────────────────┐
│                                                      │
│  [Admin 사용자]                                       │
│    │  POST /api/auth/invite                          │
│    │  Body: { role: 'parent' | 'child' }             │
│    │                                                 │
│  [API Route]                                         │
│    │  1. 세션 검증 (role === 'ADMIN' 아니면 403)       │
│    │  2. 토큰 생성: crypto.randomBytes(32) → 64자 hex  │
│    │  3. DB INSERT invite_tokens                     │
│    │     (expires_at = NOW() + 48h, used_at = NULL)  │
│    │  4. 초대 링크 반환                                │
│    │     https://diary.example.com/register?token=xx │
└──────────────────────────────────────────────────────┘

┌─────── Admin이 카카오톡/문자로 링크 공유 ───────────────┐
└──────────────────────────────────────────────────────┘

┌─────── 회원가입 ─────────────────────────────────────┐
│                                                      │
│  [신규 가족 구성원]                                    │
│    │  링크 클릭 → /register?token=xxxx               │
│    │  이름, 이메일, 비밀번호 입력 후 제출               │
│    │  POST /api/auth/register                        │
│    │                                                 │
│  [API Route — 토큰 검증 4단계]                        │
│    │  1. token 존재 여부 (없으면 404)                  │
│    │  2. used_at IS NULL (이미 사용 시 409)            │
│    │  3. expires_at > NOW() (만료 시 410)             │
│    │  4. 이메일 중복 확인 (중복 시 409)                 │
│    │                                                 │
│  [회원 생성]                                          │
│    │  1. bcrypt 해시 (saltRounds: 12)                │
│    │  2. users INSERT (role = intendedRole)          │
│    │  3. profiles INSERT (빈 프로필 자동 생성)          │
│    │  4. invite_tokens.used_at = NOW() UPDATE       │
│    │  5. NextAuth signIn() → JWT 발급 → 리다이렉트     │
└──────────────────────────────────────────────────────┘
```

### 3.2 JWT 세션 구성

NextAuth.js v5 Credentials Provider 기반 JWT 인증:

```typescript
// JWT 페이로드 구조
interface SessionUser {
  id: string;        // users.id (BigInt → string 변환)
  familyId: string;  // users.family_id
  role: 'ADMIN' | 'PARENT' | 'CHILD';
  name: string;
  email: string;
}

// 쿠키 설정 (자동 처리)
// HttpOnly: true  → JavaScript에서 접근 불가 (XSS 방어)
// Secure: true    → HTTPS 전송만 허용
// SameSite: 'lax' → CSRF 방어
```

### 3.3 역할별 권한 매트릭스

| 기능 | admin | parent | child |
|------|:-----:|:------:|:-----:|
| 초대 토큰 생성 | ✅ | ❌ | ❌ |
| 가족 구성원 관리 (비활성화) | ✅ | ❌ | ❌ |
| 가족 공지사항 작성 | ✅ | ✅ | ❌ |
| 가족 공지사항 열람 | ✅ | ✅ | ✅ |
| 가족 목표 생성 | ✅ | ✅ | ❌ |
| 가족 이벤트 생성 | ✅ | ✅ | ✅ |
| 가족 이벤트 삭제 (본인 생성분) | ✅ | ✅ | ✅ |
| 가족 이벤트 삭제 (타인 생성분) | ✅ | ❌ | ❌ |
| 자신의 계획/목표/메모 CRUD | ✅ | ✅ | ✅ |
| 타인 계획 열람 (is_published=true) | ✅ | ✅ | ✅ |
| 타인 계획 수정 | ❌ | ❌ | ❌ |

### 3.4 API 데이터 격리 패턴

모든 API Route에서 반드시 지켜야 하는 패턴:

```typescript
// ❌ WRONG: 클라이언트가 보낸 userId를 그대로 사용 (IDOR 취약점)
const plan = await prisma.dailyPlan.findFirst({
  where: { userId: Number(req.body.userId) }
});

// ✅ CORRECT: 세션에서 userId 추출 (클라이언트 입력 무시)
const session = await getServerSession(authOptions);
if (!session) return new Response('Unauthorized', { status: 401 });

const plan = await prisma.dailyPlan.findFirst({
  where: {
    userId: BigInt(session.user.id),   // 세션에서 추출
    // familyId 조건으로 가족 간 데이터 격리도 보장
  }
});
```

### 3.5 초대 토큰 보안 특성

| 특성 | 값/방법 | 목적 |
|------|---------|------|
| 토큰 길이 | 64자 hex (256비트) | 브루트포스 불가 |
| 만료 시간 | 48시간 | 탈취 위험 최소화 |
| 1회 사용 | `used_at` 기록으로 재사용 차단 | 링크 유출 대비 |
| 역할 고정 | `intended_role` (parent/child) | 권한 상승 불가 |

---

## 4. 데이터베이스 설계

### 4.1 ERD (엔티티 관계 다이어그램)

```
families (1)
  ├──────────────< users (N)
  │                 │  id, family_id, email(UNIQUE), name, role
  │                 │  password_hash, color_tag, is_active
  │                 │
  │                 ├──(1:1)──> profiles
  │                 │              personal_mission, core_values(JSON)
  │                 │              roles_responsibilities, long_term_vision
  │                 │
  │                 ├──────────< goals (N)
  │                 │              goal_type(weekly/monthly/yearly)
  │                 │              period_start/end_date(DATE)
  │                 │              status, progress_percentage
  │                 │
  │                 ├──────────< daily_plans (N)
  │                 │    UNIQUE(user_id, plan_date)
  │                 │    theme, reflection, is_published
  │                 │         │
  │                 │         └──< plan_items (N)
  │                 │                priority(A/B/C), sequence_order
  │                 │                is_completed, estimated/actual_time
  │                 │                category, tags(JSON)
  │                 │
  │                 ├──────────< appointments (N)
  │                 │              start_at, end_at, is_all_day
  │                 │
  │                 ├──────────< notes (N)
  │                 │    UNIQUE(user_id, note_date)
  │                 │    content(LongText/Markdown), mood
  │                 │
  │                 └──────────< emotion_checkins (N)
  │                      UNIQUE(user_id, checkin_date)
  │                      primary_emotion, emotion_score(1-10)
  │                      sleep_quality, sleep_hours, exercise_minutes
  │
  ├──────────────< family_events (N)      ← Supabase Realtime 구독 대상
  │                 created_by_user_id
  │                 event_type(standard/birthday/anniversary/holiday)
  │                 attendee_user_ids(JSON)
  │
  ├──────────────< family_announcements (N)
  │                 priority(low/normal/high/urgent), is_pinned
  │
  ├──────────────< family_goals (N)
  │                 goal_type, status, contributor_user_ids(JSON)
  │
  └──────────────< invite_tokens (N)
                    token(UNIQUE, 64자), intended_role
                    expires_at, used_at, used_by_user_id
```

### 4.2 테이블별 핵심 설계 결정

#### `families` — 가족 그룹
- `name UNIQUE`: 중복 가족명 방지
- 단일 가족 운영 전제 (확장 시 멀티 테넌시 지원 가능)

#### `users` — 가족 구성원
- `role ENUM('admin', 'parent', 'child')`: 역할 고정으로 권한 체계 명확화
- `color_tag VARCHAR(20)`: 캘린더에서 구성원별 색상 구분 (`#FF6B6B` 등 hex)
- `is_active`: 삭제 대신 비활성화로 데이터 보존

#### `invite_tokens` — 초대 코드
- `token VARCHAR(64) UNIQUE`: `crypto.randomBytes(32)` hex = 64자
- `intended_role ENUM('parent', 'child')`: admin은 초대 불가 (직접 DB 설정)
- `used_at`: NULL이면 미사용, 값이 있으면 사용 완료

#### `profiles` — 개인 사명서 (1:1)
- `core_values JSON`: `["가족", "성장", "건강"]` 형태, MariaDB 10.2+ JSON 지원
- `personal_mission TEXT`: 마크다운으로 작성
- `UNIQUE(user_id)`: 1:1 관계 DB 수준 보장

#### `goals` — 개인 목표
- `period_start_date DATE`, `period_end_date DATE`: 날짜 전용 타입으로 timezone 이슈 회피
- `progress_percentage INT(0-100)`: 수동 입력 또는 완료된 태스크 기반 계산
- `is_public BOOLEAN`: 가족 공유 여부 개인 선택

#### `daily_plans` — 일별 계획
- **`UNIQUE(user_id, plan_date)`**: 날짜당 1개 보장 + 조회 인덱스 겸용 (핵심 설계)
- `plan_date DATE`: `DATETIME`이 아닌 `DATE` 타입 → timezone 이슈 완전 회피
- `reflection TEXT`: 일일 성찰 마크다운
- `focus_areas JSON`: 오늘의 집중 영역 배열

#### `plan_items` — A/B/C 태스크
- `priority ENUM('A', 'B', 'C')`: A=반드시 완수, B=중요, C=선택
- `sequence_order INT`: 드래그 앤 드롭 순서 유지 (PATCH /api/tasks/reorder로 업데이트)
- `estimated_time_minutes`, `actual_time_minutes`: 시간 추적으로 Phase 4 분석 기반
- `tags JSON`: `["업무", "건강"]` 형태의 자유 태그

#### `family_events` — 가족 공유 캘린더
- `event_type ENUM('standard', 'birthday', 'anniversary', 'holiday')`: 기념일 자동 추적
- `attendee_user_ids JSON`: `["1", "2", "3"]` — 참석자 표시용, 권한 제어와 무관
- **Supabase Realtime 구독 대상**: 여러 구성원이 동시에 보는 유일한 공유 데이터

#### `notes` — 일일 메모
- **`UNIQUE(user_id, note_date)`**: 날짜당 1개, 없으면 생성 있으면 수정(upsert)
- `mood ENUM`: 당일 기분 태그 (very_sad/sad/neutral/happy/very_happy)
- `content LONGTEXT`: 마크다운 지원 (이미지 임베드 가능)

#### `emotion_checkins` — 감정 체크인
- **`UNIQUE(user_id, checkin_date)`**: 날짜당 1번 기록
- `emotion_score INT(1-10)`: 감정 강도 수치화 → Phase 4 추이 분석
- `sleep_quality INT(1-10)`, `sleep_hours DECIMAL(3,1)`: 수면 추적
- `exercise_minutes INT`: 운동 시간 추적

#### `family_announcements` — 가족 공지사항
- `priority ENUM('low', 'normal', 'high', 'urgent')`: 긴급 공지 강조
- `is_pinned`, `pinned_until`: 특정 기간 상단 고정 기능

#### `family_goals` — 가족 공동 목표
- `contributor_user_ids JSON`: 참여 구성원 목록 (권한 제어와 무관, 표시용)
- `progress_percentage`: 가족 전체 진행률 수동 업데이트

### 4.3 핵심 인덱스 전략

**필수 인덱스 5개** (성능 핵심):

| 번호 | 테이블 | 인덱스 | 활용 쿼리 패턴 |
|------|--------|--------|--------------|
| 1 | `users` | `email UNIQUE` | 로그인 시 O(log n) 조회 |
| 2 | `users` | `idx_family_id` | 가족 구성원 목록 조회 |
| 3 | `daily_plans` | `UNIQUE(user_id, plan_date)` | 날짜별 계획 조회 (핵심) |
| 4 | `plan_items` | `idx_daily_plan_priority_completed(daily_plan_id, priority, is_completed)` | A/B/C 필터링 최적화 |
| 5 | `family_events` | `idx_family_period(family_id, start_at, end_at)` | 월간 캘린더 기간 쿼리 |

**복합 인덱스 설계 원리**:
- `plan_items(daily_plan_id, priority, is_completed)`: daily_plan_id로 1차 필터 → 수십 개로 줄어듦 → priority/is_completed 추가 필터
- `family_events(family_id, start_at, end_at)`: 가족 이벤트 월간 조회 시 full scan 없이 범위 탐색

### 4.4 MariaDB 특이사항

| 사항 | 내용 |
|------|------|
| `TIMESTAMPTZ` 미지원 | → `DATETIME` 사용, 날짜 전용은 `DATE` 타입으로 분리 |
| Prisma provider | `"mysql"` (MariaDB는 MySQL 프로토콜 완전 호환) |
| 문자셋 | `utf8mb4_unicode_ci` — 한국어 + 이모지 완전 지원 |
| JSON 컬럼 | MariaDB 10.2+ 지원 (core_values, tags, attendee_user_ids 등) |
| 엔진 | InnoDB 전용 — 트랜잭션, 외래키, 행 수준 잠금 지원 |
| `ON DELETE CASCADE` | 부모 레코드 삭제 시 자식 레코드 자동 삭제 (데이터 정합성) |

### 4.5 데이터 규모 예측 (3년 기준)

| 테이블 | 계산 근거 | 예상 행 수 |
|--------|----------|-----------|
| `plan_items` | 10명 × 365일 × 3년 × 5태스크 | ~54,750 |
| `daily_plans` | 10명 × 365일 × 3년 | ~10,950 |
| `notes` | 10명 × 365일 × 3년 | ~10,950 |
| `emotion_checkins` | 10명 × 365일 × 3년 | ~10,950 |
| `family_events` | 가족 × 365일 × 3년 × 2이벤트 | ~2,190 |
| **전체 합계** | | **~108,000** |

- **전체 데이터 크기**: 30-50MB (극소)
- **innodb_buffer_pool_size 256MB**에 전체 데이터 상주 가능
- → 대부분의 쿼리가 **메모리 히트**, 1ms 이하 응답

---

## 5. API 설계

### 5.1 공통 규칙

| 항목 | 규칙 |
|------|------|
| 기본 경로 | `/api` |
| 인증 | 모든 엔드포인트에서 NextAuth 세션 검증 필수 (미인증 → 401) |
| 입력 검증 | Zod 스키마 (검증 실패 → 400 + 에러 상세) |
| 날짜 형식 | ISO 8601 (`YYYY-MM-DD`) |
| 성공 응답 | `{ data: T }` |
| 실패 응답 | `{ error: string, details?: object }` |
| Content-Type | `application/json` |

### 5.2 엔드포인트 상세 명세

---

#### `POST /api/auth/invite` — 초대 토큰 생성

| 항목 | 내용 |
|------|------|
| 권한 | admin 전용 (PARENT/CHILD → 403) |
| 요청 Body | `{ role: 'parent' \| 'child' }` |
| 응답 200 | `{ data: { token: string, inviteUrl: string, expiresAt: string } }` |
| 응답 403 | admin 아닌 경우 |

---

#### `POST /api/auth/register` — 초대 코드 회원가입

| 항목 | 내용 |
|------|------|
| 권한 | 비로그인 (공개) |
| 요청 Body | `{ token: string, name: string, email: string, password: string }` |
| 응답 201 | `{ data: { user: { id, name, email, role } } }` — 자동 로그인 포함 |
| 응답 404 | 토큰 없음 |
| 응답 409 | 토큰 사용됨 또는 이메일 중복 |
| 응답 410 | 토큰 만료 |

---

#### `GET /api/plans?date=YYYY-MM-DD` — 일일 계획 조회

| 항목 | 내용 |
|------|------|
| 권한 | 로그인 필수 (본인 데이터만) |
| Query | `date: string` (YYYY-MM-DD, 필수) |
| 응답 200 | 아래 참고 |

```json
{
  "data": {
    "dailyPlan": {
      "id": 123,
      "planDate": "2026-03-03",
      "theme": "가족과 함께하는 하루",
      "reflection": "오늘은 A 목표를 모두 달성했다...",
      "focusAreas": ["업무", "가족"],
      "isPublished": true,
      "planItems": [
        {
          "id": 456,
          "title": "프로젝트 보고서 작성",
          "priority": "A",
          "sequenceOrder": 0,
          "isCompleted": false,
          "completedAt": null,
          "estimatedTimeMinutes": 60,
          "actualTimeMinutes": null,
          "category": "업무",
          "tags": ["프로젝트", "마감"]
        }
      ]
    }
  }
}
```
> 해당 날짜 계획 없으면 `dailyPlan: null`

---

#### `POST /api/plans` — 일일 계획 생성/갱신

| 항목 | 내용 |
|------|------|
| 권한 | 로그인 필수 |
| 요청 Body | `{ date: string, theme?: string, focusAreas?: string[] }` |
| 응답 200/201 | `{ data: { dailyPlan: DailyPlan } }` (upsert — 날짜당 1개) |

---

#### `PUT /api/tasks/:id` — 태스크 수정

| 항목 | 내용 |
|------|------|
| 권한 | 로그인 필수, 본인 태스크만 |
| 요청 Body | `{ isCompleted?: boolean, title?: string, priority?: 'A'\|'B'\|'C', actualTimeMinutes?: number }` |
| 응답 200 | `{ data: { planItem: PlanItem } }` |
| 응답 404 | 태스크 없음 |
| 응답 403 | 타인 태스크 수정 시도 |

---

#### `PATCH /api/tasks/reorder` — 태스크 순서 변경

| 항목 | 내용 |
|------|------|
| 권한 | 로그인 필수 |
| 요청 Body | `{ items: Array<{ id: number, sequenceOrder: number }> }` |
| 응답 200 | `{ data: { success: true } }` |

```typescript
// Prisma 구현 예시 (트랜잭션)
await prisma.$transaction(
  items.map(({ id, sequenceOrder }) =>
    prisma.planItem.update({
      where: { id: BigInt(id), userId: BigInt(session.user.id) },
      data: { sequenceOrder }
    })
  )
);
```

---

#### `GET /api/family/events?month=YYYY-MM` — 월간 가족 캘린더

| 항목 | 내용 |
|------|------|
| 권한 | 로그인 필수 (가족 공유 데이터) |
| Query | `month: string` (YYYY-MM, 필수) |
| 응답 200 | `{ data: { events: FamilyEvent[] } }` |

---

#### `POST /api/family/events` — 가족 이벤트 생성

| 항목 | 내용 |
|------|------|
| 권한 | 로그인 필수 |
| 요청 Body | `{ title, startAt, endAt, isAllDay?, location?, category?, colorTag?, eventType?, attendeeUserIds? }` |
| 응답 201 | `{ data: { event: FamilyEvent } }` |
| 부작용 | Supabase Broadcast 이벤트 발행 → 다른 가족 화면 실시간 갱신 |

---

#### `DELETE /api/family/events/:id` — 가족 이벤트 삭제

| 항목 | 내용 |
|------|------|
| 권한 | 본인 생성 이벤트 또는 admin |
| 응답 200 | `{ data: { success: true } }` |
| 응답 403 | 타인 이벤트 삭제 시도 (admin 제외) |
| 부작용 | Supabase Broadcast 이벤트 발행 |

---

#### `GET /api/goals` — 목표 목록

| 항목 | 내용 |
|------|------|
| 권한 | 로그인 필수 |
| Query | `type?: 'weekly'\|'monthly'\|'yearly'`, `year?: number` |
| 응답 200 | `{ data: { goals: Goal[] } }` |

---

#### `GET /api/profile` — 사명서/가치관 조회

| 항목 | 내용 |
|------|------|
| 권한 | 로그인 필수 |
| 응답 200 | `{ data: { profile: Profile } }` (없으면 빈 Profile 반환) |

---

#### `PUT /api/profile` — 사명서/가치관 수정

| 항목 | 내용 |
|------|------|
| 권한 | 로그인 필수 (본인만) |
| 요청 Body | `{ personalMission?, coreValues?, rolesResponsibilities?, longTermVision?, bio? }` |
| 응답 200 | `{ data: { profile: Profile } }` (upsert) |

---

#### `GET /api/health` — 헬스체크

| 항목 | 내용 |
|------|------|
| 권한 | 없음 (공개) |
| 응답 200 | `{ status: 'ok', timestamp: '2026-03-03T00:00:00.000Z' }` |
| 목적 | Docker healthcheck 기준점, Nginx `/health` 프록시 대상 |

---

### 5.3 HTTP 에러 코드

| 코드 | 의미 | 예시 |
|------|------|------|
| 400 | 입력 검증 실패 | 날짜 형식 오류, 필수 필드 누락 |
| 401 | 인증 실패 | 세션 없음, 만료된 JWT |
| 403 | 권한 없음 | 타인 데이터 수정, admin 전용 기능 |
| 404 | 리소스 없음 | 존재하지 않는 태스크 ID |
| 409 | 충돌 | 이메일 중복, 이미 사용된 초대 토큰 |
| 410 | 만료됨 | 48시간 초과된 초대 토큰 |
| 500 | 서버 에러 | DB 연결 오류 |

### 5.4 Zod 입력 검증 예시

```typescript
// 태스크 생성 스키마 예시
const createPlanItemSchema = z.object({
  dailyPlanId: z.coerce.number().positive(),
  title: z.string().min(1).max(255),
  priority: z.enum(['A', 'B', 'C']),
  sequenceOrder: z.number().int().min(0),
  estimatedTimeMinutes: z.number().positive().optional(),
  category: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

// API Route에서 사용 패턴
const result = createPlanItemSchema.safeParse(await req.json());
if (!result.success) {
  return Response.json(
    { error: 'Validation failed', details: result.error.flatten() },
    { status: 400 }
  );
}
```

---

## 6. UI/UX 설계

### 6.1 사이트맵

```
/                        → 자동 리다이렉트 (로그인 상태에 따라)
├── /login               → 로그인 페이지
├── /register?token=xxx  → 초대 코드 회원가입
└── (로그인 필요)
    ├── /dashboard        → 오늘의 요약 대시보드
    ├── /planner          → 일일 계획 (기본: 오늘)
    │   └── /planner?date=YYYY-MM-DD
    ├── /calendar         → 가족 공유 캘린더 (월간 뷰)
    ├── /goals            → 개인 목표 관리
    │   └── /goals/family → 가족 공동 목표
    ├── /profile          → 개인 사명서/가치관/역할
    ├── /notes            → 일일 메모
    ├── /announcements    → 가족 공지사항
    └── /admin            → 관리 (admin 전용)
        ├── /admin/invite  → 초대 토큰 생성
        └── /admin/members → 가족 구성원 관리
```

### 6.2 레이아웃 구조

```
┌─────────────────────────────────────────────────────────┐
│  Header                                                 │
│  [🏠 FamilyPlanner]     [2026년 3월 3일 (화)]  [👤 홍길동] │
├───────────┬─────────────────────────────────────────────┤
│  Sidebar  │  Main Content (페이지별 교체)                 │
│  ─────    │                                             │
│  📊 대시보드 │                                             │
│  📝 플래너  │                                             │
│  📅 캘린더  │                                             │
│  🎯 목표   │                                             │
│  👤 프로필  │                                             │
│  📓 메모   │                                             │
│  📢 공지   │                                             │
│  ⚙️  관리  │  (admin만 표시)                              │
│           │                                             │
│  [모바일]  │                                             │
│  Sidebar  │                                             │
│  → Sheet  │                                             │
│  (드로어)  │                                             │
└───────────┴─────────────────────────────────────────────┘
```

### 6.3 핵심 화면 와이어프레임

#### 일일 계획 화면 (`/planner`)

```
┌──────────────────────────────────────────────────────┐
│  ◀  2026년 3월 3일 (화)  ▶                    [공유 ✓] │
├──────────────────────────────────────────────────────┤
│  오늘의 테마: [가족과 함께하는 하루              ]       │
├──────────────────────────────────────────────────────┤
│  🔴 A — 반드시 완수                                   │
│  ┌─────────────────────────────────────────────────┐ │
│  │ ☐  프로젝트 보고서 작성           [업무] [60분 예상] │ │
│  │ ☐  가족 회의 준비                [가족] [15분 예상] │ │
│  └─────────────────────────────────────────────────┘ │
│  [+ A 항목 추가]                                      │
│                                                      │
│  🟡 B — 중요                                          │
│  ┌─────────────────────────────────────────────────┐ │
│  │ ☑  운동 (완료됨 45분)            [건강] [45분 완료] │ │
│  └─────────────────────────────────────────────────┘ │
│  [+ B 항목 추가]                                      │
│                                                      │
│  🟢 C — 선택                                          │
│  ┌─────────────────────────────────────────────────┐ │
│  │ ☐  독서 30분                     [학습]           │ │
│  └─────────────────────────────────────────────────┘ │
│  [+ C 항목 추가]                                      │
├──────────────────────────────────────────────────────┤
│  오늘의 성찰 (Reflection)                             │
│  ┌─────────────────────────────────────────────────┐ │
│  │ 마크다운 에디터...                               │ │
│  │                                                 │ │
│  └─────────────────────────────────────────────────┘ │
│                               [저장]  [취소]          │
└──────────────────────────────────────────────────────┘
```

#### 가족 캘린더 화면 (`/calendar`)

```
┌──────────────────────────────────────────────────────┐
│  ◀ 2026년 2월          2026년 3월           2026년 4월 ▶│
│                   [이벤트 추가 +]                      │
├──────────────────────────────────────────────────────┤
│   월   화   수   목   금   토   일                     │
│                                  1                   │
│    2   [3]   4    5    6    7    8                   │
│   [파티]            [회의]                            │
│    9   10   11   12   13   14   15                  │
│        [학교]                  [야구]                 │
│   16   17   18   19   20   21   22                  │
│   23   24   25   26   27   28   29                  │
│   30   31                                           │
├──────────────────────────────────────────────────────┤
│  3월 3일 이벤트                                       │
│  ● 파티 (오후 3:00 - 6:00) — 홍길동 [수정] [삭제]     │
└──────────────────────────────────────────────────────┘
```

#### 사명서/프로필 화면 (`/profile`)

```
┌──────────────────────────────────────────────────────┐
│  [👤 사진]  홍길동 (parent)                            │
│  간단 소개: [                                    ]    │
├──────────────────────────────────────────────────────┤
│  📜 개인 사명서                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │ 마크다운 에디터로 작성...                          │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  💎 핵심 가치관                                       │
│  [가족 ×] [성장 ×] [건강 ×] [+ 추가]                  │
│                                                      │
│  🎭 역할 및 책임                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │ 마크다운 에디터로 작성...                          │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  🌟 장기 비전                                         │
│  ┌─────────────────────────────────────────────────┐ │
│  │ 마크다운 에디터로 작성...                          │ │
│  └─────────────────────────────────────────────────┘ │
│                             [저장]                   │
└──────────────────────────────────────────────────────┘
```

### 6.4 shadcn/ui 컴포넌트 매핑

| UI 요소 | shadcn/ui 컴포넌트 | 비고 |
|---------|------------------|------|
| 태스크 체크박스 | `Checkbox` | 완료 상태 토글 |
| 날짜 선택 | `Calendar` + `Popover` | 날짜 네비게이션 |
| 마크다운 에디터 | `Textarea` (+ react-markdown 렌더링) | 사명서, 성찰 입력 |
| 이벤트 생성 모달 | `Dialog` | 캘린더 이벤트 추가 |
| 가치관 태그 입력 | `Badge` + `Input` 조합 | 태그 추가/삭제 |
| 토스트 알림 | `Sonner` | 저장 성공/실패 |
| 폼 | `Form` + `FormField` (react-hook-form) | 모든 입력 폼 |
| 로딩 상태 | `Skeleton` | 데이터 로딩 중 |
| 공지사항 우선순위 | `Badge` (variant별 색상) | low/normal/high/urgent |
| 감정 선택 | 커스텀 이모지 버튼 (RadioGroup 기반) | 😢 😔 😐 😊 😄 |

### 6.5 반응형 설계 전략

| 브레이크포인트 | 크기 | 변화 |
|-------------|------|------|
| 모바일 | < 768px (`sm`) | Sidebar → Sheet 드로어, 캘린더 → 주간 뷰 |
| 태블릿 | 768px ~ 1280px (`md`) | Sidebar 최소화 (아이콘만) |
| 데스크톱 | > 1280px (`lg`) | 전체 Sidebar 표시, 넓은 Main |

---

## 7. 실시간 기능 설계

### 7.1 실시간 구독 범위 결정

| 데이터 | 실시간 필요 여부 | 이유 |
|--------|---------------|------|
| `family_events` | ✅ 필요 | 여러 구성원이 **동시에** 보는 공유 데이터 |
| `daily_plans`, `plan_items` | ❌ 불필요 | 개인 데이터, 본인만 편집 |
| `goals`, `notes` | ❌ 불필요 | 개인 데이터, 페이지 이동 시 refetch 충분 |
| `family_announcements` | ❌ 불필요 | 빈도 낮음, 새로고침으로 충분 |

### 7.2 Supabase Realtime 연동 아키텍처

MariaDB는 Supabase Realtime의 PostgreSQL CDC와 직접 연동되지 않으므로, **Broadcast 채널**을 브리지로 사용한다:

```
[사용자 A — 이벤트 생성]
          │
          │ POST /api/family/events
          ▼
[Next.js API Route]
          │ 1. Prisma → MariaDB INSERT family_events
          │ 2. Supabase Broadcast 이벤트 발행
          │    channel('family-events-{familyId}')
          │    .send({ type: 'broadcast', event: 'event-changed' })
          │
[Supabase Realtime Cloud]
          │ WebSocket 채널 브로드캐스트
          │
[사용자 B의 브라우저 — FamilyCalendar.tsx]
          │ 'event-changed' 수신
          ▼
[TanStack Query]
    queryClient.invalidateQueries(['family-events', month])
          │
          ▼ 자동 refetch → UI 갱신
```

### 7.3 클라이언트 구독 코드 패턴

```typescript
// app/(app)/calendar/components/FamilyCalendarRealtime.tsx
'use client'

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase';

export function FamilyCalendarRealtime({ familyId }: { familyId: string }) {
  const queryClient = useQueryClient();
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel(`family-events-${familyId}`)
      .on('broadcast', { event: 'event-changed' }, () => {
        // 현재 보고 있는 월의 데이터 무효화 → 자동 refetch
        queryClient.invalidateQueries({
          queryKey: ['family-events']
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [familyId, queryClient, supabase]);

  return null; // UI 없음, 구독만 처리
}
```

### 7.4 API Route에서 Broadcast 발행

```typescript
// app/api/family/events/route.ts
import { supabaseAdmin } from '@/lib/supabase-admin';

// 이벤트 생성 후
await supabaseAdmin
  .channel(`family-events-${session.user.familyId}`)
  .send({
    type: 'broadcast',
    event: 'event-changed',
    payload: { action: 'created', eventId: newEvent.id }
  });
```

### 7.5 오프라인/재연결 처리

- Supabase 연결 끊김 → 재연결 시 TanStack Query `invalidateQueries` 호출
- `staleTime: 0` (가족 이벤트) → 항상 최신 데이터 보장
- Supabase 클라이언트 기본 재연결 로직 활용 (추가 구현 불필요)

---

## 8. 프론트엔드 아키텍처

### 8.1 Next.js App Router 폴더 구조

```
app/
├── (auth)/                    # 인증 페이지 그룹 (레이아웃 없음)
│   ├── login/
│   │   └── page.tsx
│   └── register/
│       └── page.tsx           # ?token= 파라미터 처리
│
├── (app)/                     # 앱 본체 (로그인 필수)
│   ├── layout.tsx             # 공통 레이아웃 (Sidebar + Header)
│   ├── dashboard/
│   │   └── page.tsx           # Server Component — 오늘 요약 fetch
│   ├── planner/
│   │   ├── page.tsx           # Server Component — 초기 일일 계획 fetch
│   │   └── components/
│   │       ├── DailyPlanClient.tsx  # 'use client' — 태스크 인터랙션
│   │       ├── TaskList.tsx
│   │       └── PrioritySection.tsx
│   ├── calendar/
│   │   ├── page.tsx
│   │   └── components/
│   │       ├── FamilyCalendar.tsx
│   │       └── FamilyCalendarRealtime.tsx  # 'use client' — 실시간 구독
│   ├── goals/
│   │   ├── page.tsx
│   │   └── family/
│   │       └── page.tsx
│   ├── profile/
│   │   └── page.tsx
│   ├── notes/
│   │   └── page.tsx
│   ├── announcements/
│   │   └── page.tsx
│   └── admin/
│       ├── layout.tsx         # admin role 검증 (non-admin → redirect)
│       ├── invite/
│       │   └── page.tsx
│       └── members/
│           └── page.tsx
│
├── api/
│   ├── auth/
│   │   ├── [...nextauth]/
│   │   │   └── route.ts      # NextAuth handler
│   │   ├── invite/
│   │   │   └── route.ts
│   │   └── register/
│   │       └── route.ts
│   ├── plans/
│   │   └── route.ts           # GET + POST
│   ├── tasks/
│   │   ├── [id]/
│   │   │   └── route.ts       # PUT + DELETE
│   │   └── reorder/
│   │       └── route.ts       # PATCH
│   ├── family/
│   │   └── events/
│   │       ├── route.ts       # GET + POST
│   │       └── [id]/
│   │           └── route.ts   # DELETE
│   ├── goals/
│   │   └── route.ts
│   ├── profile/
│   │   └── route.ts
│   └── health/
│       └── route.ts
│
├── layout.tsx                 # 최상위 레이아웃 (TanStack Query Provider)
└── middleware.ts              # NextAuth 미들웨어 (세션 보호)

components/
├── ui/                        # shadcn/ui 컴포넌트 (자동 생성)
├── layout/
│   ├── Sidebar.tsx
│   ├── Header.tsx
│   └── MobileNav.tsx          # Sheet 드로어
├── planner/
│   ├── TaskItem.tsx
│   └── AddTaskForm.tsx
├── calendar/
│   └── EventDialog.tsx
└── shared/
    ├── MarkdownEditor.tsx
    └── DateNavigation.tsx

lib/
├── prisma.ts                  # Prisma 클라이언트 싱글톤
├── auth.ts                    # NextAuth 설정 (authOptions)
├── supabase.ts                # Supabase Client (브라우저용)
├── supabase-admin.ts          # Supabase Admin Client (서버용)
└── validations/
    ├── plan.ts                # Zod 스키마
    ├── task.ts
    └── event.ts

stores/
└── useUIStore.ts              # Zustand (UI 상태만)

hooks/
├── useDailyPlan.ts            # TanStack Query
├── useFamilyEvents.ts         # TanStack Query + Realtime
└── useProfile.ts              # TanStack Query
```

### 8.2 Server vs Client 컴포넌트 분리 기준

| 종류 | 조건 | 예시 |
|------|------|------|
| **Server Component** (기본) | 초기 데이터 fetch, DB 직접 접근 | `planner/page.tsx`, `dashboard/page.tsx` |
| **Client Component** (`'use client'`) | useState, useEffect, 이벤트 핸들러, 실시간 구독 | `DailyPlanClient.tsx`, `FamilyCalendarRealtime.tsx` |

### 8.3 상태 관리 전략

**TanStack Query — 서버 상태**:

| 쿼리 키 | 데이터 | staleTime |
|---------|--------|-----------|
| `['daily-plan', date]` | 일일 계획 + 태스크 | 5분 |
| `['family-events', month]` | 가족 캘린더 이벤트 | 0 (실시간) |
| `['goals', type, year]` | 목표 목록 | 10분 |
| `['profile']` | 사명서/가치관 | 30분 |
| `['family-announcements']` | 공지사항 | 5분 |

**Zustand — UI 상태** (서버 상태 아닌 순수 UI):

```typescript
// stores/useUIStore.ts
interface UIStore {
  isSidebarOpen: boolean;
  selectedDate: Date;
  draggingTaskId: number | null;
  // ...
}
```

### 8.4 데이터 로딩 전략

1. **초기 렌더링 (Server Component)**: Prisma 직접 호출 → HTML에 포함 → 초기 로딩 빠름
2. **이후 인터랙션 (TanStack Query)**: API 호출 → 캐시 활용 → 낙관적 업데이트
3. **낙관적 업데이트 예시** (태스크 완료 체크):
   ```typescript
   const { mutate } = useMutation({
     mutationFn: (id: number) => fetch(`/api/tasks/${id}`, { method: 'PUT', ... }),
     onMutate: async (id) => {
       // 서버 응답 전 UI 즉시 반영
       queryClient.setQueryData(['daily-plan', date], (old) => ({
         ...old,
         planItems: old.planItems.map(item =>
           item.id === id ? { ...item, isCompleted: true } : item
         )
       }));
     },
     onError: () => queryClient.invalidateQueries({ queryKey: ['daily-plan', date] })
   });
   ```

---

## 9. 배포 아키텍처

### 9.1 Docker Compose 서비스 구성

| 서비스 | 이미지 | 역할 | 포트 | 네트워크 |
|--------|--------|------|------|---------|
| `mariadb` | `mariadb:11.2` | DB 영속화 | expose 없음 | diary-internal |
| `next-app` | 프로젝트 Dockerfile 빌드 | App + API | 3000 (내부) | diary-internal |
| `nginx` | `nginx:1.26-alpine` | 리버스 프록시, SSL | 80, 443 | diary-internal + diary-external |

**헬스체크 체인**:
```
mariadb: healthcheck.sh --innodb_initialized
    → next-app: depends_on mariadb (healthy)
        → next-app: wget http://localhost:3000/api/health
            → nginx: depends_on next-app
```

### 9.2 Dockerfile 멀티스테이지 빌드

```dockerfile
# Stage 1: deps — 프로덕션 의존성 + Prisma 클라이언트 생성
FROM node:20-alpine AS deps
RUN npm ci --only=production
RUN npx prisma generate

# Stage 2: builder — 전체 빌드
FROM node:20-alpine AS builder
COPY --from=deps /app/node_modules .
RUN npm run build  # output: 'standalone' 모드

# Stage 3: runner — 최소 이미지 (standalone 결과물만)
FROM node:20-alpine AS runner
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# Prisma 바이너리 포함 필수
USER nextjs  # 비루트 사용자로 실행
EXPOSE 3000
```

**`output: 'standalone'` 필수 이유**:
- `node_modules` 없이 실행 가능한 자체 포함 번들 생성
- 이미지 크기: 전체 포함 ~1GB → standalone ~150-200MB

### 9.3 환경변수 관리

```env
# NAS의 deploy/nas/.env (git 추적 제외, SSH로 직접 전송)

# MariaDB
DB_ROOT_PASSWORD=<openssl rand -base64 24>
DB_NAME=family_planner
DB_USER=planner_app
DB_PASSWORD=<openssl rand -base64 24>

# NextAuth.js
NEXTAUTH_URL=https://diary.yourdomain.com
NEXT_PUBLIC_APP_URL=https://diary.yourdomain.com
NEXTAUTH_SECRET=<openssl rand -base64 32>  # 최소 32바이트

# Supabase Realtime
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...

# 도메인
DOMAIN_NAME=diary.yourdomain.com
```

### 9.4 Nginx 설정 전략

**MODE A** — HTTPS + Let's Encrypt (DDNS + 포트포워딩 사용 시):
```nginx
server {
    listen 80;
    return 301 https://$host$request_uri;
}
server {
    listen 443 ssl;
    ssl_certificate /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;
    ...
}
```

**MODE B** — HTTP only (Cloudflare Tunnel 사용 시, **권장**):
```nginx
server {
    listen 80;  # Cloudflare Tunnel이 HTTPS 처리, 내부는 HTTP
    location / { proxy_pass http://next-app:3000; }
    # WebSocket 업그레이드 (Supabase Realtime)
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

### 9.5 Cloudflare Tunnel 설정 (권장 방식)

```
① Cloudflare Dashboard → Zero Trust → Networks → Tunnels → Create Tunnel
② NAS에서 cloudflared 설치/컨테이너 기동 (diary-external 네트워크)
③ Public Hostname 설정:
   Subdomain: diary
   Domain: yourdomain.com
   Service: http://nginx:80
④ DNS 자동 설정 (Cloudflare A 레코드)
⑤ HTTPS 자동 처리 (Cloudflare 인증서)
```

**장점**: 공유기에 포트 개방 불필요, HTTPS 자동, DDoS 방어 포함

### 9.6 데이터 백업 전략

```bash
# deploy/nas/scripts/backup.sh (cron: 매일 새벽 2시)
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/volume1/backups/family-diary"

docker exec family-diary-db mysqldump \
  -u root -p"${DB_ROOT_PASSWORD}" \
  --single-transaction \
  --routines \
  family_planner \
  > "${BACKUP_DIR}/${DATE}.sql"

# 30일 이상 된 백업 자동 삭제
find "${BACKUP_DIR}" -name "*.sql" -mtime +30 -delete
```

### 9.7 운영 명령어 (NAS SSH)

```bash
# 전체 스택 기동
docker compose up -d

# 특정 서비스만 재시작
docker compose restart next-app

# 로그 확인
docker compose logs -f next-app
docker compose logs -f mariadb

# 상태 확인
docker compose ps

# 코드 업데이트 배포
bash deploy/nas/scripts/deploy.sh

# 수동 백업
bash deploy/nas/scripts/backup.sh
```

---

## 10. 개발 로드맵

### Phase 1 — MVP (핵심 기능, 최우선)

**목표**: 실제 가족이 매일 사용할 수 있는 최소 기능

| 기능 | 상세 |
|------|------|
| 초대 코드 회원가입 | `/register?token=` 페이지, 토큰 검증, 자동 로그인 |
| 로그인/로그아웃 | NextAuth Credentials Provider |
| 일일 계획 | A/B/C 우선순위 태스크 추가/완료/삭제 |
| 가족 공유 캘린더 | 월간 뷰, 이벤트 추가/삭제, Supabase Realtime 실시간 동기화 |
| 기본 배포 | Docker Compose + NAS 기동 |

**구현 순서** (의존성 고려):
1. DB 스키마 + Prisma 설정 (`npx prisma migrate dev`)
2. NextAuth 설정 + `middleware.ts` (세션 보호)
3. 초대 코드 API + 회원가입 페이지
4. 일일 계획 API + 플래너 화면 (Server Component + Client)
5. 가족 이벤트 API + 캘린더 화면
6. Supabase Realtime 연동 (`FamilyCalendarRealtime.tsx`)
7. Docker Compose 기동 테스트

---

### Phase 2 — 핵심 플래너 완성

**목표**: 프랭클린 플래너의 계층 구조 완전 구현

| 기능 | 상세 |
|------|------|
| 개인 사명서/가치관 | `/profile` 페이지, 마크다운 에디터 |
| 목표 관리 | 주간/월간/연간 목표, 진행률 업데이트 |
| 주간 계획 뷰 | `/planner?view=week` — 7일 한눈에 보기 |
| 드래그 앤 드롭 | dnd-kit으로 태스크 순서 변경 (`PATCH /api/tasks/reorder`) |
| 태스크 카테고리/태그 | 카테고리별 필터링 |
| 일일 성찰 | 플래너 하단 마크다운 에디터 |

---

### Phase 3 — 가족 공동체 기능

**목표**: 가족 유대를 위한 공동 기능

| 기능 | 상세 |
|------|------|
| 가족 목표 | `/goals/family` — 가족 공동 목표, 참여자 표시 |
| 가족 공지사항 | `/announcements` — 핀 고정, 우선순위 색상 |
| 감정 체크인 | 일일 감정 기록, 수면/운동 추적 |
| 가족 헌장 | 가족 미션, 가치관 공동 작성 (별도 페이지) |
| 기념일 자동 추적 | `family_events.event_type = 'birthday'|'anniversary'`로 자동 표시 |
| 가족 뉴스피드 | 대시보드에 오늘의 가족 활동 요약 |

---

### Phase 4 — 고도화 및 분석

**목표**: 데이터 기반 인사이트 + 편의 기능

| 기능 | 상세 |
|------|------|
| PWA 지원 | 홈 화면 추가, 오프라인 기본 기능 |
| 시간 분석 | 카테고리별 `actual_time_minutes` 집계 — 역할별 시간 분배 시각화 |
| 주간 리뷰 자동 생성 | 지난 주 완료율 + 성찰 요약 |
| 데이터 내보내기 | CSV/JSON 다운로드 |
| 가족 회의 자동 생성 | 목표 기반 주간/월간 회의 아젠다 자동 작성 |

---

## 11. 보안 고려사항

### 11.1 위협 모델

| 위협 | 공격 시나리오 | 대응책 |
|------|------------|--------|
| **초대 링크 탈취** | 링크가 외부에 노출됨 | 48시간 만료 + 1회 사용으로 피해 최소화 |
| **타 가족 데이터 접근** | userId 조작으로 다른 가족 데이터 조회 | 모든 API에서 `familyId` 강제 필터 |
| **타 구성원 데이터 무단 수정** | planId를 알고 있어 타인 태스크 수정 시도 | `userId` 강제 조건으로 차단 |
| **환경변수 노출** | `.env`가 git에 커밋됨 | `.gitignore` + SSH 직접 전송 |
| **DB 직접 접근** | MariaDB 포트 외부 노출 | `diary-internal` 네트워크 격리 |

### 11.2 인증/세션 보안

```typescript
// bcrypt 설정 (saltRounds: 12)
const passwordHash = await bcrypt.hash(password, 12);
const isValid = await bcrypt.compare(password, user.passwordHash);

// JWT Cookie 속성 (NextAuth 자동 처리)
// httpOnly: true    — XSS로 훔칠 수 없음
// secure: true      — HTTPS 전송만
// sameSite: 'lax'   — CSRF 방어
// maxAge: 30 * 24 * 60 * 60  — 30일
```

### 11.3 데이터 격리 필수 패턴

```typescript
// ❌ WRONG — IDOR(Insecure Direct Object Reference) 취약점
const task = await prisma.planItem.findUnique({
  where: { id: BigInt(params.id) }  // 누구의 태스크인지 검증 없음!
});

// ✅ CORRECT — userId + 선택적 familyId 조건 필수
const session = await getServerSession(authOptions);
const task = await prisma.planItem.findFirst({
  where: {
    id: BigInt(params.id),
    userId: BigInt(session.user.id),  // 본인 태스크만
  }
});
if (!task) return Response.json({ error: 'Not found' }, { status: 404 });
```

### 11.4 입력 검증 + XSS 방지

- **SQL Injection**: Prisma ORM이 파라미터화 쿼리 자동 적용 → 위험 없음
- **XSS**: React 기본 이스케이핑 + 마크다운 HTML 렌더링 시 `DOMPurify` 또는 `sanitize-html` 적용 필수
- **모든 API**: Zod 스키마 검증 필수 (`safeParse` 사용)

### 11.5 운영 보안 체크리스트

```
□ .gitignore에 .env, .env.local, .env.production 포함
□ NAS .env는 SSH로 직접 전송 (git push 절대 금지)
□ DB_ROOT_PASSWORD: 최소 32자 랜덤 문자열
□ NEXTAUTH_SECRET: openssl rand -base64 32 (32바이트 이상)
□ MariaDB 포트 외부 미노출 확인 (docker compose ps)
□ Cloudflare Tunnel 설정 시 'Access' 정책 검토
```

---

## 12. 성능 최적화 전략

### 12.1 현재 규모 특성

```
가족 10명 × 3년 = 전체 ~108,000행, ~30-50MB
innodb_buffer_pool_size = 256MB → 전체 데이터 메모리 상주

→ 대부분의 쿼리: 1ms 이하 (인덱스 히트 + 메모리 캐시)
→ 과도한 최적화 불필요, 코드 가독성 우선
```

### 12.2 필수 최적화 — DB 인덱스

`schema/01_create_tables.sql`에 이미 포함된 인덱스들:

```sql
-- 1. 로그인 (매우 빈번)
UNIQUE INDEX ON users(email)

-- 2. 가족 구성원 조회
INDEX idx_family_id ON users(family_id)

-- 3. 날짜별 계획 조회 (핵심, 하루 수십 회)
UNIQUE INDEX uk_user_date ON daily_plans(user_id, plan_date)

-- 4. A/B/C 필터링 최적화 (복합 인덱스)
INDEX idx_daily_plan_priority_completed ON plan_items(daily_plan_id, priority, is_completed)

-- 5. 월간 캘린더 쿼리 최적화 (복합 인덱스)
INDEX idx_family_period ON family_events(family_id, start_at, end_at)
```

### 12.3 N+1 쿼리 방지

```typescript
// ❌ N+1 발생 패턴 (절대 금지)
const plans = await prisma.dailyPlan.findMany({ where: { userId } });
for (const plan of plans) {
  plan.items = await prisma.planItem.findMany(  // N번 추가 쿼리!
    { where: { dailyPlanId: plan.id } }
  );
}

// ✅ Prisma include로 1번 쿼리에 해결
const plan = await prisma.dailyPlan.findUnique({
  where: { userId_planDate: { userId, planDate } },
  include: {
    planItems: {
      orderBy: [
        { priority: 'asc' },       // A → B → C 순서
        { sequenceOrder: 'asc' }    // 우선순위 내 순서
      ]
    }
  }
});
```

### 12.4 프론트엔드 최적화

**Next.js 자동 최적화** (별도 설정 불필요):
- Image Optimization (`next/image`)
- JS 번들 코드 스플리팅
- `/_next/static/` 파일 장기 캐시 (파일명에 해시 포함)

**TanStack Query 캐싱 설정**:
```typescript
// lib/query-client.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,   // 기본 5분
      gcTime: 30 * 60 * 1000,     // 30분 후 가비지 컬렉션
    }
  }
});
// family-events는 staleTime: 0 (실시간 대응)
```

### 12.5 MariaDB 설정 (my.cnf)

```ini
[mysqld]
# 메모리 설정 (NAS 4GB RAM 기준)
innodb_buffer_pool_size = 256M   # 전체 데이터 메모리 상주
innodb_log_file_size = 64M

# 동시성 (소규모 가족)
max_connections = 20

# 안정성 (NAS 정전 대비)
innodb_flush_log_at_trx_commit = 1   # 프로덕션: 완전 안전
# innodb_flush_log_at_trx_commit = 2  # 개발: 성능 우선

# 한국어 지원
character_set_server = utf8mb4
collation_server = utf8mb4_unicode_ci

# 모니터링
slow_query_log = 1
long_query_time = 0.5           # 0.5초 이상 쿼리 기록
```

### 12.6 성능 모니터링 쿼리

```sql
-- 슬로우 쿼리 로그 파일 위치 확인
SHOW VARIABLES LIKE 'slow_query_log_file';

-- 미사용 인덱스 탐지 (월 1회 확인)
SELECT OBJECT_NAME, INDEX_NAME
FROM performance_schema.table_io_waits_summary_by_index_usage
WHERE OBJECT_SCHEMA = 'family_planner'
  AND COUNT_STAR = 0
  AND INDEX_NAME IS NOT NULL;

-- 테이블별 크기 모니터링
SELECT TABLE_NAME,
  ROUND((data_length + index_length) / 1024 / 1024, 2) AS size_mb
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'family_planner'
ORDER BY size_mb DESC;
```

### 12.7 미래 확장 시나리오 (사용자 100명 초과 시)

현재 스키마로 100명까지 추가 작업 없이 확장 가능.
100명 초과 시 고려 사항:

| 항목 | 현재 | 100명+ |
|------|------|-------|
| DB 캐싱 | innodb_buffer_pool | Redis 캐시 레이어 추가 |
| 읽기 부하 | MariaDB 단일 | 읽기 복제본 추가 |
| 세션 저장 | NextAuth JWT | Redis 세션 스토어 |
| 데이터 파티셔닝 | 불필요 | `family_events` 날짜 기반 파티셔닝 |

---

## 부록 — 기존 문서와의 관계

이 설계 문서는 "**무엇을 왜 만드는가**"를 설명한다.
기존 `docs/` 폴더의 문서들은 "**어떻게 설치/운영하는가**"를 설명하는 구현 가이드다.

| 기존 문서 | 역할 | 이 문서의 관련 섹션 |
|----------|------|-----------------|
| `SETUP_GUIDE.md` | MariaDB 초기 설치 + Prisma 통합 | 섹션 4 (DB), 섹션 9 (배포) |
| `PERFORMANCE_OPTIMIZATION.md` | 성능 튜닝 상세 | 섹션 12 (성능) |
| `INDEX_DESIGN.md` | 인덱스 설계 상세 분석 | 섹션 4.3 (인덱스) |
| `NAS_MIGRATION_GUIDE.md` | PC → NAS 전환 절차 | 섹션 9 (배포) |

---

*이 문서는 각 Phase 완료 시 해당 섹션을 업데이트한다. 스키마 변경 시 섹션 4(DB)와 섹션 5(API)를 동시에 갱신한다.*
