import { z } from "zod";

export const createAnnouncementSchema = z.object({
  title: z.string().min(1, "제목은 필수입니다").max(255),
  content: z.string().min(1, "내용은 필수입니다").max(10000),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  isPinned: z.boolean().default(false),
  pinnedUntil: z.string().datetime().optional(),
});

export const updateAnnouncementSchema = createAnnouncementSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;
