"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

// ============================================================================
// API 함수
// ============================================================================

interface AddTaskPayload {
  dailyPlanId: string | null;
  date: string;
  title: string;
  priority: "A" | "B" | "C";
  sequenceOrder: number;
  estimatedTimeMinutes?: number;
  category?: string;
}

async function createTask(payload: AddTaskPayload) {
  const body: Record<string, unknown> = {
    title: payload.title,
    priority: payload.priority,
    sequenceOrder: payload.sequenceOrder,
    date: payload.date,
  };

  if (payload.dailyPlanId) {
    body.dailyPlanId = payload.dailyPlanId;
  }
  if (payload.estimatedTimeMinutes) {
    body.estimatedTimeMinutes = payload.estimatedTimeMinutes;
  }
  if (payload.category) {
    body.category = payload.category;
  }

  const res = await fetch("/api/plans/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "태스크 추가에 실패했습니다");
  }

  return res.json();
}

// ============================================================================
// Props
// ============================================================================

interface AddTaskFormProps {
  priority: "A" | "B" | "C";
  dailyPlanId: string | null;
  currentDate: string;
  nextSequenceOrder: number;
  onSuccess: () => void;
  onCancel: () => void;
}

// ============================================================================
// 우선순위 안내 문구
// ============================================================================

const PRIORITY_PLACEHOLDER: Record<"A" | "B" | "C", string> = {
  A: "오늘 반드시 완료해야 할 일",
  B: "하면 좋은 일",
  C: "시간 여유가 있을 때 할 일",
};

// ============================================================================
// Component
// ============================================================================

export function AddTaskForm({
  priority,
  dailyPlanId,
  currentDate,
  nextSequenceOrder,
  onSuccess,
  onCancel,
}: AddTaskFormProps) {
  const [title, setTitle] = useState("");
  const [estimatedValue, setEstimatedValue] = useState<string>("");
  const [estimatedUnit, setEstimatedUnit] = useState<"분" | "시간" | "일">("분");
  const [category, setCategory] = useState("");

  function toMinutes(value: string, unit: "분" | "시간" | "일"): number | undefined {
    const n = parseInt(value, 10);
    if (!n || n <= 0) return undefined;
    if (unit === "시간") return n * 60;
    if (unit === "일") return n * 480;
    return n;
  }

  const mutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      onSuccess();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error("태스크 제목을 입력해주세요");
      return;
    }

    mutation.mutate({
      dailyPlanId,
      date: currentDate,
      title: trimmedTitle,
      priority,
      sequenceOrder: nextSequenceOrder,
      estimatedTimeMinutes: toMinutes(estimatedValue, estimatedUnit),
      category: category.trim() || undefined,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {/* 제목 입력 */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={PRIORITY_PLACEHOLDER[priority]}
        className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground placeholder:text-muted-foreground"
        maxLength={255}
        autoFocus
        disabled={mutation.isPending}
      />

      {/* 부가 정보 행 */}
      <div className="flex gap-2">
        {/* 예상 시간 — 숫자 + 단위 선택 */}
        <div className="flex">
          <input
            type="number"
            value={estimatedValue}
            onChange={(e) => setEstimatedValue(e.target.value)}
            placeholder="소요시간"
            min={1}
            className="w-20 border border-border rounded-l-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground placeholder:text-muted-foreground"
            disabled={mutation.isPending}
          />
          <select
            value={estimatedUnit}
            onChange={(e) => setEstimatedUnit(e.target.value as "분" | "시간" | "일")}
            className="border border-l-0 border-border rounded-r-lg px-2 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={mutation.isPending}
          >
            <option value="분">분</option>
            <option value="시간">시간</option>
            <option value="일">일</option>
          </select>
        </div>

        {/* 카테고리 */}
        <input
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="카테고리 (선택)"
          className="flex-1 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground placeholder:text-muted-foreground"
          maxLength={100}
          disabled={mutation.isPending}
        />
      </div>

      {/* 버튼 행 */}
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={mutation.isPending}
          className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={mutation.isPending || !title.trim()}
          className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          {mutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          추가
        </button>
      </div>
    </form>
  );
}
