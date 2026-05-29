import type { D1Database } from '@cloudflare/workers-types';
import { Store } from '@/types/store';
import { ttlCache } from '../utils/cache';

export class StoreRepository {
  constructor(private db: D1Database) {}

  async findAll(active?: boolean | null) {
    // Create cache key based on active parameter
    const cacheKey = `stores:all:${active ?? 'null'}`;
    
    // Try to get from cache first
    const cachedResult = ttlCache.get<Store[]>(cacheKey);
    if (cachedResult !== null) {
      return cachedResult;
    }

    let result;
    if (active !== null && active !== undefined) {
      result = await this.db.prepare(
        'SELECT * FROM stores WHERE deleted_at IS NULL AND active = ?'
      )
      .bind(active ? 1 : 0)
      .all();
    } else {
      result = await this.db.prepare(
        'SELECT * FROM stores WHERE deleted_at IS NULL ORDER BY name ASC'
      )
      .all();
    }

    const stores = result.results;
    // Cache the result for 30 seconds
    ttlCache.set(cacheKey, stores, 30);
    
    return stores;
  }

  async findById(id: number): Promise<Store | null> {
    const result = await this.db.prepare(
      'SELECT * FROM stores WHERE id = ? AND deleted_at IS NULL'
    )
    .bind(id)
    .first();

    return result ? (result as Store) : null;
  }

  async create(store: Omit<Store, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>): Promise<Store> {
    const result = await this.db.prepare(
      'INSERT INTO stores (name, city, active) VALUES (?, ?, ?)'
    )
    .bind(store.name, store.city || null, store.active ? 1 : 0)
    .run();

    const newStore = await this.db.prepare(
      'SELECT * FROM stores WHERE id = ?'
    )
    .bind(result.meta.last_row_id)
    .first();

    return newStore as Store;
  }

  async update(id: number, store: Partial<Omit<Store, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>>): Promise<Store> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error('Store not found');
    }

    const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const bindings: (string | number | boolean)[] = [];

    if (store.name !== undefined) {
      updates.push('name = ?');
      bindings.push(store.name);
    }
    if (store.city !== undefined) {
      updates.push('city = ?');
      bindings.push(store.city);
    }
    if (store.active !== undefined) {
      updates.push('active = ?');
      bindings.push(store.active ? 1 : 0);
    }

    if (updates.length === 1) {
      throw new Error('No fields to update');
    }

    bindings.push(id);
    await this.db.prepare(`UPDATE stores SET ${updates.join(', ')} WHERE id = ?`).bind(...bindings).run();

    const updatedStore = await this.findById(id);
    if (!updatedStore) {
      throw new Error('Store not found after update');
    }

    return updatedStore;
  }

  async delete(id: number): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error('Store not found');
    }

    await this.db.prepare(
      'UPDATE stores SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP, active = 0 WHERE id = ?'
    )
    .bind(id)
    .run();
  }
}