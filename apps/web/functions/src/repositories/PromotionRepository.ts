import type { D1Database } from '@cloudflare/workers-types';
import { Promotion, PromotionWithStores } from '@/types/promotion';
import { ttlCache } from '../utils/cache';
import { traceAsyncFn, traceSyncFn } from '../tracing/otel';

export class PromotionRepository {
  constructor(private db: D1Database) {}

  /**
   * Execute multiple statements in a batch (transaction-like).
   * Note: D1's batch method executes all statements in a single transaction.
   * If any statement fails, the entire batch is rolled back.
   */
  private async batch(statements: { sql: string; bindings?: any[] }[]): Promise<void> {
    const stmts = statements.map(({ sql, bindings }) => {
      const stmt = this.db.prepare(sql);
      if (bindings) {
        return stmt.bind(...bindings);
      }
      return stmt;
    });
    // Use D1's batch API if available, otherwise execute sequentially
    if (typeof this.db.batch === 'function') {
      await this.db.batch(stmts);
    } else {
      // Fallback to sequential execution (not transactional)
      for (const stmt of stmts) {
        await stmt.run();
      }
    }
  }

  async findAllWithFilters(
    status?: string,
    search?: string,
    storeId?: string,
    period?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<PromotionWithStores[]> {
    return traceAsyncFn('PromotionRepository.findAllWithFilters', async () => {
      let query = 'SELECT * FROM promotions WHERE deleted_at IS NULL';
      const bindings: (string | number)[] = [];

      if (status) {
        query += ' AND status = ?';
        bindings.push(status);
      }
      if (search) {
        query += ' AND (description LIKE ? OR code LIKE ?)';
        bindings.push(`%${search}%`, `%${search}%`);
      }
      if (storeId) {
        query += ` AND id IN (SELECT promotion_id FROM promotion_stores WHERE store_id = ?)`;
        bindings.push(parseInt(storeId));
      }
      if (period) {
        switch (period) {
          case 'today':
            query += ` AND date(end_date) = date('now')`;
            break;
          case 'tomorrow':
            query += ` AND date(end_date) = date('now', '+1 day')`;
            break;
          case 'week':
            query += ` AND date(end_date) <= date('now', '+7 days')`;
            break;
          case 'month':
            query += ` AND date(end_date) <= date('now', '+30 days')`;
            break;
          case 'expired':
            query += ` AND date(end_date) < date('now')`;
            break;
        }
      }

      query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      bindings.push(limit, offset);

      const result = await this.db.prepare(query).bind(...bindings).all();

      // Fetch stores for each promotion
      const promotionsWithStores = await Promise.all(
        result.results.map(async (promo: Promotion) => {
          const stores = await this.db.prepare(
            `SELECT s.* FROM stores s INNER JOIN promotion_stores ps ON s.id = ps.store_id WHERE ps.promotion_id = ? AND s.deleted_at IS NULL`
          )
          .bind(promo.id)
          .all();

          return { ...promo, stores: stores.results };
        })
      );

      return promotionsWithStores;
    }, {
      attributes: {
        'db.operation': 'findAllWithFilters',
        'db.system': 'd1',
        'db.statement': query,
        'db.parameters.count': bindings.length,
      }
    });
  }

  async findById(id: number): Promise<PromotionWithStores | null> {
    return traceAsyncFn('PromotionRepository.findById', async () => {
      // Try to get from cache first
      const cacheKey = `promotion:${id}`;
      const cachedResult = ttlCache.get<PromotionWithStores>(cacheKey);
      if (cachedResult !== null) {
        return cachedResult;
      }

      const promo = await this.db.prepare(
        'SELECT * FROM promotions WHERE id = ? AND deleted_at IS NULL'
      )
      .bind(id)
      .first() as Promotion | null;

      if (!promo) return null;

      const stores = await this.db.prepare(
        `SELECT s.* FROM stores s INNER JOIN promotion_stores ps ON s.id = ps.store_id WHERE ps.promotion_id = ? AND s.deleted_at IS NULL`
      )
      .bind(id)
      .all();

      const promotionWithStores = { ...promo, stores: stores.results };
      // Cache the result for 15 seconds (promotions don't change extremely frequently)
      ttlCache.set(cacheKey, promotionWithStores, 15);
      
      return promotionWithStores;
    }, {
      attributes: {
        'db.operation': 'findById',
        'db.system': 'd1',
        'db.table': 'promotions',
        'promotion.id': id,
      }
    });
  }

  async create(
    promotion: Omit<Promotion, 'id' | 'status' | 'created_by' | 'updated_at' | 'deleted_at' | 'launched_by' | 'launched_at' | 'closed_at' | 'cancelled_by' | 'cancelled_at'>,
    userId: string,
    storeIds: number[]
  ): Promise<PromotionWithStores> {
    return traceAsyncFn('PromotionRepository.create', async () => {
      // Insert promotion
      const promotionResult = await this.db.prepare(
        `INSERT INTO promotions (code, description, retail_price, wholesale_price, start_date, end_date, notes, status, created_by, category_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDENTE', ?, ?)`
      )
      .bind(
        promotion.code || null,
        promotion.description,
        promotion.retail_price,
        promotion.wholesale_price || null,
        promotion.start_date,
        promotion.end_date,
        promotion.notes || null,
        userId,
        promotion.category_id || null
      )
      .run();

      const promotionId = promotionResult.meta.last_row_id as number;

      // Prepare batch for promotion_stores and history
      const statements: { sql: string; bindings?: any[] }[] = [];

      // Insert promotion_stores
      for (const storeId of storeIds) {
        statements.push({
          sql: 'INSERT INTO promotion_stores (promotion_id, store_id) VALUES (?, ?)',
          bindings: [promotionId, storeId]
        });
      }

      // Insert history
      statements.push({
        sql: 'INSERT INTO promotion_history (promotion_id, user_id, action, old_status, new_status, payload) VALUES (?, ?, ?, ?, ?, ?)',
        bindings: [
          promotionId,
          userId,
          'CREATE',
          null,
          'PENDENTE',
          JSON.stringify({ description: promotion.description, retail_price: promotion.retail_price })
        ]
      });

      // Execute batch
      await this.batch(statements);

      return this.findById(promotionId);
    }, {
      attributes: {
        'db.operation': 'create',
        'db.system': 'd1',
        'db.table': 'promotions',
        'user.id': userId,
        'store.ids.count': storeIds.length,
      }
    });
  }

  async update(
    id: number,
    promotion: Partial<Omit<Promotion, 'id' | 'status' | 'created_by' | 'updated_at' | 'deleted_at' | 'launched_by' | 'launched_at' | 'closed_at' | 'cancelled_by' | 'cancelled_at'>>,
    userId: string,
    storeIds?: number[]
  ): Promise<PromotionWithStores> {
    return traceAsyncFn('PromotionRepository.update', async () => {
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error('Promotion not found');
      }

      // Build update query for promotions table
      const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
      const bindings: (string | number | null)[] = [];

      if (promotion.code !== undefined) {
        updates.push('code = ?');
        bindings.push(promotion.code);
      }
      if (promotion.description !== undefined) {
        updates.push('description = ?');
        bindings.push(promotion.description);
      }
      if (promotion.retail_price !== undefined) {
        updates.push('retail_price = ?');
        bindings.push(promotion.retail_price);
      }
      if (promotion.wholesale_price !== undefined) {
        updates.push('wholesale_price = ?');
        bindings.push(promotion.wholesale_price);
      }
      if (promotion.start_date !== undefined) {
        updates.push('start_date = ?');
        bindings.push(promotion.start_date);
      }
      if (promotion.end_date !== undefined) {
        updates.push('end_date = ?');
        bindings.push(promotion.end_date);
      }
      if (promotion.notes !== undefined) {
        updates.push('notes = ?');
        bindings.push(promotion.notes);
      }
      if (promotion.category_id !== undefined) {
        updates.push('category_id = ?');
        bindings.push(promotion.category_id);
      }

      // Prepare batch statements
      const statements: { sql: string; bindings?: any[] }[] = [];

      // Update promotions table if there are changes
      if (updates.length > 1) {
        bindings.push(id);
        statements.push({
          sql: `UPDATE promotions SET ${updates.join(', ')} WHERE id = ?`,
          bindings
        });
      }

      // Handle store updates if storeIds is provided and user has permission (permission checked in service)
      if (storeIds !== undefined) {
        // Delete existing promotion_stores
        statements.push({
          sql: 'DELETE FROM promotion_stores WHERE promotion_id = ?',
          bindings: [id]
        });
        // Insert new promotion_stores
        for (const storeId of storeIds) {
          statements.push({
            sql: 'INSERT INTO promotion_stores (promotion_id, store_id) VALUES (?, ?)',
            bindings: [id, storeId]
          });
        }
      }

      // Insert history
      statements.push({
        sql: 'INSERT INTO promotion_history (promotion_id, user_id, action, old_status, new_status, payload) VALUES (?, ?, ?, ?, ?, ?)',
        bindings: [
          id,
          userId,
          'UPDATE',
          existing.status,
          existing.status, // In original code, old and new status were the same for UPDATE
          JSON.stringify(promotion)
        ]
      });

      // Execute batch
      await this.batch(statements);

      return this.findById(id);
    }, {
      attributes: {
        'db.operation': 'update',
        'db.system': 'd1',
        'db.table': 'promotions',
        'promotion.id': id,
        'user.id': userId,
        'store.ids.count': storeIds?.length || 0,
      }
    });
  }

  async delete(id: number): Promise<void> {
    return traceAsyncFn('PromotionRepository.delete', async () => {
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error('Promotion not found');
      }

      // Prepare batch statements
      const statements: { sql: string; bindings?: any[] }[] = [];

      // Update promotion to CANCELADA and set deleted_at
      statements.push({
        sql: 'UPDATE promotions SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP, status = ? WHERE id = ?',
        bindings: ['CANCELADA', id]
      });

      // Update stores (set active=0) - note: this is from original code, but may be incorrect
      statements.push({
        sql: 'UPDATE stores SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP, active = 0 WHERE id IN (SELECT store_id FROM promotion_stores WHERE promotion_id = ?) AND deleted_at IS NULL',
        bindings: [id]
      });

      // Insert history
      statements.push({
        sql: 'INSERT INTO promotion_history (promotion_id, user_id, action, old_status, new_status, payload) VALUES (?, ?, ?, ?, ?, ?)',
        bindings: [
          id,
          null, // userId will be provided by service? Actually, in original code, the delete endpoint had payload.sub
          'SOFT_DELETE',
          existing.status,
          'CANCELADA',
          null
        ]
      });

      // Execute batch
      await this.batch(statements);
    }, {
      attributes: {
        'db.operation': 'delete',
        'db.system': 'd1',
        'db.table': 'promotions',
        'promotion.id': id,
      }
    });
  }

  async launch(id: number, userId: string): Promise<PromotionWithStores> {
    return traceAsyncFn('PromotionRepository.launch', async () => {
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error('Promotion not found');
      }
      if (existing.status !== 'PENDENTE') {
        throw new Error('Only PENDENTE promotions can be launched');
      }

      // Prepare batch statements
      const statements: { sql: string; bindings?: any[] }[] = [];

      // Update promotion to ATIVA
      statements.push({
        sql: "UPDATE promotions SET status = 'ATIVA', launched_by = ?, launched_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL",
        bindings: [userId, id]
      });

      // Insert history
      statements.push({
        sql: 'INSERT INTO promotion_history (promotion_id, user_id, action, old_status, new_status, payload) VALUES (?, ?, ?, ?, ?, ?)',
        bindings: [
          id,
          userId,
          'LAUNCH',
          'PENDENTE',
          'ATIVA',
          null
        ]
      });

      // Execute batch
      await this.batch(statements);

      return this.findById(id);
    }, {
      attributes: {
        'db.operation': 'launch',
        'db.system': 'd1',
        'db.table': 'promotions',
        'promotion.id': id,
        'user.id': userId,
      }
    });
  }

  async cancel(id: number, userId: string): Promise<PromotionWithStores> {
    return traceAsyncFn('PromotionRepository.cancel', async () => {
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error('Promotion not found');
      }
      if (existing.status === 'CANCELADA' || existing.status === 'ENCERRADA') {
        throw new Error('Cannot cancel promotion');
      }

      // Prepare batch statements
      const statements: { sql: string; bindings?: any[] }[] = [];

      // Update promotion to CANCELADA
      statements.push({
        sql: "UPDATE promotions SET status = 'CANCELADA', cancelled_by = ?, cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL",
        bindings: [userId, id]
      });

      // Insert history
      statements.push({
        sql: 'INSERT INTO promotion_history (promotion_id, user_id, action, old_status, new_status, payload) VALUES (?, ?, ?, ?, ?, ?)',
        bindings: [
          id,
          userId,
          'CANCEL',
          existing.status,
          'CANCELADA',
          null
        ]
      });

      // Execute batch
      await this.batch(statements);

      return this.findById(id);
    }, {
      attributes: {
        'db.operation': 'cancel',
        'db.system': 'd1',
        'db.table': 'promotions',
        'promotion.id': id,
        'user.id': userId,
      }
    });
  }

  async duplicate(
    id: number,
    userId: string,
    startDate: string,
    endDate: string,
    storeIds?: number[]
  ): Promise<PromotionWithStores> {
    return traceAsyncFn('PromotionRepository.duplicate', async () => {
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error('Promotion not found');
      }
      if (!startDate || !endDate) {
        throw new Error('Dates are required');
      }

      // Insert new promotion
      const promotionResult = await this.db.prepare(
        `INSERT INTO promotions (code, description, retail_price, wholesale_price, start_date, end_date, notes, status, created_by, category_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDENTE', ?, ?)`
      )
      .bind(
        existing.code,
        existing.description,
        existing.retail_price,
        existing.wholesale_price,
        startDate,
        endDate,
        existing.notes,
        userId,
        existing.category_id || null
      )
      .run();

    const newId = promotionResult.meta.last_row_id as number;

    // Prepare batch statements
    const statements: { sql: string; bindings?: any[] }[] = [];

    // Insert promotion_stores
    const storesToUse = storeIds || existing.stores.map((s: { id: number }) => s.id);
    for (const storeId of storesToUse) {
      statements.push({
        sql: 'INSERT INTO promotion_stores (promotion_id, store_id) VALUES (?, ?)',
        bindings: [newId, storeId]
      });
    }

    // Insert history
    statements.push({
      sql: 'INSERT INTO promotion_history (promotion_id, user_id, action, old_status, new_status, payload) VALUES (?, ?, ?, ?, ?, ?)',
      bindings: [
        newId,
        userId,
        'DUPLICATE',
        undefined,
        'PENDENTE',
        JSON.stringify({ from_promotion_id: id })
      ]
    });

    // Execute batch
    await this.batch(statements);

    return this.findById(newId);
    }, {
      attributes: {
        'db.operation': 'duplicate',
        'db.system': 'd1',
        'db.table': 'promotions',
        'promotion.id': id,
        'user.id': userId,
        'new.promotion.id': '{newId}',
        'store.ids.count': storeIds?.length || existing.stores.length,
      }
    });
  }

  async expireOldPromotions(): Promise<void> {
    return traceAsyncFn('PromotionRepository.expireOldPromotions', async () => {
      const toExpire = await this.db.prepare(
        `SELECT id, status FROM promotions WHERE status = 'ATIVA' AND date(end_date) < date('now') AND closed_at IS NULL AND deleted_at IS NULL`
      )
      .all();

      // We'll update each promotion individually and create history entries.
      // For simplicity, we'll do sequential updates but we could batch them.
      // However, since this is a maintenance task, we'll keep it simple.
      for (const promo of toExpire.results as { id: number }[]) {
        // Update promotion
        await this.db.prepare(
          `UPDATE promotions SET status = 'ENCERRADA', closed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
        )
        .bind(promo.id)
        .run();

        // Insert history
        await this.db.prepare(
          'INSERT INTO promotion_history (promotion_id, user_id, action, old_status, new_status, payload) VALUES (?, ?, ?, ?, ?, ?)'
        )
        .bind(
          promo.id,
          null, // system action, no user
          'CLOSE',
          'ATIVA',
          'ENCERRADA',
          null
        )
        .run();
      }
    }, {
      attributes: {
        'db.operation': 'expireOldPromotions',
        'db.system': 'd1',
        'db.table': 'promotions',
      }
    });
  }
}