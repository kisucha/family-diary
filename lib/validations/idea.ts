import { z } from "zod";

export const createIdeaSchema = z.object({
  title: z.string().min(1, "제목은 필수입니다").max(255),
  content: z.string().optional(),
  category: z.string().max(100).optional(),
  tags: z.array(z.string()).optional(),
  colorTag: z.string().max(20).optional(),
  isPinned: z.boolean().optional().default(false),
});

export const updateIdeaSchema = createIdeaSchema.partial();

export type CreateIdeaInput = z.infer<typeof createIdeaSchema>;
export type UpdateIdeaInput = z.infer<typeof updateIdeaSchema>;
