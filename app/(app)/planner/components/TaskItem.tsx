"use client";

import { useState, useRef, useEffect } from "react";
import { Clock, Trash2, CalendarClock, MessageSquare } from "lucide-react";
import type { SerializedPlanItem } from "../page";

// ============================================================================
// 유틸
// ============================================================================

function formatDuration(minutes: number): string {
  // 1440분 단위로 나누어 떨어지면 "N일" 표시 (1일 = 24시간 = 1440분)
  if (minutes >= 1440 && minutes % 1440 === 0) return `${minutes / 1440}일`;
  if (minutes < 60) return `${minutes}분`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

const PRIORITY_BADGE: Record<"A" | "B" | "C", string> = {
  A: "bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700",
  B: "bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700",
  C: "bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700",
};

const TASK_ACCENT: Record<"A" | "B" | "C", string> = {
  A: "border-l-red-400",
  B: "border-l-amber-400",
  C: "border-l-blue-400",
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
  onMemoSave: (id: string, description: string | null) => Promise<void>;
}

// ============================================================================
// Component
// ============================================================================

export function TaskItem({ task, priority, onToggle, onDelete, onPostpone, onMemoSave }: TaskItemProps) {
  const [isEditingMemo, setIsEditingMemo] = useState(false);
  const [memoText, setMemoText] = useState(task.description ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // task.description이 외부에서 바뀌면 동기화
  useEffect(() => {
    if (!isEditingMemo) {
      setMemoText(task.description ?? "");
    }
  }, [task.description, isEditingMemo]);

  // 편집 모드 시작 시 textarea 포커스
  useEffect(() => {
    if (isEditingMemo && textareaRef.current) {
      textareaRef.current.focus();
      // 커서를 맨 끝으로
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [isEditingMemo]);

  const handleToggle = () => onToggle(task.id, !task.isCompleted);

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

  const handleMemoIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingMemo(true);
  };

  const handleMemoSave = async () => {
    const trimmed = memoText.trim();
    const newValue = trimmed === "" ? null : trimmed;
    // 변경 없으면 그냥 닫기
    if (newValue === (task.description ?? null)) {
      setIsEditingMemo(false);
      return;
    }
    setIsSaving(true);
    try {
      await onMemoSave(task.id, newValue);
    } finally {
      setIsSaving(false);
      setIsEditingMemo(false);
    }
  };

  const handleMemoCancel = () => {
    setMemoText(task.description ?? "");
    setIsEditingMemo(false);
  };

  const handleMemoKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      handleMemoCancel();
    }
    // Ctrl+Enter 또는 Cmd+Enter로 저장
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleMemoSave();
    }
  };

  return (
    <div
      className={`p-2.5 rounded-lg bg-card border-y border-r border-l-[3px] transition-all ${TASK_ACCENT[priority]} ${
        task.isCompleted
          ? "border-y-border/40 border-r-border/40 opacity-60"
          : "border-y-border/60 border-r-border/60 hover:border-y-border hover:border-r-border hover:shadow-sm"
      }`}
    >
      {/* 상단 행: 체크박스 + 내용 + 액션 버튼 */}
      <div className="flex items-start gap-3">
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

            {task.totalSpanDays > 1 && (
              <span className={`flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded ${
                task.parentTaskId
                  ? "text-blue-400 bg-blue-50 dark:bg-blue-950/40"
                  : "text-blue-600 bg-blue-100 dark:bg-blue-900/50"
              }`}>
                연속 {task.totalSpanDays}일{task.parentTaskId ? " (연결됨)" : ""}
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
          {/* 메모 버튼 */}
          <button
            onClick={handleMemoIconClick}
            className={`p-1 transition-colors rounded ${
              task.description
                ? "text-primary hover:text-primary/80"
                : "text-muted-foreground/50 hover:text-primary"
            }`}
            aria-label="특이사항 메모"
            title={task.description ? "특이사항 편집" : "특이사항 추가"}
          >
            <MessageSquare className="w-4 h-4" />
          </button>

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

      {/* 메모 영역 */}
      {isEditingMemo ? (
        <div className="mt-2 ml-8">
          <textarea
            ref={textareaRef}
            value={memoText}
            onChange={(e) => setMemoText(e.target.value)}
            onKeyDown={handleMemoKeyDown}
            placeholder="특이사항을 입력하세요... (Ctrl+Enter 저장, Esc 취소)"
            rows={3}
            className="w-full text-xs border border-border rounded-md px-2.5 py-1.5 bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          />
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={handleMemoSave}
              disabled={isSaving}
              className="text-xs px-2.5 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isSaving ? "저장 중..." : "저장"}
            </button>
            <button
              onClick={handleMemoCancel}
              className="text-xs px-2.5 py-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      ) : task.description ? (
        <div
          className="mt-2 ml-8 cursor-pointer group"
          onClick={() => setIsEditingMemo(true)}
          title="클릭하여 메모 편집"
        >
          <p className="text-xs text-muted-foreground bg-accent/40 rounded-md px-2.5 py-1.5 group-hover:bg-accent/70 transition-colors whitespace-pre-wrap leading-relaxed">
            {task.description}
          </p>
        </div>
      ) : (
        <div
          className="mt-1.5 ml-8 cursor-pointer group"
          onClick={() => setIsEditingMemo(true)}
          title="특이사항 추가"
        >
          <p className="text-xs text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors py-0.5">
            + 특이사항 추가...
          </p>
        </div>
      )}
    </div>
  );
}
