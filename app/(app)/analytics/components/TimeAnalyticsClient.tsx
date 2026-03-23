"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart2, PieChart as PieChartIcon, TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ============================================================================
// 타입
// ============================================================================

type Period = "week" | "month" | "3month";

interface AnalyticsData {
  period: string;
  fromDate: string;
  toDate: string;
  summary: {
    total: number;
    completed: number;
    completionRate: number;
  };
  priorityData: { name: string; total: number; completed: number }[];
  byDay: { day: string; total: number; completed: number }[];
  monthlyData: { month: string; total: number; completed: number; rate: number }[];
  pieData: { name: string; value: number; fill: string }[];
}

// ============================================================================
// TimeAnalyticsClient
// ============================================================================

export function TimeAnalyticsClient() {
  const [period, setPeriod] = useState<Period>("month");

  const { data, isLoading } = useQuery<{ data: AnalyticsData }>({
    queryKey: ["timeAnalytics", period],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/time?period=${period}`);
      if (!res.ok) throw new Error();
      return res.json();
    },
  });

  const analytics = data?.data;

  const periodTabs: { value: Period; label: string }[] = [
    { value: "week", label: "이번 주" },
    { value: "month", label: "이번 달" },
    { value: "3month", label: "최근 3개월" },
  ];

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <TrendingUp className="h-6 w-6 text-indigo-600" />
        <h1 className="text-2xl font-bold text-foreground">시간 분석</h1>
      </div>

      {/* 기간 탭 */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
        {periodTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setPeriod(tab.value)}
            className={`flex-1 text-sm py-1.5 rounded-md transition-all ${
              period === tab.value
                ? "bg-white shadow-sm text-indigo-700 font-medium"
                : "text-slate-600 hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="text-center py-12 text-slate-400">불러오는 중...</div>
      )}

      {analytics && (
        <>
          {/* 기간 표시 */}
          <p className="text-xs text-slate-500">
            {analytics.fromDate} ~ {analytics.toDate}
          </p>

          {/* 요약 카드 */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="border border-slate-200">
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-2xl font-bold text-slate-700">{analytics.summary.total}</p>
                <p className="text-xs text-slate-500 mt-0.5">전체 태스크</p>
              </CardContent>
            </Card>
            <Card className="border border-slate-200">
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{analytics.summary.completed}</p>
                <p className="text-xs text-slate-500 mt-0.5">완료</p>
              </CardContent>
            </Card>
            <Card className="border border-slate-200">
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-2xl font-bold text-indigo-600">{analytics.summary.completionRate}%</p>
                <p className="text-xs text-slate-500 mt-0.5">완료율</p>
              </CardContent>
            </Card>
          </div>

          {/* 우선순위별 파이차트 */}
          {analytics.pieData.length > 0 && (
            <Card className="border border-slate-200">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4 text-indigo-500" />
                  우선순위별 분포
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={analytics.pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {analytics.pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* 요일별 바차트 */}
          <Card className="border border-slate-200">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-indigo-500" />
                요일별 태스크
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.byDay.every((d) => d.total === 0) ? (
                <p className="text-sm text-slate-400 py-4 text-center">해당 기간에 태스크가 없습니다</p>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={analytics.byDay} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Bar dataKey="completed" name="완료" fill="#6366f1" radius={[2, 2, 0, 0]} stackId="a" />
                    <Bar dataKey="total" name="전체" fill="#e0e7ff" radius={[2, 2, 0, 0]} stackId="b" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* 월별 완료율 (3개월일 경우) */}
          {period === "3month" && analytics.monthlyData.length > 0 && (
            <Card className="border border-slate-200">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  월별 완료율
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={analytics.monthlyData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip
                      formatter={(value) => [`${value}%`, "완료율"]}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Bar dataKey="rate" name="완료율" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* 우선순위별 상세 */}
          <Card className="border border-slate-200">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-semibold text-slate-800">
                우선순위별 상세
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.priorityData.map((item) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <span className="text-xs font-medium text-slate-600 w-24 flex-shrink-0">{item.name}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-2">
                      <div
                        className="bg-indigo-500 h-2 rounded-full transition-all"
                        style={{
                          width: item.total > 0 ? `${Math.round((item.completed / item.total) * 100)}%` : "0%",
                        }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 w-16 text-right flex-shrink-0">
                      {item.completed}/{item.total}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
