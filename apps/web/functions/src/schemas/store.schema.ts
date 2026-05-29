import { z } from 'zod';

export const storeSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  city: z.string().optional(),
  active: z.boolean().optional(),
});

export type StoreSchemaType = z.infer<typeof storeSchema>;