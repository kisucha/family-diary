"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import { Lightbulb, Plus, X, Pin, PinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// ============================================================================
// 타입 정의
// ============================================================================

type SerializedIdea = {
  id: string;
  title: string;
  content: string | null;
  category: string | null;
  colorTag: string | null;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
};

// ============================================================================
// 카드 컬러 팔레트 (IdeasClient와 동일)
// ============================================================================

const COLOR_OPTIONS = [
  { value: "", label: "기본" },
  { value: "rose", label: "빨강" },
  { value: "amber", label: "노랑" },
  { value: "emerald", label: "초록" },
  { value: "sky", label: "파랑" },
  { value: "violet", label: "보라" },
];

// ============================================================================
// API 함수
// ============================================================================

async function fetchIdeas(): Promise<SerializedIdea[]> {
  const res = await fetch("/api/ideas");
  if (!res.ok) throw new Error("아이디어 로드 실패");
  const json = await res.json();
  return json.data;
}

async function createIdea(title: string): Promise<SerializedIdea> {
  const res = await fetch("/api/ideas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error("아이디어 추가 실패");
  const json = await res.json();
  return json.data;
}

async function updateIdea({ id, ...data }: Partial<SerializedIdea> & { id: string }): Promise<SerializedIdea> {
  const res = await fetch(`/api/ideas/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("아이디어 수정 실패");
  return (await res.json()).data;
}

// ============================================================================
// IdeaEditForm — IdeasClient의 IdeaForm과 동일한 레이아웃
// ============================================================================

interface IdeaEditFormProps {
  initial: SerializedIdea;
  onSave: (data: { title: string; content: string; category: string; colorTag: string; isPinned: boolean }) => void;
  onCancel: () => void;
  isSaving: boolean;
}

function IdeaEditForm({ initial, onSave, onCancel, isSaving }: IdeaEditFormProps) {
  const [title, setTitle] = useState(initial.title);
  const [content, setContent] = useState(initial.content ?? "");
  const [category, setCategory] = useState(initial.category ?? "");
  const [colorTag, setColorTag] = useState(initial.colorTag ?? "");
  const [isPinned, setIsPinned] = useState(initial.isPinned);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({ title: title.trim(), content, category: category.trim(), colorTag, isPinned });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">제목 *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="아이디어나 메모 제목"
          required
          className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">내용</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="내용을 자유롭게 작성하세요..."
          className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y min-h-[400px]"
        />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-foreground mb-1">카테고리</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="예: 업무, 개인, 독서..."
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">색상</label>
          <div className="flex gap-1.5 pt-1">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColorTag(c.value)}
                className={`w-6 h-6 rounded-full border-2 transition-all ${
                  c.value === "" ? "bg-card" :
                  c.value === "rose" ? "bg-rose-200" :
                  c.value === "amber" ? "bg-amber-200" :
                  c.value === "emerald" ? "bg-emerald-200" :
                  c.value === "sky" ? "bg-sky-200" :
                  "bg-violet-200"
                } ${colorTag === c.value ? "border-foreground scale-110" : "border-border"}`}
                title={c.label}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsPinned((p) => !p)}
          className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors ${
            isPinned
              ? "bg-amber-100 dark:bg-amber-900/50 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300"
              : "border-border text-muted-foreground hover:bg-accent"
          }`}
        >
          {isPinned ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5" />}
          {isPinned ? "고정됨" : "고정 안 함"}
        </button>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>취소</Button>
        <Button type="submit" size="sm" disabled={isSaving || !title.trim()}>
          {isSaving ? "저장 중..." : "저장"}
        </Button>
      </div>
    </form>
  );
}

// ============================================================================
// Component
// ============================================================================

export function QuickIdeaWidget() {
  const [title, setTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingIdea, setEditingIdea] = useState<SerializedIdea | null>(null);
  const queryClient = useQueryClient();

  const { data: ideas = [], isLoading } = useQuery<SerializedIdea[]>({
    queryKey: ["ideas"],
    queryFn: fetchIdeas,
    staleTime: 1000 * 60,
  });

  const recentIdeas = ideas.slice(0, 3);

  const createMutation = useMutation({
    mutationFn: createIdea,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ideas"] });
      setTitle("");
      setIsAdding(false);
      toast.success("아이디어가 추가되었습니다");
    },
    onError: () => toast.error("아이디어 추가에 실패했습니다"),
  });

  const updateMutation = useMutation({
    mutationFn: updateIdea,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ideas"] });
      setEditingIdea(null);
      toast.success("아이디어가 수정되었습니다");
    },
    onError: () => toast.error("아이디어 수정에 실패했습니다"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || createMutation.isPending) return;
    createMutation.mutate(title.trim());
  };

  const handleSave = (data: { title: string; content: string; category: string; colorTag: string; isPinned: boolean }) => {
    if (!editingIdea) return;
    updateMutation.mutate({ id: editingIdea.id, ...data });
  };

  return (
    <div className="mt-6 pt-4 border-t border-border">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          오늘 떠오른 아이디어
        </h3>
        <Link href="/ideas" className="text-xs text-primary hover:underline flex items-center gap-0.5">
          전체 보기 →
        </Link>
      </div>

      {/* 빠른 입력 영역 */}
      {!isAdding ? (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full text-left text-xs text-muted-foreground hover:text-foreground border border-dashed border-border rounded-lg px-3 py-2 transition-colors"
        >
          <Plus className="w-3 h-3 inline mr-1" />
          새 아이디어 추가...
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2 mb-3">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="아이디어를 입력하세요..."
            autoFocus
            className="text-sm h-8"
          />
          <Button type="submit" size="sm" disabled={createMutation.isPending || !title.trim()} className="h-8">
            추가
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => { setIsAdding(false); setTitle(""); }}
            className="h-8 px-2"
          >
            <X className="w-3 h-3" />
          </Button>
        </form>
      )}

      {/* 최근 아이디어 미리보기 — 클릭 시 편집 다이얼로그 */}
      {isLoading ? (
        <div className="text-xs text-muted-foreground py-2">로딩 중...</div>
      ) : recentIdeas.length > 0 ? (
        <div className="space-y-1.5 mt-2">
          {recentIdeas.map((idea) => (
            <button
              key={idea.id}
              onClick={() => setEditingIdea(idea)}
              className="w-full text-left flex items-start gap-2 p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
            >
              <Lightbulb className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{idea.title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(idea.createdAt).toLocaleDateString("ko-KR", {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground py-2 text-center">아직 아이디어가 없습니다</p>
      )}

      {/* 편집 다이얼로그 */}
      <Dialog open={!!editingIdea} onOpenChange={(open) => { if (!open) setEditingIdea(null); }}>
        <DialogContent className="max-w-2xl w-full">
          <DialogHeader>
            <DialogTitle>아이디어 편집</DialogTitle>
          </DialogHeader>
          {editingIdea && (
            <IdeaEditForm
              initial={editingIdea}
              onSave={handleSave}
              onCancel={() => setEditingIdea(null)}
              isSaving={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
