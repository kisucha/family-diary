# Expert DBA Memory - Family Planner Project

## Project Overview
- **Name**: Franklin Planner Family Diary (프랭클린 다이어리 기반 가족 전용 플래닝)
- **Technology Stack**: Next.js 14 + Prisma ORM + MariaDB (로컬)
- **User Scale**: 최대 10명 (매우 작은 규모)
- **Data Retention**: 3-5년 기준 설계

## Database Architecture
- **DBMS**: MariaDB (MySQL 호환)
- **Engine**: InnoDB
- **Character Set**: utf8mb4 (모든 테이블)
- **Collation**: utf8mb4_unicode_ci
- **Total Tables**: 13개

## Key Tables & Characteristics
1. **families** - 가족 그룹 (UNIQUE: name)
2. **users** - 가족 구성원 (UNIQUE: email, role: admin/parent/child)
3. **daily_plans** - 일별 계획 (UNIQUE: user_id + plan_date)
4. **plan_items** - A/B/C 우선순위 태스크
5. **appointments** - 개인 약속/일정
6. **family_events** - 가족 공유 캘린더 이벤트
7. **notes** - 일일 메모 (마크다운)
8. **profiles** - 개인 사명서, 가치관
9. **goals** - 역할별 목표 (weekly/monthly/yearly)
10. **family_goals** - 가족 공동 목표
11. **emotion_checkins** - 일일 감정 기록
12. **family_announcements** - 가족 공지사항
13. **invite_tokens** - 초대 코드 (48시간 유효)

## Index Strategy
### Critical Indexes (성능 필수)
- `users.idx_family_id` - 가족 구성원 조회
- `users.email` (UNIQUE) - 로그인
- `daily_plans.uk_user_date` (UNIQUE) - 사용자의 특정 날짜 계획 조회
- `plan_items.idx_daily_plan_priority_completed` (복합) - 일일 계획의 태스크 조회
- `family_events.idx_family_period` (복합) - 월간 캘린더 조회

### Composite Indexes (중요)
- **plan_items**: (daily_plan_id, priority, is_completed) - 태스크 필터링
- **family_events**: (family_id, start_at, end_at) - 기간별 이벤트
- **goals**: (user_id, goal_type, period_start_date) - 기간별 목표
- **appointments**: (user_id, start_at) - 사용자의 기간별 약속

## Data Scale Analysis
- **Estimated Annual Rows** (10 users, 3 years):
  - daily_plans: 10,800 (10명 × 365일 × 3년)
  - plan_items: 54,000 (평균 5개 태스크)
  - notes: 10,800
  - emotion_checkins: 10,800
  - Total: ~108,000 rows
- **Estimated DB Size**: 30-50MB (매우 작음)
- **Impact**: 전체 데이터가 메모리(innodb_buffer_pool)에 로드 가능 → 성능 이슈 거의 없음

## Performance Considerations
- **Small Scale Advantage**: 10명 규모는 복잡한 최적화 불필요
- **Query Pattern**: OLTP (Online Transaction Processing) 중심
- **Bottleneck Potential**: N+1 쿼리 패턴 (Prisma include/relations 활용해서 방지)
- **Recommended Monitoring**: 주 1회 슬로우 쿼리 로그 확인

## Critical Queries & Patterns
1. **Daily Plan + Tasks** (가장 빈번):
   ```sql
   SELECT * FROM daily_plans dp
   LEFT JOIN plan_items pi ON dp.id = pi.daily_plan_id
   WHERE dp.user_id = ? AND dp.plan_date = ?
   ```
   - Index: uk_user_date + idx_daily_plan_priority_completed

2. **Monthly Calendar Events**:
   ```sql
   WHERE family_id = ? AND start_at BETWEEN date1 AND date2
   ```
   - Index: idx_family_period

3. **User Goals by Period**:
   ```sql
   WHERE user_id = ? AND goal_type = ? AND period_start_date >= ?
   ```
   - Index: idx_user_period

## Prisma Configuration
- **datasource**: mysql (MariaDB 호환)
- **Key Relations**:
  - User → Family (many-to-one)
  - DailyPlan → PlanItems (one-to-many)
  - FamilyEvent → User (creator 관계)
  - Goal/FamilyGoal → User/Family (many-to-one)

## File Locations
- DDL: `C:\Develop\다이어리\schema\01_create_tables.sql`
- Queries: `C:\Develop\다이어리\schema\02_important_queries.sql`
- Prisma: `C:\Develop\다이어리\prisma\schema.prisma`
- Setup Guide: `C:\Develop\다이어리\docs\SETUP_GUIDE.md`
- Performance Guide: `C:\Develop\다이어리\docs\PERFORMANCE_OPTIMIZATION.md`
- Index Design: `C:\Develop\다이어리\docs\INDEX_DESIGN.md`

## MariaDB Settings (Local Dev)
```ini
innodb_buffer_pool_size = 256M
innodb_flush_log_at_trx_commit = 2  # dev 환경
slow_query_log = 1
long_query_time = 1
character_set_server = utf8mb4
collation_server = utf8mb4_unicode_ci
```

## Known Patterns & Anti-patterns
✅ **Good**:
- LEFT JOIN으로 복합 조회 + include 활용
- 기간 쿼리에 >= 시작일, < 종료일 사용
- JSON 컬럼으로 유연한 속성 저장

❌ **Bad**:
- plan_items를 daily_plan과 별도로 조회 (N+1)
- 전체 family_events 조회 후 메모리에서 필터링
- SELECT * 사용

## Future Considerations
- 사용자가 10명 이상으로 확대되면 → 파티셔닝 검토 불필요 (여전히 작음)
- 데이터가 5년 이상 누적되면 → 아카이브 전략 검토
- 프로덕션 배포 시 → replication/backup 전략 수립 필요

## Testing Checklist
- [ ] 데이터베이스 연결 테스트
- [ ] 모든 13개 테이블 생성 확인
- [ ] 초대 토큰 48시간 만료 검증
- [ ] 일일 계획 + 태스크 복합 조회 성능 확인
- [ ] 월간 캘린더 이벤트 조회 인덱스 활용 확인
- [ ] 감정 체크인 시계열 데이터 쿼리 성능 확인
