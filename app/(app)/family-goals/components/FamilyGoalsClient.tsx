"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Users, Plus, Pencil, Trash2, Target } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@radix-ui/react-tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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

interface SerializedFamilyGoal {
  id: string;
  familyId: string;
  createdByUserId: string;
  goalType: GoalType;
  periodStartDate: string;
  periodEndDate: string;
  title: string;
  description: string | null;
  targetMetric: string | null;
  progressPercentage: number | null;
  status: GoalStatus;
  priority: Priority;
  contributorUserIds: string[] | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  createdBy: { id: string; name: string };
}

interface FamilyMember {
  id: string;
  name: string;
}

interface FamilyGoalsClientProps {
  initialGoals: SerializedFamilyGoal[];
  userId: string;
  userRole: string;
  familyMembers: FamilyMember[];
}

// ============================================================================
// 헬퍼
// ============================================================================

const PRIORITY_LABELS: Record<Priority, string> = {
  HIGH: "높음",
  MEDIUM: "중간",
  LOW: "낮음",
};

const PRIORITY_BADGE: Record<Priority, string> = {
  HIGH: "bg-red-100 text-red-700 border-red-200",
  MEDIUM: "bg-amber-100 text-amber-700 border-amber-200",
  LOW: "bg-slate-100 text-slate-600 border-slate-200",
};

function getPeriodDefaults(type: GoalType) {
  const now = new Date();
  if (type === "WEEKLY") {
    const day = now.getDay();
    const mon = new Date(now);
    mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return {
      start: mon.toISOString().split("T")[0],
      end: sun.toISOString().split("T")[0],
    };
  }
  if (type === "MONTHLY") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
    };
  }
  // YEARLY
  return {
    start: `${now.getFullYear()}-01-01`,
    end: `${now.getFullYear()}-12-31`,
  };
}

// ============================================================================
// GoalFormDialog
// ============================================================================

interface FormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editing?: SerializedFamilyGoal | null;
  familyMembers: FamilyMember[];
}

function GoalFormDialog({ open, onClose, onSuccess, editing, familyMembers }: FormDialogProps) {
  const defaults = getPeriodDefaults("WEEKLY");
  const [goalType, setGoalType] = useState<GoalType>(editing?.goalType ?? "WEEKLY");
  const [periodStart, setPeriodStart] = useState(editing?.periodStartDate ?? defaults.start);
  const [periodEnd, setPeriodEnd] = useState(editing?.periodEndDate ?? defaults.end);
  const [title, setTitle] = useState(editing?.title ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [targetMetric, setTargetMetric] = useState(editing?.targetMetric ?? "");
  const [priority, setPriority] = useState<Priority>(editing?.priority ?? "MEDIUM");
  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    editing?.contributorUserIds ?? []
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleTypeChange = (type: GoalType) => {
    setGoalType(type);
    const d = getPeriodDefaults(type);
    setPeriodStart(d.start);
    setPeriodEnd(d.end);
  };

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error("제목을 입력해주세요"); return; }
    setIsLoading(true);
    try {
      const url = editing ? `/api/family/goals/${editing.id}` : "/api/family/goals";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalType,
          periodStartDate: periodStart,
          periodEndDate: periodEnd,
          title: title.trim(),
          description: description.trim() || undefined,
          targetMetric: targetMetric.trim() || undefined,
          priority,
          contributorUserIds: selectedMembers,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "저장에 실패했습니다");
        return;
      }
      toast.success(editing ? "목표가 수정되었습니다" : "목표가 등록되었습니다");
      onSuccess();
      onClose();
    } catch {
      toast.error("저장에 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "가족 목표 수정" : "가족 목표 등록"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* 목표 유형 */}
          <div>
            <Label className="text-sm">목표 유형</Label>
            <Select value={goalType} onValueChange={(v) => handleTypeChange(v as GoalType)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WEEKLY">주간</SelectItem>
                <SelectItem value="MONTHLY">월간</SelectItem>
                <SelectItem value="YEARLY">연간</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* 기간 */}
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
          {/* 제목 */}
          <div>
            <Label className="text-sm">제목 *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="목표 제목" maxLength={255} className="mt-1" />
          </div>
          {/* 설명 */}
          <div>
            <Label className="text-sm">설명</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="목표에 대한 설명" rows={3} maxLength={2000} className="mt-1 resize-none" />
          </div>
          {/* 달성 지표 + 우선순위 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">달성 지표</Label>
              <Input value={targetMetric} onChange={(e) => setTargetMetric(e.target.value)} placeholder="예: 주 3회" maxLength={255} className="mt-1" />
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
          </div>
          {/* 기여자 */}
          {familyMembers.length > 0 && (
            <div>
              <Label className="text-sm">기여 구성원</Label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {familyMembers.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleMember(m.id)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      selectedMembers.includes(m.id)
                        ? "bg-indigo-100 text-indigo-700 border-indigo-300"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>취소</Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "저장 중..." : (editing ? "수정" : "등록")}
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
  goal: SerializedFamilyGoal;
  canModify: boolean;
  familyMembers: FamilyMember[];
  onEdit: (goal: SerializedFamilyGoal) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: { progressPercentage?: number; status?: GoalStatus }) => void;
}

function GoalCard({ goal, canModify, familyMembers, onEdit, onDelete, onUpdate }: GoalCardProps) {
  const contributorNames = (goal.contributorUserIds ?? [])
    .map((id) => familyMembers.find((m) => m.id === id)?.name)
    .filter(Boolean);

  return (
    <Card className="border border-slate-200">
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-semibold text-slate-800">{goal.title}</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {goal.periodStartDate} ~ {goal.periodEndDate}
              {goal.createdBy && ` · ${goal.createdBy.name} 등록`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Badge
              variant="outline"
              className={`text-[10px] border ${PRIORITY_BADGE[goal.priority]}`}
            >
              {PRIORITY_LABELS[goal.priority]}
            </Badge>
            {canModify && (
              <>
                <button
                  onClick={() => onEdit(goal)}
                  className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => { if (confirm("이 목표를 삭제하시겠습니까?")) onDelete(goal.id); }}
                  className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-4 space-y-3">
        {goal.description && (
          <p className="text-sm text-slate-600 leading-relaxed">{goal.description}</p>
        )}
        {goal.targetMetric && (
          <p className="text-xs text-slate-500">목표 지표: {goal.targetMetric}</p>
        )}
        {/* 진행률 */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500">진행률</span>
            <span className="text-xs font-medium text-slate-700">{goal.progressPercentage ?? 0}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={goal.progressPercentage ?? 0}
            onChange={(e) => onUpdate(goal.id, { progressPercentage: parseInt(e.target.value) })}
            className="w-full h-1.5 accent-indigo-600"
          />
        </div>
        {/* 상태 + 기여자 */}
        <div className="flex items-center gap-3">
          <Select
            value={goal.status}
            onValueChange={(v) => onUpdate(goal.id, { status: v as GoalStatus })}
          >
            <SelectTrigger className="h-7 text-xs w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NOT_STARTED">시작 전</SelectItem>
              <SelectItem value="IN_PROGRESS">진행 중</SelectItem>
              <SelectItem value="COMPLETED">완료</SelectItem>
              <SelectItem value="ABANDONED">포기</SelectItem>
            </SelectContent>
          </Select>
          {contributorNames.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {contributorNames.map((name, i) => (
                <span key={i} className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100">
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// GoalList (탭 내부 목표 목록)
// ============================================================================

interface GoalListProps {
  goals: SerializedFamilyGoal[];
  userId: string;
  userRole: string;
  familyMembers: FamilyMember[];
  onEdit: (goal: SerializedFamilyGoal) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: { progressPercentage?: number; status?: GoalStatus }) => void;
  onAddClick: () => void;
}

function GoalList({ goals, userId, userRole, familyMembers, onEdit, onDelete, onUpdate, onAddClick }: GoalListProps) {
  if (goals.length === 0) {
    return (
      <Card className="border border-slate-200">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="rounded-full bg-slate-100 p-4 inline-flex mb-3">
            <Target className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-600">등록된 목표가 없습니다</p>
          <p className="text-xs text-slate-400 mt-1">가족 함께 달성할 목표를 등록해보세요</p>
          <Button size="sm" className="mt-3" onClick={onAddClick}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            목표 추가
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {goals.map((goal) => (
        <GoalCard
          key={goal.id}
          goal={goal}
          canModify={goal.createdByUserId === userId || userRole === "ADMIN"}
          familyMembers={familyMembers}
          onEdit={onEdit}
          onDelete={onDelete}
          onUpdate={onUpdate}
        />
      ))}
    </div>
  );
}

// ============================================================================
// FamilyGoalsClient
// ============================================================================

export function FamilyGoalsClient({
  initialGoals,
  userId,
  userRole,
  familyMembers,
}: FamilyGoalsClientProps) {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SerializedFamilyGoal | null>(null);
  const [activeTab, setActiveTab] = useState<GoalType>("WEEKLY");

  const { data } = useQuery<{ data: SerializedFamilyGoal[] }>({
    queryKey: ["familyGoals"],
    queryFn: async () => {
      const res = await fetch("/api/family/goals");
      if (!res.ok) throw new Error();
      return res.json();
    },
    initialData: { data: initialGoals },
  });

  const goals = data?.data ?? [];

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/family/goals/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["familyGoals"] });
      toast.success("목표가 삭제되었습니다");
    },
    onError: () => toast.error("삭제에 실패했습니다"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: object }) => {
      const res = await fetch(`/api/family/goals/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["familyGoals"] });
    },
    onError: () => toast.error("업데이트에 실패했습니다"),
  });

  const getGoalsByType = (type: GoalType) =>
    goals.filter((g) => g.goalType === type);

  const tabItems: { value: GoalType; label: string }[] = [
    { value: "WEEKLY", label: "주간" },
    { value: "MONTHLY", label: "월간" },
    { value: "YEARLY", label: "연간" },
  ];

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-600" />
            <h1 className="text-2xl font-bold text-slate-900">가족 목표</h1>
          </div>
          <p className="text-sm text-slate-500">가족이 함께 달성할 공동 목표를 관리합니다.</p>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" />
          목표 추가
        </Button>
      </div>

      {/* 탭 */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as GoalType)}>
        <TabsList className="flex gap-1 bg-slate-100 p-1 rounded-lg w-full">
          {tabItems.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex-1 text-sm py-1.5 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-700 text-slate-600 transition-all"
            >
              {tab.label}
              <span className="ml-1.5 text-xs opacity-60">
                ({getGoalsByType(tab.value).length})
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {tabItems.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-4">
            <GoalList
              goals={getGoalsByType(tab.value)}
              userId={userId}
              userRole={userRole}
              familyMembers={familyMembers}
              onEdit={(g) => { setEditing(g); setFormOpen(true); }}
              onDelete={(id) => deleteMutation.mutate(id)}
              onUpdate={(id, data) => updateMutation.mutate({ id, data })}
              onAddClick={() => { setEditing(null); setFormOpen(true); }}
            />
          </TabsContent>
        ))}
      </Tabs>

      {/* 폼 다이얼로그 */}
      <GoalFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["familyGoals"] })}
        editing={editing}
        familyMembers={familyMembers}
      />
    </div>
  );
}
