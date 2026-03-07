import { z } from "zod";

export const upsertEmotionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식은 YYYY-MM-DD"),
  primaryEmotion: z.string().min(1).max(50),
  emotionScore: z.number().int().min(1).max(5),
  physicalCondition: z.string().max(50).optional(),
  sleepQuality: z.number().int().min(1).max(5).optional(),
  sleepHours: z.number().min(0).max(24).optional(),
  exerciseMinutes: z.number().int().min(0).optional(),
  notes: z.string().max(1000).optional(),
  isPublished: z.boolean().optional().default(true),
});

export type UpsertEmotionInput = z.infer<typeof upsertEmotionSchema>;
