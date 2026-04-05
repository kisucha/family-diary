"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format, addDays, subDays, parseISO, isToday } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarDays, Eye, Edit3, Check, BookOpen } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmotionCheckinSection } from "./EmotionCheckinSection";

// ============================================================================
// 타입
// ============================================================================

type MoodType = "VERY_SAD" | "SAD" | "NEUTRAL" | "HAPPY" | "VERY_HAPPY";

interface SerializedNote {
  id: string;
  userId: string;
  noteDate: string;
  content: string | null;
  mood: MoodType | null;
  isPublished: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface SerializedEmotion {
  id: string;
  userId: string;
  checkinDate: string;
  primaryEmotion: string;
  emotionScore: number;
  physicalCondition: string | null;
  sleepQuality: number | null;
  sleepHours: number | null;
  exerciseMinutes: number | null;
  notes: string | null;
  isPublished: boolean;
}

interface NoteEditorClientProps {
  initialDate: string;
  initialNote: SerializedNote | null;
  initialCheckin: SerializedEmotion | null;
}

// ============================================================================
// 상수
// ============================================================================

const MOOD_CONFIG: Record<MoodType, { emoji: string; label: string }> = {
  VERY_SAD: { emoji: "😢", label: "매우 우울" },
  SAD: { emoji: "😟", label: "우울" },
  NEUTRAL: { emoji: "😐", label: "보통" },
  HAPPY: { emoji: "😊", label: "좋음" },
  VERY_HAPPY: { emoji: "😄", label: "매우 좋음" },
};

const MOOD_ORDER: MoodType[] = ["VERY_SAD", "SAD", "NEUTRAL", "HAPPY", "VERY_HAPPY"];

// ============================================================================
// 일기 목록 다이얼로그
// ============================================================================

interface NoteListItem {
  noteDate: string;
  mood: MoodType | null;
  preview: string;
}

function NoteListDialog({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (date: string) => void;
}) {
  const { data, isLoading } = useQuery<{ data: NoteListItem[] }>({
    queryKey: ["notesList"],
    queryFn: async () => {
      const res = await fetch("/api/notes/list");
      if (!res.ok) throw new Error();
      return res.json();
    },
    enabled: open,
    staleTime: 1000 * 30,
  });

  const notes = data?.data ?? [];

  // 월별 그룹화
  const grouped: Record<string, NoteListItem[]> = {};
  notes.forEach((n) => {
    const month = n.noteDate.slice(0, 7); // "YYYY-MM"
    if (!grouped[month]) grouped[month] = [];
    grouped[month].push(n);
  });

  const formatMonth = (ym: string) => {
    const [y, m] = ym.split("-");
    return `${y}년 ${parseInt(m)}월`;
  };

  const formatDay = (dateStr: string) => {
    const d = parseISO(dateStr);
    return format(d, "d일 (EEE)", { locale: ko });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            일기 목록
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {isLoading && (
            <p className="text-sm text-muted-foreground text-center py-8">불러오는 중...</p>
          )}
          {!isLoading && notes.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">작성된 일기가 없습니다.</p>
          )}
          {Object.keys(grouped).sort((a, b) => b.localeCompare(a)).map((month) => (
            <div key={month}>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5 sticky top-0 bg-background py-1">
                {formatMonth(month)}
              </p>
              <div className="space-y-1">
                {grouped[month].map((n) => (
                  <button
                    key={n.noteDate}
                    onClick={() => { onSelect(n.noteDate); onClose(); }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent text-left transition-colors"
                  >
                    <span className="text-lg leading-none flex-shrink-0">
                      {n.mood ? MOOD_CONFIG[n.mood].emoji : "📝"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{formatDay(n.noteDate)}</p>
                      {n.preview && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{n.preview}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// NoteEditorClient
// ============================================================================

export function NoteEditorClient({ initialDate, initialNote, initialCheckin }: NoteEditorClientProps) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [content, setContent] = useState(initialNote?.content ?? "");
  const [mood, setMood] = useState<MoodType | null>(initialNote?.mood ?? null);
  const [isPreview, setIsPreview] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "unsaved" | "saving">("saved");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(
    initialNote ? new Date() : null
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentDateRef = useRef(currentDate);
  const contentRef = useRef(content);
  const moodRef = useRef(mood);

  // ref를 항상 최신값으로 유지
  useEffect(() => { currentDateRef.current = currentDate; }, [currentDate]);
  useEffect(() => { contentRef.current = content; }, [content]);
  useEffect(() => { moodRef.current = mood; }, [mood]);

  // ----------------------------------------------------------------
  // 날짜 변경 시 노트 데이터 로드
  // ----------------------------------------------------------------
  useEffect(() => {
    const fetchNote = async () => {
      try {
        const res = await fetch(`/api/notes?date=${currentDate}`);
        if (!res.ok) return;
        const json = await res.json();
        const note: SerializedNote | null = json.data;
        setContent(note?.content ?? "");
        setMood(note?.mood ?? null);
        setSaveStatus("saved");
        setLastSavedAt(note ? new Date() : null);
      } catch {
        // 오류 무시
      }
    };

    if (currentDate !== initialDate) {
      fetchNote();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate]);

  // ----------------------------------------------------------------
  // 저장 Mutation
  // ----------------------------------------------------------------
  const saveMutation = useMutation({
    mutationFn: async ({ date, text, moodVal }: { date: string; text: string; moodVal: MoodType | null }) => {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, content: text, mood: moodVal ?? undefined }),
      });
      if (!res.ok) throw new Error("저장 실패");
      return res.json();
    },
    onMutate: () => {
      setSaveStatus("saving");
    },
    onSuccess: () => {
      setSaveStatus("saved");
      setLastSavedAt(new Date());
    },
    onError: () => {
      setSaveStatus("unsaved");
      toast.error("저장에 실패했습니다");
    },
  });

  // ----------------------------------------------------------------
  // 2초 debounce 자동저장
  // ----------------------------------------------------------------
  const scheduleAutosave = useCallback((text: string, moodVal: MoodType | null) => {
    setSaveStatus("unsaved");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveMutation.mutate({ date: currentDateRef.current, text, moodVal });
    }, 2000);
  }, [saveMutation]);

  const handleContentChange = (val: string) => {
    setContent(val);
    scheduleAutosave(val, moodRef.current);
  };

  const handleMoodChange = (val: MoodType) => {
    const newMood = mood === val ? null : val;
    setMood(newMood);
    scheduleAutosave(contentRef.current, newMood);
  };

  // ----------------------------------------------------------------
  // 날짜 네비게이션
  // ----------------------------------------------------------------
  const navigateDate = (direction: "prev" | "next") => {
    // 저장 중인 내용 즉시 저장
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      saveMutation.mutate({ date: currentDateRef.current, text: contentRef.current, moodVal: moodRef.current });
    }
    const current = parseISO(currentDate);
    const newDate = direction === "prev" ? subDays(current, 1) : addDays(current, 1);
    const newDateStr = format(newDate, "yyyy-MM-dd");
    setCurrentDate(newDateStr);
    router.replace(`/notes?date=${newDateStr}`, { scroll: false });
  };

  const goToToday = () => {
    const today = format(new Date(), "yyyy-MM-dd");
    setCurrentDate(today);
    router.replace("/notes", { scroll: false });
  };

  const goToDate = useCallback((dateStr: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      saveMutation.mutate({ date: currentDateRef.current, text: contentRef.current, moodVal: moodRef.current });
    }
    setCurrentDate(dateStr);
    router.replace(`/notes?date=${dateStr}`, { scroll: false });
  }, [router, saveMutation]);

  // ----------------------------------------------------------------
  // 저장 상태 표시 문자열
  // ----------------------------------------------------------------
  const saveStatusText = () => {
    if (saveStatus === "saving") return "저장 중...";
    if (saveStatus === "unsaved") return "미저장 변경사항";
    if (lastSavedAt) {
      return `저장됨 ${lastSavedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`;
    }
    return "";
  };

  const displayDate = parseISO(currentDate);
  const todayFlag = isToday(displayDate);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-xl font-bold text-foreground">나의 하루</h1>
          <p className="text-sm text-muted-foreground mt-0.5">오늘 하루를 기록하고 감정을 체크해보세요</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setListOpen(true)}>
          <BookOpen className="h-4 w-4 mr-1.5" />
          일기 목록
        </Button>
      </div>

      {/* 날짜 네비게이션 */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigateDate("prev")}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="이전 날"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>

        <div className="text-center">
          <div className="flex items-center gap-2 justify-center">
            <CalendarDays className="w-5 h-5 text-gray-500" />
            <h1 className="text-xl font-bold text-gray-800">
              {format(displayDate, "M월 d일 (EEEE)", { locale: ko })}
            </h1>
            {todayFlag && (
              <span className="text-xs bg-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 rounded-full">
                오늘
              </span>
            )}
          </div>
          {!todayFlag && (
            <button onClick={goToToday} className="text-xs text-indigo-600 hover:underline mt-0.5">
              오늘로 돌아가기
            </button>
          )}
        </div>

        <button
          onClick={() => navigateDate("next")}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="다음 날"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* 기분 선택 */}
      <div className="flex items-center gap-1 justify-center">
        {MOOD_ORDER.map((m) => (
          <button
            key={m}
            onClick={() => handleMoodChange(m)}
            title={MOOD_CONFIG[m].label}
            className={`text-2xl p-1.5 rounded-lg transition-all ${
              mood === m
                ? "bg-indigo-100 scale-110 shadow-sm"
                : "hover:bg-slate-100 opacity-50 hover:opacity-100"
            }`}
          >
            {MOOD_CONFIG[m].emoji}
          </button>
        ))}
        {mood && (
          <span className="text-xs text-slate-500 ml-2">{MOOD_CONFIG[mood].label}</span>
        )}
      </div>

      {/* 편집/미리보기 탭 전환 */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 border border-slate-200 rounded-lg p-0.5 w-fit">
          <Button
            variant={!isPreview ? "default" : "ghost"}
            size="sm"
            onClick={() => setIsPreview(false)}
            className="h-7 px-3"
          >
            <Edit3 className="h-3.5 w-3.5 mr-1" />
            편집
          </Button>
          <Button
            variant={isPreview ? "default" : "ghost"}
            size="sm"
            onClick={() => setIsPreview(true)}
            className="h-7 px-3"
          >
            <Eye className="h-3.5 w-3.5 mr-1" />
            미리보기
          </Button>
        </div>
        <span className={`text-xs ${
          saveStatus === "saving" ? "text-amber-500" :
          saveStatus === "unsaved" ? "text-rose-500" :
          "text-emerald-600"
        } flex items-center gap-1`}>
          {saveStatus === "saved" && lastSavedAt && <Check className="h-3 w-3" />}
          {saveStatusText()}
        </span>
      </div>

      {/* 에디터 / 미리보기 */}
      {isPreview ? (
        <div className="min-h-[400px] rounded-lg border border-slate-200 bg-white p-4">
          {content ? (
            <div className="prose prose-sm max-w-none prose-slate">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-slate-400 text-sm">내용이 없습니다.</p>
          )}
        </div>
      ) : (
        <Textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder={"오늘 하루를 기록해보세요. 마크다운을 지원합니다.\n\n예:\n## 오늘 배운 것\n- ...\n\n## 감사한 것\n- ..."}
          rows={18}
          className="font-mono text-sm resize-none border-slate-200 leading-relaxed"
          maxLength={50000}
        />
      )}

      <div className="flex justify-between text-xs text-slate-400">
        <span>마크다운 지원 (## 제목, **굵게**, - 목록 등)</span>
        <span>{content.length.toLocaleString()}/50,000</span>
      </div>

      {/* 감정 체크인 섹션 */}
      <EmotionCheckinSection date={currentDate} initialCheckin={initialCheckin} />

      {/* 일기 목록 다이얼로그 */}
      <NoteListDialog
        open={listOpen}
        onClose={() => setListOpen(false)}
        onSelect={goToDate}
      />
    </div>
  );
}
