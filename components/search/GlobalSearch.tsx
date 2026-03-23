"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Loader2, FileText, Bell, BookOpen, Target, Users, Calendar, Lightbulb } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

// ─── 타입 ─────────────────────────────────────────────────────────────────────

interface TaskResult {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  isCompleted: boolean;
  date: string;
  link: string;
}

interface AnnouncementResult {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  priority: string;
  createdByName: string | null;
  createdAt: string;
  link: string;
}

interface NoteResult {
  id: string;
  content: string;
  date: string;
  link: string;
}

interface GoalResult {
  id: string;
  title: string;
  description: string | null;
  goalType: string;
  status: string;
  progressPercentage: number;
  link: string;
}

interface FamilyGoalResult extends GoalResult {
  createdByName: string | null;
}

interface EventResult {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  isAllDay: boolean;
  location: string | null;
  link: string;
}

interface IdeaResult {
  id: string;
  title: string;
  content: string;
  category: string | null;
  isPinned: boolean;
  colorTag: string | null;
  link: string;
}

interface SearchResults {
  tasks: TaskResult[];
  announcements: AnnouncementResult[];
  notes: NoteResult[];
  goals: GoalResult[];
  familyGoals: FamilyGoalResult[];
  events: EventResult[];
  ideas: IdeaResult[];
}

interface SearchCounts {
  tasks: number;
  announcements: number;
  notes: number;
  goals: number;
  familyGoals: number;
  events: number;
  ideas: number;
  total: number;
}

interface SearchResponse {
  query: string;
  results: SearchResults;
  counts: SearchCounts;
}

// ─── 유틸 ──────────────────────────────────────────────────────────────────────

const GOAL_TYPE_LABEL: Record<string, string> = {
  WEEKLY: "주간",
  MONTHLY: "월간",
  YEARLY: "연간",
};

const STATUS_LABEL: Record<string, string> = {
  NOT_STARTED: "미시작",
  IN_PROGRESS: "진행중",
  COMPLETED: "완료",
  ABANDONED: "포기",
};

const PRIORITY_LABEL: Record<string, string> = {
  A: "A",
  B: "B",
  C: "C",
};

const PRIORITY_COLOR: Record<string, string> = {
  A: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  B: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  C: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
};

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  return dateStr.slice(0, 10);
}

function formatDateTime(isoStr: string): string {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ─── 섹션 헤더 ────────────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, label, count }: { icon: React.ElementType; label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 border-b border-border">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4 ml-auto">{count}건</Badge>
    </div>
  );
}

// ─── 결과 아이템 래퍼 ─────────────────────────────────────────────────────────

function ResultItem({ link, onClick, children }: { link: string; onClick: (link: string) => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => onClick(link)}
      className="w-full text-left px-3 py-2.5 hover:bg-muted/60 transition-colors border-b border-border/50 last:border-0 block"
    >
      {children}
    </button>
  );
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SearchResponse | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 검색 실행
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setData(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // 검색 오류 무시
    } finally {
      setLoading(false);
    }
  }, []);

  // 입력 debounce 300ms
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  };

  // 검색창 열기
  const handleOpen = () => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // 닫기
  const handleClose = () => {
    setOpen(false);
    setQuery("");
    setData(null);
  };

  // 결과 클릭 → 해당 페이지 이동
  const handleNavigate = (link: string) => {
    router.push(link);
    handleClose();
  };

  // 외부 클릭 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // ESC 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const hasResults = data && data.counts.total > 0;

  return (
    <div ref={containerRef} className="relative">
      {/* 검색 아이콘 버튼 (닫혔을 때) */}
      {!open && (
        <button
          type="button"
          onClick={handleOpen}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="검색"
        >
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline text-xs">검색</span>
        </button>
      )}

      {/* 검색 입력창 (열렸을 때) */}
      {open && (
        <div className="flex items-center gap-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              ref={inputRef}
              value={query}
              onChange={handleChange}
              placeholder="전체 검색..."
              className="h-8 w-48 sm:w-64 pl-8 pr-8 text-sm"
            />
            {(loading) && (
              <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground animate-spin" />
            )}
            {(!loading && query) && (
              <button
                type="button"
                onClick={() => { setQuery(""); setData(null); inputRef.current?.focus(); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            취소
          </button>
        </div>
      )}

      {/* 결과 드롭다운 */}
      {open && (data || loading) && (
        <div className="absolute right-0 top-full mt-1 w-80 sm:w-96 bg-background border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          {/* 요약 헤더 */}
          {data && (
            <div className="px-3 py-2 border-b border-border bg-muted/30">
              <span className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">&ldquo;{data.query}&rdquo;</span> 검색 결과{" "}
                <span className="font-semibold text-primary">{data.counts.total}건</span>
                {data.counts.total > 0 && (
                  <span className="ml-1">
                    (
                    {[
                      data.counts.tasks > 0 && `태스크 ${data.counts.tasks}건`,
                      data.counts.announcements > 0 && `공지 ${data.counts.announcements}건`,
                      data.counts.notes > 0 && `노트 ${data.counts.notes}건`,
                      data.counts.goals > 0 && `목표 ${data.counts.goals}건`,
                      data.counts.familyGoals > 0 && `가족목표 ${data.counts.familyGoals}건`,
                      data.counts.events > 0 && `일정 ${data.counts.events}건`,
                      data.counts.ideas > 0 && `아이디어 ${data.counts.ideas}건`,
                    ].filter(Boolean).join(", ")}
                    )
                  </span>
                )}
              </span>
            </div>
          )}

          {/* 결과 목록 */}
          <ScrollArea className="max-h-[420px]">
            {loading && !data && (
              <div className="flex items-center justify-center py-8 text-muted-foreground text-sm gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                검색 중...
              </div>
            )}

            {!loading && data && !hasResults && (
              <div className="py-8 text-center text-muted-foreground text-sm">
                검색 결과가 없습니다
              </div>
            )}

            {hasResults && (
              <div>
                {/* 태스크 */}
                {data.results.tasks.length > 0 && (
                  <div>
                    <SectionHeader icon={FileText} label="태스크" count={data.counts.tasks} />
                    {data.results.tasks.map((item) => (
                      <ResultItem key={item.id} link={item.link} onClick={handleNavigate}>
                        <div className="flex items-start gap-2">
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 ${PRIORITY_COLOR[item.priority] ?? ""}`}>
                            {PRIORITY_LABEL[item.priority] ?? item.priority}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${item.isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>
                              {item.title}
                            </p>
                            {item.description && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">{item.description}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-0.5">{formatDate(item.date)}</p>
                          </div>
                          {item.isCompleted && (
                            <Badge variant="secondary" className="text-xs flex-shrink-0">완료</Badge>
                          )}
                        </div>
                      </ResultItem>
                    ))}
                  </div>
                )}

                {/* 공지사항 */}
                {data.results.announcements.length > 0 && (
                  <div>
                    <SectionHeader icon={Bell} label="공지사항" count={data.counts.announcements} />
                    {data.results.announcements.map((item) => (
                      <ResultItem key={item.id} link={item.link} onClick={handleNavigate}>
                        <div className="flex items-start gap-2">
                          {item.isPinned && <span className="text-xs text-amber-500 flex-shrink-0 mt-0.5">📌</span>}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate text-foreground">{item.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{item.content}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {item.createdByName && <span>{item.createdByName} · </span>}
                              {formatDate(item.createdAt)}
                            </p>
                          </div>
                        </div>
                      </ResultItem>
                    ))}
                  </div>
                )}

                {/* 노트 */}
                {data.results.notes.length > 0 && (
                  <div>
                    <SectionHeader icon={BookOpen} label="나의 하루 (노트)" count={data.counts.notes} />
                    {data.results.notes.map((item) => (
                      <ResultItem key={item.id} link={item.link} onClick={handleNavigate}>
                        <p className="text-xs text-primary font-medium mb-0.5">{formatDate(item.date)}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">{item.content}</p>
                      </ResultItem>
                    ))}
                  </div>
                )}

                {/* 개인 목표 */}
                {data.results.goals.length > 0 && (
                  <div>
                    <SectionHeader icon={Target} label="개인 목표" count={data.counts.goals} />
                    {data.results.goals.map((item) => (
                      <ResultItem key={item.id} link={item.link} onClick={handleNavigate}>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            {GOAL_TYPE_LABEL[item.goalType] ?? item.goalType}
                          </Badge>
                          <p className="text-sm font-medium text-foreground truncate flex-1">{item.title}</p>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {STATUS_LABEL[item.status] ?? item.status}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-xs text-muted-foreground truncate mt-1">{item.description}</p>
                        )}
                      </ResultItem>
                    ))}
                  </div>
                )}

                {/* 가족 목표 */}
                {data.results.familyGoals.length > 0 && (
                  <div>
                    <SectionHeader icon={Users} label="가족 목표" count={data.counts.familyGoals} />
                    {data.results.familyGoals.map((item) => (
                      <ResultItem key={item.id} link={item.link} onClick={handleNavigate}>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            {GOAL_TYPE_LABEL[item.goalType] ?? item.goalType}
                          </Badge>
                          <p className="text-sm font-medium text-foreground truncate flex-1">{item.title}</p>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {STATUS_LABEL[item.status] ?? item.status}
                          </span>
                        </div>
                        {item.createdByName && (
                          <p className="text-xs text-muted-foreground mt-0.5">{item.createdByName}</p>
                        )}
                      </ResultItem>
                    ))}
                  </div>
                )}

                {/* 가족 일정 */}
                {data.results.events.length > 0 && (
                  <div>
                    <SectionHeader icon={Calendar} label="가족 일정" count={data.counts.events} />
                    {data.results.events.map((item) => (
                      <ResultItem key={item.id} link={item.link} onClick={handleNavigate}>
                        <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-muted-foreground">{formatDateTime(item.startAt)}</p>
                          {item.isAllDay && <Badge variant="secondary" className="text-xs">종일</Badge>}
                          {item.location && <p className="text-xs text-muted-foreground truncate">📍 {item.location}</p>}
                        </div>
                        {item.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{item.description}</p>
                        )}
                      </ResultItem>
                    ))}
                  </div>
                )}

                {/* 아이디어 */}
                {data.results.ideas.length > 0 && (
                  <div>
                    <SectionHeader icon={Lightbulb} label="아이디어" count={data.counts.ideas} />
                    {data.results.ideas.map((item) => (
                      <ResultItem key={item.id} link={item.link} onClick={handleNavigate}>
                        <div className="flex items-center gap-2">
                          {item.isPinned && <span className="text-xs flex-shrink-0">📌</span>}
                          <p className="text-sm font-medium text-foreground truncate flex-1">{item.title}</p>
                          {item.category && (
                            <Badge variant="outline" className="text-xs flex-shrink-0">{item.category}</Badge>
                          )}
                        </div>
                        {item.content && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{item.content}</p>
                        )}
                      </ResultItem>
                    ))}
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
