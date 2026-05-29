import type { D1Database } from '@cloudflare/workers-types';
import { PromotionRepository } from '@/repositories/PromotionRepository';
import { PromotionWithStores } from '@/types/promotion';
import { ttlCache } from '@/utils/cache';

export class PromotionService {
  private promotionRepository: PromotionRepository;

  constructor(db: D1Database) {
    this.promotionRepository = new PromotionRepository(db);
  }

  async getPromotions(
    status?: string,
    search?: string,
    storeId?: string,
    period?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<PromotionWithStores[]> {
    await this.promotionRepository.expireOldPromotions();
    return await this.promotionRepository.findAllWithFilters(status, search, storeId, period, limit, offset);
  }

  async getPromotionById(id: number): Promise<PromotionWithStores | null> {
    await this.promotionRepository.expireOldPromotions();
    return await this.promotionRepository.findById(id);
  }

  async createPromotion(
    promotion: Omit<PromotionWithStores, 'id' | 'status' | 'created_by' | 'updated_at' | 'deleted_at' | 'launched_by' | 'launched_at' | 'closed_at' | 'cancelled_by' | 'cancelled_at'>,
    userId: string,
    storeIds: number[]
  ): Promise<PromotionWithStores> {
    const result = await this.promotionRepository.create(promotion, userId, storeIds);
    // Clear relevant cache entries
    ttlCache.clearPrefix('promotion:');
    ttlCache.clearPrefix('promotions:all:');
    return result;
  }

  async updatePromotion(
    id: number,
    promotion: Partial<Omit<PromotionWithStores, 'id' | 'status' | 'created_by' | 'updated_at' | 'deleted_at' | 'launched_by' | 'launched_at' | 'closed_at' | 'cancelled_by' | 'cancelled_at'>>,
    userId: string,
    storeIds?: number[]
  ): Promise<PromotionWithStores> {
    const result = await this.promotionRepository.update(id, promotion, userId, storeIds);
    // Clear relevant cache entries
    ttlCache.clearPrefix('promotion:');
    ttlCache.clearPrefix('promotions:all:');
    return result;
  }

  async deletePromotion(id: number, userId: string): Promise<void> {
    await this.promotionRepository.delete(id);
  }

  async launchPromotion(id: number, userId: string): Promise<PromotionWithStores> {
    return await this.promotionRepository.launch(id, userId);
  }

  async cancelPromotion(id: number, userId: string): Promise<PromotionWithStores> {
    return await this.promotionRepository.cancel(id, userId);
  }

  async duplicatePromotion(
    id: number,
    userId: string,
    startDate: string,
    endDate: string,
    storeIds?: number[]
  ): Promise<PromotionWithStores> {
    return await this.promotionRepository.duplicate(id, userId, startDate, endDate, storeIds);
  }
}