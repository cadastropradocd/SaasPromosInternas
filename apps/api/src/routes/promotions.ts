import { Hono } from 'hono'
import { jwt } from 'hono/jwt'

type Env = {
  DB: D1Database
  JWT_SECRET: string
}

const promotions = new Hono<{ Bindings: Env }>()

const expireOldPromotions = async (db: D1Database) => {
  await db
    .prepare(
      `UPDATE promotions
       SET status = 'ENCERRADA'
       WHERE status = 'ATIVA'
       AND date(end_date) < date('now')`
    )
    .run()
}

const getPromotionWithStores = async (db: D1Database, id: number) => {
  const promo = await db.prepare('SELECT * FROM promotions WHERE id = ?').bind(id).first()
  if (!promo) return null

  const stores = await db
    .prepare(
      `SELECT s.* FROM stores s
       INNER JOIN promotion_stores ps ON s.id = ps.store_id
       WHERE ps.promotion_id = ?`
    )
    .bind(id)
    .all()

  return { ...promo, stores: stores.results }
}

const getAllPromotionsWithStores = async (db: D1Database, query: string, bindings: (string | number)[]) => {
  const result = await db.prepare(query).bind(...bindings).all()

  const promotionsWithStores = await Promise.all(
    result.results.map(async (promo: { id: number }) =>
      getPromotionWithStores(db, promo.id)
    )
  )

  return promotionsWithStores.filter(Boolean)
}

promotions.use('/*', jwt({ secret: c => c.env.JWT_SECRET }))

promotions.get('/', async (c) => {
  const db = c.env.DB
  await expireOldPromotions(db)

  const { status, search, store_id, period } = c.req.query()

  let query = 'SELECT * FROM promotions WHERE 1=1'
  const bindings: (string | number)[] = []

  if (status) {
    query += ' AND status = ?'
    bindings.push(status)
  }

  if (search) {
    query += ' AND (description LIKE ? OR code LIKE ?)'
    bindings.push(`%${search}%`, `%${search}%`)
  }

  if (store_id) {
    query += ` AND id IN (
      SELECT promotion_id FROM promotion_stores WHERE store_id = ?
    )`
    bindings.push(parseInt(store_id))
  }

  if (period) {
    const today = new Date().toISOString().split('T')[0]
    if (period === 'today') {
      query += ` AND date(end_date) = date('${today}')`
    } else if (period === 'week') {
      query += ` AND date(end_date) <= date('${today}', '+7 days')`
    } else if (period === 'month') {
      query += ` AND date(end_date) <= date('${today}', '+30 days')`
    }
  }

  query += ' ORDER BY created_at DESC'

  const result = await getAllPromotionsWithStores(db, query, bindings)
  return c.json(result)
})

promotions.get('/:id', async (c) => {
  const db = c.env.DB
  const id = parseInt(c.req.param('id'))

  const promo = await getPromotionWithStores(db, id)
  if (!promo) {
    return c.json({ error: 'Promoção não encontrada' }, 404)
  }

  return c.json(promo)
})

promotions.post('/', async (c) => {
  const db = c.env.DB
  const payload = c.get('jwtPayload')
  const body = await c.req.json()

  const { description, retail_price, wholesale_price, start_date, end_date, notes, code, store_ids } = body

  if (!description || !retail_price || !start_date || !end_date) {
    return c.json({ error: 'Campos obrigatórios: description, retail_price, start_date, end_date' }, 400)
  }

  const result = await db
    .prepare(
      `INSERT INTO promotions (code, description, retail_price, wholesale_price, start_date, end_date, notes, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDENTE', ?)`
    )
    .bind(
      code || null,
      description,
      retail_price,
      wholesale_price || null,
      start_date,
      end_date,
      notes || null,
      payload.sub
    )
    .run()

  const promotionId = result.meta.last_row_id as number

  if (store_ids && Array.isArray(store_ids) && store_ids.length > 0) {
    for (const storeId of store_ids) {
      await db
        .prepare('INSERT INTO promotion_stores (promotion_id, store_id) VALUES (?, ?)')
        .bind(promotionId, storeId)
        .run()
    }
  }

  const newPromotion = await getPromotionWithStores(db, promotionId)
  return c.json(newPromotion, 201)
})

promotions.put('/:id', async (c) => {
  const db = c.env.DB
  const payload = c.get('jwtPayload')
  const id = parseInt(c.req.param('id'))
  const body = await c.req.json()

  const existing = await db.prepare('SELECT * FROM promotions WHERE id = ?').bind(id).first()
  if (!existing) {
    return c.json({ error: 'Promoção não encontrada' }, 404)
  }

  const canEdit = payload.role === 'GESTOR' ||
    (payload.role === 'COMPRADOR' && existing.status === 'PENDENTE' && existing.created_by === payload.sub)

  if (!canEdit) {
    return c.json({ error: 'Sem permissão para editar' }, 403)
  }

  const updates: string[] = []
  const bindings: (string | number | null)[] = []

  if (body.code !== undefined) { updates.push('code = ?'); bindings.push(body.code) }
  if (body.description !== undefined) { updates.push('description = ?'); bindings.push(body.description) }
  if (body.retail_price !== undefined) { updates.push('retail_price = ?'); bindings.push(body.retail_price) }
  if (body.wholesale_price !== undefined) { updates.push('wholesale_price = ?'); bindings.push(body.wholesale_price) }
  if (body.start_date !== undefined) { updates.push('start_date = ?'); bindings.push(body.start_date) }
  if (body.end_date !== undefined) { updates.push('end_date = ?'); bindings.push(body.end_date) }
  if (body.notes !== undefined) { updates.push('notes = ?'); bindings.push(body.notes) }

  if (updates.length > 0) {
    bindings.push(id)
    await db.prepare(`UPDATE promotions SET ${updates.join(', ')} WHERE id = ?`).bind(...bindings).run()
  }

  if (body.store_ids !== undefined && payload.role === 'GESTOR') {
    await db.prepare('DELETE FROM promotion_stores WHERE promotion_id = ?').bind(id).run()
    if (Array.isArray(body.store_ids) && body.store_ids.length > 0) {
      for (const storeId of body.store_ids) {
        await db
          .prepare('INSERT INTO promotion_stores (promotion_id, store_id) VALUES (?, ?)')
          .bind(id, storeId)
          .run()
      }
    }
  }

  const updated = await getPromotionWithStores(db, id)
  return c.json(updated)
})

promotions.delete('/:id', async (c) => {
  const db = c.env.DB
  const payload = c.get('jwtPayload')
  const id = c.req.param('id')

  if (payload.role !== 'GESTOR') {
    return c.json({ error: 'Apenas gestores podem excluir' }, 403)
  }

  const existing = await db.prepare('SELECT * FROM promotions WHERE id = ?').bind(id).first()
  if (!existing) {
    return c.json({ error: 'Promoção não encontrada' }, 404)
  }

  await db.prepare('DELETE FROM promotion_stores WHERE promotion_id = ?').bind(id).run()
  await db.prepare('DELETE FROM promotions WHERE id = ?').bind(id).run()
  return c.json({ message: 'Promoção excluída' })
})

promotions.post('/:id/launch', async (c) => {
  const db = c.env.DB
  const payload = c.get('jwtPayload')
  const id = parseInt(c.req.param('id'))

  if (payload.role !== 'GESTOR') {
    return c.json({ error: 'Apenas gestores podem lançar promoções' }, 403)
  }

  const existing = await db.prepare('SELECT * FROM promotions WHERE id = ?').bind(id).first()
  if (!existing) {
    return c.json({ error: 'Promoção não encontrada' }, 404)
  }

  if (existing.status !== 'PENDENTE') {
    return c.json({ error: 'Apenas promoções PENDENTE podem ser lançadas' }, 400)
  }

  await db.prepare("UPDATE promotions SET status = 'ATIVA' WHERE id = ?").bind(id).run()

  const updated = await getPromotionWithStores(db, id)
  return c.json(updated)
})

promotions.post('/:id/duplicate', async (c) => {
  const db = c.env.DB
  const payload = c.get('jwtPayload')
  const id = parseInt(c.req.param('id'))
  const body = await c.req.json()

  const existing = await getPromotionWithStores(db, id)
  if (!existing) {
    return c.json({ error: 'Promoção não encontrada' }, 404)
  }

  const { start_date, end_date, store_ids } = body

  if (!start_date || !end_date) {
    return c.json({ error: 'Datas de início e fim são obrigatórias para duplicar' }, 400)
  }

  const result = await db
    .prepare(
      `INSERT INTO promotions (code, description, retail_price, wholesale_price, start_date, end_date, notes, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDENTE', ?)`
    )
    .bind(
      existing.code,
      existing.description,
      existing.retail_price,
      existing.wholesale_price,
      start_date,
      end_date,
      existing.notes,
      payload.sub
    )
    .run()

  const newId = result.meta.last_row_id as number

  const storeIdsToUse = store_ids || (existing.stores as { id: number }[]).map(s => s.id)
  if (storeIdsToUse.length > 0) {
    for (const storeId of storeIdsToUse) {
      await db
        .prepare('INSERT INTO promotion_stores (promotion_id, store_id) VALUES (?, ?)')
        .bind(newId, storeId)
        .run()
    }
  }

  const duplicated = await getPromotionWithStores(db, newId)
  return c.json(duplicated, 201)
})

export { promotions }
