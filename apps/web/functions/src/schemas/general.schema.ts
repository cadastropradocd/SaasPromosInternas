import { z } from 'zod';

export const emptyObjectSchema = z.object({}).strict();

export const promotionQueryParamsSchema = z.object({
  status: z.string().optional(),
  search: z.string().optional(),
  store_id: z.string().optional(),
  period: z.enum(['today', 'tomorrow', 'week', 'month', 'expired']).optional(),
  limit: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, {
    message: 'Limit must be a positive number'
  }).transform(val => Number(val)).optional(),
  offset: z.string().refine(val => !isNaN(Number(val)) && Number(val) >= 0, {
    message: 'Offset must be a non-negative number'
  }).transform(val => Number(val)).optional(),
});

export const storeQueryParamsSchema = z.object({
  active: z.enum(['0', '1']).optional().transform(val => val === '1')
});

export const launchPromotionSchema = emptyObjectSchema;
export const cancelPromotionSchema = emptyObjectSchema;
export const dashboardQueryParamsSchema = emptyObjectSchema;

export type EmptyObjectSchemaType = z.infer<typeof emptyObjectSchema>;
export type PromotionQueryParamsSchemaType = z.infer<typeof promotionQueryParamsSchema>;
export type StoreQueryParamsSchemaType = z.infer<typeof storeQueryParamsSchema>;
export type LaunchPromotionSchemaType = z.infer<typeof launchPromotionSchema>;
export type CancelPromotionSchemaType = z.infer<typeof cancelPromotionSchema>;
export type DashboardQueryParamsSchemaType = z.infer<typeof dashboardQueryParamsSchema>;