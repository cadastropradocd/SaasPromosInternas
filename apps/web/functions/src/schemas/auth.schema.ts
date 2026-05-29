import { z } from 'zod';
import { emptyObjectSchema } from './general.schema';

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

export const seedSchema = emptyObjectSchema; // Seed endpoint doesn't require any input

export type LoginSchemaType = z.infer<typeof loginSchema>;
export type SeedSchemaType = z.infer<typeof seedSchema>;