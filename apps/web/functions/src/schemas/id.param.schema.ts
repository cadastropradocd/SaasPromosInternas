import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, {
    message: 'ID deve ser um número positivo'
  }).transform(val => Number(val))
});

export type IdParamSchemaType = z.infer<typeof idParamSchema>;