import type { D1Database } from '@cloudflare/workers-types';
import { CategoryRepository } from '@/repositories/CategoryRepository';
import { Category } from '@/types/category';

export class CategoryService {
  private categoryRepository: CategoryRepository;

  constructor(db: D1Database) {
    this.categoryRepository = new CategoryRepository(db);
  }

  async getCategories(active?: boolean): Promise<Category[]> {
    return await this.categoryRepository.findAll(active);
  }

  async getCategoryById(id: number): Promise<Category | null> {
    return await this.categoryRepository.findById(id);
  }

  async createCategory(category: Omit<Category, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>): Promise<Category> {
    return await this.categoryRepository.create(category);
  }

  async updateCategory(id: number, category: Partial<Omit<Category, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>>): Promise<Category> {
    return await this.categoryRepository.update(id, category);
  }

  async deleteCategory(id: number): Promise<void> {
    await this.categoryRepository.delete(id);
  }
}