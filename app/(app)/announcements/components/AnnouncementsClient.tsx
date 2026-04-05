"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bell, Pin, Plus, Pencil, CheckCircle2, RotateCcw, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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

type AnnouncementPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

interface SerializedAnnouncement {
  id: string;
  familyId: string;
  createdByUserId: string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  isPinned: boolean;
  pinnedUntil: string | null;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  createdBy: { id: string; name: string };
}

interface AnnouncementsClientProps {
  initialAnnouncements: SerializedAnnouncement[];
  userId: string;
  userRole: string;
}

// ============================================================================
// 헬퍼
// ============================================================================

function getPriorityLabel(priority: AnnouncementPriority): string {
  switch (priority) {
    case "URGENT": return "긴급";
    case "HIGH": return "중요";
    case "NORMAL": return "일반";
    case "LOW": return "낮음";
  }
}

function getPriorityBadgeClass(priority: AnnouncementPriority): string {
  switch (priority) {
    case "URGENT": return "bg-red-100 text-red-700 border-red-200";
    case "HIGH": return "bg-amber-100 text-amber-700 border-amber-200";
    case "NORMAL": return "bg-slate-100 text-slate-600 border-slate-200";
    case "LOW": return "bg-emerald-100 text-emerald-600 border-emerald-200";
  }
}

function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

// ============================================================================
// AnnouncementFormDialog
// ============================================================================

interface FormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editing?: SerializedAnnouncement | null;
}

function AnnouncementFormDialog({ open, onClose, onSuccess, editing }: FormDialogProps) {
  const [title, setTitle] = useState(editing?.title ?? "");
  const [content, setContent] = useState(editing?.content ?? "");
  const [priority, setPriority] = useState<AnnouncementPriority>(editing?.priority ?? "NORMAL");
  const [isPinned, setIsPinned] = useState(editing?.isPinned ?? false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error("제목을 입력해주세요"); return; }
    if (!content.trim()) { toast.error("내용을 입력해주세요"); return; }
    setIsLoading(true);
    try {
      const url = editing ? `/api/announcements/${editing.id}` : "/api/announcements";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), content: content.trim(), priority, isPinned }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "저장에 실패했습니다");
        return;
      }
      toast.success(editing ? "공지가 수정되었습니다" : "공지가 등록되었습니다");
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "공지 수정" : "공지 작성"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-sm">제목 *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="공지 제목" maxLength={255} className="mt-1" />
          </div>
          <div>
            <Label className="text-sm">내용 *</Label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="가족에게 전달할 내용을 작성하세요" rows={5} maxLength={10000} className="mt-1 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">우선순위</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as AnnouncementPriority)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="URGENT">긴급</SelectItem>
                  <SelectItem value="HIGH">중요</SelectItem>
                  <SelectItem value="NORMAL">일반</SelectItem>
                  <SelectItem value="LOW">낮음</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">핀 고정</Label>
              <div className="mt-2.5 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPinned"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="h-4 w-4 accent-indigo-600"
                />
                <label htmlFor="isPinned" className="text-sm text-slate-600">
                  상단 고정
                </label>
              </div>
            </div>
          </div>
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
// AnnouncementRow — accordion 방식 단일 공지 행
// ============================================================================

interface AnnouncementRowProps {
  announcement: SerializedAnnouncement;
  canModify: boolean;
  isPinned: boolean;
  onEdit: () => void;
  onComplete: () => void;
  onRestore: () => void;
  onDelete: () => void;
}

function AnnouncementRow({ announcement, canModify, isPinned, onEdit, onComplete, onRestore, onDelete }: AnnouncementRowProps) {
  const [expanded, setExpanded] = useState(false);
  const isCompleted = !announcement.isActive;

  return (
    <div className={`border rounded-lg overflow-hidden ${
      isPinned ? "border-indigo-200 bg-indigo-50/30 dark:bg-indigo-950/20" :
      isCompleted ? "border-slate-100 bg-slate-50/40 opacity-65" :
      "border-border bg-card"
    }`}>
      {/* 제목 행 */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        {isPinned && <Pin className="h-3 w-3 text-indigo-400 flex-shrink-0" />}
        {isCompleted && <CheckCircle2 className="h-3 w-3 text-emerald-400 flex-shrink-0" />}

        <span className={`flex-1 text-sm font-medium truncate ${isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>
          {announcement.title}
        </span>

        <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <Badge
            variant="outline"
            className={`text-[10px] border px-1.5 py-0 ${isCompleted ? "bg-slate-100 text-slate-400 border-slate-200" : getPriorityBadgeClass(announcement.priority)}`}
          >
            {isCompleted ? "완료" : getPriorityLabel(announcement.priority)}
          </Badge>
          <span className="text-[10px] text-muted-foreground">{formatDate(announcement.createdAt)}</span>

          {canModify && (
            <>
              {!isCompleted && (
                <button onClick={onEdit} className="p-1 hover:bg-accent rounded text-muted-foreground/50 hover:text-muted-foreground" title="수정">
                  <Pencil className="h-3 w-3" />
                </button>
              )}
              {!isCompleted ? (
                <button onClick={onComplete} className="p-1 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded text-muted-foreground/50 hover:text-emerald-600" title="게시 완료">
                  <CheckCircle2 className="h-3 w-3" />
                </button>
              ) : (
                <button onClick={onRestore} className="p-1 hover:bg-accent rounded text-muted-foreground/30 hover:text-muted-foreground" title="완료 취소">
                  <RotateCcw className="h-3 w-3" />
                </button>
              )}
              <button onClick={onDelete} className="p-1 hover:bg-red-50 dark:hover:bg-red-950/40 rounded text-muted-foreground/50 hover:text-red-500" title="삭제">
                <Trash2 className="h-3 w-3" />
              </button>
            </>
          )}
        </div>

        {expanded
          ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
          : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
        }
      </div>

      {/* 내용 (펼치기) */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-border/40">
          <p className="text-xs text-muted-foreground mb-1">{announcement.createdBy.name}</p>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
            {announcement.content}
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// AnnouncementsClient
// ============================================================================

export function AnnouncementsClient({ initialAnnouncements, userId, userRole }: AnnouncementsClientProps) {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SerializedAnnouncement | null>(null);
  const now = new Date();

  const canWrite = userRole === "ADMIN" || userRole === "PARENT";

  const { data } = useQuery<{ data: SerializedAnnouncement[] }>({
    queryKey: ["announcements"],
    queryFn: async () => {
      const res = await fetch("/api/announcements?take=50");
      if (!res.ok) throw new Error();
      return res.json();
    },
    initialData: { data: initialAnnouncements },
  });

  // 게시 완료 (isActive: false)
  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/announcements/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast.success("게시가 완료 처리되었습니다");
    },
    onError: () => toast.error("처리에 실패했습니다"),
  });

  // 완료 취소 (isActive: true 복원)
  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/announcements/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast.success("공지가 다시 활성화되었습니다");
    },
    onError: () => toast.error("처리에 실패했습니다"),
  });

  // 완전 삭제
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/announcements/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast.success("공지가 삭제되었습니다");
    },
    onError: () => toast.error("삭제에 실패했습니다"),
  });

  const announcements = data?.data ?? [];
  const activeAnnouncements = announcements.filter((a) => a.isActive);
  const completedAnnouncements = announcements.filter((a) => !a.isActive);

  const pinnedList = activeAnnouncements.filter(
    (a) => a.isPinned && (!a.pinnedUntil || new Date(a.pinnedUntil) > now)
  );
  const normalList = activeAnnouncements.filter(
    (a) => !a.isPinned || (a.pinnedUntil && new Date(a.pinnedUntil) <= now)
  );

  const canModify = (a: SerializedAnnouncement) =>
    a.createdByUserId === userId || userRole === "ADMIN";

  const handleDelete = (id: string) => {
    if (confirm("이 공지를 완전히 삭제하시겠습니까?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleComplete = (id: string) => {
    if (confirm("게시 완료 처리하시겠습니까?\n완료 후에도 목록에서 확인할 수 있습니다.")) {
      completeMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-indigo-600" />
          <h1 className="text-xl font-bold text-foreground">공지사항</h1>
        </div>
        {canWrite && (
          <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" />
            공지 작성
          </Button>
        )}
      </div>

      {/* 빈 상태 */}
      {announcements.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
          아직 공지사항이 없습니다.
        </div>
      )}

      {/* 고정 공지 */}
      {pinnedList.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            <Pin className="h-3 w-3 text-indigo-400" /> 고정 공지
          </p>
          {pinnedList.map((a) => (
            <AnnouncementRow
              key={a.id}
              announcement={a}
              canModify={canModify(a)}
              isPinned={true}
              onEdit={() => { setEditing(a); setFormOpen(true); }}
              onComplete={() => handleComplete(a.id)}
              onRestore={() => restoreMutation.mutate(a.id)}
              onDelete={() => handleDelete(a.id)}
            />
          ))}
        </div>
      )}

      {pinnedList.length > 0 && normalList.length > 0 && <Separator />}

      {/* 일반 공지 */}
      {normalList.length > 0 && (
        <div className="space-y-1.5">
          {pinnedList.length > 0 && (
            <p className="text-xs font-semibold text-slate-500">전체 공지</p>
          )}
          {normalList.map((a) => (
            <AnnouncementRow
              key={a.id}
              announcement={a}
              canModify={canModify(a)}
              isPinned={false}
              onEdit={() => { setEditing(a); setFormOpen(true); }}
              onComplete={() => handleComplete(a.id)}
              onRestore={() => restoreMutation.mutate(a.id)}
              onDelete={() => handleDelete(a.id)}
            />
          ))}
        </div>
      )}

      {/* 게시 완료된 공지 */}
      {completedAnnouncements.length > 0 && (
        <>
          {activeAnnouncements.length > 0 && <Separator />}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-slate-400 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              게시 완료 ({completedAnnouncements.length})
            </p>
            {completedAnnouncements.map((a) => (
              <AnnouncementRow
                key={a.id}
                announcement={a}
                canModify={canModify(a)}
                isPinned={false}
                onEdit={() => { setEditing(a); setFormOpen(true); }}
                onComplete={() => handleComplete(a.id)}
                onRestore={() => restoreMutation.mutate(a.id)}
                onDelete={() => handleDelete(a.id)}
              />
            ))}
          </div>
        </>
      )}

      {/* 공지 작성/수정 다이얼로그 */}
      <AnnouncementFormDialog
        key={editing?.id ?? "new"}
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["announcements"] })}
        editing={editing}
      />
    </div>
  );
}
