import { z } from 'zod';

export const promotionCreateSchema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória'),
  retail_price: z.number().positive('Preço de varejo deve ser positivo'),
  wholesale_price: z.number().nonnegative('Preço de atacado não pode ser negativo').optional(),
  start_date: z.string().datetime({ offset: true }).or(z.string().date()), // Accepts ISO date string or datetime
  end_date: z.string().datetime({ offset: true }).or(z.string().date()),
  notes: z.string().optional(),
  code: z.string().optional(),
  store_ids: z.array(z.number().int().positive()).optional(),
  category_id: z.number().int().positive().optional(),
});

export const promotionUpdateSchema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória').optional(),
  retail_price: z.number().positive('Preço de varejo deve ser positivo').optional(),
  wholesale_price: z.number().nonnegative('Preço de atacado não pode ser negativo').optional(),
  start_date: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
  end_date: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
  notes: z.string().optional(),
  code: z.string().optional(),
  store_ids: z.array(z.number().int().positive()).optional(),
  category_id: z.number().int().positive().optional(),
});

export const promotionDuplicateSchema = z.object({
  start_date: z.string().datetime({ offset: true }).or(z.string().date()),
  end_date: z.string().datetime({ offset: true }).or(z.string().date()),
  store_ids: z.array(z.number().int().positive()).optional(),
});

export const pdfGenerateSchema = z.object({
  promotionIds: z.array(z.number().int().positive()).nonempty('Pelo menos uma promoção deve ser selecionada')
});

export type PromotionCreateSchemaType = z.infer<typeof promotionCreateSchema>;
export type PromotionUpdateSchemaType = z.infer<typeof promotionUpdateSchema>;
export type PromotionDuplicateSchemaType = z.infer<typeof promotionDuplicateSchema>;
export type PdfGenerateSchemaType = z.infer<typeof pdfGenerateSchema>;