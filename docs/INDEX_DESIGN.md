# Franklin Planner Family Diary - 인덱스 설계 상세

## 개요

이 문서는 각 테이블의 인덱스 설계 이유와 사용 패턴을 상세히 설명합니다.

---

## 1. FAMILIES 테이블

```sql
CREATE TABLE families (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    ...
);

-- 인덱스
INDEX idx_created_at (created_at);
UNIQUE uk_family_name UNIQUE (name);
```

### 인덱스 분석

| 인덱스 | 유형 | 사용 쿼리 패턴 | 선택도 | 비고 |
|--------|------|--------------|--------|------|
| PRIMARY | PK | id로 직접 조회 | 매우 높음 | 자동 |
| uk_family_name | UNIQUE | 가족명으로 이미 생성된 그룹 조회 | 매우 높음 | 중복 방지 |
| idx_created_at | 단일 | 최근 생성 가족 목록 | 낮음 | 선택적 |

### 사용 패턴

```typescript
// 일반적인 조회
const family = await prisma.family.findUnique({
  where: { id: 1 }  // PRIMARY KEY 사용
});

// 이름으로 중복 확인
const existing = await prisma.family.findUnique({
  where: { name: "우리 가족" }  // uk_family_name 사용
});

// 최근 가족들 (admin 페이지)
const families = await prisma.family.findMany({
  orderBy: { createdAt: 'desc' },  // idx_created_at 사용
  take: 10
});
```

---

## 2. USERS 테이블

```sql
CREATE TABLE users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    family_id BIGINT UNSIGNED NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    role ENUM('admin', 'parent', 'child'),
    ...
);

-- 인덱스
INDEX idx_family_id (family_id);
INDEX idx_email (email);
INDEX idx_role (role);
INDEX idx_created_at (created_at);
```

### 인덱스 분석

| 인덱스 | 사용 쿼리 | 중요도 |
|--------|----------|--------|
| PRIMARY | id로 조회 | ⭐⭐⭐⭐⭐ |
| idx_family_id | 가족의 모든 사용자 조회 | ⭐⭐⭐⭐⭐ |
| email (UNIQUE) | 로그인 (이메일 기반) | ⭐⭐⭐⭐⭐ |
| idx_role | 역할별 필터링 | ⭐⭐ (선택적) |
| idx_created_at | 최신 가입자 조회 | ⭐ (관리자용) |

### 핵심 쿼리

```typescript
// 가족 구성원 모두 조회 (가장 빈번)
const members = await prisma.user.findMany({
  where: { familyId: 1 },  // idx_family_id 사용
  include: { profile: true }
});

// 부모만 조회
const parents = await prisma.user.findMany({
  where: {
    familyId: 1,
    role: 'PARENT'  // idx_family_id 선행, idx_role 부분 적용
  }
});

// 로그인 (매우 중요)
const user = await prisma.user.findUnique({
  where: { email: "user@example.com" }  // UNIQUE email 인덱스
});
```

---

## 3. DAILY_PLANS 테이블

```sql
CREATE TABLE daily_plans (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    plan_date DATE NOT NULL,
    ...
);

-- 인덱스 (매우 중요)
UNIQUE INDEX uk_user_date (user_id, plan_date);
INDEX idx_user_id (user_id);
INDEX idx_plan_date (plan_date);
INDEX idx_created_at (created_at);
```

### 인덱스 분석

| 인덱스 | 구조 | 사용 패턴 | 설명 |
|--------|------|---------|------|
| uk_user_date | UNIQUE 복합 | 특정 사용자의 특정 날짜 계획 조회 | **중요**: 사용자-날짜 조합은 유일함을 보장하며, 동시에 조회 성능 최적화 |
| idx_user_id | 단일 | 사용자의 모든 계획 조회 | 주로 분석/통계에 사용 |
| idx_plan_date | 단일 | 특정 날짜의 모든 계획 | 가족 피드 구성 시 사용 |
| idx_created_at | 단일 | 최근 계획 순 정렬 | 대시보드 표시용 |

### 핵심 패턴

```typescript
// ⭐⭐⭐ 가장 중요한 쿼리
const todayPlan = await prisma.dailyPlan.findUnique({
  where: {
    userId_planDate: {
      userId: 1,
      planDate: new Date('2026-03-02')
    }  // uk_user_date 인덱스로 O(log n) 조회
  },
  include: {
    planItems: { orderBy: { priority: 'asc' } }
  }
});

// 사용자의 이번 달 모든 계획
const monthPlans = await prisma.dailyPlan.findMany({
  where: {
    userId: 1,
    planDate: {
      gte: new Date('2026-03-01'),
      lt: new Date('2026-04-01')
    }
  },
  orderBy: { planDate: 'desc' }
  // 실행: idx_user_id → 날짜 범위 필터 → 정렬
});
```

---

## 4. PLAN_ITEMS 테이블 (중요도 ⭐⭐⭐⭐⭐)

```sql
CREATE TABLE plan_items (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    daily_plan_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    priority ENUM('A', 'B', 'C'),
    is_completed BOOLEAN,
    sequence_order INT,
    ...
);

-- 핵심 인덱스
INDEX idx_daily_plan_priority_completed (daily_plan_id, priority, is_completed);
INDEX idx_daily_plan_id (daily_plan_id);
INDEX idx_user_id (user_id);
INDEX idx_priority (priority);
INDEX idx_is_completed (is_completed);
INDEX idx_created_at (created_at);
```

### 인덱스 설계 이유

#### 복합 인덱스: `idx_daily_plan_priority_completed`

```sql
-- 이 인덱스가 없으면?
SELECT * FROM plan_items
WHERE daily_plan_id = 1
  AND priority = 'A'
  AND is_completed = false
ORDER BY sequence_order;

-- 실행 방식 (최악):
-- 1) full table scan 또는
-- 2) daily_plan_id로 필터 → 모든 우선순위 확인 → 완료 상태 확인 → 정렬

-- 복합 인덱스 있으면:
-- 1) idx_daily_plan_priority_completed에서 직접 해당 행만 검색
-- 2) 이미 정렬된 상태 (인덱스 정렬 순서)
-- 3) 매우 빠름 (수십 개 행만 스캔)
```

**복합 인덱스의 컬럼 순서 중요:**
```
idx_daily_plan_priority_completed (daily_plan_id, priority, is_completed)
     ↓ 첫 번째 필터 (거의 모든 쿼리)
     ↓ 두 번째 필터 (자주 사용)
     ↓ 세 번째 필터 (자주 사용)
```

### 실제 쿼리 분석

```typescript
// ⭐⭐⭐⭐⭐ 가장 중요한 패턴
const incompleteTasksWithPriority = await prisma.planItem.findMany({
  where: {
    dailyPlanId: 1,        // idx_daily_plan_priority_completed 1번 컬럼
    priority: 'A',         // idx_daily_plan_priority_completed 2번 컬럼
    isCompleted: false     // idx_daily_plan_priority_completed 3번 컬럼
  },
  orderBy: { sequenceOrder: 'asc' }
  // 실행: 복합 인덱스 사용 → ~5-10개 행만 스캔 → 정렬
});

// 쿼리 2: 일일 계획의 모든 태스크
const allTasks = await prisma.planItem.findMany({
  where: { dailyPlanId: 1 },  // idx_daily_plan_priority_completed 1번 컬럼
  orderBy: [
    { priority: 'asc' },
    { sequenceOrder: 'asc' }
  ]
  // 실행: 복합 인덱스로 30-50개 행 검색 후 정렬
});

// 쿼리 3: 특정 우선순위만 (복합 인덱스 부분 사용)
const highPriorityTasks = await prisma.planItem.findMany({
  where: { priority: 'A' },  // 복합 인덱스 2번 컬럼으로만 검색
  // 불가능: daily_plan_id 없이는 복합 인덱스 첫 컬럼 활용 못 함
  // → full table scan 발생 (idx_priority 단일 인덱스 사용)
});
```

### 추가 인덱스 필요성

| 인덱스 | 사용 | 중요도 | 설명 |
|--------|------|--------|------|
| idx_daily_plan_id | 명시적 | ⭐⭐ | 복합 인덱스가 이미 커버하므로 엄밀히는 필요 없지만, 명시성 위해 유지 |
| idx_user_id | 사용자 분석 | ⭐⭐ | "특정 사용자의 모든 미완료 태스크" 조회 |
| idx_priority | 통계 | ⭐ | "A 우선순위 태스크의 완료율" 등 집계에 사용 |
| idx_is_completed | 필터링 | ⭐ | "미완료 태스크 모두 보기" 같은 가정 없는 조회 |

---

## 5. APPOINTMENTS 테이블

```sql
CREATE TABLE appointments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    start_at DATETIME NOT NULL,
    end_at DATETIME NOT NULL,
    ...
);

-- 인덱스
INDEX idx_user_id (user_id);
INDEX idx_start_at (start_at);
INDEX idx_user_date (user_id, start_at);  -- 복합: 사용자의 특정 기간 약속 조회
```

### 사용 패턴

```typescript
// 사용자의 오늘 일정
const todayAppointments = await prisma.appointment.findMany({
  where: {
    userId: 1,  // idx_user_date 1번 컬럼
    startAt: {
      gte: startOfDay(now),
      lt: startOfDay(tomorrow)
    }  // idx_user_date 2번 컬럼 (range)
  },
  orderBy: { startAt: 'asc' }
  // 실행: idx_user_date로 5-10개 행만 스캔
});
```

---

## 6. FAMILY_EVENTS 테이블

```sql
CREATE TABLE family_events (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    family_id BIGINT UNSIGNED NOT NULL,
    created_by_user_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    start_at DATETIME NOT NULL,
    end_at DATETIME NOT NULL,
    ...
);

-- 인덱스
INDEX idx_family_id (family_id);
INDEX idx_created_by_user_id (created_by_user_id);
INDEX idx_start_at (start_at);
INDEX idx_family_date (family_id, start_at);  -- 복합
INDEX idx_family_period (family_id, start_at, end_at);  -- 복합 (더 상세)
```

### 핵심 인덱스: `idx_family_period`

```typescript
// ⭐⭐⭐ 월간 캘린더 뷰 (가장 자주)
const monthEvents = await prisma.familyEvent.findMany({
  where: {
    familyId: 1,  // idx_family_period 1번 컬럼
    startAt: {
      gte: new Date('2026-03-01'),  // idx_family_period 2번 컬럼
      lt: new Date('2026-04-01')
    }
  },
  orderBy: { startAt: 'asc' }
  // 실행: 복합 인덱스로 해당 달 이벤트 30-50개만 스캔
});

// vs 복합 인덱스 없음:
// 1) family_id로 모든 이벤트 찾기 → 연간 600개 중 600개 스캔
// 2) 날짜 범위 필터 → 그 중 30-50개 선택
// 3) 정렬
// → 570개 불필요한 행 스캔
```

---

## 7. GOALS 및 FAMILY_GOALS 테이블

```sql
CREATE TABLE goals (
    user_id BIGINT UNSIGNED NOT NULL,
    goal_type ENUM('weekly', 'monthly', 'yearly'),
    period_start_date DATE NOT NULL,
    ...
);

-- 인덱스
INDEX idx_user_period (user_id, goal_type, period_start_date);
```

### 쿼리 패턴

```typescript
// 사용자의 이번 달 월간 목표
const monthlyGoals = await prisma.goal.findMany({
  where: {
    userId: 1,  // idx_user_period 1번
    goalType: 'MONTHLY',  // idx_user_period 2번
    periodStartDate: {
      gte: new Date('2026-03-01')  // idx_user_period 3번 (range)
    }
  }
  // 실행: 5-10개 행만 스캔
});
```

---

## 8. 인덱스 최적화 체크리스트

### 추가 고려 사항

```sql
-- JSON 컬럼 인덱스 (MariaDB 10.5+)
-- ❌ 현재는 일반 JSON으로 인덱스 불가능
-- ✅ 대신 JSON_EXTRACT로 검색 시 VIRTUAL COLUMN 고려
ALTER TABLE plan_items
ADD COLUMN category_generated VARCHAR(100) GENERATED ALWAYS AS
  (JSON_EXTRACT(tags, '$[0]')) STORED;  -- 첫 태그 저장

-- ✅ 후 인덱싱
ALTER TABLE plan_items
ADD INDEX idx_category_virtual (category_generated);
```

### 피해야 할 실수

```sql
-- ❌ 너무 많은 단일 인덱스
ALTER TABLE users
ADD INDEX idx_name (name);  -- 선택도 낮음, 거의 사용 안 함
ADD INDEX idx_created_at (created_at);  -- 관리자용만
ADD INDEX idx_is_active (is_active);  -- 항상 true 대부분

-- ✅ 필요한 것만 추가
ALTER TABLE users
ADD INDEX idx_family_id (family_id);  -- 필수
ADD INDEX idx_email (email);  -- 로그인 필수 (UNIQUE)
```

---

## 9. 인덱스 모니터링 SQL

```sql
-- 모든 인덱스 목록
SELECT
    TABLE_NAME,
    INDEX_NAME,
    COLUMN_NAME,
    SEQ_IN_INDEX,
    CARDINALITY,
    INDEX_TYPE
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = 'family_planner'
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;

-- 인덱스 크기
SELECT
    INDEX_NAME,
    ROUND(STAT_VALUE / 1024 / 1024, 2) as size_mb
FROM mysql.innodb_index_stats
WHERE STAT_NAME = 'size'
  AND OBJECT_SCHEMA = 'family_planner'
ORDER BY STAT_VALUE DESC;

-- 인덱스 사용 여부 (Performance Schema 활성화 필요)
SELECT
    OBJECT_SCHEMA,
    OBJECT_NAME,
    INDEX_NAME,
    COUNT_READ,
    COUNT_WRITE,
    COUNT_DELETE,
    COUNT_UPDATE
FROM PERFORMANCE_SCHEMA.TABLE_IO_WAITS_SUMMARY_BY_INDEX_USAGE
WHERE OBJECT_SCHEMA = 'family_planner'
  AND INDEX_NAME != 'PRIMARY'
ORDER BY COUNT_READ DESC;
```

---

## 요약

### 필수 인덱스 (5개)
1. `users.idx_family_id` - 가족 구성원 조회
2. `users.email` (UNIQUE) - 로그인
3. `daily_plans.uk_user_date` (UNIQUE) - 사용자의 특정 날짜 계획 조회
4. `plan_items.idx_daily_plan_priority_completed` - 일일 계획의 태스크 조회
5. `family_events.idx_family_period` - 월간 캘린더 조회

### 선택 인덱스 (최적화용)
- `appointments.idx_user_date` - 사용자의 기간별 약속 조회
- `goals.idx_user_period` - 사용자의 기간별 목표 조회
- `emotion_checkins.idx_user_date` - 감정 추이 조회 (이미 UNIQUE로 커버)

### 성능 영향
- 이 규모(108,000행)에서는 대부분의 쿼리가 메모리에서 처리
- 인덱스 크기: 총 5-10MB
- 조회 성능: 거의 모든 쿼리가 1ms 이하
- 쓰기 성능: 인덱스 수가 적어서 영향 거의 없음
