import type { D1Database } from '@cloudflare/workers-types';
import { Category } from '@/types/category';
import { ttlCache } from '../utils/cache';

export class CategoryRepository {
  constructor(private db: D1Database) {}

  async findAll(active?: boolean | null) {
    // Create cache key based on active parameter
    const cacheKey = `categories:all:${active ?? 'null'}`;
    
    // Try to get from cache first
    const cachedResult = ttlCache.get<Category[]>(cacheKey);
    if (cachedResult !== null) {
      return cachedResult;
    }

    let result;
    if (active !== null && active !== undefined) {
      result = await this.db.prepare(
        'SELECT * FROM categories WHERE deleted_at IS NULL AND active = ?'
      )
      .bind(active ? 1 : 0)
      .all();
    } else {
      result = await this.db.prepare(
        'SELECT * FROM categories WHERE deleted_at IS NULL ORDER BY name ASC'
      )
      .all();
    }

    const categories = result.results;
    // Cache the result for 30 seconds
    ttlCache.set(cacheKey, categories, 30);
    
    return categories;
  }

  async findById(id: number): Promise<Category | null> {
    const result = await this.db.prepare(
      'SELECT * FROM categories WHERE id = ? AND deleted_at IS NULL'
    )
    .bind(id)
    .first();

    return result ? (result as Category) : null;
  }

  async create(category: Omit<Category, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>): Promise<Category> {
    const result = await this.db.prepare(
      'INSERT INTO categories (name, active) VALUES (?, ?)'
    )
    .bind(category.name, category.active ? 1 : 0)
    .run();

    const newCategory = await this.db.prepare(
      'SELECT * FROM categories WHERE id = ?'
    )
    .bind(result.meta.last_row_id)
    .first();

    return newCategory as Category;
  }

  async update(id: number, category: Partial<Omit<Category, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>>): Promise<Category> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error('Category not found');
    }

    const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const bindings: (string | number | boolean)[] = [];

    if (category.name !== undefined) {
      updates.push('name = ?');
      bindings.push(category.name);
    }
    if (category.active !== undefined) {
      updates.push('active = ?');
      bindings.push(category.active ? 1 : 0);
    }

    if (updates.length === 1) {
      throw new Error('No fields to update');
    }

    bindings.push(id);
    await this.db.prepare(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`).bind(...bindings).run();

    const updatedCategory = await this.findById(id);
    if (!updatedCategory) {
      throw new Error('Category not found after update');
    }

    return updatedCategory;
  }

  async delete(id: number): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error('Category not found');
    }

    await this.db.prepare(
      'UPDATE categories SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP, active = 0 WHERE id = ?'
    )
    .bind(id)
    .run();
  }
}