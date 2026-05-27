import { Hono } from 'hono'
import { jwt } from 'hono/jwt'
import type { Promotion, CreatePromotionInput, UpdatePromotionInput } from '@promos/types'

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

promotions.use('/*', jwt({ secret: c => c.env.JWT_SECRET }))

promotions.get('/', async (c) => {
  const db = c.env.DB
  await expireOldPromotions(db)

  const { status, search } = c.req.query()
  
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

  query += ' ORDER BY created_at DESC'

  const result = await db.prepare(query).bind(...bindings).all()
  return c.json(result.results)
})

promotions.get('/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')

  const result = await db.prepare('SELECT * FROM promotions WHERE id = ?').bind(id).first()
  
  if (!result) {
    return c.json({ error: 'Promoção não encontrada' }, 404)
  }

  return c.json(result)
})

promotions.post('/', async (c) => {
  const db = c.env.DB
  const payload = c.get('jwtPayload')
  const body: CreatePromotionInput = await c.req.json()

  if (!body.description || !body.retail_price || !body.start_date || !body.end_date) {
    return c.json({ error: 'Campos obrigatórios: description, retail_price, start_date, end_date' }, 400)
  }

  const result = await db
    .prepare(
      `INSERT INTO promotions (code, description, retail_price, wholesale_price, start_date, end_date, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDENTE')`
    )
    .bind(
      body.code || null,
      body.description,
      body.retail_price,
      body.wholesale_price || null,
      body.start_date,
      body.end_date,
      body.notes || null
    )
    .run()

  const newPromotion = await db.prepare('SELECT * FROM promotions WHERE id = ?').bind(result.meta.last_row_id).first()
  return c.json(newPromotion, 201)
})

promotions.put('/:id', async (c) => {
  const db = c.env.DB
  const payload = c.get('jwtPayload')
  const id = c.req.param('id')
  const body: UpdatePromotionInput = await c.req.json()

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

  if (updates.length === 0) {
    return c.json({ error: 'Nenhum campo para atualizar' }, 400)
  }

  bindings.push(parseInt(id))
  await db.prepare(`UPDATE promotions SET ${updates.join(', ')} WHERE id = ?`).bind(...bindings).run()

  const updated = await db.prepare('SELECT * FROM promotions WHERE id = ?').bind(id).first()
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

  await db.prepare('DELETE FROM promotions WHERE id = ?').bind(id).run()
  return c.json({ message: 'Promoção excluída' })
})

promotions.post('/:id/launch', async (c) => {
  const db = c.env.DB
  const payload = c.get('jwtPayload')
  const id = c.req.param('id')

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

  const updated = await db.prepare('SELECT * FROM promotions WHERE id = ?').bind(id).first()
  return c.json(updated)
})

export { promotions }
