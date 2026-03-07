-- ============================================================================
-- Franklin Planner Family Diary - Important Query Examples
-- ============================================================================

-- ============================================================================
-- 1. 특정 날짜의 사용자 일일 계획 + 태스크 조회
-- 목적: 사용자의 특정 날짜 계획과 태스크 모두 조회
-- 사용 시나리오: 사용자가 특정 날짜의 계획을 확인할 때
-- ============================================================================

SELECT
    dp.id as daily_plan_id,
    dp.plan_date,
    dp.theme,
    dp.reflection,
    dp.focus_areas,
    dp.is_published,

    -- 태스크 정보
    pi.id as plan_item_id,
    pi.title,
    pi.description,
    pi.priority,
    pi.sequence_order,
    pi.is_completed,
    pi.completed_at,
    pi.category,
    pi.tags,
    pi.estimated_time_minutes,
    pi.actual_time_minutes,

    -- 사용자 정보
    u.name as user_name,
    u.color_tag

FROM daily_plans dp
LEFT JOIN plan_items pi ON dp.id = pi.daily_plan_id
LEFT JOIN users u ON dp.user_id = u.id

WHERE dp.user_id = 1  -- 특정 사용자 ID
  AND dp.plan_date = '2026-03-02'  -- 특정 날짜

ORDER BY pi.priority = 'A' DESC,
         pi.priority = 'B' DESC,
         pi.sequence_order ASC;

-- ============================================================================
-- Prisma 코드 예시:
-- ============================================================================

/*
const dailyPlan = await prisma.dailyPlan.findUnique({
  where: {
    userId_planDate: {
      userId: 1,
      planDate: new Date('2026-03-02')
    }
  },
  include: {
    planItems: {
      orderBy: [
        { priority: 'asc' },  // A, B, C 순
        { sequenceOrder: 'asc' }  // 같은 우선순위 내에서 순서
      ]
    },
    user: true
  }
});
*/

-- ============================================================================
-- 2. 이번 달 가족 공유 캘린더 이벤트 조회
-- 목적: 특정 가족의 이번 달 모든 일정 조회 (타입별 필터 가능)
-- 사용 시나리오: 가족 캘린더 뷰에서 월간 일정 표시
-- ============================================================================

SELECT
    fe.id,
    fe.title,
    fe.description,
    fe.start_at,
    fe.end_at,
    fe.location,
    fe.is_all_day,
    fe.category,
    fe.color_tag,
    fe.event_type,
    fe.attendee_user_ids,

    -- 생성자 정보
    u.id as created_by_user_id,
    u.name as created_by_user_name,
    u.color_tag as creator_color_tag

FROM family_events fe
LEFT JOIN users u ON fe.created_by_user_id = u.id

WHERE fe.family_id = 1  -- 특정 가족 ID
  AND YEAR(fe.start_at) = 2026  -- 2026년
  AND MONTH(fe.start_at) = 3  -- 3월

ORDER BY fe.start_at ASC;

-- ============================================================================
-- 더 복잡한 버전: 생일/기념일 필터링
-- ============================================================================

SELECT
    fe.id,
    fe.title,
    fe.event_type,
    fe.start_at,
    fe.color_tag,
    u.name as created_by,

    -- 참석자 정보 (JSON 배열 처리)
    fe.attendee_user_ids

FROM family_events fe
LEFT JOIN users u ON fe.created_by_user_id = u.id

WHERE fe.family_id = 1
  AND fe.event_type IN ('birthday', 'anniversary')  -- 특별한 날짜만
  AND MONTH(fe.start_at) = 3  -- 이번 달

ORDER BY DAY(fe.start_at) ASC;

-- ============================================================================
-- Prisma 코드 예시:
-- ============================================================================

/*
const familyEvents = await prisma.familyEvent.findMany({
  where: {
    familyId: 1,
    startAt: {
      gte: new Date('2026-03-01'),
      lt: new Date('2026-04-01')
    }
  },
  include: {
    createdBy: true
  },
  orderBy: {
    startAt: 'asc'
  }
});
*/

-- ============================================================================
-- 3. 사용자별 목표 달성률 계산
-- 목적: 사용자의 모든 목표에 대한 완료 상태 및 진행률 조회
-- 사용 시나리오: 사용자 대시보드에서 목표 진행 상황 표시
-- ============================================================================

SELECT
    u.id as user_id,
    u.name,
    g.id as goal_id,
    g.goal_type,
    g.title,
    g.period_start_date,
    g.period_end_date,
    g.progress_percentage,
    g.status,
    g.priority,

    -- 관련 태스크 통계
    (
        SELECT COUNT(*)
        FROM plan_items pi
        JOIN daily_plans dp ON pi.daily_plan_id = dp.id
        WHERE pi.user_id = u.id
          AND dp.plan_date BETWEEN g.period_start_date AND g.period_end_date
          AND pi.is_completed = true
    ) as completed_tasks_count,

    (
        SELECT COUNT(*)
        FROM plan_items pi
        JOIN daily_plans dp ON pi.daily_plan_id = dp.id
        WHERE pi.user_id = u.id
          AND dp.plan_date BETWEEN g.period_start_date AND g.period_end_date
    ) as total_tasks_count

FROM users u
LEFT JOIN goals g ON u.id = g.user_id

WHERE u.id = 1  -- 특정 사용자 ID
  AND g.goal_type = 'monthly'  -- 월간 목표만
  AND YEAR(g.period_start_date) = 2026
  AND MONTH(g.period_start_date) = 3  -- 2026년 3월

ORDER BY g.period_start_date DESC, g.priority DESC;

-- ============================================================================
-- Prisma 코드 예시 (복잡한 계산):
-- ============================================================================

/*
const userGoals = await prisma.goal.findMany({
  where: {
    userId: 1,
    goalType: 'MONTHLY',
    periodStartDate: {
      gte: new Date('2026-03-01'),
      lt: new Date('2026-04-01')
    }
  },
  include: {
    user: true
  },
  orderBy: [
    { periodStartDate: 'desc' },
    { priority: 'desc' }
  ]
});

// 각 목표별로 완료된 태스크 개수 계산
for (const goal of userGoals) {
  const completedTasks = await prisma.planItem.count({
    where: {
      userId: goal.userId,
      isCompleted: true,
      dailyPlan: {
        planDate: {
          gte: goal.periodStartDate,
          lte: goal.periodEndDate
        }
      }
    }
  });

  const totalTasks = await prisma.planItem.count({
    where: {
      userId: goal.userId,
      dailyPlan: {
        planDate: {
          gte: goal.periodStartDate,
          lte: goal.periodEndDate
        }
      }
    }
  });

  goal.completedTasksCount = completedTasks;
  goal.totalTasksCount = totalTasks;
}
*/

-- ============================================================================
-- 4. 가족 구성원별 감정 추이 (선택 쿼리)
-- 목적: 특정 기간 동안 가족 구성원들의 감정 변화 추적
-- 사용 시나리오: 가족 건강도 대시보드
-- ============================================================================

SELECT
    u.id,
    u.name,
    u.color_tag,
    ec.checkin_date,
    ec.primary_emotion,
    ec.emotion_score,
    ec.physical_condition,
    ec.sleep_quality,
    ec.sleep_hours,
    ec.exercise_minutes

FROM emotion_checkins ec
JOIN users u ON ec.user_id = u.id

WHERE u.family_id = 1  -- 특정 가족
  AND ec.checkin_date BETWEEN '2026-02-01' AND '2026-03-02'  -- 최근 1개월
  AND ec.is_published = true

ORDER BY ec.checkin_date DESC, u.name ASC;

-- ============================================================================
-- 5. 일일 요약 (선택 쿼리)
-- 목적: 특정 날짜 가족 구성원들의 활동 요약
-- 사용 시나리오: 가족 뉴스피드
-- ============================================================================

SELECT
    '계획' as activity_type,
    u.id,
    u.name,
    u.color_tag,
    dp.plan_date as activity_date,
    dp.theme as title,
    COUNT(DISTINCT CASE WHEN pi.is_completed = true THEN pi.id END) as completed_count,
    COUNT(pi.id) as total_count

FROM daily_plans dp
JOIN users u ON dp.user_id = u.id
LEFT JOIN plan_items pi ON dp.id = pi.daily_plan_id

WHERE u.family_id = 1
  AND dp.plan_date = '2026-03-02'
  AND dp.is_published = true

GROUP BY dp.id, u.id

UNION ALL

SELECT
    '메모' as activity_type,
    u.id,
    u.name,
    u.color_tag,
    n.note_date as activity_date,
    CONCAT('메모 (기분: ', n.mood, ')') as title,
    1 as completed_count,
    1 as total_count

FROM notes n
JOIN users u ON n.user_id = u.id

WHERE u.family_id = 1
  AND n.note_date = '2026-03-02'
  AND n.is_published = true

ORDER BY activity_date DESC, name ASC;

-- ============================================================================
-- 6. 성능 최적화 쿼리 - 인덱스 활용 확인
-- ============================================================================

-- 특정 사용자의 완료되지 않은 태스크 조회 (인덱스 활용)
SELECT pi.id, pi.title, pi.priority, pi.sequence_order
FROM plan_items pi
WHERE pi.daily_plan_id = 1  -- 복합 인덱스 idx_daily_plan_priority_completed 사용
  AND pi.is_completed = false
  AND pi.priority = 'A'
ORDER BY pi.sequence_order ASC;

-- 가족 이벤트 조회 (기간과 가족 ID로) - 복합 인덱스 활용
SELECT fe.id, fe.title, fe.start_at
FROM family_events fe
WHERE fe.family_id = 1  -- 복합 인덱스 idx_family_period 사용
  AND fe.start_at BETWEEN '2026-03-01' AND '2026-03-31'
ORDER BY fe.start_at ASC;

-- ============================================================================
-- 7. 데이터 정합성 확인 쿼리
-- ============================================================================

-- 고아 레코드 확인: plan_items 중 daily_plans가 없는 것
SELECT pi.id, pi.daily_plan_id, pi.user_id
FROM plan_items pi
LEFT JOIN daily_plans dp ON pi.daily_plan_id = dp.id
WHERE dp.id IS NULL;

-- 초대 토큰 만료 확인
SELECT id, token, expires_at, used_at
FROM invite_tokens
WHERE expires_at < NOW()
  AND used_at IS NULL;

-- 사용자가 많은 태스크 조회 (성능 이슈 감지)
SELECT pi.user_id, COUNT(*) as task_count
FROM plan_items pi
WHERE pi.is_completed = false
GROUP BY pi.user_id
HAVING COUNT(*) > 50
ORDER BY task_count DESC;
