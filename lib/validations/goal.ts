import { z } from "zod";

export const createGoalSchema = z.object({
  goalType: z.enum(["WEEKLY", "MONTHLY", "YEARLY"]),
  periodStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식은 YYYY-MM-DD"),
  periodEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식은 YYYY-MM-DD"),
  title: z.string().min(1, "제목은 필수입니다").max(255),
  description: z.string().max(2000).optional(),
  targetMetric: z.string().max(255).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  isPublic: z.boolean().default(false),
});

export const updateGoalSchema = createGoalSchema.partial().extend({
  progressPercentage: z.number().int().min(0).max(100).optional(),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "ABANDONED"]).optional(),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
