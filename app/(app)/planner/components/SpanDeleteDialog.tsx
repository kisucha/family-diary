"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { SerializedPlanItem } from "../page";

interface SpanDeleteDialogProps {
  open: boolean;
  task: SerializedPlanItem | null;
  currentDate: string;
  onClose: () => void;
  onConfirm: (mode: "single" | "from-here") => void;
}

export function SpanDeleteDialog({
  open,
  task,
  currentDate,
  onClose,
  onConfirm,
}: SpanDeleteDialogProps) {
  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>연속 일정 삭제</DialogTitle>
          <DialogDescription asChild>
            <div>
              <span className="font-medium text-foreground">{task.title}</span>은(는){" "}
              <span className="font-semibold text-primary">{task.totalSpanDays}일 연속</span> 일정입니다.
              <br />
              어떻게 삭제하시겠습니까?
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 pt-1">
          {/* 이 날만 삭제 */}
          <button
            type="button"
            onClick={() => onConfirm("single")}
            className="flex flex-col items-start gap-0.5 rounded-lg border border-border px-4 py-3 text-left transition-colors hover:bg-accent"
          >
            <span className="text-sm font-medium text-foreground">이 날만 삭제</span>
            <span className="text-xs text-muted-foreground">
              {currentDate} 날짜 항목만 제거합니다
            </span>
          </button>

          {/* 이 날부터 이후 모두 삭제 */}
          <button
            type="button"
            onClick={() => onConfirm("from-here")}
            className="flex flex-col items-start gap-0.5 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-left transition-colors hover:bg-destructive/10"
          >
            <span className="text-sm font-medium text-destructive">이 날부터 이후 모두 삭제</span>
            <span className="text-xs text-muted-foreground">
              {currentDate}부터 종료일까지 전부 삭제합니다
            </span>
          </button>

          <Button variant="ghost" size="sm" onClick={onClose} className="mt-1">
            취소
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
