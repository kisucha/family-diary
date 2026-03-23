# FamilyPlanner — 개발 진행 현황

> 마지막 업데이트: 2026-03-08
> 중단 후 재개 시 이 파일을 먼저 확인하고 ✅ 완료된 단계 이후부터 진행할 것.

---

## 진행 상태 범례
- ✅ **완료** — 구현 및 검증 완료
- 🔄 **진행중** — 현재 작업 중
- ⬜ **대기** — 아직 시작 안 함
- ❌ **실패** — 오류 발생, 메모 확인

---

## 메시지 로그 포맷

서브에이전트가 각 태스크 작업 시 아래 형식으로 메시지를 기입합니다:

```
- ✅ N-N. 태스크 제목
  - 📝 YYYY-MM-DD HH:MM [시작]: 작업을 시작합니다.
  - 📝 YYYY-MM-DD HH:MM [진행]: 중간 진행 메시지.
  - 📝 YYYY-MM-DD HH:MM [완료]: 작업이 완료되었습니다.
  - ⚠️ YYYY-MM-DD HH:MM [오류]: 발생한 오류 내용.
```

---

## Phase 1 — MVP ✅ 전체 완료

- ✅ 1-1. Next.js 프로젝트 초기화 (next@14.2.35, 수동 생성)
- ✅ 1-2. 패키지 의존성 설치
- ✅ 1-3. Prisma + MariaDB 연결 + 마이그레이션
- ✅ 1-4. NextAuth.js v5 인증 (Credentials + JWT)
- ✅ 1-5. 미들웨어 라우트 보호
- ✅ 1-6. shadcn/ui 17개 컴포넌트
- ✅ 1-7. 공통 레이아웃 (Sidebar + Header + MobileNav)
- ✅ 1-8. 로그인/회원가입 + Auth API
- ✅ 1-9. 일일 계획 API (plans, tasks, reorder)
- ✅ 1-10. 플래너 UI (A/B/C 우선순위, 날짜 네비, 낙관적 업데이트)
- ✅ 1-11. 가족 캘린더 API + UI + Supabase Realtime 구조
- ✅ 1-12. 헬스체크 + 대시보드 + 기타 페이지 (profile, notes, announcements, goals 플레이스홀더)
- ✅ 1-13. 프로덕션 빌드 성공 (21개 페이지)
- ✅ 1-14. DB 마이그레이션 + admin 계정 생성 + 개발서버 기동

---

## Phase 2 — 핵심 플래너 기능 ✅ 전체 완료

- ✅ 2-1. 프로필 편집 API + UI (사명서, 가치관 태그, 역할, 비전)
- ✅ 2-2. 노트 편집 API + UI (2초 debounce 자동저장, 마크다운 미리보기, 날짜 네비)
- ✅ 2-3. 목표 관리 API + UI (주간/월간/연간 탭, 슬라이더 진행률, 상태 관리)
- ✅ 2-4. 가족 공지사항 CRUD (핀 고정, 우선순위, 역할별 권한)
- ✅ 2-5. 태스크 드래그 앤 드롭 (@dnd-kit, 낙관적 업데이트, PATCH /api/tasks/reorder)
- ✅ 2-6. 감정 체크인 API + UI (5단계 이모지, 수면/운동 입력, 노트 통합)
- ✅ Phase 2 빌드 검증 (npm run build — 26개 페이지)

---

## Phase 3 — 가족 공동체 기능 ✅ 전체 완료

- ✅ 3-1. 가족 공동 목표 (FamilyGoal CRUD, 기여자 멀티셀렉트, Sidebar 메뉴 추가)
- ✅ 3-2. 관리자 구성원 관리 (역할 변경, 활성/비활성 토글, admin 탭 네비)
- ✅ 3-3. 주간 리뷰 자동 생성 (recharts, BarChart 완료율, LineChart 감정 트렌드, 주간 네비)
- ✅ Phase 3 빌드 검증 (npm run build — 32개 페이지)

---

## Phase 4 — 고도화 ✅ 전체 완료

- ✅ 4-1. PWA 설정 (next-pwa, manifest.json, service worker, 앱 아이콘)
- ✅ 4-2. 시간 분석 대시보드 (PieChart 우선순위 분포, BarChart 요일별, 월별 완료율)
- ✅ 4-3. 데이터 내보내기 (papaparse, CSV/JSON, BOM UTF-8, 기간 선택)
- ✅ Phase 4 빌드 검증 (npm run build — 35개 페이지, PWA sw.js 생성)

---

## Phase 5 — 메시지 로그 시스템 + 기능 보완 ✅ 전체 완료

- ✅ 5-1. DEV_PROGRESS.md 메시지 로그 포맷 정의 및 적용
  - 📝 2026-03-08 [시작]: 사용자 요청에 따라 태스크별 메시지 기입 시스템 구현 시작.
  - 📝 2026-03-08 [진행]: DEV_PROGRESS.md 파일 구조를 분석하고 로그 포맷 설계.
  - 📝 2026-03-08 [완료]: 범례에 로그 포맷 규칙 추가, Phase 5 섹션 신설 완료.

- ✅ 5-2. 플래너 태스크 특이사항 메모 필드 추가
  - 📝 2026-03-08 [시작]: plan_items의 기존 description 컬럼을 UI에 노출하는 작업 시작.
  - 📝 2026-03-08 [진행]: validations/plan.ts에 description 필드 추가, tasks/route.ts POST에 반영.
  - 📝 2026-03-08 [진행]: TaskItem.tsx에 MessageSquare 아이콘 + textarea 인라인 편집 UI 구현 (Ctrl+Enter 저장, Esc 취소).
  - 📝 2026-03-08 [진행]: SortableTaskItem.tsx에 onMemoSave prop 전달, DailyPlanClient.tsx에 memoMutation + handleMemoSave 추가.
  - 📝 2026-03-08 [완료]: npm run build 성공 (36페이지, 타입 에러 없음).

- ✅ 5-3. 플래너·캘린더 테마 미적용 색상 수정
  - 📝 2026-03-08 [시작]: 플래너·캘린더만 테마 미적용 문제 보고.
  - 📝 2026-03-08 [진행]: planner/page.tsx의 bg-gray-50 래퍼, calendar/page.tsx의 text-gray-* 확인.
  - 📝 2026-03-08 [진행]: CalendarClient.tsx에서 bg-white·border-gray-*·text-gray-* 등 20여 곳 하드코딩 색상 발견.
  - 📝 2026-03-08 [완료]: 3개 파일 수정 — 모든 gray 하드코딩을 bg-card/bg-accent/text-foreground/text-muted-foreground/border-border 등 테마 토큰으로 교체. 빌드 성공.

- ✅ 5-4. 플래너 가독성 향상 색상 수정
  - 📝 2026-03-08 [시작]: 섹션 배경 너무 연함, 태스크 카드 구분 불가, 뱃지 가시성 저하 문제 확인.
  - 📝 2026-03-08 [완료]: DailyPlanClient.tsx 섹션 배경(bg-red-50 등) 강화, TaskItem.tsx 우선순위별 left accent(border-l-[3px]) 추가, 뱃지 bg-*-100 text-*-700으로 진하게 교체. 빌드 성공.

---

## Phase 6 — 텔레그램 일일 알림 시스템 ✅ 전체 완료

### 개요

매일 오전 8시, 각 사용자에게 개인 텔레그램으로 일일 브리핑을 발송한다.
사용자별로 Bot Token + Chat ID를 프로필에 등록하며, 미등록 사용자는 알림 제외.

**알림 포함 내용 (3가지):**
1. 오늘의 플랜 태스크 — A/B/C 우선순위별 목록 (완료 여부 표시)
2. 이번 주 가족 일정 — `family_events` 테이블 기준 해당 주 월~일 이벤트
3. 미완료 태스크 — 최근 7일 이내 `plan_items` 중 `is_completed = false`인 항목

**아키텍처:**
- 스케줄러: `node-cron` + Next.js `instrumentation.ts` hook (NAS/노트북 배포 환경)
- Telegram Bot API: `https://api.telegram.org/bot{token}/sendMessage` 직접 호출 (fetch)
- 실행 주기: 매일 08:00 KST (`0 8 * * *` — `Asia/Seoul` 타임존 적용)
- 발송 단위: 사용자별 독립 발송 (telegram_chat_id 설정된 활성 사용자만)

---

### 설계 세부사항

#### DB 변경 — `profiles` 테이블에 컬럼 추가

```
telegram_bot_token  VARCHAR(200) NULL  -- 사용자별 Bot Token (예: 8144690567:AAE...)
telegram_chat_id    VARCHAR(50)  NULL  -- 사용자별 Chat ID   (예: 8673958851)
```

> **보안 주의**: Bot Token은 DB에 암호화 없이 저장 (가족 내부망 전용 서비스 특성상 허용).
> `.env` 파일이 아닌 DB에 저장하는 이유: 사용자별로 다른 값이 필요하기 때문.

#### 텔레그램 메시지 포맷 예시

```
📅 *2026-03-23 (월) 일일 브리핑*

🔴 *A 우선순위*
• [ ] 보고서 작성
• [✓] 아침 운동

🟡 *B 우선순위*
• [ ] 독서 30분

🟢 *C 우선순위*
• [ ] 방 정리

─────────────────
📆 *이번 주 가족 일정*
• 03-24 (화) 아이 학교 발표회
• 03-26 (목) 가족 외식

─────────────────
⚠️ *미완료 태스크 (최근 7일)*
• [03-22] 운동 계획 세우기
• [03-20] 책 반납
```

#### 신규 파일 목록

| 파일 | 역할 |
|------|------|
| `instrumentation.ts` | Next.js 서버 시작 훅 — node-cron 스케줄러 등록 |
| `lib/telegram.ts` | Bot API `sendMessage` 유틸리티 함수 |
| `lib/notifications/daily-brief.ts` | 알림 내용 수집 + 메시지 포맷 생성 |
| `app/api/notifications/test/route.ts` | 즉시 테스트 발송 API (admin 전용) |

#### 수정 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `prisma/schema.prisma` | Profile 모델에 `telegramBotToken`, `telegramChatId` 필드 추가 |
| `schema/01_create_tables.sql` | `ALTER TABLE profiles ADD COLUMN` |
| `lib/validations/profile.ts` | updateProfileSchema에 telegram 필드 추가 |
| `app/api/profile/route.ts` | GET/PATCH에 telegram 필드 포함 |
| `app/(app)/profile/components/ProfileEditClient.tsx` | 텔레그램 설정 섹션 추가 (Bot Token, Chat ID, 테스트 발송 버튼) |
| `app/(auth)/register/_components/RegisterForm.tsx` | 텔레그램 정보 입력 필드 추가 (선택 입력) |
| `app/api/auth/register/route.ts` | 회원가입 시 profile에 telegram 필드 저장 |
| `package.json` | `node-cron` 패키지 추가 |

---

### 구현 태스크

- ✅ 6-1. DB 스키마 변경
  - 📝 2026-03-23 [완료]: `prisma/schema.prisma` Profile 모델에 `telegramBotToken`, `telegramChatId` 추가. `schema/01_create_tables.sql` 컬럼 추가. `prisma/migrations/20260323000000_add_telegram_fields/migration.sql` 생성.

- ✅ 6-2. 텔레그램 유틸리티 + 알림 내용 수집 로직 구현
  - 📝 2026-03-23 [완료]: `lib/telegram.ts` sendTelegramMessage 함수 생성. `lib/notifications/daily-brief.ts` buildDailyBriefMessage 함수 구현 (KST 기준 오늘 계획/이번 주 가족일정/최근 7일 미완료 태스크).

- ✅ 6-3. 스케줄러 구현 (node-cron + instrumentation.ts)
  - 📝 2026-03-23 [완료]: `node-cron@3.x` + `@types/node-cron` 설치. `instrumentation.ts` 루트 생성 — 매일 08:00 KST 스케줄 등록. `next.config.mjs`에 `instrumentationHook: true` + webpack externals 처리(node-cron).

- ✅ 6-4. 회원가입 폼 + API에 텔레그램 정보 추가
  - 📝 2026-03-23 [완료]: `RegisterForm.tsx` 텔레그램 선택 입력 섹션 추가. `app/api/auth/register/route.ts` telegram 필드 Zod 스키마 추가 + profile.create에 반영.

- ✅ 6-5. 프로필 편집에 텔레그램 설정 섹션 추가
  - 📝 2026-03-23 [완료]: `lib/validations/profile.ts` telegram 필드 추가. `app/api/profile/route.ts` GET/PUT에 telegram 반영. `ProfileEditClient.tsx` 텔레그램 카드 + 테스트 발송 버튼 추가. `app/api/notifications/test/route.ts` 신규 생성.

- ✅ Phase 6 빌드 검증 (npm run build — 40개 페이지, TypeScript 에러 없음)

---

## 오류 기록

| 단계 | 오류 내용 | 해결 방법 | 날짜 |
|------|----------|----------|------|
| 1-11 | Supabase placeholder URL broadcast REST fallback 지연 | placeholder 감지 후 skip | 2026-03-06 |
| 1-11 | EventDialog 오류 미표시 | try/catch + submitError state | 2026-03-06 |
| 1-11 | DELETE/CalendarClient admin 역할 `"admin"` 오타 | `"ADMIN"`으로 수정 | 2026-03-06 |
| 2-x | TypeScript Omit 교차 타입 에러 (Date & string) | Omit에 날짜 필드 명시적 추가 | 2026-03-07 |
| 2-6 | SerializedEmotion 두 파일 불일치 | NoteEditorClient 인터페이스 확장 | 2026-03-07 |
| 3-1 | contributorUserIds JsonValue 타입 불일치 | 구조분해 + Array.isArray 캐스팅 | 2026-03-07 |
| 4-3 | PlanItem.notes 필드 없음 | description 필드로 교체 | 2026-03-07 |

---

## 재개 방법

1. 이 파일에서 🔄 또는 첫 ⬜ 단계 확인
2. 해당 단계부터 서브에이전트로 진행
3. 완료 시 체크박스 `[ ]` → `[x]` 표시 후 다음 단계 진행
