import { z } from "zod";

export const upsertNoteSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식은 YYYY-MM-DD 이어야 합니다"),
  content: z.string().max(50000).optional(),
  mood: z.enum(["VERY_SAD", "SAD", "NEUTRAL", "HAPPY", "VERY_HAPPY"]).optional(),
  isPublished: z.boolean().optional().default(true),
});

export type UpsertNoteInput = z.infer<typeof upsertNoteSchema>;
