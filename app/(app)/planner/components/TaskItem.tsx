"use client";

import { Clock, Trash2, CalendarClock } from "lucide-react";
import type { SerializedPlanItem } from "../page";

// ============================================================================
// 유틸
// ============================================================================

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}분`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

const PRIORITY_BADGE: Record<"A" | "B" | "C", string> = {
  A: "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-400/30",
  B: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-400/30",
  C: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-400/30",
};

// ============================================================================
// Props
// ============================================================================

interface TaskItemProps {
  task: SerializedPlanItem;
  priority: "A" | "B" | "C";
  onToggle: (id: string, isCompleted: boolean) => void;
  onDelete: (id: string) => void;
  onPostpone: (task: SerializedPlanItem) => void;
}

// ============================================================================
// Component
// ============================================================================

export function TaskItem({ task, priority, onToggle, onDelete, onPostpone }: TaskItemProps) {
  const handleToggle = () => {
    onToggle(task.id, !task.isCompleted);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("이 태스크를 삭제하시겠습니까?")) {
      onDelete(task.id);
    }
  };

  const handlePostpone = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPostpone(task);
  };

  return (
    <div
      className={`flex items-start gap-3 p-2.5 rounded-lg bg-card border transition-all ${
        task.isCompleted
          ? "border-border/50 opacity-60"
          : "border-border/70 hover:border-border"
      }`}
    >
      {/* 체크박스 */}
      <button
        onClick={handleToggle}
        className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
          task.isCompleted
            ? "bg-primary border-primary"
            : "border-border hover:border-primary"
        }`}
        aria-label={task.isCompleted ? "완료 취소" : "완료로 표시"}
      >
        {task.isCompleted && (
          <svg
            className="w-3 h-3 text-primary-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </button>

      {/* 내용 */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium leading-tight ${
            task.isCompleted
              ? "line-through text-muted-foreground"
              : "text-foreground"
          }`}
        >
          {task.title}
        </p>

        {/* 메타 정보 행 */}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span
            className={`text-xs font-bold px-1.5 py-0.5 rounded ${PRIORITY_BADGE[priority]}`}
          >
            {priority}
          </span>

          {task.category && (
            <span className="text-xs text-muted-foreground bg-accent/50 px-2 py-0.5 rounded-full">
              {task.category}
            </span>
          )}

          {task.estimatedTimeMinutes && (
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {formatDuration(task.estimatedTimeMinutes)}
            </span>
          )}

          {task.isCompleted && task.actualTimeMinutes && (
            <span className="flex items-center gap-0.5 text-xs text-primary">
              <Clock className="w-3 h-3" />
              실제 {formatDuration(task.actualTimeMinutes)}
            </span>
          )}
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        {/* 연기 버튼 */}
        <button
          onClick={handlePostpone}
          className="p-1 text-muted-foreground/40 hover:text-primary transition-colors rounded"
          aria-label="태스크 연기"
          title="다른 날로 연기"
        >
          <CalendarClock className="w-4 h-4" />
        </button>

        {/* 삭제 버튼 */}
        <button
          onClick={handleDelete}
          className="p-1 text-muted-foreground/40 hover:text-red-500 transition-colors rounded"
          aria-label="태스크 삭제"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
