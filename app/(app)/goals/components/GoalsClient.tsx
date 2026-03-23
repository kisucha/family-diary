"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Target, ChevronDown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@radix-ui/react-tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ============================================================================
// 타입
// ============================================================================

type GoalType = "WEEKLY" | "MONTHLY" | "YEARLY";
type GoalStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "ABANDONED";
type Priority = "LOW" | "MEDIUM" | "HIGH";

interface SerializedGoal {
  id: string;
  userId: string;
  goalType: GoalType;
  periodStartDate: string;
  periodEndDate: string;
  title: string;
  description: string | null;
  targetMetric: string | null;
  progressPercentage: number | null;
  status: GoalStatus;
  isPublic: boolean;
  priority: Priority;
  createdAt: string | Date;
  updatedAt: string | Date;
}

// ============================================================================
// 헬퍼
// ============================================================================

function getStatusLabel(status: GoalStatus): string {
  switch (status) {
    case "NOT_STARTED": return "시작 전";
    case "IN_PROGRESS": return "진행 중";
    case "COMPLETED": return "완료";
    case "ABANDONED": return "포기";
  }
}

function getStatusBadgeClass(status: GoalStatus): string {
  switch (status) {
    case "NOT_STARTED": return "bg-slate-100 text-slate-600 border-slate-200";
    case "IN_PROGRESS": return "bg-blue-100 text-blue-700 border-blue-200";
    case "COMPLETED": return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "ABANDONED": return "bg-rose-100 text-rose-600 border-rose-200";
  }
}

function getPriorityLabel(priority: Priority): string {
  switch (priority) {
    case "HIGH": return "높음";
    case "MEDIUM": return "중간";
    case "LOW": return "낮음";
  }
}

function getPeriodDefaults(type: GoalType): { start: string; end: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  if (type === "WEEKLY") {
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      start: monday.toISOString().split("T")[0],
      end: sunday.toISOString().split("T")[0],
    };
  } else if (type === "MONTHLY") {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    return {
      start: firstDay.toISOString().split("T")[0],
      end: lastDay.toISOString().split("T")[0],
    };
  } else {
    return {
      start: `${year}-01-01`,
      end: `${year}-12-31`,
    };
  }
}

// ============================================================================
// GoalFormDialog
// ============================================================================

interface GoalFormDialogProps {
  open: boolean;
  onClose: () => void;
  goalType: GoalType;
  onSuccess: () => void;
}

function GoalFormDialog({ open, onClose, goalType, onSuccess }: GoalFormDialogProps) {
  const defaults = getPeriodDefaults(goalType);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetMetric, setTargetMetric] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [periodStart, setPeriodStart] = useState(defaults.start);
  const [periodEnd, setPeriodEnd] = useState(defaults.end);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error("제목을 입력해주세요"); return; }
    setIsLoading(true);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalType,
          periodStartDate: periodStart,
          periodEndDate: periodEnd,
          title: title.trim(),
          description: description.trim() || undefined,
          targetMetric: targetMetric.trim() || undefined,
          priority,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("목표가 추가되었습니다");
      setTitle(""); setDescription(""); setTargetMetric("");
      onSuccess();
      onClose();
    } catch {
      toast.error("목표 추가에 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>목표 추가</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-sm">제목 *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="목표 제목을 입력하세요"
              maxLength={255}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">시작일</Label>
              <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">종료일</Label>
              <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-sm">우선순위</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HIGH">높음</SelectItem>
                <SelectItem value="MEDIUM">중간</SelectItem>
                <SelectItem value="LOW">낮음</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm">목표 지표 (선택)</Label>
            <Input
              value={targetMetric}
              onChange={(e) => setTargetMetric(e.target.value)}
              placeholder="예: 하루 30분 독서"
              maxLength={255}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-sm">설명 (선택)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="목표에 대한 상세 설명"
              rows={3}
              maxLength={2000}
              className="mt-1 resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>취소</Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "저장 중..." : "추가"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// GoalCard
// ============================================================================

interface GoalCardProps {
  goal: SerializedGoal;
  onUpdate: (id: string, data: Partial<{ progressPercentage: number; status: GoalStatus }>) => void;
  onDelete: (id: string) => void;
}

function GoalCard({ goal, onUpdate, onDelete }: GoalCardProps) {
  const [expanded, setExpanded] = useState(false);
  const progress = goal.progressPercentage ?? 0;

  return (
    <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-white">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-800 text-sm">{goal.title}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {goal.periodStartDate} ~ {goal.periodEndDate}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Badge variant="outline" className={`text-xs border ${getStatusBadgeClass(goal.status)}`}>
            {getStatusLabel(goal.status)}
          </Badge>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-slate-100 rounded"
          >
            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
          <button
            onClick={() => onDelete(goal.id)}
            className="p-1 hover:bg-rose-50 hover:text-rose-500 rounded text-slate-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 진행률 */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>진행률</span>
          <span className="font-medium text-slate-700">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
        {/* 슬라이더 */}
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={progress}
          onChange={(e) => onUpdate(goal.id, { progressPercentage: Number(e.target.value) })}
          className="w-full h-1 appearance-none cursor-pointer accent-indigo-600"
        />
      </div>

      {/* 상태 변경 */}
      <Select
        value={goal.status}
        onValueChange={(v) => onUpdate(goal.id, { status: v as GoalStatus })}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="NOT_STARTED">시작 전</SelectItem>
          <SelectItem value="IN_PROGRESS">진행 중</SelectItem>
          <SelectItem value="COMPLETED">완료</SelectItem>
          <SelectItem value="ABANDONED">포기</SelectItem>
        </SelectContent>
      </Select>

      {/* 상세 정보 (토글) */}
      {expanded && (
        <div className="pt-2 border-t border-slate-100 space-y-1.5">
          {goal.targetMetric && (
            <p className="text-xs text-slate-600">
              <span className="font-medium">목표 지표:</span> {goal.targetMetric}
            </p>
          )}
          {goal.description && (
            <p className="text-xs text-slate-600 whitespace-pre-line">{goal.description}</p>
          )}
          <p className="text-xs text-slate-400">
            우선순위: {getPriorityLabel(goal.priority)}
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// GoalList
// ============================================================================

interface GoalListProps {
  goalType: GoalType;
}

function GoalList({ goalType }: GoalListProps) {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);

  const { data, isLoading } = useQuery<{ data: SerializedGoal[] }>({
    queryKey: ["goals", goalType],
    queryFn: async () => {
      const res = await fetch(`/api/goals?type=${goalType}`);
      if (!res.ok) throw new Error();
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<{ progressPercentage: number; status: GoalStatus }> }) => {
      const res = await fetch(`/api/goals/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals", goalType] });
    },
    onError: () => toast.error("저장에 실패했습니다"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/goals/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals", goalType] });
      toast.success("목표가 삭제되었습니다");
    },
    onError: () => toast.error("삭제에 실패했습니다"),
  });

  const goals = data?.data ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">{goals.length}개의 목표</span>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          목표 추가
        </Button>
      </div>

      {isLoading && (
        <div className="text-center py-8 text-slate-400 text-sm">불러오는 중...</div>
      )}

      {!isLoading && goals.length === 0 && (
        <div className="text-center py-10 border border-dashed border-slate-200 rounded-lg">
          <Target className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">아직 목표가 없습니다.</p>
          <p className="text-xs text-slate-400 mt-1">목표 추가 버튼으로 시작해보세요!</p>
        </div>
      )}

      {goals.map((goal) => (
        <GoalCard
          key={goal.id}
          goal={goal}
          onUpdate={(id, updates) => updateMutation.mutate({ id, updates })}
          onDelete={(id) => {
            if (confirm("이 목표를 삭제하시겠습니까?")) {
              deleteMutation.mutate(id);
            }
          }}
        />
      ))}

      <GoalFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        goalType={goalType}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["goals", goalType] })}
      />
    </div>
  );
}

// ============================================================================
// GoalsClient (메인)
// ============================================================================

export function GoalsClient() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Target className="h-6 w-6 text-indigo-600" />
          <h1 className="text-2xl font-bold text-foreground">목표</h1>
        </div>
        <p className="text-sm text-slate-500">
          주간, 월간, 연간 목표를 설정하고 진행 상황을 추적합니다.
        </p>
      </div>

      <Tabs defaultValue="weekly" className="space-y-4">
        <TabsList className="flex gap-1 border border-slate-200 rounded-lg p-0.5 w-fit bg-slate-50">
          <TabsTrigger
            value="weekly"
            className="px-4 py-1.5 text-sm rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-700 text-slate-600 transition-all"
          >
            주간
          </TabsTrigger>
          <TabsTrigger
            value="monthly"
            className="px-4 py-1.5 text-sm rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-700 text-slate-600 transition-all"
          >
            월간
          </TabsTrigger>
          <TabsTrigger
            value="yearly"
            className="px-4 py-1.5 text-sm rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-700 text-slate-600 transition-all"
          >
            연간
          </TabsTrigger>
        </TabsList>

        <TabsContent value="weekly">
          <GoalList goalType="WEEKLY" />
        </TabsContent>
        <TabsContent value="monthly">
          <GoalList goalType="MONTHLY" />
        </TabsContent>
        <TabsContent value="yearly">
          <GoalList goalType="YEARLY" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
