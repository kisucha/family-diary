"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bell, Pin, Plus, Pencil, CheckCircle2, RotateCcw, Trash2, X } from "lucide-react";
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
  return d.toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
}

function formatDateFull(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

// ============================================================================
// 공지 작성/수정 다이얼로그
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
                <label htmlFor="isPinned" className="text-sm text-muted-foreground">
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
// 공지 상세 보기 다이얼로그
// ============================================================================

function AnnouncementDetailDialog({
  announcement,
  onClose,
}: {
  announcement: SerializedAnnouncement | null;
  onClose: () => void;
}) {
  if (!announcement) return null;
  return (
    <Dialog open={!!announcement} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-start gap-2 pr-6">
            {announcement.isPinned && <Pin className="h-4 w-4 text-indigo-500 mt-0.5 flex-shrink-0" />}
            <DialogTitle className="text-base leading-snug">{announcement.title}</DialogTitle>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className={`text-[10px] border ${getPriorityBadgeClass(announcement.priority)}`}>
              {getPriorityLabel(announcement.priority)}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {announcement.createdBy.name} · {formatDateFull(announcement.createdAt)}
            </span>
          </div>
        </DialogHeader>
        <div className="mt-2 max-h-96 overflow-y-auto">
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
            {announcement.content}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="h-3.5 w-3.5 mr-1" /> 닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// 게시판 테이블
// ============================================================================

interface BoardTableProps {
  announcements: SerializedAnnouncement[];
  canModify: (a: SerializedAnnouncement) => boolean;
  isCompleted?: boolean;
  onView: (a: SerializedAnnouncement) => void;
  onEdit: (a: SerializedAnnouncement) => void;
  onComplete: (id: string) => void;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
}

function BoardTable({ announcements, canModify, isCompleted = false, onView, onEdit, onComplete, onRestore, onDelete }: BoardTableProps) {
  if (announcements.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground border border-border rounded-lg">
        {isCompleted ? "완료된 공지가 없습니다." : "등록된 공지가 없습니다."}
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* 테이블 헤더 */}
      <div className="grid grid-cols-[2rem_1fr_4rem_4rem_5rem] bg-muted/50 border-b border-border px-3 py-2 text-xs font-semibold text-muted-foreground">
        <span></span>
        <span>제목</span>
        <span className="text-center">작성자</span>
        <span className="text-center">날짜</span>
        <span className="text-center">관리</span>
      </div>

      {/* 행 목록 */}
      <div className="divide-y divide-border">
        {announcements.map((a) => (
          <div
            key={a.id}
            className={`grid grid-cols-[2rem_1fr_4rem_4rem_5rem] items-center px-3 py-2.5 text-sm transition-colors hover:bg-muted/30 ${isCompleted ? "opacity-60" : ""}`}
          >
            {/* 우선순위 / 핀 */}
            <div className="flex items-center justify-center">
              {a.isPinned
                ? <Pin className="h-3 w-3 text-indigo-500" />
                : <Badge variant="outline" className={`text-[9px] px-1 py-0 border leading-tight ${isCompleted ? "bg-slate-100 text-slate-400 border-slate-200" : getPriorityBadgeClass(a.priority)}`}>
                    {isCompleted ? "완료" : getPriorityLabel(a.priority)}
                  </Badge>
              }
            </div>

            {/* 제목 */}
            <button
              onClick={() => onView(a)}
              className={`text-left text-sm truncate pr-2 hover:underline underline-offset-2 ${isCompleted ? "line-through text-muted-foreground" : "text-foreground font-medium"}`}
            >
              {a.title}
            </button>

            {/* 작성자 */}
            <span className="text-center text-xs text-muted-foreground truncate">
              {a.createdBy.name}
            </span>

            {/* 날짜 */}
            <span className="text-center text-xs text-muted-foreground">
              {formatDate(a.createdAt)}
            </span>

            {/* 액션 */}
            <div className="flex items-center justify-center gap-0.5">
              {canModify(a) && (
                <>
                  {!isCompleted && (
                    <button onClick={() => onEdit(a)} className="p-1 rounded hover:bg-accent text-muted-foreground/50 hover:text-muted-foreground" title="수정">
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                  {!isCompleted ? (
                    <button onClick={() => onComplete(a.id)} className="p-1 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-muted-foreground/50 hover:text-emerald-600" title="게시 완료">
                      <CheckCircle2 className="h-3 w-3" />
                    </button>
                  ) : (
                    <button onClick={() => onRestore(a.id)} className="p-1 rounded hover:bg-accent text-muted-foreground/30 hover:text-muted-foreground" title="완료 취소">
                      <RotateCcw className="h-3 w-3" />
                    </button>
                  )}
                  <button onClick={() => onDelete(a.id)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-muted-foreground/50 hover:text-red-500" title="삭제">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
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
  const [viewing, setViewing] = useState<SerializedAnnouncement | null>(null);
  const [tab, setTab] = useState<"active" | "completed">("active");
  const now = new Date();

  const canWrite = userRole === "ADMIN" || userRole === "PARENT";

  const { data } = useQuery<{ data: SerializedAnnouncement[] }>({
    queryKey: ["announcements"],
    queryFn: async () => {
      const res = await fetch("/api/announcements?take=100");
      if (!res.ok) throw new Error();
      return res.json();
    },
    initialData: { data: initialAnnouncements },
  });

  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/announcements/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["announcements"] }); toast.success("게시 완료 처리되었습니다"); },
    onError: () => toast.error("처리에 실패했습니다"),
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/announcements/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["announcements"] }); toast.success("공지가 다시 활성화되었습니다"); },
    onError: () => toast.error("처리에 실패했습니다"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/announcements/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["announcements"] }); toast.success("공지가 삭제되었습니다"); },
    onError: () => toast.error("삭제에 실패했습니다"),
  });

  const announcements = data?.data ?? [];
  const activeList = announcements.filter((a) => a.isActive).sort((a, b) => {
    // 핀 고정 우선, 그 다음 최신순
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  const completedList = announcements.filter((a) => !a.isActive).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const canModify = (a: SerializedAnnouncement) =>
    a.createdByUserId === userId || userRole === "ADMIN";

  const handleDelete = (id: string) => {
    if (confirm("이 공지를 완전히 삭제하시겠습니까?")) deleteMutation.mutate(id);
  };

  const handleComplete = (id: string) => {
    if (confirm("게시 완료 처리하시겠습니까?")) completeMutation.mutate(id);
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* 헤더 */}
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

      {/* 탭 */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setTab("active")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "active"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          진행중
          {activeList.length > 0 && (
            <span className="ml-1.5 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
              {activeList.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("completed")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "completed"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          게시 완료
          {completedList.length > 0 && (
            <span className="ml-1.5 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
              {completedList.length}
            </span>
          )}
        </button>
      </div>

      {/* 게시판 테이블 */}
      <BoardTable
        announcements={tab === "active" ? activeList : completedList}
        canModify={canModify}
        isCompleted={tab === "completed"}
        onView={setViewing}
        onEdit={(a) => { setEditing(a); setFormOpen(true); }}
        onComplete={handleComplete}
        onRestore={(id) => restoreMutation.mutate(id)}
        onDelete={handleDelete}
      />

      {/* 상세 보기 다이얼로그 */}
      <AnnouncementDetailDialog
        announcement={viewing}
        onClose={() => setViewing(null)}
      />

      {/* 작성/수정 다이얼로그 */}
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
