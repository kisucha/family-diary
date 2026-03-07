"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bell, Pin, Plus, Pencil, Trash2 } from "lucide-react";
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
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
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
      const res = await fetch("/api/announcements?take=30");
      if (!res.ok) throw new Error();
      return res.json();
    },
    initialData: { data: initialAnnouncements },
  });

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
  const pinnedList = announcements.filter(
    (a) => a.isPinned && (!a.pinnedUntil || new Date(a.pinnedUntil) > now)
  );
  const normalList = announcements.filter(
    (a) => !a.isPinned || (a.pinnedUntil && new Date(a.pinnedUntil) <= now)
  );

  const canModify = (announcement: SerializedAnnouncement) =>
    announcement.createdByUserId === userId || userRole === "ADMIN";

  const renderCard = (announcement: SerializedAnnouncement, isPinCard: boolean) => (
    <Card
      key={announcement.id}
      className={`border ${isPinCard ? "border-indigo-200 bg-indigo-50/40" : "border-slate-200"}`}
    >
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
            {isPinCard && <Pin className="h-3.5 w-3.5 text-indigo-500 flex-shrink-0" />}
            <CardTitle className="text-sm font-semibold text-slate-800 truncate">
              {announcement.title}
            </CardTitle>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Badge
              variant="outline"
              className={`text-[10px] border ${getPriorityBadgeClass(announcement.priority)}`}
            >
              {getPriorityLabel(announcement.priority)}
            </Badge>
            {canModify(announcement) && (
              <>
                <button
                  onClick={() => { setEditing(announcement); setFormOpen(true); }}
                  className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => { if (confirm("이 공지를 삭제하시겠습니까?")) deleteMutation.mutate(announcement.id); }}
                  className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
        <CardDescription className="text-xs text-slate-500">
          {announcement.createdBy.name} · {formatDate(announcement.createdAt)}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-4">
        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
          {announcement.content}
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Bell className="h-6 w-6 text-indigo-600" />
            <h1 className="text-2xl font-bold text-slate-900">공지사항</h1>
          </div>
          <p className="text-sm text-slate-500">가족에게 전달할 공지와 중요 안내를 확인합니다.</p>
        </div>
        {canWrite && (
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" />
            공지 작성
          </Button>
        )}
      </div>

      {/* 빈 상태 */}
      {announcements.length === 0 && (
        <Card className="border border-slate-200">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="rounded-full bg-slate-100 p-5 inline-flex mb-3">
              <Bell className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-base font-medium text-slate-600">아직 공지사항이 없습니다.</p>
            {canWrite && (
              <p className="text-xs text-slate-400 mt-1">공지 작성 버튼으로 등록해보세요.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 핀 고정 공지 */}
      {pinnedList.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
            <Pin className="h-3.5 w-3.5 text-indigo-500" />
            고정 공지
          </h2>
          {pinnedList.map((a) => renderCard(a, true))}
        </div>
      )}

      {pinnedList.length > 0 && normalList.length > 0 && <Separator />}

      {/* 일반 공지 */}
      {normalList.length > 0 && (
        <div className="space-y-3">
          {pinnedList.length > 0 && (
            <h2 className="text-sm font-semibold text-slate-700">전체 공지</h2>
          )}
          {normalList.map((a) => renderCard(a, false))}
        </div>
      )}

      {/* 공지 작성/수정 폼 다이얼로그 */}
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
