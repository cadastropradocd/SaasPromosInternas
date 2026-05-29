import type { D1Database } from '@cloudflare/workers-types';
import { StoreRepository } from '@/repositories/StoreRepository';
import { Store } from '@/types/store';
import { ttlCache } from '@/utils/cache';

export class StoreService {
  private storeRepository: StoreRepository;

  constructor(db: D1Database) {
    this.storeRepository = new StoreRepository(db);
  }

  async getStores(active?: boolean): Promise<Store[]> {
    return await this.storeRepository.findAll(active);
  }

  async getStoreById(id: number): Promise<Store | null> {
    return await this.storeRepository.findById(id);
  }

  async createStore(store: Omit<Store, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>): Promise<Store> {
    const result = await this.storeRepository.create(store);
    // Clear relevant cache entries
    ttlCache.clearPrefix('stores:all:');
    return result;
  }

  async updateStore(id: number, store: Partial<Omit<Store, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>>): Promise<Store> {
    return await this.storeRepository.update(id, store);
  }

  async deleteStore(id: number): Promise<void> {
    await this.storeRepository.delete(id);
  }
}