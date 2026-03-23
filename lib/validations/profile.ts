import { z } from "zod";

export const updateProfileSchema = z.object({
  personalMission: z.string().max(2000).optional(),
  coreValues: z.array(z.string().min(1).max(50)).max(10).optional(),
  rolesResponsibilities: z.string().max(3000).optional(),
  longTermVision: z.string().max(2000).optional(),
  bio: z.string().max(500).optional(),
  telegramBotToken: z.string().max(200).nullable().optional(),
  telegramChatId: z.string().max(50).nullable().optional(),
  telegramNotifyPlans: z.boolean().optional(),
  telegramNotifyEvents: z.boolean().optional(),
  telegramNotifyIncomplete: z.boolean().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
