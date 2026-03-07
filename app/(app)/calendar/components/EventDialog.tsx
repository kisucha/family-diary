"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { X, Loader2, AlertCircle } from "lucide-react";
import { z } from "zod";
import { createEventBaseSchema, type CreateEventInput } from "@/lib/validations/event";

// ============================================================================
// Props
// ============================================================================

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string; // "YYYY-MM-DD"
  onSuccess: () => void;
}

// ============================================================================
// 이벤트 타입 옵션
// ============================================================================

const EVENT_TYPE_OPTIONS = [
  { value: "standard", label: "일반" },
  { value: "birthday", label: "생일" },
  { value: "anniversary", label: "기념일" },
  { value: "holiday", label: "공휴일" },
] as const;

// ============================================================================
// API 함수
// ============================================================================

async function createEvent(data: CreateEventInput): Promise<void> {
  const res = await fetch("/api/family/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error ?? "이벤트 생성에 실패했습니다");
  }
}

// ============================================================================
// 날짜+시간 → ISO 8601 datetime string 변환 헬퍼
// ============================================================================

function toISODatetime(date: string, time: string): string {
  // date: "YYYY-MM-DD", time: "HH:mm"
  return `${date}T${time}:00.000Z`;
}

// ============================================================================
// Component
// ============================================================================

export function EventDialog({
  open,
  onOpenChange,
  defaultDate,
  onSuccess,
}: EventDialogProps) {
  const today = format(new Date(), "yyyy-MM-dd");
  const defaultStartDate = defaultDate ?? today;
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<
    Omit<CreateEventInput, "startAt" | "endAt"> & {
      startDate: string;
      startTime: string;
      endDate: string;
      endTime: string;
    }
  >({
    resolver: zodResolver(
      // startDate/startTime/endDate/endTime 필드를 포함해야 formData에서 접근 가능
      createEventBaseSchema.omit({ startAt: true, endAt: true }).extend({
        startDate: z.string().min(1),
        startTime: z.string().min(1),
        endDate: z.string().min(1),
        endTime: z.string().min(1),
      })
    ),
    defaultValues: {
      title: "",
      startDate: defaultStartDate,
      startTime: "09:00",
      endDate: defaultStartDate,
      endTime: "10:00",
      isAllDay: false,
      description: "",
      location: "",
      category: "",
      colorTag: "",
      eventType: "standard",
      attendeeUserIds: [],
    },
  });

  const isAllDay = watch("isAllDay");

  // defaultDate 변경 시 날짜 필드 업데이트
  useEffect(() => {
    if (open && defaultDate) {
      setValue("startDate", defaultDate);
      setValue("endDate", defaultDate);
    }
  }, [open, defaultDate, setValue]);

  // Dialog 닫힐 때 폼 초기화 + 오류 초기화
  useEffect(() => {
    if (!open) {
      setSubmitError(null);
      reset({
        title: "",
        startDate: defaultDate ?? today,
        startTime: "09:00",
        endDate: defaultDate ?? today,
        endTime: "10:00",
        isAllDay: false,
        description: "",
        location: "",
        category: "",
        colorTag: "",
        eventType: "standard",
        attendeeUserIds: [],
      });
    }
  }, [open, reset, defaultDate, today]);

  const onSubmit = handleSubmit(async (formData) => {
    setSubmitError(null);
    try {
      const startAt = isAllDay
        ? `${formData.startDate}T00:00:00.000Z`
        : toISODatetime(formData.startDate, formData.startTime);
      const endAt = isAllDay
        ? `${formData.endDate}T23:59:59.000Z`
        : toISODatetime(formData.endDate, formData.endTime);

      // endAt >= startAt 검증
      if (new Date(endAt) < new Date(startAt)) {
        setSubmitError("종료 시각은 시작 시각 이후여야 합니다");
        return;
      }

      await createEvent({
        title: formData.title,
        startAt,
        endAt,
        isAllDay: formData.isAllDay,
        description: formData.description || undefined,
        location: formData.location || undefined,
        category: formData.category || undefined,
        colorTag: formData.colorTag || undefined,
        eventType: formData.eventType,
        attendeeUserIds:
          formData.attendeeUserIds && formData.attendeeUserIds.length > 0
            ? formData.attendeeUserIds
            : undefined,
      });

      onSuccess();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "이벤트 생성에 실패했습니다");
    }
  });

  if (!open) return null;

  return (
    // 배경 오버레이
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Dialog 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-800">새 이벤트 추가</h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 폼 */}
        <form id="event-form" onSubmit={onSubmit} className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* 서버/네트워크 오류 메시지 */}
          {submitError && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{submitError}</p>
            </div>
          )}

          {/* 제목 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              제목 <span className="text-red-500">*</span>
            </label>
            <input
              {...register("title")}
              type="text"
              placeholder="이벤트 제목"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              maxLength={255}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>
            )}
          </div>

          {/* 종일 여부 */}
          <div className="flex items-center gap-2">
            <Controller
              name="isAllDay"
              control={control}
              render={({ field }) => (
                <input
                  id="isAllDay"
                  type="checkbox"
                  checked={field.value}
                  onChange={field.onChange}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-400"
                />
              )}
            />
            <label htmlFor="isAllDay" className="text-sm text-gray-700 cursor-pointer">
              종일 이벤트
            </label>
          </div>

          {/* 시작 날짜/시간 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                시작 날짜 <span className="text-red-500">*</span>
              </label>
              <input
                {...register("startDate")}
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            {!isAllDay && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  시작 시간
                </label>
                <input
                  {...register("startTime")}
                  type="time"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            )}
          </div>

          {/* 종료 날짜/시간 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                종료 날짜 <span className="text-red-500">*</span>
              </label>
              <input
                {...register("endDate")}
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            {!isAllDay && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  종료 시간
                </label>
                <input
                  {...register("endTime")}
                  type="time"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            )}
          </div>

          {/* 이벤트 유형 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              이벤트 유형
            </label>
            <select
              {...register("eventType")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            >
              {EVENT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* 장소 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              장소
            </label>
            <input
              {...register("location")}
              type="text"
              placeholder="장소 (선택)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              maxLength={255}
            />
          </div>

          {/* 카테고리 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              카테고리
            </label>
            <input
              {...register("category")}
              type="text"
              placeholder="카테고리 (선택)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              maxLength={100}
            />
          </div>

          {/* 메모 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              메모
            </label>
            <textarea
              {...register("description")}
              placeholder="이벤트 메모 (선택)"
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          </div>
        </form>

        {/* Dialog 푸터 */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="submit"
            form="event-form"
            disabled={isSubmitting}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSubmitting ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
