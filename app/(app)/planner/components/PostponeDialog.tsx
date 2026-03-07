"use client";

import { useState } from "react";
import { format, addDays } from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

// ============================================================================
// Props
// ============================================================================

export interface PostponeTask {
  id: string;
  title: string;
  priority: "A" | "B" | "C";
  category: string | null;
  estimatedTimeMinutes: number | null;
}

interface PostponeDialogProps {
  open: boolean;
  onClose: () => void;
  task: PostponeTask | null;
  currentDate: string; // "YYYY-MM-DD"
  onSuccess: () => void;
}

// ============================================================================
// PostponeDialog
// ============================================================================

export function PostponeDialog({
  open,
  onClose,
  task,
  currentDate,
  onSuccess,
}: PostponeDialogProps) {
  const tomorrow = addDays(new Date(), 1);
  const [targetDate, setTargetDate] = useState<Date | undefined>(tomorrow);
  const [withReminder, setWithReminder] = useState(false);
  const [reminderDate, setReminderDate] = useState<Date | undefined>(
    addDays(tomorrow, -1)
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = () => {
    if (isLoading) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (!task) return;
    if (!targetDate) {
      toast.error("연기할 날짜를 선택해주세요");
      return;
    }

    const targetDateStr = format(targetDate, "yyyy-MM-dd");
    if (targetDateStr <= currentDate) {
      toast.error("연기 날짜는 오늘 이후여야 합니다");
      return;
    }

    if (withReminder && reminderDate) {
      const reminderDateStr = format(reminderDate, "yyyy-MM-dd");
      if (reminderDateStr >= targetDateStr) {
        toast.error("알림 날짜는 연기 날짜 이전이어야 합니다");
        return;
      }
    }

    setIsLoading(true);
    try {
      // 1. 연기 날짜에 태스크 새로 생성
      const createRes = await fetch("/api/plans/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: targetDateStr,
          title: task.title,
          priority: task.priority,
          sequenceOrder: 999,
          ...(task.estimatedTimeMinutes && {
            estimatedTimeMinutes: task.estimatedTimeMinutes,
          }),
          ...(task.category && { category: task.category }),
        }),
      });
      if (!createRes.ok) throw new Error("태스크 생성에 실패했습니다");

      // 2. 사전 알림 태스크 생성
      if (withReminder && reminderDate) {
        const reminderDateStr = format(reminderDate, "yyyy-MM-dd");
        const currentDateLabel = format(new Date(currentDate), "M월 d일", { locale: ko });
        await fetch("/api/plans/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: reminderDateStr,
            title: `${currentDateLabel}에 연기된 "${task.title}" 작업이 있습니다`,
            priority: task.priority,
            sequenceOrder: 999,
          }),
        });
      }

      // 3. 기존 태스크 삭제
      await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });

      toast.success(
        `${format(targetDate, "M월 d일", { locale: ko })}으로 연기되었습니다`
      );
      onSuccess();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "연기에 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-[340px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="h-4 w-4 text-indigo-600" />
            태스크 연기
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* 태스크 제목 */}
          <p className="text-sm text-slate-600 bg-slate-50 rounded px-3 py-2 truncate">
            {task.title}
          </p>

          {/* 연기 날짜 */}
          <div>
            <Label className="text-sm font-medium text-slate-700">
              연기할 날짜
            </Label>
            <div className="mt-1.5 flex justify-center">
              <Calendar
                mode="single"
                selected={targetDate}
                onSelect={setTargetDate}
                disabled={(d) => d <= new Date(currentDate)}
                locale={ko}
                className="rounded-md border border-slate-200 p-2"
              />
            </div>
            {targetDate && (
              <p className="text-xs text-center text-indigo-600 mt-1">
                {format(targetDate, "yyyy년 M월 d일 (EEEE)", { locale: ko })}
              </p>
            )}
          </div>

          {/* 사전 알림 체크박스 */}
          <div className="flex items-center gap-2 pt-1">
            <Checkbox
              id="withReminder"
              checked={withReminder}
              onCheckedChange={(v) => setWithReminder(!!v)}
            />
            <Label htmlFor="withReminder" className="text-sm cursor-pointer">
              사전 알림 추가
            </Label>
          </div>

          {/* 알림 날짜 */}
          {withReminder && (
            <div>
              <Label className="text-sm font-medium text-slate-700">
                알림 날짜
              </Label>
              <p className="text-xs text-slate-400 mt-0.5">
                이 날짜 플래너에 &quot;{format(new Date(currentDate), "M월 d일", { locale: ko })}에 연기된 &apos;{task.title}&apos; 작업이 있습니다&quot; 알림이 같은 우선순위로 추가됩니다
              </p>
              <div className="mt-1.5 flex justify-center">
                <Calendar
                  mode="single"
                  selected={reminderDate}
                  onSelect={setReminderDate}
                  disabled={(d) =>
                    d <= new Date(currentDate) ||
                    (targetDate ? d >= targetDate : false)
                  }
                  locale={ko}
                  className="rounded-md border border-slate-200 p-2"
                />
              </div>
              {reminderDate && (
                <p className="text-xs text-center text-indigo-600 mt-1">
                  {format(reminderDate, "yyyy년 M월 d일 (EEEE)", { locale: ko })}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !targetDate}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {isLoading ? "처리 중..." : "연기 확인"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
