import { z } from "zod";

// ============================================================================
// DailyPlan 스키마
// ============================================================================

export const createPlanSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식은 YYYY-MM-DD 이어야 합니다"),
  theme: z.string().max(255).optional(),
  reflection: z.string().optional(),
  focusAreas: z.array(z.string()).optional(),
  isPublished: z.boolean().optional().default(true),
});

export const updatePlanSchema = createPlanSchema.partial().omit({ date: true });

// ============================================================================
// PlanItem (Task) 스키마
// ============================================================================

export const createTaskSchema = z.object({
  dailyPlanId: z.coerce.number().int().positive(),
  title: z.string().min(1, "제목은 필수입니다").max(255),
  description: z.string().optional(),   // ← 추가
  priority: z.enum(["A", "B", "C"]),
  sequenceOrder: z.number().int().min(0),
  estimatedTimeMinutes: z.number().int().positive().optional(),
  category: z.string().max(100).optional(),
  tags: z.array(z.string()).optional(),
});

export const updateTaskSchema = createTaskSchema
  .partial()
  .omit({ dailyPlanId: true })
  .extend({
    isCompleted: z.boolean().optional(),
    actualTimeMinutes: z.number().int().positive().optional(),
    description: z.string().nullable().optional(),   // ← nullable 허용
  });

export const reorderTasksSchema = z.object({
  items: z.array(
    z.object({
      id: z.number().int().positive(),
      sequenceOrder: z.number().int().min(0),
    })
  ),
});

// ============================================================================
// 타입 추출
// ============================================================================

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ReorderTasksInput = z.infer<typeof reorderTasksSchema>;
