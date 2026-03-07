# Senior Dev Mentor - Agent Memory

## 프로젝트: 가족 전용 프랭클린 다이어리

- 프로젝트 위치: C:\Develop\다이어리
- 사용자: 가족 5명 이하, 폐쇄형 초대제 시스템
- 핵심 기능: 프랭클린 플래너 (사명서/가치관, 우선순위 계획, 가족 공유 캘린더)
- 설계 결정 사항: 상세 내용은 architecture.md 참조

## 기술 스택 결정 (2026-03-02, 코드베이스 기준 확정)

- Frontend: Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- 상태관리: Zustand (클라이언트) + TanStack Query (서버 상태)
- Backend: Next.js API Routes (모놀리식)
- Database: MariaDB (로컬/NAS Docker) + Prisma ORM (mysql provider)
- 실시간: Supabase Realtime (family_events 테이블만, WebSocket 기반)
- 인증: NextAuth.js v5 (Credentials Provider + 초대 토큰, JWT HttpOnly Cookie)
- 배포 목표: NAS Docker (Next.js + MariaDB + Nginx) + Supabase Realtime 유지
- 주의: Prisma schema.prisma의 provider는 "mysql" (MariaDB 호환)

## 사용자 선호사항

- 비용 최소화 (가족용, 무료 티어 활용)
- 간단한 배포 운영 선호
- 한국어 우선 응답

## NAS 마이그레이션 (2026-03-02)

- 대상: Synology/QNAP Docker Compose 3-서비스 (next-app + mariadb + nginx)
- 외부 접근 권장: Cloudflare Tunnel (포트 개방 불필요, 무료 HTTPS)
- 생성된 파일 위치: deploy/nas/ 디렉토리
  - docker-compose.yml, .env.example
  - nginx/nginx.conf, nginx/conf.d/app.conf
  - mariadb/my.cnf
  - scripts/backup.sh, deploy.sh, logs.sh
  - SETUP_CHECKLIST.md
- 절차서: docs/NAS_MIGRATION_GUIDE.md
- Dockerfile: 프로젝트 루트 (standalone 빌드, multi-stage)
- 중요: next.config.js 에 output: 'standalone' 추가 필요
- 중요: app/api/health/route.ts 헬스체크 엔드포인트 추가 필요 (2026-03-04 생성 완료)

## 구현된 API 엔드포인트 (2026-03-04)

- GET/POST /api/plans — 일일 계획 조회/upsert
- POST /api/plans/tasks — 태스크 생성 (dailyPlanId 없으면 date로 자동 upsert)
- PUT/DELETE /api/tasks/[id] — 태스크 수정/삭제 (본인 소유 검증)
- PATCH /api/tasks/reorder — 순서 변경 (트랜잭션)
- GET /api/health — Docker healthcheck
- GET /api/family/events?month=YYYY-MM — 월간 이벤트 조회
- POST /api/family/events — 이벤트 생성 + Supabase Broadcast
- DELETE /api/family/events/[id] — 이벤트 삭제 (본인+admin) + Broadcast

## 코딩 패턴 (이 프로젝트 기준)

- BigInt 직렬화: serializePlan/serializeTask 헬퍼 함수로 .toString() 변환
- 세션 userId: session.user.id (string) → BigInt(session.user.id)로 변환
- API 응답 형태: Response.json({ data: ... }) 통일
- DailyPlan UNIQUE 제약: userId_planDate (Prisma 복합 unique)
- TanStack Query 낙관적 업데이트: onMutate에서 cancelQueries + setQueryData
- 태스크 완료: isCompleted=true → completedAt=new Date(), false → null
- 날짜 컬럼: DATE 타입이므로 new Date(dateString) 변환 후 사용
- Prisma FamilyEventType enum 매핑: DB는 lowercase ("standard") → Prisma enum은 UPPERCASE (STANDARD)
  → API Route에서 eventTypeMap 객체로 변환 후 사용
- CalendarRealtime: useRef로 콜백 참조 안정화 → familyId 변경 시만 재구독
- Supabase Broadcast 실패는 non-fatal: try/catch로 감싸고 로그만 남김
- 월간 이벤트 범위 쿼리: startAt < monthEnd AND endAt >= monthStart (기간 겹침 포함)
- 가족 캘린더 페이지 경로: app/(app)/calendar/

## 구현된 페이지 (2026-03-04)

- app/(app)/dashboard/page.tsx — Server Component (오늘 계획 + 이번주 이벤트 조회 후 전달)
- app/(app)/dashboard/components/DashboardClient.tsx — Client Component (완료율 Progress, 이벤트 카드, 빠른 액션)
- app/(app)/goals/page.tsx — Phase 2 예정 Coming Soon UI + 플래너/캘린더 링크
- app/(app)/profile/page.tsx — Server Component: 사명서/가치관/역할 조회, 빈 상태 표시
- app/(app)/notes/page.tsx — Server Component: 오늘 메모 + 최근 7일 목록 조회
- app/(app)/announcements/page.tsx — Server Component: 가족 공지 목록 (핀 우선 정렬)
- app/(app)/admin/layout.tsx — role === "ADMIN" 아니면 /dashboard redirect
- app/(app)/admin/invite/page.tsx — Client Component: 역할 선택 + fetch POST /api/auth/invite + 복사 버튼
- components/ui/progress.tsx — @radix-ui/react-progress 기반 shadcn/ui Progress 컴포넌트 (신규 추가)
- .env.local — 개발 환경변수 템플릿 생성

## shadcn/ui 컴포넌트 목록 (설치 확인 기준)

기존: avatar, badge, button, card, checkbox, dialog, dropdown-menu, form, input, label, popover, scroll-area, select, separator, sheet, skeleton, textarea
신규 추가: progress (@radix-ui/react-progress npm install 완료)
