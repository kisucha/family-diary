"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { format, addDays, subDays, parseISO, isToday } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { toast } from "sonner";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { SortableTaskItem } from "./SortableTaskItem";
import { TaskItem } from "./TaskItem";
import { AddTaskForm } from "./AddTaskForm";
import { PostponeDialog } from "./PostponeDialog";
import type { SerializedDailyPlan, SerializedPlanItem } from "../page";

// ============================================================================
// API 함수
// ============================================================================

async function fetchPlan(date: string): Promise<SerializedDailyPlan | null> {
  const res = await fetch(`/api/plans?date=${date}`);
  if (!res.ok) throw new Error("계획을 불러오는데 실패했습니다");
  const json = await res.json();
  return json.data;
}

async function upsertPlan(payload: {
  date: string;
  theme?: string;
}): Promise<SerializedDailyPlan> {
  const res = await fetch("/api/plans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("계획 저장에 실패했습니다");
  const json = await res.json();
  return json.data;
}

async function toggleTask(payload: {
  id: string;
  isCompleted: boolean;
}): Promise<SerializedPlanItem> {
  const res = await fetch(`/api/tasks/${payload.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isCompleted: payload.isCompleted }),
  });
  if (!res.ok) throw new Error("태스크 업데이트에 실패했습니다");
  const json = await res.json();
  return json.data;
}

async function deleteTask(id: string): Promise<void> {
  const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("태스크 삭제에 실패했습니다");
}

// ============================================================================
// 헬퍼
// ============================================================================

const PRIORITY_LABELS: Record<"A" | "B" | "C", string> = {
  A: "A — 반드시 해야 할 일",
  B: "B — 하면 좋은 일",
  C: "C — 여유 있을 때",
};

const PRIORITY_COLORS: Record<"A" | "B" | "C", string> = {
  A: "border-red-400/50 bg-red-500/5 dark:bg-red-500/10",
  B: "border-amber-400/50 bg-amber-500/5 dark:bg-amber-500/10",
  C: "border-blue-400/50 bg-blue-500/5 dark:bg-blue-500/10",
};

const PRIORITY_BADGE: Record<"A" | "B" | "C", string> = {
  A: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-400/30",
  B: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-400/30",
  C: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-400/30",
};

// ============================================================================
// DroppablePrioritySection — 섹션을 드롭 대상으로 만드는 래퍼
// ============================================================================

function DroppablePrioritySection({
  priority,
  children,
}: {
  priority: "A" | "B" | "C";
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: priority });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[40px] rounded-lg transition-all duration-150 ${
        isOver ? "ring-2 ring-primary/40 ring-inset bg-primary/5" : ""
      }`}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Props
// ============================================================================

interface DailyPlanClientProps {
  initialDate: string;
  initialPlan: SerializedDailyPlan | null;
  userId: string;
}

// ============================================================================
// Component
// ============================================================================

export function DailyPlanClient({
  initialDate,
  initialPlan,
}: DailyPlanClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [currentDate, setCurrentDate] = useState<string>(initialDate);
  const [theme, setTheme] = useState<string>(initialPlan?.theme ?? "");
  const [addingPriority, setAddingPriority] = useState<"A" | "B" | "C" | null>(null);
  const [activeTask, setActiveTask] = useState<SerializedPlanItem | null>(null);

  // 연기 다이얼로그 상태
  const [postponeTask, setPostponeTask] = useState<SerializedPlanItem | null>(null);

  // 테마 debounce 관련
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedThemeRef = useRef<string>(initialPlan?.theme ?? "");

  // ----------------------------------------------------------------
  // DnD 센서 설정
  // ----------------------------------------------------------------
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ----------------------------------------------------------------
  // TanStack Query: 일일 계획 조회
  // ----------------------------------------------------------------
  const { data: plan, isLoading } = useQuery<SerializedDailyPlan | null>({
    queryKey: ["dailyPlan", currentDate],
    queryFn: () => fetchPlan(currentDate),
    initialData: currentDate === initialDate ? initialPlan : undefined,
    staleTime: 1000 * 60,
  });

  // ----------------------------------------------------------------
  // 날짜가 바뀌면 테마를 해당 날짜의 plan 데이터로 동기화
  // ----------------------------------------------------------------
  useEffect(() => {
    const newTheme = plan?.theme ?? "";
    setTheme(newTheme);
    savedThemeRef.current = newTheme;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan?.id, currentDate]);

  // ----------------------------------------------------------------
  // Mutation: 계획 upsert (테마 저장)
  // ----------------------------------------------------------------
  const upsertMutation = useMutation({
    mutationFn: upsertPlan,
    onSuccess: (data) => {
      savedThemeRef.current = data.theme ?? "";
      queryClient.setQueryData(["dailyPlan", currentDate], data);
    },
    onError: () => toast.error("테마 저장에 실패했습니다"),
  });

  // ----------------------------------------------------------------
  // 테마 입력 → debounce 자동 저장 (800ms)
  // ----------------------------------------------------------------
  const handleThemeChange = useCallback(
    (value: string) => {
      setTheme(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (value === savedThemeRef.current) return;
        savedThemeRef.current = value;
        upsertMutation.mutate({ date: currentDate, theme: value });
      }, 800);
    },
    [currentDate, upsertMutation]
  );

  // ----------------------------------------------------------------
  // Mutation: 태스크 완료 토글 (낙관적 업데이트)
  // ----------------------------------------------------------------
  const toggleMutation = useMutation({
    mutationFn: toggleTask,
    onMutate: async ({ id, isCompleted }) => {
      await queryClient.cancelQueries({ queryKey: ["dailyPlan", currentDate] });
      const previous = queryClient.getQueryData<SerializedDailyPlan | null>([
        "dailyPlan",
        currentDate,
      ]);
      if (previous) {
        queryClient.setQueryData<SerializedDailyPlan>(
          ["dailyPlan", currentDate],
          {
            ...previous,
            planItems: previous.planItems.map((item) =>
              item.id === id ? { ...item, isCompleted } : item
            ),
          }
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["dailyPlan", currentDate], context.previous);
      }
      toast.error("태스크 업데이트에 실패했습니다");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["dailyPlan", currentDate] });
    },
  });

  // ----------------------------------------------------------------
  // Mutation: 태스크 삭제
  // ----------------------------------------------------------------
  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dailyPlan", currentDate] });
      toast.success("태스크가 삭제되었습니다");
    },
    onError: () => toast.error("태스크 삭제에 실패했습니다"),
  });

  // ----------------------------------------------------------------
  // 드래그 시작: 활성 태스크 저장
  // ----------------------------------------------------------------
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const task = plan?.planItems.find((item) => item.id === event.active.id);
      setActiveTask(task ?? null);
    },
    [plan]
  );

  // ----------------------------------------------------------------
  // 드래그 앤 드롭: 순서 변경 및 우선순위 변경
  // ----------------------------------------------------------------
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);
      if (!over || !plan) return;
      if (active.id === over.id) return;

      const draggedTask = plan.planItems.find((item) => item.id === active.id);
      if (!draggedTask) return;

      // over.id 가 우선순위 섹션 ID("A"/"B"/"C")인지 태스크 ID인지 판별
      const PRIORITIES = ["A", "B", "C"] as const;
      const overIsPriority = PRIORITIES.includes(over.id as "A" | "B" | "C");

      let targetPriority: "A" | "B" | "C";
      if (overIsPriority) {
        targetPriority = over.id as "A" | "B" | "C";
      } else {
        const overTask = plan.planItems.find((item) => item.id === over.id);
        if (!overTask) return;
        targetPriority = overTask.priority;
      }

      if (draggedTask.priority !== targetPriority) {
        // 우선순위 변경 (cross-section drop)
        const snapshot = plan;
        queryClient.setQueryData<SerializedDailyPlan>(["dailyPlan", currentDate], {
          ...plan,
          planItems: plan.planItems.map((item) =>
            item.id === draggedTask.id ? { ...item, priority: targetPriority } : item
          ),
        });

        try {
          const res = await fetch(`/api/tasks/${draggedTask.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ priority: targetPriority }),
          });
          if (!res.ok) throw new Error();
          queryClient.invalidateQueries({ queryKey: ["dailyPlan", currentDate] });
          toast.success(`우선순위 ${draggedTask.priority} → ${targetPriority} 변경`);
        } catch {
          queryClient.setQueryData(["dailyPlan", currentDate], snapshot);
          toast.error("우선순위 변경에 실패했습니다");
        }
      } else {
        // 같은 섹션 내 순서 변경
        const items = plan.planItems.filter((item) => item.priority === draggedTask.priority);
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;

        const reordered = arrayMove(items, oldIndex, newIndex);
        const otherItems = plan.planItems.filter((item) => item.priority !== draggedTask.priority);
        queryClient.setQueryData<SerializedDailyPlan>(["dailyPlan", currentDate], {
          ...plan,
          planItems: [...otherItems, ...reordered],
        });

        try {
          const res = await fetch("/api/tasks/reorder", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              items: reordered.map((item, idx) => ({
                id: parseInt(item.id),
                sequenceOrder: idx,
              })),
            }),
          });
          if (!res.ok) throw new Error();
        } catch {
          queryClient.setQueryData(["dailyPlan", currentDate], plan);
          toast.error("순서 변경에 실패했습니다");
        }
      }
    },
    [plan, queryClient, currentDate]
  );

  // ----------------------------------------------------------------
  // 날짜 네비게이션
  // ----------------------------------------------------------------
  const navigateDate = useCallback(
    (direction: "prev" | "next") => {
      const current = parseISO(currentDate);
      const newDate =
        direction === "prev" ? subDays(current, 1) : addDays(current, 1);
      const newDateStr = format(newDate, "yyyy-MM-dd");
      setCurrentDate(newDateStr);
      setAddingPriority(null);
      router.replace(`/planner?date=${newDateStr}`, { scroll: false });
    },
    [currentDate, router]
  );

  const goToToday = useCallback(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    setCurrentDate(today);
    setAddingPriority(null);
    router.replace("/planner", { scroll: false });
  }, [router]);

  // ----------------------------------------------------------------
  // 태스크 추가 완료 콜백
  // ----------------------------------------------------------------
  const handleTaskAdded = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["dailyPlan", currentDate] });
    setAddingPriority(null);
    toast.success("태스크가 추가되었습니다");
  }, [queryClient, currentDate]);

  // ----------------------------------------------------------------
  // 연기 성공 콜백
  // ----------------------------------------------------------------
  const handlePostponeSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["dailyPlan", currentDate] });
    setPostponeTask(null);
  }, [queryClient, currentDate]);

  // ----------------------------------------------------------------
  // 렌더링 헬퍼: 우선순위별 태스크 필터
  // ----------------------------------------------------------------
  const getTasksByPriority = (priority: "A" | "B" | "C") =>
    plan?.planItems.filter((item) => item.priority === priority) ?? [];

  // ----------------------------------------------------------------
  // 날짜 표시
  // ----------------------------------------------------------------
  const displayDate = parseISO(currentDate);
  const todayFlag = isToday(displayDate);

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* 날짜 네비게이션 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigateDate("prev")}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
          aria-label="이전 날"
        >
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        </button>

        <div className="text-center">
          <div className="flex items-center gap-2 justify-center">
            <CalendarDays className="w-5 h-5 text-muted-foreground" />
            <h1 className="text-xl font-bold text-foreground">
              {format(displayDate, "M월 d일 (EEEE)", { locale: ko })}
            </h1>
            {todayFlag && (
              <span className="text-xs bg-primary/15 text-primary font-semibold px-2 py-0.5 rounded-full">
                오늘
              </span>
            )}
          </div>
          {!todayFlag && (
            <button
              onClick={goToToday}
              className="text-xs text-primary hover:underline mt-0.5"
            >
              오늘로 돌아가기
            </button>
          )}
        </div>

        <button
          onClick={() => navigateDate("next")}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
          aria-label="다음 날"
        >
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* 오늘의 테마 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-muted-foreground mb-1">
          오늘의 테마
        </label>
        <input
          type="text"
          value={theme}
          onChange={(e) => handleThemeChange(e.target.value)}
          placeholder="오늘 하루의 주제나 의도를 적어보세요"
          className="w-full border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground placeholder:text-muted-foreground"
          maxLength={255}
        />
      </div>

      {/* 로딩 상태 */}
      {isLoading && (
        <div className="text-center py-8 text-muted-foreground">불러오는 중...</div>
      )}

      {/* A/B/C 우선순위별 태스크 섹션 — 단일 DndContext */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {(["A", "B", "C"] as const).map((priority) => {
          const tasks = getTasksByPriority(priority);
          const isAddingThis = addingPriority === priority;

          return (
            <div
              key={priority}
              className={`mb-5 border-l-4 rounded-lg p-4 ${PRIORITY_COLORS[priority]}`}
            >
              {/* 섹션 헤더 */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold border rounded px-2 py-0.5 ${PRIORITY_BADGE[priority]}`}
                  >
                    {priority}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {PRIORITY_LABELS[priority]}
                  </span>
                  <span className="text-xs text-muted-foreground">({tasks.length})</span>
                </div>
                <button
                  onClick={() => setAddingPriority(isAddingThis ? null : priority)}
                  className="text-xs text-primary hover:text-primary/70 font-medium"
                >
                  {isAddingThis ? "취소" : "+ 추가"}
                </button>
              </div>

              {/* 태스크 목록 (DnD) */}
              <DroppablePrioritySection priority={priority}>
                <SortableContext
                  items={tasks.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {tasks.map((task) => (
                      <SortableTaskItem
                        key={task.id}
                        task={task}
                        priority={priority}
                        onToggle={(id, isCompleted) =>
                          toggleMutation.mutate({ id, isCompleted })
                        }
                        onDelete={(id) => deleteMutation.mutate(id)}
                        onPostpone={(t) => setPostponeTask(t)}
                      />
                    ))}

                    {tasks.length === 0 && !isAddingThis && (
                      <p className="text-xs text-muted-foreground py-1">
                        아직 등록된 항목이 없습니다
                      </p>
                    )}
                  </div>
                </SortableContext>
              </DroppablePrioritySection>

              {/* 태스크 추가 폼 */}
              {isAddingThis && plan && (
                <div className="mt-3 pt-3 border-t border-border">
                  <AddTaskForm
                    priority={priority}
                    dailyPlanId={plan.id}
                    currentDate={currentDate}
                    nextSequenceOrder={tasks.length}
                    onSuccess={handleTaskAdded}
                    onCancel={() => setAddingPriority(null)}
                  />
                </div>
              )}

              {isAddingThis && !plan && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">
                    태스크를 추가하려면 먼저 오늘 계획을 생성합니다
                  </p>
                  <AddTaskForm
                    priority={priority}
                    dailyPlanId={null}
                    currentDate={currentDate}
                    nextSequenceOrder={0}
                    onSuccess={handleTaskAdded}
                    onCancel={() => setAddingPriority(null)}
                  />
                </div>
              )}
            </div>
          );
        })}

        {/* 드래그 오버레이 */}
        <DragOverlay>
          {activeTask && (
            <div className="opacity-90 shadow-xl rotate-1 cursor-grabbing">
              <TaskItem
                task={activeTask}
                priority={activeTask.priority}
                onToggle={() => {}}
                onDelete={() => {}}
                onPostpone={() => {}}
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* 연기 다이얼로그 */}
      <PostponeDialog
        open={postponeTask !== null}
        onClose={() => setPostponeTask(null)}
        task={postponeTask}
        currentDate={currentDate}
        onSuccess={handlePostponeSuccess}
      />
    </div>
  );
}
