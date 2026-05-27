import { Hono } from 'hono'
import { jwt } from 'hono/jwt'

type Env = {
  DB: D1Database
  JWT_SECRET: string
}

const stores = new Hono<{ Bindings: Env }>()

stores.use('/*', jwt({ secret: c => c.env.JWT_SECRET }))

stores.get('/', async (c) => {
  const db = c.env.DB
  const { active } = c.req.query()

  let query = 'SELECT * FROM stores'
  if (active !== undefined) {
    query += ' WHERE active = ?'
    const result = await db.prepare(query).bind(active === 'true' ? 1 : 0).all()
    return c.json(result.results)
  }

  const result = await db.prepare(query + ' ORDER BY name ASC').all()
  return c.json(result.results)
})

stores.get('/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')

  const result = await db.prepare('SELECT * FROM stores WHERE id = ?').bind(id).first()
  if (!result) {
    return c.json({ error: 'Loja não encontrada' }, 404)
  }
  return c.json(result)
})

stores.post('/', async (c) => {
  const db = c.env.DB
  const { name, city, active = true } = await c.req.json()

  if (!name) {
    return c.json({ error: 'Nome é obrigatório' }, 400)
  }

  const result = await db
    .prepare('INSERT INTO stores (name, city, active) VALUES (?, ?, ?)')
    .bind(name, city || null, active ? 1 : 0)
    .run()

  const newStore = await db.prepare('SELECT * FROM stores WHERE id = ?').bind(result.meta.last_row_id).first()
  return c.json(newStore, 201)
})

stores.put('/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const { name, city, active } = await c.req.json()

  const existing = await db.prepare('SELECT * FROM stores WHERE id = ?').bind(id).first()
  if (!existing) {
    return c.json({ error: 'Loja não encontrada' }, 404)
  }

  const updates: string[] = []
  const bindings: (string | number | null)[] = []

  if (name !== undefined) { updates.push('name = ?'); bindings.push(name) }
  if (city !== undefined) { updates.push('city = ?'); bindings.push(city) }
  if (active !== undefined) { updates.push('active = ?'); bindings.push(active ? 1 : 0) }

  if (updates.length === 0) {
    return c.json({ error: 'Nenhum campo para atualizar' }, 400)
  }

  bindings.push(parseInt(id))
  await db.prepare(`UPDATE stores SET ${updates.join(', ')} WHERE id = ?`).bind(...bindings).run()

  const updated = await db.prepare('SELECT * FROM stores WHERE id = ?').bind(id).first()
  return c.json(updated)
})

stores.delete('/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const payload = c.get('jwtPayload')

  if (payload.role !== 'GESTOR') {
    return c.json({ error: 'Apenas gestores podem excluir lojas' }, 403)
  }

  const existing = await db.prepare('SELECT * FROM stores WHERE id = ?').bind(id).first()
  if (!existing) {
    return c.json({ error: 'Loja não encontrada' }, 404)
  }

  await db.prepare('DELETE FROM stores WHERE id = ?').bind(id).run()
  return c.json({ message: 'Loja excluída' })
})

export { stores }
