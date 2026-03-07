"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  getDay,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
  addMonths,
  subMonths,
} from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, X, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import type { SerializedFamilyEvent } from "../page";
import { EventDialog } from "./EventDialog";
import { CalendarRealtime } from "./CalendarRealtime";

// ============================================================================
// 상수 및 헬퍼
// ============================================================================

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];

// date-fns getDay(): 0=일, 1=월 ... 6=토 → 월요일 시작 그리드로 변환
function getMondayBasedDayIndex(date: Date): number {
  const day = getDay(date); // 0(일) ~ 6(토)
  return day === 0 ? 6 : day - 1; // 일요일 → 6, 월요일 → 0
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  STANDARD: "일반",
  BIRTHDAY: "생일",
  ANNIVERSARY: "기념일",
  HOLIDAY: "공휴일",
};

// colorTag가 없을 때 eventType별 기본 색상
const EVENT_TYPE_COLORS: Record<string, string> = {
  STANDARD: "bg-indigo-500",
  BIRTHDAY: "bg-pink-500",
  ANNIVERSARY: "bg-rose-500",
  HOLIDAY: "bg-emerald-500",
};

function getEventDotColor(event: SerializedFamilyEvent): string {
  if (event.colorTag) {
    // colorTag가 hex나 tailwind 클래스로 올 수 있으므로 안전하게 처리
    return "bg-gray-600";
  }
  return EVENT_TYPE_COLORS[event.eventType] ?? "bg-gray-500";
}

// ============================================================================
// API 함수
// ============================================================================

async function fetchEvents(month: string): Promise<SerializedFamilyEvent[]> {
  const res = await fetch(`/api/family/events?month=${month}`);
  if (!res.ok) throw new Error("이벤트를 불러오는데 실패했습니다");
  const json = await res.json();
  return json.data as SerializedFamilyEvent[];
}

async function deleteEvent(id: string): Promise<void> {
  const res = await fetch(`/api/family/events/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error ?? "이벤트 삭제에 실패했습니다");
  }
}

// ============================================================================
// Props
// ============================================================================

interface CalendarClientProps {
  initialMonth: string; // "YYYY-MM"
  initialEvents: SerializedFamilyEvent[];
  userId: string;
  userRole: string;
}

// ============================================================================
// Component
// ============================================================================

export function CalendarClient({
  initialMonth,
  initialEvents,
  userId,
  userRole,
}: CalendarClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [currentMonth, setCurrentMonth] = useState<string>(initialMonth);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogDefaultDate, setDialogDefaultDate] = useState<string | undefined>();

  // ----------------------------------------------------------------
  // TanStack Query: 월별 이벤트 조회
  // ----------------------------------------------------------------
  const { data: events = [] } = useQuery<SerializedFamilyEvent[]>({
    queryKey: ["family-events", currentMonth],
    queryFn: () => fetchEvents(currentMonth),
    initialData: currentMonth === initialMonth ? initialEvents : undefined,
    staleTime: 1000 * 30, // 30초
  });

  // ----------------------------------------------------------------
  // Mutation: 이벤트 삭제
  // ----------------------------------------------------------------
  const deleteMutation = useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family-events", currentMonth] });
      toast.success("이벤트가 삭제되었습니다");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ----------------------------------------------------------------
  // 월 네비게이션
  // ----------------------------------------------------------------
  const navigateMonth = useCallback(
    (direction: "prev" | "next") => {
      const base = parseISO(`${currentMonth}-01`);
      const newDate =
        direction === "prev" ? subMonths(base, 1) : addMonths(base, 1);
      const newMonth = format(newDate, "yyyy-MM");
      setCurrentMonth(newMonth);
      setSelectedDate(null);
      router.replace(`/calendar?month=${newMonth}`, { scroll: false });
    },
    [currentMonth, router]
  );

  const goToToday = useCallback(() => {
    const todayMonth = format(new Date(), "yyyy-MM");
    setCurrentMonth(todayMonth);
    setSelectedDate(new Date());
    router.replace("/calendar", { scroll: false });
  }, [router]);

  // ----------------------------------------------------------------
  // 달력 그리드 계산
  // ----------------------------------------------------------------
  const calendarDays = useMemo(() => {
    const base = parseISO(`${currentMonth}-01`);
    const monthStart = startOfMonth(base);
    const monthEnd = endOfMonth(base);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // 앞 빈 칸 (월요일 시작)
    const leadingBlanks = getMondayBasedDayIndex(monthStart);
    // 뒤 빈 칸 (7의 배수로 맞추기)
    const totalCells = Math.ceil((days.length + leadingBlanks) / 7) * 7;
    const trailingBlanks = totalCells - days.length - leadingBlanks;

    return {
      leadingBlanks,
      days,
      trailingBlanks,
    };
  }, [currentMonth]);

  // ----------------------------------------------------------------
  // 날짜별 이벤트 맵 (빠른 조회)
  // ----------------------------------------------------------------
  const eventsByDate = useMemo(() => {
    const map = new Map<string, SerializedFamilyEvent[]>();
    for (const event of events) {
      // 이벤트 기간 동안 각 날짜에 매핑
      const start = new Date(event.startAt);
      const end = new Date(event.endAt);
      const startDate = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate()
      );
      const endDate = new Date(
        end.getFullYear(),
        end.getMonth(),
        end.getDate()
      );
      let cur = new Date(startDate);
      while (cur <= endDate) {
        const key = format(cur, "yyyy-MM-dd");
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(event);
        cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1);
      }
    }
    return map;
  }, [events]);

  // ----------------------------------------------------------------
  // 선택된 날짜의 이벤트
  // ----------------------------------------------------------------
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, "yyyy-MM-dd");
    return eventsByDate.get(key) ?? [];
  }, [selectedDate, eventsByDate]);

  // ----------------------------------------------------------------
  // 이벤트 추가 다이얼로그 열기
  // ----------------------------------------------------------------
  const openCreateDialog = useCallback((date?: Date) => {
    if (date) {
      setDialogDefaultDate(format(date, "yyyy-MM-dd"));
    } else {
      setDialogDefaultDate(undefined);
    }
    setIsDialogOpen(true);
  }, []);

  const handleEventCreated = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["family-events", currentMonth] });
    setIsDialogOpen(false);
    toast.success("이벤트가 추가되었습니다");
  }, [queryClient, currentMonth]);

  // ----------------------------------------------------------------
  // Realtime 콜백: 이벤트 변경 수신 시 쿼리 무효화
  // ----------------------------------------------------------------
  const handleRealtimeChange = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["family-events", currentMonth] });
  }, [queryClient, currentMonth]);

  // ----------------------------------------------------------------
  // 삭제 권한 확인
  // ----------------------------------------------------------------
  const canDeleteEvent = useCallback(
    (event: SerializedFamilyEvent) => {
      return event.createdByUserId === userId || userRole === "ADMIN";
    },
    [userId, userRole]
  );

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------
  const base = parseISO(`${currentMonth}-01`);
  const displayMonth = format(base, "yyyy년 M월", { locale: ko });
  const isCurrentMonth = currentMonth === format(new Date(), "yyyy-MM");

  return (
    <>
      {/* Realtime 구독 (UI 없는 사이드이펙트 컴포넌트) */}
      <CalendarRealtime
        familyId={undefined} // familyId는 서버에서 채널명에 사용하므로 클라이언트에서는 패턴 구독
        onEventChanged={handleRealtimeChange}
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* 캘린더 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <CalendarDays className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-bold text-gray-800">{displayMonth}</h2>
            {!isCurrentMonth && (
              <button
                onClick={goToToday}
                className="text-xs text-indigo-600 hover:underline"
              >
                오늘로
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateMonth("prev")}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="이전 달"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={() => navigateMonth("next")}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="다음 달"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={() => openCreateDialog()}
              className="ml-2 flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              이벤트 추가
            </button>
          </div>
        </div>

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {WEEKDAYS.map((day, i) => (
            <div
              key={day}
              className={`py-2 text-center text-xs font-semibold ${
                i === 5 ? "text-blue-500" : i === 6 ? "text-red-500" : "text-gray-500"
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className="grid grid-cols-7">
          {/* 앞 빈 칸 */}
          {Array.from({ length: calendarDays.leadingBlanks }).map((_, i) => (
            <div
              key={`blank-lead-${i}`}
              className="min-h-[100px] border-b border-r border-gray-50 bg-gray-50/50"
            />
          ))}

          {/* 날짜 셀 */}
          {calendarDays.days.map((day, idx) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const dayEvents = eventsByDate.get(dateKey) ?? [];
            const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
            const isTodayDate = isToday(day);
            const isCurrentMonthDay = isSameMonth(day, base);
            const dayOfWeek = getMondayBasedDayIndex(day); // 0=월 ... 6=일
            const isSat = dayOfWeek === 5;
            const isSun = dayOfWeek === 6;

            // 마지막 행 여부 (border-b 제거)
            const totalCells =
              calendarDays.leadingBlanks +
              calendarDays.days.length +
              calendarDays.trailingBlanks;
            const cellIndex = calendarDays.leadingBlanks + idx;
            const isLastRow = cellIndex >= totalCells - 7;

            return (
              <div
                key={dateKey}
                onClick={() => setSelectedDate(isSelected ? null : day)}
                className={[
                  "min-h-[100px] p-1.5 cursor-pointer transition-colors",
                  !isLastRow ? "border-b" : "",
                  "border-r border-gray-100",
                  isSelected
                    ? "bg-indigo-50"
                    : "hover:bg-gray-50",
                  !isCurrentMonthDay ? "opacity-40" : "",
                ].join(" ")}
              >
                {/* 날짜 숫자 */}
                <div className="flex justify-between items-start mb-1">
                  <span
                    className={[
                      "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
                      isTodayDate
                        ? "bg-indigo-600 text-white"
                        : isSun
                        ? "text-red-500"
                        : isSat
                        ? "text-blue-500"
                        : "text-gray-700",
                    ].join(" ")}
                  >
                    {format(day, "d")}
                  </span>
                  {/* 날짜 클릭 시 이벤트 추가 버튼 */}
                  {isSelected && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openCreateDialog(day);
                      }}
                      className="text-indigo-500 hover:text-indigo-700"
                      aria-label="이벤트 추가"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* 이벤트 목록 (최대 2개 + more) */}
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 2).map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center gap-1 text-xs truncate"
                    >
                      <span
                        className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${getEventDotColor(event)}`}
                      />
                      <span className="truncate text-gray-700">{event.title}</span>
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-xs text-gray-400 pl-2.5">
                      +{dayEvents.length - 2}개 더
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* 뒤 빈 칸 */}
          {Array.from({ length: calendarDays.trailingBlanks }).map((_, i) => (
            <div
              key={`blank-trail-${i}`}
              className="min-h-[100px] border-r border-gray-50 bg-gray-50/50"
            />
          ))}
        </div>
      </div>

      {/* 선택된 날짜 이벤트 상세 패널 */}
      {selectedDate && (
        <div className="mt-4 bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">
              {format(selectedDate, "M월 d일 (EEEE)", { locale: ko })} 일정
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => openCreateDialog(selectedDate)}
                className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                <Plus className="w-4 h-4" />
                추가
              </button>
              <button
                onClick={() => setSelectedDate(null)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {selectedDateEvents.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              이날의 일정이 없습니다
            </p>
          ) : (
            <ul className="space-y-3">
              {selectedDateEvents.map((event) => (
                <li
                  key={event.id}
                  className="flex items-start justify-between gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span
                      className={`mt-1 flex-shrink-0 w-2.5 h-2.5 rounded-full ${getEventDotColor(event)}`}
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800 text-sm truncate">
                        {event.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {event.isAllDay ? (
                          "종일"
                        ) : (
                          <>
                            {format(new Date(event.startAt), "HH:mm")}
                            {" ~ "}
                            {format(new Date(event.endAt), "HH:mm")}
                          </>
                        )}
                        {event.location && (
                          <span className="ml-2 text-gray-400">
                            @ {event.location}
                          </span>
                        )}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                          {EVENT_TYPE_LABELS[event.eventType] ?? event.eventType}
                        </span>
                        {event.category && (
                          <span className="text-xs text-gray-400">
                            {event.category}
                          </span>
                        )}
                      </div>
                      {event.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {event.description}
                        </p>
                      )}
                    </div>
                  </div>
                  {canDeleteEvent(event) && (
                    <button
                      onClick={() => deleteMutation.mutate(event.id)}
                      disabled={deleteMutation.isPending}
                      className="flex-shrink-0 text-gray-300 hover:text-red-500 transition-colors disabled:opacity-50"
                      aria-label="이벤트 삭제"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* 이벤트 생성 Dialog */}
      <EventDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        defaultDate={dialogDefaultDate}
        onSuccess={handleEventCreated}
      />
    </>
  );
}
