import { z } from "zod";

// ============================================================================
// FamilyEvent 생성 스키마 (base — .omit()/.extend() 가능)
// ============================================================================

export const createEventBaseSchema = z.object({
  title: z
    .string()
    .min(1, "제목은 필수입니다")
    .max(255, "제목은 255자 이내여야 합니다"),
  startAt: z.string().datetime({ message: "올바른 날짜/시간 형식이 아닙니다" }),
  endAt: z.string().datetime({ message: "올바른 날짜/시간 형식이 아닙니다" }),
  isAllDay: z.boolean().default(false),
  description: z.string().optional(),
  location: z.string().max(255, "장소는 255자 이내여야 합니다").optional(),
  category: z.string().max(100, "카테고리는 100자 이내여야 합니다").optional(),
  colorTag: z.string().max(20, "색상 태그는 20자 이내여야 합니다").optional(),
  eventType: z
    .enum(["standard", "birthday", "anniversary", "holiday"], {
      errorMap: () => ({ message: "올바른 이벤트 유형이 아닙니다" }),
    })
    .default("standard"),
  attendeeUserIds: z.array(z.string()).optional(),
});

// refine이 추가된 전체 스키마 (API Route에서 사용)
export const createEventSchema = createEventBaseSchema.refine(
  (data) => new Date(data.endAt) >= new Date(data.startAt),
  {
    message: "종료 시각은 시작 시각 이후여야 합니다",
    path: ["endAt"],
  }
);

// ============================================================================
// 타입 추출
// ============================================================================

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type CreateEventBaseInput = z.infer<typeof createEventBaseSchema>;
