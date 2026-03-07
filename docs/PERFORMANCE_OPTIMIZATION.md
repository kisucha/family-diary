# Franklin Planner Family Diary - 성능 최적화 가이드

## 목차
1. [데이터 규모 분석](#데이터-규모-분석)
2. [인덱스 전략](#인덱스-전략)
3. [MariaDB 설정](#mariadb-설정)
4. [쿼리 최적화](#쿼리-최적화)
5. [모니터링 및 튜닝](#모니터링-및-튜닝)
6. [주의사항](#주의사항)

---

## 데이터 규모 분석

### 가정 조건
- **가족 수**: 최대 10명 (매우 작은 규모)
- **데이터 보존 기간**: 기본 3-5년 가정
- **월별 신규 데이터 량**:
  - 일일 계획: 10명 × 30일 = 300개/월
  - 일일 계획 항목(태스크): 300 × 5개(평균) = 1,500개/월
  - 메모: 10명 × 30일 = 300개/월
  - 감정 체크인: 10명 × 30일 = 300개/월
  - 가족 이벤트: ~50개/월
  - 목표: 10명 × 3(주/월/년) = 30개/월

### 연 3년 기준 예상 행 수
| 테이블 | 1년 | 3년 |
|--------|-----|-----|
| daily_plans | 3,600 | 10,800 |
| plan_items | 18,000 | 54,000 |
| notes | 3,600 | 10,800 |
| emotion_checkins | 3,600 | 10,800 |
| appointments | ~2,000 | ~6,000 |
| family_events | 600 | 1,800 |
| goals | 1,200 | 3,600 |
| family_goals | 120 | 360 |
| **합계** | **~36,000** | **~108,000** |

**결론**: 극도로 작은 규모의 데이터 → 성능 이슈 가능성 낮음

---

## 인덱스 전략

### 1. 기본 원칙
이 규모에서는 **읽기 성능 최적화**에 초점을 맞춤:
- 날짜 범위 쿼리가 많으므로 날짜 컬럼에 인덱스 필수
- 사용자별 조회가 많으므로 user_id는 거의 모든 테이블에 인덱스
- 복합 인덱스는 쿼리 패턴에 따라 선택적으로 추가

### 2. 설계된 인덱스 상세 설명

#### daily_plans 인덱스
```sql
-- 단일 인덱스
UNIQUE INDEX uk_user_date (user_id, plan_date)  -- 사용자당 하루 1개만
INDEX idx_user_id (user_id)                       -- 사용자별 조회
INDEX idx_plan_date (plan_date)                   -- 날짜 범위 조회
INDEX idx_created_at (created_at)                 -- 최신순 정렬

-- 왜 필요한가?
-- 1. uk_user_date: 중복 방지 + 사용자별 일일 계획 빠른 조회
-- 2. idx_user_date는 자동으로 (user_id, plan_date) 복합 인덱스 역할
```

#### plan_items 인덱스
```sql
-- 복합 인덱스 - 매우 중요!
INDEX idx_daily_plan_priority_completed (daily_plan_id, priority, is_completed)
-- 왜? 일일 계획 조회 시 자주 필터링되는 조건들을 모두 포함
-- 실행 계획: (daily_plan_id로 1차 필터) → (priority/is_completed으로 2차 필터)

-- 단일 인덱스
INDEX idx_daily_plan_id (daily_plan_id)          -- 위 복합 인덱스와 중복되지만, 명시성 위해 유지
INDEX idx_priority (priority)                      -- 우선순위별 집계에 사용
INDEX idx_is_completed (is_completed)              -- 미완료 태스크 조회
```

#### family_events 인덱스
```sql
-- 복합 인덱스 - 월간/주간 캘린더 뷰에서 필수
INDEX idx_family_period (family_id, start_at, end_at)
-- 가족별 기간 범위 쿼리 최적화

INDEX idx_family_date (family_id, start_at)      -- 가족별 시작일 기준 조회
```

#### goals & family_goals 인덱스
```sql
-- 기간별 목표 조회 최적화
INDEX idx_user_period (user_id, goal_type, period_start_date)
INDEX idx_family_type_period (family_id, goal_type, period_start_date)
```

### 3. 인덱스 추가 시 주의사항

#### 피해야 할 것
```sql
-- ❌ 나쁜 예: 불필요한 단일 인덱스
ALTER TABLE users ADD INDEX idx_color_tag (color_tag);  -- 선택도 낮음, 거의 사용 안 함

-- ❌ 나쁜 예: 너무 많은 인덱스
-- 각 INSERT/UPDATE 시 모든 인덱스 업데이트 필요 → 쓰기 성능 저하
```

#### 좋은 예
```sql
-- ✅ 자주 사용되는 필터 조건 포함
ALTER TABLE plan_items
ADD INDEX idx_user_completed_priority (user_id, is_completed, priority);

-- ✅ 복합 인덱스로 여러 조건 동시 처리
ALTER TABLE notes
ADD INDEX idx_user_date (user_id, note_date);  -- 이미 UNIQUE 제약으로 존재
```

---

## MariaDB 설정

### 1. 로컬 개발 환경 설정

#### my.cnf / my.ini 추천 설정 (10명 가족용)

```ini
[mysqld]
# =====================
# 메모리 설정
# =====================
# 로컬 dev: 총 메모리의 25-50% 할당
innodb_buffer_pool_size = 256M          # 가장 중요. 워킹셋 전체를 메모리에 유지
key_buffer_size = 64M                    # MyISAM용 (거의 사용 안 함)
max_connections = 50                     # 로컬: 충분함

# =====================
# InnoDB 설정
# =====================
innodb_file_per_table = 1               # 테이블별 독립 tablespace (권장)
innodb_flush_log_at_trx_commit = 2      # dev: 성능 우선 (프로덕션은 1)
innodb_log_file_size = 512M             # 큰 bulk insert 시 유리

# =====================
# 쿼리 캐시 (MariaDB 10.1.2부터 기본값 disabled)
# =====================
# query_cache_type = 0                  # 필요시 비활성화 (보통 기본값이 좋음)

# =====================
# 슬로우 쿼리 로그 (개발/튜닝 필수)
# =====================
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow-query.log
long_query_time = 1                     # 1초 이상 쿼리 기록 (dev환경)

# =====================
# 기타
# =====================
character_set_server = utf8mb4          # 설치 시 반드시 설정
collation_server = utf8mb4_unicode_ci
```

### 2. 데이터베이스/테이블 문자 집합 확인

```sql
-- 데이터베이스 확인
SHOW CREATE DATABASE family_planner;

-- 테이블 확인
SHOW CREATE TABLE users;

-- 특정 컬럼 확인
SHOW FULL COLUMNS FROM users;
```

모두 `utf8mb4` / `utf8mb4_unicode_ci`이어야 함.

---

## 쿼리 최적화

### 1. 실행 계획 분석 방법

```sql
-- EXPLAIN 명령어 사용 (MariaDB 8.0+ 권장: EXPLAIN FORMAT=JSON)
EXPLAIN FORMAT=JSON
SELECT pi.*
FROM plan_items pi
WHERE pi.daily_plan_id = 1 AND pi.is_completed = false
ORDER BY pi.sequence_order ASC\G

-- 확인할 항목:
-- 1. type: ref/const (좋음) > range > index > ALL (나쁨)
-- 2. key: 사용된 인덱스 (NULL이면 인덱스 미사용 → 튜닝 필요)
-- 3. rows: 스캔 행 수 (적을수록 좋음)
-- 4. filtered: 조건으로 걸러진 비율 (높을수록 좋음)
```

### 2. 주요 쿼리별 최적화 팁

#### A. 일일 계획 + 태스크 조회 (매우 자주)

**최적화된 쿼리:**
```sql
SELECT
    dp.id, dp.plan_date, dp.theme,
    pi.id, pi.title, pi.priority, pi.is_completed
FROM daily_plans dp
LEFT JOIN plan_items pi ON dp.id = pi.daily_plan_id
WHERE dp.user_id = ? AND dp.plan_date = ?
ORDER BY
    pi.priority = 'A' DESC,
    pi.priority = 'B' DESC,
    pi.sequence_order ASC;
```

**Prisma 최적화:**
```typescript
// ✅ 좋은 예
const plan = await prisma.dailyPlan.findUnique({
  where: {
    userId_planDate: { userId: 1, planDate: new Date() }
  },
  include: {
    planItems: {
      orderBy: [
        { priority: 'asc' },      // 'A', 'B', 'C' 순
        { sequenceOrder: 'asc' }  // 같은 우선순위 내 순서
      ]
    }
  }
});

// ❌ 나쁜 예 (N+1 쿼리)
const plan = await prisma.dailyPlan.findUnique({...});
const items = await prisma.planItem.findMany({
  where: { dailyPlanId: plan.id }
});
```

#### B. 월간 가족 이벤트 조회

**최적화된 쿼리:**
```sql
SELECT fe.id, fe.title, fe.start_at, fe.end_at
FROM family_events fe
WHERE fe.family_id = ?
  AND fe.start_at >= '2026-03-01'
  AND fe.start_at < '2026-04-01'  -- 끝 시간이 아닌 시작 시간으로 비교
ORDER BY fe.start_at ASC;
```

**인덱스 활용:**
```
- idx_family_period(family_id, start_at, end_at) 사용
- MariaDB: range + index 스캔 (매우 효율적)
```

#### C. 감정 추이 조회 (대시보드용)

```sql
-- 지난 30일 감정 변화
SELECT
    ec.checkin_date,
    ec.primary_emotion,
    ec.emotion_score,
    ec.sleep_quality,
    ec.exercise_minutes
FROM emotion_checkins ec
WHERE ec.user_id = ?
  AND ec.checkin_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
ORDER BY ec.checkin_date DESC;
```

**최적화:**
- `idx_user_date(user_id, checkin_date)` 사용 (이미 UNIQUE 제약으로 존재)

### 3. JOIN 최적화

이 프로젝트에서는 **LEFT JOIN**이 많으므로:

```sql
-- ✅ 권장: 필요한 컬럼만 SELECT
SELECT dp.id, dp.theme, pi.title  -- 전체 * 하지 말 것
FROM daily_plans dp
LEFT JOIN plan_items pi ON dp.id = pi.daily_plan_id;

-- ❌ 피할 것: SELECT *
SELECT *  -- 불필요한 컬럼 전송 → 네트워크 오버헤드
FROM daily_plans dp
LEFT JOIN plan_items pi ON ...;
```

### 4. 페이지네이션 쿼리

```typescript
// Prisma skip/take 사용
const notes = await prisma.note.findMany({
  where: { userId: 1 },
  orderBy: { noteDate: 'desc' },
  skip: (pageNumber - 1) * PAGE_SIZE,
  take: PAGE_SIZE
});

// ✅ 또는 cursor-based pagination (대용량 데이터에서 더 효율적)
const notes = await prisma.note.findMany({
  where: { userId: 1 },
  orderBy: { noteDate: 'desc' },
  cursor: { id: lastNoteId },
  take: PAGE_SIZE
});
```

---

## 모니터링 및 튜닝

### 1. 슬로우 쿼리 확인

```bash
# 슬로우 쿼리 로그 확인 (Linux)
tail -100 /var/log/mysql/slow-query.log

# 또는 MariaDB에서 직접
SHOW VARIABLES LIKE 'slow_query%';
SET GLOBAL long_query_time = 1;  -- 1초 이상 쿼리 기록
```

### 2. 테이블 크기 확인

```sql
-- 테이블별 크기
SELECT
    TABLE_NAME,
    ROUND(((data_length + index_length) / 1024 / 1024), 2) as size_mb
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'family_planner'
ORDER BY (data_length + index_length) DESC;
```

예상:
- 3년 데이터 → 총 30-50MB (극도로 작음)

### 3. 인덱스 효율성 확인

```sql
-- 사용되지 않는 인덱스 찾기
SELECT OBJECT_SCHEMA, OBJECT_NAME, INDEX_NAME
FROM PERFORMANCE_SCHEMA.TABLE_IO_WAITS_SUMMARY_BY_INDEX_USAGE
WHERE OBJECT_SCHEMA = 'family_planner'
  AND COUNT_STAR = 0  -- 사용되지 않음
  AND INDEX_NAME != 'PRIMARY'
ORDER BY OBJECT_NAME;
```

## 주의사항

### 1. 이 규모에서는 성능 이슈가 거의 없음

- 10명 가족 × 3년 = ~108,000개 행
- 메모리 캐시(innodb_buffer_pool)에 **전체 데이터가 올라감**
- 따라서 **대부분의 쿼리가 메모리 히트**

### 2. 성능 문제가 발생하는 경우

**원인 분석:**
1. **느린 쿼리 로그 확인** → EXPLAIN 분석
2. **인덱스 활용 여부 확인** → key 필드 확인
3. **N+1 쿼리 패턴 확인** → ORM 쿼리 구조 재검토

**해결 방법 (우선순위순):**
1. 복합 인덱스 추가
2. 쿼리 구조 개선 (JOIN 최적화)
3. SELECT 컬럼 최소화
4. pagination 도입

### 3. 프로덕션 배포 시 주의사항

```sql
-- 배포 전 체크리스트
-- 1. 슬로우 쿼리 로그 활성화
SET GLOBAL slow_query_log = 1;
SET GLOBAL long_query_time = 0.5;  -- 프로덕션: 0.5초 이상

-- 2. innodb_flush_log_at_trx_commit = 1 (안정성)
SET GLOBAL innodb_flush_log_at_trx_commit = 1;

-- 3. 트랜잭션 격리 수준 확인
SHOW VARIABLES LIKE 'transaction_isolation';
-- 기본값 REPEATABLE-READ (권장)

-- 4. 최대 연결 수 확인
SHOW VARIABLES LIKE 'max_connections';
-- 프로덕션: 100-200 추천 (작은 팀용)
```

### 4. 데이터 백업 전략

```bash
# 전체 백업 (매주 1회)
mysqldump -u root -p family_planner > backup_$(date +%Y%m%d).sql

# 또는 binary log를 이용한 증분 백업
SHOW MASTER STATUS;  -- 현재 위치 확인
```

---

## 요약

이 프로젝트는 **극도로 작은 규모**이므로:

✅ **할 것**
- 날짜/user_id 기반 인덱스는 필수
- 쿼리 범위 최소화
- Prisma include/relations 활용해서 N+1 방지

❌ **하지 말아야 할 것**
- 과도한 인덱스 추가
- 복잡한 캐싱 전략
- 읽기 복제본 구성 (필요 없음)

📊 **모니터링 주기**
- 주 1회: 슬로우 쿼리 로그 확인
- 월 1회: 테이블/인덱스 크기 확인

---

## 참고 자료

- [MariaDB Performance Tuning](https://mariadb.com/resources/blog/mysql-mysql-mariadb-performance-tuning/)
- [Prisma Query Optimization](https://www.prisma.io/docs/orm/prisma-client/queries/query-optimization)
- [MySQL EXPLAIN 가이드](https://dev.mysql.com/doc/refman/8.0/en/explain.html)
