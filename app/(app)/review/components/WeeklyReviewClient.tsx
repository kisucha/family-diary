"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, addWeeks, subWeeks, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight, BarChart2, TrendingUp, Target } from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ============================================================================
// 타입
// ============================================================================

interface DayStat {
  day: string;
  total: number;
  completed: number;
  rate: number;
}

interface EmotionPoint {
  day: string;
  score: number;
  sleep: number | null;
}

interface WeeklyReviewData {
  weekStart: string;
  weekEnd: string;
  dailyStats: DayStat[];
  emotionTrend: EmotionPoint[];
  goalSummary: {
    total: number;
    completed: number;
    inProgress: number;
  };
  summary: {
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    avgEmotionScore: number | null;
  };
}

// ============================================================================
// WeeklyReviewClient
// ============================================================================

export function WeeklyReviewClient() {
  const [weekBase, setWeekBase] = useState(() => format(new Date(), "yyyy-MM-dd"));

  const { data, isLoading } = useQuery<{ data: WeeklyReviewData }>({
    queryKey: ["weeklyReview", weekBase],
    queryFn: async () => {
      const res = await fetch(`/api/review/weekly?week=${weekBase}`);
      if (!res.ok) throw new Error();
      return res.json();
    },
  });

  const review = data?.data;

  const navigate = useCallback(
    (dir: "prev" | "next") => {
      const base = parseISO(weekBase);
      const newBase = dir === "prev" ? subWeeks(base, 1) : addWeeks(base, 1);
      setWeekBase(format(newBase, "yyyy-MM-dd"));
    },
    [weekBase]
  );

  const goToThisWeek = () => setWeekBase(format(new Date(), "yyyy-MM-dd"));

  const emotionLabel = (score: number | null) => {
    if (score === null) return "—";
    if (score >= 4.5) return "매우 좋음 😄";
    if (score >= 3.5) return "좋음 😊";
    if (score >= 2.5) return "보통 😐";
    if (score >= 1.5) return "우울 😟";
    return "매우 우울 😢";
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* 헤더 + 네비게이션 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-6 w-6 text-indigo-600" />
          <h1 className="text-2xl font-bold text-slate-900">주간 리뷰</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("prev")}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="이전 주"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <button
            onClick={goToThisWeek}
            className="text-xs text-indigo-600 hover:underline px-1"
          >
            이번 주
          </button>
          <button
            onClick={() => navigate("next")}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="다음 주"
          >
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </div>

      {/* 기간 표시 */}
      {review && (
        <p className="text-sm text-slate-500 -mt-2">
          {format(parseISO(review.weekStart), "M월 d일", { locale: ko })} —{" "}
          {format(parseISO(review.weekEnd), "M월 d일 (EEE)", { locale: ko })}
        </p>
      )}

      {isLoading && (
        <div className="text-center py-12 text-slate-400">불러오는 중...</div>
      )}

      {review && (
        <>
          {/* 요약 카드 */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="border border-slate-200">
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-2xl font-bold text-indigo-600">
                  {review.summary.completionRate}%
                </p>
                <p className="text-xs text-slate-500 mt-0.5">태스크 완료율</p>
                <p className="text-[10px] text-slate-400">
                  {review.summary.completedTasks}/{review.summary.totalTasks}
                </p>
              </CardContent>
            </Card>
            <Card className="border border-slate-200">
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-2xl font-bold text-rose-500">
                  {review.summary.avgEmotionScore ?? "—"}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">평균 감정 점수</p>
                <p className="text-[10px] text-slate-400">
                  {emotionLabel(review.summary.avgEmotionScore)}
                </p>
              </CardContent>
            </Card>
            <Card className="border border-slate-200">
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">
                  {review.goalSummary.total > 0
                    ? `${review.goalSummary.completed}/${review.goalSummary.total}`
                    : "—"}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">목표 달성</p>
                <p className="text-[10px] text-slate-400">
                  {review.goalSummary.inProgress}개 진행 중
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 요일별 태스크 완료율 바차트 */}
          <Card className="border border-slate-200">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-indigo-500" />
                요일별 태스크 완료율
              </CardTitle>
            </CardHeader>
            <CardContent>
              {review.dailyStats.every((d) => d.total === 0) ? (
                <p className="text-sm text-slate-400 py-4 text-center">이번 주 등록된 태스크가 없습니다</p>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={review.dailyStats} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip
                      formatter={(value) => [`${value}%`, "완료율"]}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Bar dataKey="rate" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* 감정 트렌드 라인차트 */}
          <Card className="border border-slate-200">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-rose-500" />
                감정 트렌드
              </CardTitle>
            </CardHeader>
            <CardContent>
              {review.emotionTrend.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">이번 주 감정 체크인 기록이 없습니다</p>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={review.emotionTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value) => [value, "감정 점수"]}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#f43f5e"
                      strokeWidth={2}
                      dot={{ fill: "#f43f5e", r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* 주간 목표 */}
          {review.goalSummary.total > 0 && (
            <Card className="border border-slate-200">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <Target className="h-4 w-4 text-emerald-500" />
                  주간 목표 현황
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-6 text-sm">
                  <div className="text-center">
                    <p className="text-xl font-bold text-slate-700">{review.goalSummary.total}</p>
                    <p className="text-xs text-slate-500">전체</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-emerald-600">{review.goalSummary.completed}</p>
                    <p className="text-xs text-slate-500">완료</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-indigo-600">{review.goalSummary.inProgress}</p>
                    <p className="text-xs text-slate-500">진행 중</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-slate-400">
                      {review.goalSummary.total - review.goalSummary.completed - review.goalSummary.inProgress}
                    </p>
                    <p className="text-xs text-slate-500">시작 전</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
