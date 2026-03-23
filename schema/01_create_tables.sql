-- ============================================================================
-- Franklin Planner Family Diary - MariaDB DDL Script
-- Database: family_planner
-- Charset: utf8mb4
-- Engine: InnoDB
-- ============================================================================

-- 데이터베이스 생성
CREATE DATABASE IF NOT EXISTS family_planner
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE family_planner;

-- ============================================================================
-- 1. FAMILIES 테이블 - 가족 그룹
-- ============================================================================
CREATE TABLE families (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT '가족 이름',
    description TEXT COMMENT '가족 소개',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_created_at (created_at),

    CONSTRAINT uk_family_name UNIQUE (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='가족 그룹 정보';

-- ============================================================================
-- 2. USERS 테이블 - 가족 구성원
-- ============================================================================
CREATE TABLE users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    family_id BIGINT UNSIGNED NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE COMMENT '이메일 (로그인용)',
    password_hash VARCHAR(255) NOT NULL COMMENT '비밀번호 해시',
    name VARCHAR(100) NOT NULL COMMENT '이름',
    role ENUM('admin', 'parent', 'child') NOT NULL DEFAULT 'child' COMMENT '역할: admin(관리자), parent(부모), child(자녀)',
    color_tag VARCHAR(20) COMMENT '캘린더 색상 태그 (hex: #XXXXXX)',
    is_active BOOLEAN NOT NULL DEFAULT true COMMENT '활성 상태',
    last_login_at DATETIME COMMENT '마지막 로그인 시간',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_family_id (family_id),
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_created_at (created_at),

    CONSTRAINT fk_users_family FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='가족 구성원 정보';

-- ============================================================================
-- 3. INVITE_TOKENS 테이블 - 초대 코드 (48시간 유효)
-- ============================================================================
CREATE TABLE invite_tokens (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    family_id BIGINT UNSIGNED NOT NULL,
    created_by_user_id BIGINT UNSIGNED NOT NULL,
    token VARCHAR(64) NOT NULL UNIQUE COMMENT '초대 코드',
    intended_role ENUM('parent', 'child') NOT NULL DEFAULT 'child' COMMENT '초대된 사람의 역할',
    expires_at DATETIME NOT NULL COMMENT '만료 시간 (48시간 후)',
    used_at DATETIME COMMENT '사용된 시간 (null이면 미사용)',
    used_by_user_id BIGINT UNSIGNED COMMENT '초대를 수락한 사용자 ID',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_family_id (family_id),
    INDEX idx_token (token),
    INDEX idx_expires_at (expires_at),

    CONSTRAINT fk_invite_tokens_family FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
    CONSTRAINT fk_invite_tokens_creator FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_invite_tokens_user FOREIGN KEY (used_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='초대 토큰 (48시간 유효)';

-- ============================================================================
-- 4. PROFILES 테이블 - 개인 사명서, 가치관, 역할 정보
-- ============================================================================
CREATE TABLE profiles (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL UNIQUE,
    personal_mission TEXT COMMENT '개인 사명서 (마크다운)',
    core_values JSON COMMENT '핵심 가치관 (배열: ["가치1", "가치2", ...])',
    roles_responsibilities TEXT COMMENT '역할 및 책임 (마크다운)',
    long_term_vision TEXT COMMENT '장기 비전 (마크다운)',
    avatar_url VARCHAR(500) COMMENT '프로필 이미지 URL',
    bio TEXT COMMENT '짧은 자기소개',
    telegram_bot_token VARCHAR(200) NULL COMMENT '텔레그램 Bot Token (사용자별)',
    telegram_chat_id VARCHAR(50) NULL COMMENT '텔레그램 Chat ID (사용자별)',
    telegram_notify_plans BOOLEAN NOT NULL DEFAULT true COMMENT '오늘 계획 알림 여부',
    telegram_notify_events BOOLEAN NOT NULL DEFAULT true COMMENT '가족 일정 알림 여부',
    telegram_notify_incomplete BOOLEAN NOT NULL DEFAULT true COMMENT '미완료 태스크 알림 여부',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_user_id (user_id),

    CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='개인 프로필 (사명서, 가치관, 역할)';

-- ============================================================================
-- 5. GOALS 테이블 - 역할별 목표 (weekly/monthly/yearly)
-- ============================================================================
CREATE TABLE goals (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    goal_type ENUM('weekly', 'monthly', 'yearly') NOT NULL COMMENT '목표 유형',
    period_start_date DATE NOT NULL COMMENT '목표 기간 시작일',
    period_end_date DATE NOT NULL COMMENT '목표 기간 종료일',
    title VARCHAR(255) NOT NULL COMMENT '목표 제목',
    description TEXT COMMENT '목표 상세 설명',
    target_metric VARCHAR(255) COMMENT '목표 측정 지표',
    progress_percentage INT DEFAULT 0 COMMENT '진행률 (0-100)',
    status ENUM('not_started', 'in_progress', 'completed', 'abandoned') NOT NULL DEFAULT 'not_started',
    is_public BOOLEAN NOT NULL DEFAULT false COMMENT '가족 공유 여부',
    priority ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_user_id (user_id),
    INDEX idx_goal_type (goal_type),
    INDEX idx_period_dates (period_start_date, period_end_date),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),

    CONSTRAINT fk_goals_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='역할별 목표 (주/월/년)';

-- ============================================================================
-- 6. DAILY_PLANS 테이블 - 일별 계획 (날짜당 1개)
-- ============================================================================
CREATE TABLE daily_plans (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    plan_date DATE NOT NULL COMMENT '계획 날짜',
    theme VARCHAR(255) COMMENT '일일 테마',
    reflection TEXT COMMENT '일일 성찰 (마크다운)',
    focus_areas TEXT COMMENT '주요 집중 영역 (JSON: ["area1", "area2", ...])',
    is_published BOOLEAN NOT NULL DEFAULT true COMMENT '가족에게 공유 여부',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE INDEX uk_user_date (user_id, plan_date),
    INDEX idx_user_id (user_id),
    INDEX idx_plan_date (plan_date),
    INDEX idx_created_at (created_at),

    CONSTRAINT fk_daily_plans_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='일별 계획 (사용자-날짜당 1개)';

-- ============================================================================
-- 7. PLAN_ITEMS 테이블 - A/B/C 우선순위 태스크 (정렬 가능)
-- ============================================================================
CREATE TABLE plan_items (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    daily_plan_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL COMMENT '태스크 제목',
    description TEXT COMMENT '태스크 상세 설명',
    priority ENUM('A', 'B', 'C') NOT NULL DEFAULT 'C' COMMENT 'A(필수), B(중요), C(선택)',
    sequence_order INT NOT NULL DEFAULT 0 COMMENT '순서 (정렬용)',
    is_completed BOOLEAN NOT NULL DEFAULT false COMMENT '완료 여부',
    completed_at DATETIME COMMENT '완료 시간',
    estimated_time_minutes INT COMMENT '예상 소요 시간 (분)',
    actual_time_minutes INT COMMENT '실제 소요 시간 (분)',
    category VARCHAR(100) COMMENT '카테고리 (Work, Family, Health, Learning 등)',
    tags JSON COMMENT '태그 배열 (["tag1", "tag2", ...])',
    parent_task_id BIGINT UNSIGNED NULL COMMENT '다중일 스패닝: 루트 태스크 ID (null이면 루트)',
    total_span_days INT NOT NULL DEFAULT 1 COMMENT '다중일 스패닝: 총 스팬 일수',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_daily_plan_id (daily_plan_id),
    INDEX idx_user_id (user_id),
    INDEX idx_priority (priority),
    INDEX idx_is_completed (is_completed),
    INDEX idx_sequence_order (sequence_order),
    INDEX idx_parent_task_id (parent_task_id),
    INDEX idx_created_at (created_at),

    CONSTRAINT fk_plan_items_daily_plan FOREIGN KEY (daily_plan_id) REFERENCES daily_plans(id) ON DELETE CASCADE,
    CONSTRAINT fk_plan_items_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_plan_items_parent FOREIGN KEY (parent_task_id) REFERENCES plan_items(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='일일 계획 항목 (A/B/C 우선순위)';

-- ============================================================================
-- 8. APPOINTMENTS 테이블 - 개인 약속/일정
-- ============================================================================
CREATE TABLE appointments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL COMMENT '약속 제목',
    description TEXT COMMENT '약속 상세 설명',
    start_at DATETIME NOT NULL COMMENT '시작 시간',
    end_at DATETIME NOT NULL COMMENT '종료 시간',
    location VARCHAR(255) COMMENT '위치',
    is_all_day BOOLEAN NOT NULL DEFAULT false COMMENT '종일 일정 여부',
    reminder_minutes INT DEFAULT 15 COMMENT '미리 알림 (분)',
    is_published BOOLEAN NOT NULL DEFAULT true COMMENT '가족과 공유 여부',
    color_tag VARCHAR(20) COMMENT '색상 태그',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_user_id (user_id),
    INDEX idx_start_at (start_at),
    INDEX idx_user_date (user_id, start_at),
    INDEX idx_created_at (created_at),

    CONSTRAINT fk_appointments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='개인 약속/일정';

-- ============================================================================
-- 9. FAMILY_EVENTS 테이블 - 가족 공유 캘린더 이벤트
-- ============================================================================
CREATE TABLE family_events (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    family_id BIGINT UNSIGNED NOT NULL,
    created_by_user_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL COMMENT '이벤트 제목',
    description TEXT COMMENT '이벤트 상세 설명',
    start_at DATETIME NOT NULL COMMENT '시작 시간',
    end_at DATETIME NOT NULL COMMENT '종료 시간',
    location VARCHAR(255) COMMENT '위치',
    is_all_day BOOLEAN NOT NULL DEFAULT false COMMENT '종일 일정 여부',
    category VARCHAR(100) COMMENT '카테고리 (Birthday, Holiday, Family Meeting 등)',
    color_tag VARCHAR(20) COMMENT '색상 태그',
    event_type ENUM('standard', 'birthday', 'anniversary', 'holiday') DEFAULT 'standard',
    attendee_user_ids JSON COMMENT '참석자 배열 (["user_id1", "user_id2", ...])',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_family_id (family_id),
    INDEX idx_created_by_user_id (created_by_user_id),
    INDEX idx_start_at (start_at),
    INDEX idx_family_date (family_id, start_at),
    INDEX idx_created_at (created_at),

    CONSTRAINT fk_family_events_family FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
    CONSTRAINT fk_family_events_creator FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='가족 공유 캘린더 이벤트';

-- ============================================================================
-- 10. NOTES 테이블 - 일일 메모 (날짜당 1개, 마크다운)
-- ============================================================================
CREATE TABLE notes (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    note_date DATE NOT NULL COMMENT '메모 날짜',
    content LONGTEXT COMMENT '메모 내용 (마크다운)',
    mood ENUM('very_sad', 'sad', 'neutral', 'happy', 'very_happy') COMMENT '기분 상태',
    is_published BOOLEAN NOT NULL DEFAULT true COMMENT '가족과 공유 여부',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE INDEX uk_user_date (user_id, note_date),
    INDEX idx_user_id (user_id),
    INDEX idx_note_date (note_date),
    INDEX idx_created_at (created_at),

    CONSTRAINT fk_notes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='일일 메모 (마크다운)';

-- ============================================================================
-- 11. FAMILY_ANNOUNCEMENTS 테이블 - 가족 공지사항
-- ============================================================================
CREATE TABLE family_announcements (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    family_id BIGINT UNSIGNED NOT NULL,
    created_by_user_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL COMMENT '공지 제목',
    content TEXT NOT NULL COMMENT '공지 내용 (마크다운)',
    priority ENUM('low', 'normal', 'high', 'urgent') NOT NULL DEFAULT 'normal',
    is_pinned BOOLEAN NOT NULL DEFAULT false COMMENT '상단 고정 여부',
    pinned_until DATETIME COMMENT '고정 해제 시간',
    is_active BOOLEAN NOT NULL DEFAULT true COMMENT '활성 상태',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_family_id (family_id),
    INDEX idx_created_by_user_id (created_by_user_id),
    INDEX idx_is_pinned (is_pinned),
    INDEX idx_priority (priority),
    INDEX idx_created_at (created_at),
    INDEX idx_family_created (family_id, created_at),

    CONSTRAINT fk_announcements_family FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
    CONSTRAINT fk_announcements_creator FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='가족 공지사항';

-- ============================================================================
-- 12. EMOTION_CHECKINS 테이블 - 일일 감정 기록
-- ============================================================================
CREATE TABLE emotion_checkins (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    checkin_date DATE NOT NULL COMMENT '체크인 날짜',
    primary_emotion VARCHAR(50) NOT NULL COMMENT '주요 감정 (happy, sad, angry, anxious, calm, tired 등)',
    emotion_score INT NOT NULL COMMENT '감정 강도 (1-10)',
    physical_condition VARCHAR(50) COMMENT '신체 상태 (energetic, normal, tired, unwell)',
    sleep_quality INT COMMENT '수면 질 (1-10)',
    sleep_hours DECIMAL(3, 1) COMMENT '수면 시간',
    exercise_minutes INT COMMENT '운동 시간 (분)',
    notes TEXT COMMENT '감정 기록 메모',
    is_published BOOLEAN NOT NULL DEFAULT true COMMENT '가족과 공유 여부',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE INDEX uk_user_date (user_id, checkin_date),
    INDEX idx_user_id (user_id),
    INDEX idx_checkin_date (checkin_date),
    INDEX idx_primary_emotion (primary_emotion),
    INDEX idx_created_at (created_at),

    CONSTRAINT fk_emotion_checkins_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='일일 감정 체크인 기록';

-- ============================================================================
-- 13. FAMILY_GOALS 테이블 - 가족 공동 목표
-- ============================================================================
CREATE TABLE family_goals (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    family_id BIGINT UNSIGNED NOT NULL,
    created_by_user_id BIGINT UNSIGNED NOT NULL,
    goal_type ENUM('weekly', 'monthly', 'yearly') NOT NULL DEFAULT 'monthly',
    period_start_date DATE NOT NULL,
    period_end_date DATE NOT NULL,
    title VARCHAR(255) NOT NULL COMMENT '가족 목표 제목',
    description TEXT COMMENT '가족 목표 상세 설명',
    target_metric VARCHAR(255) COMMENT '측정 지표',
    progress_percentage INT DEFAULT 0 COMMENT '진행률 (0-100)',
    status ENUM('not_started', 'in_progress', 'completed', 'abandoned') NOT NULL DEFAULT 'not_started',
    priority ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
    contributor_user_ids JSON COMMENT '참여자 배열 (["user_id1", "user_id2", ...])',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_family_id (family_id),
    INDEX idx_created_by_user_id (created_by_user_id),
    INDEX idx_goal_type (goal_type),
    INDEX idx_period_dates (period_start_date, period_end_date),
    INDEX idx_status (status),
    INDEX idx_family_type_period (family_id, goal_type, period_start_date),
    INDEX idx_created_at (created_at),

    CONSTRAINT fk_family_goals_family FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
    CONSTRAINT fk_family_goals_creator FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='가족 공동 목표';

-- ============================================================================
-- 인덱스 재확인 및 추가 최적화
-- ============================================================================

-- PLAN_ITEMS 복합 인덱스: 일일 계획 조회 시 우선순위 + 완료 상태 함께 조회
ALTER TABLE plan_items ADD INDEX idx_daily_plan_priority_completed (daily_plan_id, priority, is_completed);

-- FAMILY_EVENTS 복합 인덱스: 가족별 기간 조회
ALTER TABLE family_events ADD INDEX idx_family_period (family_id, start_at, end_at);

-- GOALS 복합 인덱스: 사용자별 기간별 목표 조회
ALTER TABLE goals ADD INDEX idx_user_period (user_id, goal_type, period_start_date);

-- ============================================================================
-- 아이디어 노트 (날짜 무관 메모/아이디어 관리)
-- ============================================================================
CREATE TABLE IF NOT EXISTS idea_memos (
    id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id    BIGINT UNSIGNED NOT NULL,
    title      VARCHAR(255) NOT NULL,
    content    LONGTEXT,
    category   VARCHAR(100),
    tags       JSON,
    color_tag  VARCHAR(20),
    is_pinned  BOOLEAN NOT NULL DEFAULT false,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_idea_memos_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE idea_memos ADD INDEX idx_idea_memos_user (user_id);
ALTER TABLE idea_memos ADD INDEX idx_idea_memos_pinned (is_pinned);
ALTER TABLE idea_memos ADD INDEX idx_idea_memos_category (category);
ALTER TABLE idea_memos ADD INDEX idx_idea_memos_created (created_at);
ALTER TABLE idea_memos ADD INDEX idx_idea_memos_user_created (user_id, created_at);

-- ============================================================================
-- 데이터 확인 쿼리
-- ============================================================================

-- 모든 테이블 목록 확인
-- SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'family_planner' ORDER BY TABLE_NAME;

-- 모든 인덱스 확인
-- SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = 'family_planner' ORDER BY TABLE_NAME, INDEX_NAME;
