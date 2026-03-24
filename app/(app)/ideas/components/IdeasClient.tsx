"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Plus, Pin, PinOff, Trash2, Pencil, Search, X, Lightbulb, Tag,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { SerializedIdea } from "../page";

// ============================================================================
// 카드 컬러 팔레트
// ============================================================================

const COLOR_OPTIONS = [
  { value: "", label: "기본", bg: "bg-card", border: "border-border" },
  { value: "rose", label: "빨강", bg: "bg-rose-50 dark:bg-rose-950/40", border: "border-rose-300 dark:border-rose-700" },
  { value: "amber", label: "노랑", bg: "bg-amber-50 dark:bg-amber-950/40", border: "border-amber-300 dark:border-amber-700" },
  { value: "emerald", label: "초록", bg: "bg-emerald-50 dark:bg-emerald-950/40", border: "border-emerald-300 dark:border-emerald-700" },
  { value: "sky", label: "파랑", bg: "bg-sky-50 dark:bg-sky-950/40", border: "border-sky-300 dark:border-sky-700" },
  { value: "violet", label: "보라", bg: "bg-violet-50 dark:bg-violet-950/40", border: "border-violet-300 dark:border-violet-700" },
];

function getCardStyle(colorTag: string | null) {
  const found = COLOR_OPTIONS.find((c) => c.value === (colorTag ?? ""));
  return found ?? COLOR_OPTIONS[0];
}

// ============================================================================
// API 함수
// ============================================================================

async function fetchIdeas(search: string, category: string): Promise<SerializedIdea[]> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (category) params.set("category", category);
  const res = await fetch(`/api/ideas?${params.toString()}`);
  if (!res.ok) throw new Error("메모를 불러오는데 실패했습니다");
  return (await res.json()).data;
}

async function createIdea(payload: Partial<SerializedIdea> & { title: string }): Promise<SerializedIdea> {
  const res = await fetch("/api/ideas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("메모 생성에 실패했습니다");
  return (await res.json()).data;
}

async function updateIdea({ id, ...data }: Partial<SerializedIdea> & { id: string }): Promise<SerializedIdea> {
  const res = await fetch(`/api/ideas/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("메모 수정에 실패했습니다");
  return (await res.json()).data;
}

async function deleteIdea(id: string): Promise<void> {
  const res = await fetch(`/api/ideas/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("메모 삭제에 실패했습니다");
}

// ============================================================================
// IdeaForm — 생성/수정 다이얼로그 내부 폼
// ============================================================================

interface IdeaFormProps {
  initial?: SerializedIdea;
  onSave: (data: { title: string; content: string; category: string; colorTag: string; isPinned: boolean }) => void;
  onCancel: () => void;
  isSaving: boolean;
}

function IdeaForm({ initial, onSave, onCancel, isSaving }: IdeaFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [colorTag, setColorTag] = useState(initial?.colorTag ?? "");
  const [isPinned, setIsPinned] = useState(initial?.isPinned ?? false);

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
                className={`w-6 h-6 rounded-full border-2 transition-all ${c.bg} ${
                  colorTag === c.value ? "border-foreground scale-110" : "border-border"
                }`}
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
// IdeaCard — 개별 카드
// ============================================================================

interface IdeaCardProps {
  idea: SerializedIdea;
  onEdit: (idea: SerializedIdea) => void;
  onDelete: (id: string) => void;
  onTogglePin: (idea: SerializedIdea) => void;
}

function IdeaCard({ idea, onEdit, onDelete, onTogglePin }: IdeaCardProps) {
  const style = getCardStyle(idea.colorTag);

  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-2 transition-shadow hover:shadow-md ${style.bg} ${style.border}`}>
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          {idea.isPinned && <Pin className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />}
          <h3 className="font-semibold text-foreground text-sm leading-snug line-clamp-2">
            {idea.title}
          </h3>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={() => onTogglePin(idea)}
            className="p-1 rounded text-muted-foreground/50 hover:text-amber-500 transition-colors"
            title={idea.isPinned ? "고정 해제" : "고정"}
          >
            {idea.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => onEdit(idea)}
            className="p-1 rounded text-muted-foreground/50 hover:text-primary transition-colors"
            title="편집"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              if (confirm("이 메모를 삭제하시겠습니까?")) onDelete(idea.id);
            }}
            className="p-1 rounded text-muted-foreground/50 hover:text-red-500 transition-colors"
            title="삭제"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 내용 미리보기 */}
      {idea.content && (
        <p className="text-xs text-muted-foreground line-clamp-4 leading-relaxed whitespace-pre-wrap">
          {idea.content}
        </p>
      )}

      {/* 카테고리 + 날짜 */}
      <div className="flex items-center justify-between mt-auto pt-1">
        {idea.category ? (
          <span className="flex items-center gap-1 text-xs bg-background/70 text-muted-foreground px-2 py-0.5 rounded-full border border-border/50">
            <Tag className="w-2.5 h-2.5" />
            {idea.category}
          </span>
        ) : (
          <span />
        )}
        <span className="text-xs text-muted-foreground/60">
          {format(parseISO(idea.createdAt), "M.d", { locale: ko })}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// IdeasClient — 메인 컴포넌트
// ============================================================================

interface IdeasClientProps {
  initialIdeas: SerializedIdea[];
}

export function IdeasClient({ initialIdeas }: IdeasClientProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<SerializedIdea | null>(null);

  // ----------------------------------------------------------------
  // Query
  // ----------------------------------------------------------------
  const { data: ideas = initialIdeas } = useQuery<SerializedIdea[]>({
    queryKey: ["ideas", activeSearch, categoryFilter],
    queryFn: () => fetchIdeas(activeSearch, categoryFilter),
    initialData: activeSearch === "" && categoryFilter === "" ? initialIdeas : undefined,
    staleTime: 1000 * 30,
  });

  // ----------------------------------------------------------------
  // 카테고리 목록 (현재 데이터 기준)
  // ----------------------------------------------------------------
  const categories = Array.from(
    new Set(ideas.map((i) => i.category).filter((c): c is string => !!c))
  ).sort();

  // ----------------------------------------------------------------
  // Mutations
  // ----------------------------------------------------------------
  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["ideas"] });
  }, [queryClient]);

  const createMutation = useMutation({
    mutationFn: createIdea,
    onSuccess: () => { invalidate(); setIsDialogOpen(false); toast.success("메모가 추가되었습니다"); },
    onError: () => toast.error("메모 추가에 실패했습니다"),
  });

  const updateMutation = useMutation({
    mutationFn: updateIdea,
    onSuccess: () => { invalidate(); setIsDialogOpen(false); setEditingIdea(null); toast.success("메모가 수정되었습니다"); },
    onError: () => toast.error("메모 수정에 실패했습니다"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteIdea,
    onSuccess: () => { invalidate(); toast.success("메모가 삭제되었습니다"); },
    onError: () => toast.error("메모 삭제에 실패했습니다"),
  });

  const togglePinMutation = useMutation({
    mutationFn: (idea: SerializedIdea) => updateIdea({ id: idea.id, isPinned: !idea.isPinned }),
    onSuccess: () => invalidate(),
    onError: () => toast.error("고정 변경에 실패했습니다"),
  });

  // ----------------------------------------------------------------
  // 핸들러
  // ----------------------------------------------------------------
  const handleOpenCreate = () => { setEditingIdea(null); setIsDialogOpen(true); };
  const handleOpenEdit = (idea: SerializedIdea) => { setEditingIdea(idea); setIsDialogOpen(true); };

  const handleSave = (data: { title: string; content: string; category: string; colorTag: string; isPinned: boolean }) => {
    if (editingIdea) {
      updateMutation.mutate({ id: editingIdea.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(search);
  };

  const clearSearch = () => { setSearch(""); setActiveSearch(""); };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------
  const pinnedIdeas = ideas.filter((i) => i.isPinned);
  const unpinnedIdeas = ideas.filter((i) => !i.isPinned);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            <h1 className="text-xl font-bold text-foreground">아이디어 노트</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            날짜 상관없이 아이디어와 메모를 자유롭게 기록하세요
          </p>
        </div>
        <Button onClick={handleOpenCreate} size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" />
          새 메모
        </Button>
      </div>

      {/* 검색 + 카테고리 필터 */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="제목이나 내용으로 검색..."
              className="w-full pl-9 pr-8 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {search && (
              <button type="button" onClick={clearSearch} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <Button type="submit" variant="outline" size="sm">검색</Button>
        </form>

        {/* 카테고리 칩 */}
        {categories.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setCategoryFilter("")}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                categoryFilter === ""
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              전체
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat === categoryFilter ? "" : cat)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  categoryFilter === cat
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 메모 없을 때 */}
      {ideas.length === 0 && (
        <div className="text-center py-16">
          <Lightbulb className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">
            {activeSearch || categoryFilter ? "검색 결과가 없습니다" : "아직 메모가 없습니다. 첫 번째 아이디어를 기록해보세요!"}
          </p>
          {!activeSearch && !categoryFilter && (
            <Button onClick={handleOpenCreate} size="sm" variant="outline" className="mt-4 gap-1.5">
              <Plus className="w-4 h-4" />새 메모 작성
            </Button>
          )}
        </div>
      )}

      {/* 고정된 메모 */}
      {pinnedIdeas.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-1.5 mb-3">
            <Pin className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">고정됨</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pinnedIdeas.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                onEdit={handleOpenEdit}
                onDelete={(id) => deleteMutation.mutate(id)}
                onTogglePin={(i) => togglePinMutation.mutate(i)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 일반 메모 */}
      {unpinnedIdeas.length > 0 && (
        <div>
          {pinnedIdeas.length > 0 && (
            <div className="flex items-center gap-1.5 mb-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">메모</span>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {unpinnedIdeas.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                onEdit={handleOpenEdit}
                onDelete={(id) => deleteMutation.mutate(id)}
                onTogglePin={(i) => togglePinMutation.mutate(i)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 생성/수정 다이얼로그 */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) { setIsDialogOpen(false); setEditingIdea(null); } }}>
        <DialogContent className="max-w-2xl w-full">
          <DialogHeader>
            <DialogTitle>{editingIdea ? "메모 편집" : "새 메모 작성"}</DialogTitle>
          </DialogHeader>
          <IdeaForm
            initial={editingIdea ?? undefined}
            onSave={handleSave}
            onCancel={() => { setIsDialogOpen(false); setEditingIdea(null); }}
            isSaving={isSaving}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
