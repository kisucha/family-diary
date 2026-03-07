"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type ExportType = "plans" | "goals" | "notes" | "emotions";
type ExportFormat = "csv" | "json";

const TYPE_LABELS: Record<ExportType, string> = {
  plans: "일일 계획 & 태스크",
  goals: "목표",
  notes: "메모",
  emotions: "감정 체크인",
};

export function ExportSection() {
  const [selectedTypes, setSelectedTypes] = useState<ExportType[]>(["plans"]);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("csv");
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [isLoading, setIsLoading] = useState(false);

  const toggleType = (type: ExportType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleDownload = async () => {
    if (selectedTypes.length === 0) {
      toast.error("내보낼 데이터를 하나 이상 선택해주세요");
      return;
    }
    setIsLoading(true);
    try {
      for (const type of selectedTypes) {
        const url = `/api/export?type=${type}&format=${exportFormat}&from=${fromDate}&to=${toDate}`;
        const res = await fetch(url);
        if (!res.ok) {
          toast.error(`${TYPE_LABELS[type]} 내보내기 실패`);
          continue;
        }
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        const disposition = res.headers.get("Content-Disposition") ?? "";
        const match = disposition.match(/filename="(.+?)"/);
        a.download = match ? match[1] : `export_${type}.${exportFormat}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      }
      toast.success("다운로드가 완료되었습니다");
    } catch {
      toast.error("다운로드에 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
          <Download className="h-4 w-4 text-slate-600" />
          데이터 내보내기
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 데이터 종류 */}
        <div>
          <Label className="text-xs text-slate-500 mb-2 block">내보낼 데이터</Label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(TYPE_LABELS) as ExportType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => toggleType(type)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  selectedTypes.includes(type)
                    ? "bg-indigo-100 text-indigo-700 border-indigo-300"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        {/* 기간 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">시작일</Label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">종료일</Label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        </div>

        {/* 형식 */}
        <div>
          <Label className="text-xs text-slate-500 mb-2 block">파일 형식</Label>
          <div className="flex gap-3">
            {(["csv", "json"] as ExportFormat[]).map((fmt) => (
              <label key={fmt} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value={fmt}
                  checked={exportFormat === fmt}
                  onChange={() => setExportFormat(fmt)}
                  className="accent-indigo-600"
                />
                <span className="text-sm text-slate-700 uppercase">{fmt}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 다운로드 버튼 */}
        <div className="flex justify-end">
          <Button
            onClick={handleDownload}
            disabled={isLoading || selectedTypes.length === 0}
            size="sm"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            {isLoading ? "다운로드 중..." : "다운로드"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
