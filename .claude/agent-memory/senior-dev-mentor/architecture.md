# 가족 프랭클린 다이어리 - 아키텍처 상세

## 핵심 설계 원칙
- YAGNI: 5명 이하 소규모 → 과도한 추상화 금지
- 단일 배포 유닛 (Next.js monorepo로 관리)
- Supabase RLS(Row Level Security)로 데이터 격리

## 데이터 모델 관계
- User 1:1 Profile (사명서/가치관)
- User 1:N Goal (역할별 목표)
- Goal 1:N Task (주간/일간 태스크)
- User 1:N DailyPlan (일일 계획)
- DailyPlan 1:N PlanItem (A/B/C 우선순위 항목)
- Family 1:N FamilyEvent (공유 캘린더)
- User 1:N Note (일일 메모)

## 인증 흐름
- 관리자가 초대 토큰 생성 → 이메일/링크로 전달
- 초대 토큰 검증 후 계정 생성 허용
- NextAuth.js Credentials Provider 사용
- JWT + HttpOnly Cookie 세션 관리

## 실시간 전략
- Supabase Realtime: FamilyEvent 테이블 변경 구독
- 개인 데이터: 일반 API 호출 (실시간 불필요)
- 공유 캘린더: INSERT/UPDATE/DELETE 이벤트 브로드캐스트
