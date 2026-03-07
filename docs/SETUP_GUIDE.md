# Franklin Planner Family Diary - MariaDB 셋업 가이드

## 목차
1. [MariaDB 설치](#mariadb-설치)
2. [데이터베이스 생성](#데이터베이스-생성)
3. [Prisma 설정](#prisma-설정)
4. [검증 및 테스트](#검증-및-테스트)

---

## MariaDB 설치

### Windows 10/11

#### 방법 1: Installer 사용 (권장)

1. [MariaDB 다운로드](https://mariadb.com/downloads/mariadb-tx/)
   - 최신 LTS 버전 (10.6 또는 11.1) 선택
   - Windows installer 다운로드

2. 설치 진행
   ```
   - Setup Type: Complete (모든 컴포넌트)
   - Data Folder: C:\MariaDB\Data
   - Port: 3306 (기본값)
   - UTF8 체크 필수
   - Service: MariaDB 로 설정 (자동 시작)
   - Root Password: 설정 필요
   ```

3. 설치 후 확인
   ```cmd
   cd "C:\Program Files\MariaDB 10.6\bin"
   mysql -u root -p
   ```

#### 방법 2: Docker 사용

```bash
docker run \
  --name mariadb_family_planner \
  -e MYSQL_ROOT_PASSWORD=your_password \
  -e MYSQL_INITDB_SKIP_TZINFO=yes \
  -p 3306:3306 \
  -v mariadb_data:/var/lib/mysql \
  -v C:\Develop\다이어리\schema:/docker-entrypoint-initdb.d \
  mariadb:11.1 \
  --character-set-server=utf8mb4 \
  --collation-server=utf8mb4_unicode_ci
```

### macOS

```bash
# Homebrew 사용
brew install mariadb
brew services start mariadb

# 초기 설정
mysql_secure_installation
# → root 비밀번호 설정
# → 익명 사용자 제거
# → root 원격 로그인 비활성화
```

### Linux (Ubuntu/Debian)

```bash
sudo apt-get update
sudo apt-get install mariadb-server

# 초기 설정
sudo mysql_secure_installation

# 시작
sudo systemctl start mariadb
sudo systemctl enable mariadb
```

---

## 데이터베이스 생성

### 1. 스키마 파일 실행

```bash
# 터미널에서
cd C:\Develop\다이어리\schema

# MariaDB 쉘로 진입
mysql -u root -p

# 또는 직접 실행
mysql -u root -p < 01_create_tables.sql
```

### 2. MariaDB 클라이언트에서 직접 실행

```bash
mysql -u root -p
```

```sql
-- 데이터베이스 선택
USE family_planner;

-- 모든 테이블 생성 확인
SHOW TABLES;
-- 결과:
-- +---------------------------+
-- | Tables_in_family_planner  |
-- +---------------------------+
-- | appointments              |
-- | daily_plans               |
-- | emotion_checkins          |
-- | families                  |
-- | family_announcements      |
-- | family_events             |
-- | family_goals              |
-- | goals                      |
-- | invite_tokens             |
-- | notes                      |
-- | plan_items                |
-- | profiles                  |
-- | users                     |
-- +---------------------------+

-- 테이블 구조 확인 (예시: users)
DESC users;
```

### 3. 기본 사용자 생성 (선택사항)

```sql
USE mysql;

-- root 사용자 외에 애플리케이션용 사용자 생성
CREATE USER 'planner_app'@'localhost' IDENTIFIED BY 'app_password_123';

-- 권한 부여 (필요한 것만)
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, INDEX, ALTER
ON family_planner.*
TO 'planner_app'@'localhost';

FLUSH PRIVILEGES;

-- 확인
SELECT User, Host FROM mysql.user WHERE User LIKE 'planner%';
```

---

## Prisma 설정

### 1. 프로젝트 초기화 (기존 프로젝트 있다면 생략)

```bash
cd C:\Develop\다이어리

# Node.js 프로젝트 초기화
npm init -y

# Prisma 설치
npm install @prisma/client
npm install -D prisma typescript ts-node @types/node
```

### 2. schema.prisma 복사

```bash
# 이미 생성된 파일 확인
ls prisma/schema.prisma
```

### 3. 환경 변수 설정

`.env` 파일 생성:

```env
# MariaDB 연결
DATABASE_URL="mysql://planner_app:app_password_123@localhost:3306/family_planner"

# 또는 root 사용자 (개발 환경만)
# DATABASE_URL="mysql://root:root_password@localhost:3306/family_planner"

# Prisma 설정
PRISMA_SKIP_ENGINE_CHECK=true
```

**주의**: `.env` 파일을 `.gitignore`에 추가

```bash
echo ".env" >> .gitignore
```

### 4. Prisma 클라이언트 생성

```bash
# 데이터베이스 스키마와 Prisma 모델 동기화
npx prisma generate

# 또는 migration 방식 (권장)
npx prisma migrate dev --name init
```

### 5. Prisma Studio로 데이터 확인 (선택사항)

```bash
# UI 기반 데이터베이스 브라우저 실행
npx prisma studio

# http://localhost:5555에서 확인 가능
```

---

## 검증 및 테스트

### 1. 데이터베이스 연결 테스트

```bash
mysql -u planner_app -p -h localhost -D family_planner
# 비밀번호: app_password_123

-- 연결 확인
SELECT @@version, @@character_set_database, @@collation_database;
```

### 2. Prisma 클라이언트 테스트

`test_connection.js` 파일 생성:

```javascript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    // 데이터베이스 연결 테스트
    const result = await prisma.$executeRaw`SELECT 1`
    console.log('✅ 데이터베이스 연결 성공')

    // 모든 테이블 확인
    const tables = await prisma.$queryRaw`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'family_planner'
      ORDER BY TABLE_NAME
    `
    console.log('\n📊 생성된 테이블:')
    tables.forEach(row => console.log(`  - ${row.TABLE_NAME}`))

  } catch (error) {
    console.error('❌ 연결 실패:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

main()
```

실행:

```bash
node test_connection.js
```

### 3. 테스트 데이터 삽입

```javascript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedDatabase() {
  try {
    // 1. 가족 생성
    const family = await prisma.family.create({
      data: {
        name: '테스트 가족',
        description: '테스트용 가족'
      }
    })
    console.log('✅ 가족 생성:', family.id)

    // 2. 사용자 생성
    const user = await prisma.user.create({
      data: {
        familyId: family.id,
        email: 'parent@example.com',
        passwordHash: 'hashed_password_123',
        name: '부모',
        role: 'PARENT',
        colorTag: '#FF5733'
      }
    })
    console.log('✅ 사용자 생성:', user.id)

    // 3. 프로필 생성
    const profile = await prisma.profile.create({
      data: {
        userId: user.id,
        personalMission: '가족과 함께 성장하는 것',
        coreValues: ['가족', '성장', '건강'],
        bio: '테스트 사용자'
      }
    })
    console.log('✅ 프로필 생성:', profile.id)

    // 4. 일일 계획 생성
    const dailyPlan = await prisma.dailyPlan.create({
      data: {
        userId: user.id,
        planDate: new Date('2026-03-02'),
        theme: '생산성 있는 월요일',
        isPublished: true
      }
    })
    console.log('✅ 일일 계획 생성:', dailyPlan.id)

    // 5. 계획 항목 생성
    const planItem = await prisma.planItem.create({
      data: {
        dailyPlanId: dailyPlan.id,
        userId: user.id,
        title: 'A: 중요한 프로젝트 마무리',
        priority: 'A',
        sequenceOrder: 1,
        category: 'Work',
        estimatedTimeMinutes: 120
      }
    })
    console.log('✅ 계획 항목 생성:', planItem.id)

    // 6. 데이터 조회
    const result = await prisma.dailyPlan.findUnique({
      where: {
        userId_planDate: {
          userId: user.id,
          planDate: new Date('2026-03-02')
        }
      },
      include: {
        planItems: true,
        user: { include: { profile: true } }
      }
    })
    console.log('\n📋 조회 결과:')
    console.log(JSON.stringify(result, null, 2))

  } catch (error) {
    console.error('❌ 오류:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

seedDatabase()
```

### 4. 중요 쿼리 테스트

```sql
-- 터미널에서 실행
mysql -u planner_app -p family_planner
```

```sql
-- 1. 테이블 행 수 확인
SELECT
    TABLE_NAME,
    TABLE_ROWS
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'family_planner'
ORDER BY TABLE_ROWS DESC;

-- 2. 인덱스 확인
SELECT
    TABLE_NAME,
    INDEX_NAME,
    COLUMN_NAME,
    SEQ_IN_INDEX
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = 'family_planner'
  AND TABLE_NAME = 'plan_items'
ORDER BY INDEX_NAME, SEQ_IN_INDEX;

-- 3. 특정 날짜 일일 계획 조회
SELECT * FROM daily_plans WHERE user_id = 1 AND plan_date = '2026-03-02';

-- 4. 계획 항목과 함께 조회
SELECT
    dp.id, dp.theme,
    pi.title, pi.priority, pi.is_completed
FROM daily_plans dp
LEFT JOIN plan_items pi ON dp.id = pi.daily_plan_id
WHERE dp.user_id = 1 AND dp.plan_date = '2026-03-02'
ORDER BY pi.priority = 'A' DESC, pi.priority = 'B' DESC, pi.sequence_order ASC;
```

### 5. 성능 확인

```sql
-- 슬로우 쿼리 로그 활성화 (이미 my.cnf에 설정됨)
SET GLOBAL long_query_time = 0.5;
SET GLOBAL slow_query_log = 1;

-- 1초 동안 샘플 쿼리 실행
SELECT COUNT(*) FROM plan_items
WHERE daily_plan_id = 1;

-- 슬로우 쿼리 로그 확인
SHOW VARIABLES LIKE 'slow_query_log_file';
-- Windows: C:\ProgramData\MariaDB\Data\(hostname)-slow.log
-- Linux: /var/log/mysql/slow-query.log
```

---

## Prisma와 ORM 사용 예시

### 기본 CRUD 작업

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// CREATE (생성)
const newPlan = await prisma.dailyPlan.create({
  data: {
    userId: 1,
    planDate: new Date('2026-03-02'),
    theme: '생산적인 하루',
    planItems: {
      create: [
        { title: 'A: 프로젝트 마무리', priority: 'A', sequenceOrder: 1 },
        { title: 'B: 회의 참석', priority: 'B', sequenceOrder: 2 },
        { title: 'C: 이메일 정리', priority: 'C', sequenceOrder: 3 }
      ]
    }
  },
  include: { planItems: true }
})

// READ (조회)
const plan = await prisma.dailyPlan.findUnique({
  where: {
    userId_planDate: {
      userId: 1,
      planDate: new Date('2026-03-02')
    }
  },
  include: {
    planItems: { orderBy: { sequence_order: 'asc' } },
    user: true
  }
})

// UPDATE (수정)
const updated = await prisma.planItem.update({
  where: { id: 1 },
  data: {
    isCompleted: true,
    completedAt: new Date()
  }
})

// DELETE (삭제)
await prisma.planItem.delete({
  where: { id: 1 }
})

// BULK OPERATIONS
await prisma.planItem.updateMany({
  where: {
    dailyPlanId: 1,
    isCompleted: false
  },
  data: {
    isCompleted: true
  }
})
```

---

## 문제 해결

### 연결 실패

```
Error: connect ECONNREFUSED 127.0.0.1:3306
```

**해결:**
```bash
# 1. MariaDB 서비스 확인
mysql -u root -p

# 2. 포트 확인
netstat -ano | findstr :3306  (Windows)
lsof -i :3306  (macOS/Linux)

# 3. 서비스 재시작
sudo systemctl restart mariadb  (Linux)
brew services restart mariadb  (macOS)
```

### 문자 인코딩 오류

```
Error: Incorrect string value for column 'title' at row 1
```

**해결:**
```sql
-- 데이터베이스 문자 집합 확인
ALTER DATABASE family_planner CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 테이블 확인 및 변경
ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Prisma 마이그레이션 오류

```bash
# 기존 마이그레이션 초기화 (주의: 개발 환경만)
rm -rf prisma/migrations

# 다시 생성
npx prisma migrate dev --name init
```

---

## 다음 단계

1. ✅ MariaDB 설치 및 스키마 생성
2. ✅ Prisma 설정 및 연결 확인
3. 📝 API 엔드포인트 개발 (Next.js)
4. 🎨 프론트엔드 구현
5. 🧪 통합 테스트

---

## 참고

- MariaDB 공식 문서: https://mariadb.com/docs/
- Prisma ORM 문서: https://www.prisma.io/docs/
- MySQL/MariaDB 튜토리얼: https://dev.mysql.com/doc/
