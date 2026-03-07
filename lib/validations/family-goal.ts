import { z } from "zod";

export const createFamilyGoalSchema = z.object({
  goalType: z.enum(["WEEKLY", "MONTHLY", "YEARLY"]),
  periodStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식이 올바르지 않습니다"),
  periodEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식이 올바르지 않습니다"),
  title: z.string().min(1, "제목을 입력해주세요").max(255),
  description: z.string().max(2000).optional(),
  targetMetric: z.string().max(255).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  contributorUserIds: z.array(z.string()).optional(),
});

export const updateFamilyGoalSchema = createFamilyGoalSchema.partial().extend({
  progressPercentage: z.number().int().min(0).max(100).optional(),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "ABANDONED"]).optional(),
});

export type CreateFamilyGoalInput = z.infer<typeof createFamilyGoalSchema>;
export type UpdateFamilyGoalInput = z.infer<typeof updateFamilyGoalSchema>;
