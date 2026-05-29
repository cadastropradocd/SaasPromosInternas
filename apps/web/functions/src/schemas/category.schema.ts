import { z } from 'zod';

export const categorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  active: z.boolean().optional(),
});

export type CategorySchemaType = z.infer<typeof categorySchema>;