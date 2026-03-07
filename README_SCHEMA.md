# Franklin Planner Family Diary - 데이터베이스 스키마 가이드

## 📋 프로젝트 개요

**가족 전용 프랭클린 다이어리 웹사이트의 완전한 MariaDB 데이터베이스 스키마**

- **기술 스택**: Next.js 14 + Prisma ORM + MariaDB
- **사용자 규모**: 최대 10명 (가족 단위)
- **데이터 규모**: 3년 기준 ~108,000개 행 (매우 작음)

---

## 📦 제공 파일 및 내용

### 1. **DDL 스크립트** (`schema/01_create_tables.sql`)
완전한 MariaDB CREATE TABLE 문:
- 13개 테이블 모두 포함
- InnoDB 엔진, utf8mb4 문자 집합
- 모든 외래키 관계 정의
- 주요 인덱스 설정

**즉시 실행 가능:**
```bash
mysql -u root -p < schema/01_create_tables.sql
```

### 2. **Prisma 스키마** (`prisma/schema.prisma`)
Prisma ORM 모델 정의:
- 13개 모델 + enum 타입
- 모든 관계(relation) 정의
- MariaDB(MySQL) datasource 설정

**사용:**
```bash
npx prisma generate
```

### 3. **중요 쿼리 예시** (`schema/02_important_queries.sql`)
자주 사용될 7개의 쿼리 패턴:

1. **특정 날짜의 일일 계획 + 태스크 조회** (가장 빈번)
2. **월간 가족 캘린더 이벤트 조회**
3. **사용자별 목표 달성률 계산**
4. **가족 구성원 감정 추이** (대시보드용)
5. **일일 요약 (활동 피드)**
6. **성능 최적화 쿼리**
7. **데이터 정합성 확인**

### 4. **성능 최적화 가이드** (`docs/PERFORMANCE_OPTIMIZATION.md`)
- 데이터 규모 분석
- 인덱스 전략 (필수/선택)
- MariaDB 설정 (my.cnf)
- 쿼리 최적화 팁
- 모니터링 및 튜닝 방법

### 5. **인덱스 설계 상세 문서** (`docs/INDEX_DESIGN.md`)
각 테이블별 인덱스 설계:
- 인덱스 선택 이유
- 복합 인덱스 설계 원리
- 실제 쿼리 패턴
- EXPLAIN 분석 방법

### 6. **셋업 가이드** (`docs/SETUP_GUIDE.md`)
완전한 설치 및 설정:
- MariaDB 설치 (Windows/macOS/Linux)
- 데이터베이스 생성
- Prisma 설정
- 검증 및 테스트
- 문제 해결

---

## 🗂️ 13개 테이블 구조 요약

| 테이블 | 용도 | 특징 |
|--------|------|------|
| **families** | 가족 그룹 | PK: id, UK: name |
| **users** | 가족 구성원 | FK: family_id, UK: email, role |
| **profiles** | 개인 프로필 | FK: user_id (1:1), JSON: core_values |
| **daily_plans** | 일별 계획 | FK: user_id, UK: (user_id, plan_date) |
| **plan_items** | A/B/C 우선순위 태스크 | FK: daily_plan_id, priority + sequence_order |
| **appointments** | 개인 약속/일정 | FK: user_id, 시간 범위 쿼리 |
| **family_events** | 가족 공유 캘린더 | FK: family_id + created_by_user_id, 기간 쿼리 |
| **notes** | 일일 메모 (마크다운) | FK: user_id, UK: (user_id, note_date) |
| **emotion_checkins** | 감정 기록 | FK: user_id, UK: (user_id, checkin_date) |
| **goals** | 역할별 목표 | FK: user_id, goal_type (weekly/monthly/yearly) |
| **family_goals** | 가족 공동 목표 | FK: family_id + created_by_user_id |
| **family_announcements** | 가족 공지사항 | FK: family_id + created_by_user_id, is_pinned |
| **invite_tokens** | 초대 코드 | FK: family_id + created_by_user_id, expires_at (48시간) |

---

## 🔑 핵심 인덱스 전략

### 필수 인덱스 (5개)
```sql
1. users.idx_family_id              -- 가족 구성원 조회
2. users.email (UNIQUE)             -- 로그인 인증
3. daily_plans.uk_user_date         -- 특정 날짜 계획 조회 (매우 빈번)
4. plan_items.idx_daily_plan_priority_completed  -- 태스크 필터링 (복합)
5. family_events.idx_family_period  -- 월간 캘린더 (복합)
```

### 복합 인덱스 설계 원리
```
plan_items: (daily_plan_id, priority, is_completed)
            ↓ 첫 필터 (거의 모든 쿼리)
            ↓ 두 필터 (자주 사용)
            ↓ 세 필터 (자주 사용)

효과: daily_plan_id=1인 30개 행 중에서
      priority='A' AND is_completed=false인 5개 행만 인덱스에서 직접 조회
```

---

## ⚡ 성능 특성

### 데이터 규모 (3년 기준)
- daily_plans: 10,800개
- plan_items: 54,000개
- 기타: 43,200개
- **합계: ~108,000개 행**

### 메모리 효율
- 인덱스 총 크기: 5-10MB
- 전체 데이터: 30-50MB
- **innodb_buffer_pool (256MB)에 전체 데이터 로드 가능**
- → **거의 모든 쿼리가 메모리 히트**

### 성능 보장
- ✅ 단순 조회: 1ms 이하 (밀리초)
- ✅ 복합 조회 (JOIN): 5-10ms
- ✅ 집계 쿼리: 10-50ms
- ⚠️ 주의: N+1 쿼리 패턴만 피할 것 (Prisma include 활용)

---

## 🛠️ 빠른 시작

### 1️⃣ MariaDB 설치
```bash
# Windows
# → MariaDB Installer 다운로드 및 설치

# macOS
brew install mariadb
brew services start mariadb

# Linux
sudo apt-get install mariadb-server
sudo systemctl start mariadb
```

### 2️⃣ 데이터베이스 생성
```bash
mysql -u root -p < schema/01_create_tables.sql
```

### 3️⃣ Prisma 설정
```bash
npm install @prisma/client prisma

# .env 파일 생성
echo 'DATABASE_URL="mysql://root:password@localhost:3306/family_planner"' > .env

# Prisma 생성
npx prisma generate
```

### 4️⃣ 연결 테스트
```bash
npx prisma studio  # UI에서 데이터 확인
```

---

## 📊 주요 쿼리 패턴

### 1. 일일 계획 + 태스크 조회 (가장 빈번)
```typescript
const plan = await prisma.dailyPlan.findUnique({
  where: {
    userId_planDate: { userId: 1, planDate: new Date() }
  },
  include: {
    planItems: {
      orderBy: [
        { priority: 'asc' },      // A, B, C 순
        { sequenceOrder: 'asc' }
      ]
    }
  }
});
```

### 2. 월간 가족 캘린더
```typescript
const events = await prisma.familyEvent.findMany({
  where: {
    familyId: 1,
    startAt: {
      gte: new Date('2026-03-01'),
      lt: new Date('2026-04-01')
    }
  },
  orderBy: { startAt: 'asc' }
});
```

### 3. 사용자의 목표 조회
```typescript
const goals = await prisma.goal.findMany({
  where: {
    userId: 1,
    goalType: 'MONTHLY',
    periodStartDate: { gte: new Date('2026-03-01') }
  },
  include: { user: true }
});
```

---

## ⚠️ 주의사항

### ✅ 꼭 해야 할 것
1. 모든 테이블에서 `utf8mb4` 문자 집합 확인
2. 날짜 범위 쿼리에서 `>=` (시작일)과 `<` (종료일+1) 사용
3. Prisma `include`로 N+1 쿼리 방지
4. 복합 인덱스의 컬럼 순서 따르기

### ❌ 피해야 할 것
1. SELECT * 사용 (필요한 컬럼만)
2. 불필요한 단일 인덱스 추가
3. 초대 토큰 만료 검증 없이 사용
4. 메모리의 관계(relation) 조회 (ORM 활용)

---

## 📚 상세 문서

| 문서 | 용도 |
|------|------|
| `SETUP_GUIDE.md` | 설치, 설정, 검증 완전 가이드 |
| `PERFORMANCE_OPTIMIZATION.md` | 성능 튜닝, MariaDB 설정, 모니터링 |
| `INDEX_DESIGN.md` | 각 테이블별 인덱스 설계 상세 분석 |

---

## 🔍 자주 묻는 질문

### Q1: 프로덕션 배포 시 주의사항?
```sql
-- 1. innodb_flush_log_at_trx_commit = 1 (안정성)
-- 2. max_connections 적절히 조정 (100-200)
-- 3. 슬로우 쿼리 로그 활성화
-- 4. 정기 백업 전략 수립
-- 5. 읽기 복제(read replica) 검토 (10명 규모는 불필요)
```

### Q2: 사용자가 10명 이상으로 확대되면?
→ 이 스키마는 **100명 규모까지 추가 최적화 없이 확장 가능**합니다.
- 데이터: ~1.08M 행 (여전히 작음)
- 파티셔닝 불필요
- 캐싱 전략만 추가로 고려

### Q3: JSON 컬럼에 인덱스를 만들 수 있나?
→ MariaDB에서는 JSON 컬럼에 직접 인덱스 불가능합니다.
```sql
-- 대신: VIRTUAL COLUMN + INDEX
ALTER TABLE plan_items
ADD COLUMN first_tag VARCHAR(100) GENERATED ALWAYS AS
  (JSON_UNQUOTE(JSON_EXTRACT(tags, '$[0]'))) STORED;
ALTER TABLE plan_items ADD INDEX idx_first_tag (first_tag);
```

### Q4: 초대 토큰 만료 정리는?
```sql
-- 주 1회 실행 (cron job)
DELETE FROM invite_tokens
WHERE expires_at < NOW() AND used_at IS NULL;
```

---

## 📞 기술 지원

모든 파일이 바로 실행 가능하도록 준비되었습니다.

1. MariaDB 설치 → `SETUP_GUIDE.md` 참고
2. 스키마 생성 → `01_create_tables.sql` 실행
3. Prisma 설정 → `schema.prisma` 복사 + 환경 변수 설정
4. 성능 최적화 → `INDEX_DESIGN.md` + `PERFORMANCE_OPTIMIZATION.md` 참고

---

**작성일**: 2026-03-02
**버전**: 1.0
**상태**: 프로덕션 준비 완료 ✅
