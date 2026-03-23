"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import { Lightbulb, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

// ============================================================================
// Component
// ============================================================================

export function QuickIdeaWidget() {
  const [title, setTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const queryClient = useQueryClient();

  const { data: ideas = [], isLoading } = useQuery<SerializedIdea[]>({
    queryKey: ["ideas"],
    queryFn: fetchIdeas,
    staleTime: 1000 * 60,
  });

  const recentIdeas = ideas.slice(0, 3);

  const mutation = useMutation({
    mutationFn: createIdea,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ideas"] });
      setTitle("");
      setIsAdding(false);
      toast.success("아이디어가 추가되었습니다");
    },
    onError: () => {
      toast.error("아이디어 추가에 실패했습니다");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || mutation.isPending) return;
    mutation.mutate(title.trim());
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
          <Button type="submit" size="sm" disabled={mutation.isPending || !title.trim()} className="h-8">
            추가
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsAdding(false);
              setTitle("");
            }}
            className="h-8 px-2"
          >
            <X className="w-3 h-3" />
          </Button>
        </form>
      )}

      {/* 최근 아이디어 미리보기 */}
      {isLoading ? (
        <div className="text-xs text-muted-foreground py-2">로딩 중...</div>
      ) : recentIdeas.length > 0 ? (
        <div className="space-y-1.5 mt-2">
          {recentIdeas.map((idea) => (
            <div
              key={idea.id}
              className="flex items-start gap-2 p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
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
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground py-2 text-center">아직 아이디어가 없습니다</p>
      )}
    </div>
  );
}
