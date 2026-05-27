import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { jwt as jwtMiddleware } from 'hono/jwt'
import * as jose from 'jose'
import type { D1Database } from '@cloudflare/workers-types'

type Env = {
  JWT_SECRET: string
  DB: D1Database
}

const app = new Hono<{ Bindings: Env }>()

app.use('/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

const users = [
  { id: '1', email: 'comprador@prado.com', password: 'comprador123', role: 'COMPRADOR' as const },
  { id: '2', email: 'gestor@prado.com', password: 'gestor123', role: 'GESTOR' as const },
]

app.post('/auth/login', async (c) => {
  const { email, password } = await c.req.json()
  const user = users.find((u) => u.email === email && u.password === password)
  if (!user) return c.json({ error: 'Credenciais inválidas' }, 401)
  const secret = new TextEncoder().encode(c.env.JWT_SECRET)
  const token = await new jose.SignJWT({ sub: user.id, email: user.email, role: user.role })
    .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('8h').sign(secret)
  return c.json({ token, user: { id: user.id, email: user.email, role: user.role } })
})

app.get('/auth/me', jwtMiddleware({ secret: c => c.env.JWT_SECRET }), async (c) => {
  const payload = c.get('jwtPayload')
  return c.json({ id: payload.sub, email: payload.email, role: payload.role })
})

app.post('/auth/logout', (c) => c.json({ message: 'Logout realizado' }))

const expireOldPromotions = async (db: D1Database) => {
  await db.prepare(`UPDATE promotions SET status = 'ENCERRADA' WHERE status = 'ATIVA' AND date(end_date) < date('now')`).run()
}

const getPromotionWithStores = async (db: D1Database, id: number) => {
  const promo = await db.prepare('SELECT * FROM promotions WHERE id = ?').bind(id).first()
  if (!promo) return null
  const stores = await db.prepare(`SELECT s.* FROM stores s INNER JOIN promotion_stores ps ON s.id = ps.store_id WHERE ps.promotion_id = ?`).bind(id).all()
  return { ...promo, stores: stores.results }
}

const getAllPromotionsWithStores = async (db: D1Database, query: string, bindings: (string | number)[]) => {
  const result = await db.prepare(query).bind(...bindings).all()
  return Promise.all(result.results.map(async (promo: { id: number }) => getPromotionWithStores(db, promo.id)))
}

app.get('/promotions', async (c) => {
  const db = c.env.DB
  await expireOldPromotions(db)
  const { status, search, store_id, period } = c.req.query()
  let query = 'SELECT * FROM promotions WHERE 1=1'
  const bindings: (string | number)[] = []
  if (status) { query += ' AND status = ?'; bindings.push(status) }
  if (search) { query += ' AND (description LIKE ? OR code LIKE ?)'; bindings.push(`%${search}%`, `%${search}%`) }
  if (store_id) { query += ` AND id IN (SELECT promotion_id FROM promotion_stores WHERE store_id = ?)`; bindings.push(parseInt(store_id)) }
  query += ' ORDER BY created_at DESC'
  const result = await getAllPromotionsWithStores(db, query, bindings)
  return c.json(result)
})

app.get('/promotions/:id', async (c) => {
  const db = c.env.DB
  const id = parseInt(c.req.param('id'))
  const promo = await getPromotionWithStores(db, id)
  if (!promo) return c.json({ error: 'Promoção não encontrada' }, 404)
  return c.json(promo)
})

app.post('/promotions', jwtMiddleware({ secret: c => c.env.JWT_SECRET }), async (c) => {
  const db = c.env.DB
  const payload = c.get('jwtPayload')
  const { description, retail_price, wholesale_price, start_date, end_date, notes, code, store_ids } = await c.req.json()
  if (!description || !retail_price || !start_date || !end_date) return c.json({ error: 'Campos obrigatórios' }, 400)
  const result = await db.prepare(`INSERT INTO promotions (code, description, retail_price, wholesale_price, start_date, end_date, notes, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDENTE', ?)`).bind(code || null, description, retail_price, wholesale_price || null, start_date, end_date, notes || null, payload.sub).run()
  const promotionId = result.meta.last_row_id as number
  if (store_ids?.length) for (const storeId of store_ids) await db.prepare('INSERT INTO promotion_stores (promotion_id, store_id) VALUES (?, ?)').bind(promotionId, storeId).run()
  const newPromotion = await getPromotionWithStores(db, promotionId)
  return c.json(newPromotion, 201)
})

app.put('/promotions/:id', jwtMiddleware({ secret: c => c.env.JWT_SECRET }), async (c) => {
  const db = c.env.DB
  const payload = c.get('jwtPayload')
  const id = parseInt(c.req.param('id'))
  const body = await c.req.json()
  const existing = await db.prepare('SELECT * FROM promotions WHERE id = ?').bind(id).first()
  if (!existing) return c.json({ error: 'Promoção não encontrada' }, 404)
  const canEdit = payload.role === 'GESTOR' || (payload.role === 'COMPRADOR' && existing.status === 'PENDENTE' && existing.created_by === payload.sub)
  if (!canEdit) return c.json({ error: 'Sem permissão' }, 403)
  const updates: string[] = []
  const bindings: (string | number | null)[] = []
  if (body.code !== undefined) { updates.push('code = ?'); bindings.push(body.code) }
  if (body.description !== undefined) { updates.push('description = ?'); bindings.push(body.description) }
  if (body.retail_price !== undefined) { updates.push('retail_price = ?'); bindings.push(body.retail_price) }
  if (body.wholesale_price !== undefined) { updates.push('wholesale_price = ?'); bindings.push(body.wholesale_price) }
  if (body.start_date !== undefined) { updates.push('start_date = ?'); bindings.push(body.start_date) }
  if (body.end_date !== undefined) { updates.push('end_date = ?'); bindings.push(body.end_date) }
  if (body.notes !== undefined) { updates.push('notes = ?'); bindings.push(body.notes) }
  if (updates.length > 0) { bindings.push(id); await db.prepare(`UPDATE promotions SET ${updates.join(', ')} WHERE id = ?`).bind(...bindings).run() }
  if (body.store_ids !== undefined && payload.role === 'GESTOR') {
    await db.prepare('DELETE FROM promotion_stores WHERE promotion_id = ?').bind(id).run()
    if (body.store_ids.length > 0) for (const storeId of body.store_ids) await db.prepare('INSERT INTO promotion_stores (promotion_id, store_id) VALUES (?, ?)').bind(id, storeId).run()
  }
  const updated = await getPromotionWithStores(db, id)
  return c.json(updated)
})

app.delete('/promotions/:id', jwtMiddleware({ secret: c => c.env.JWT_SECRET }), async (c) => {
  const db = c.env.DB
  const payload = c.get('jwtPayload')
  const id = c.req.param('id')
  if (payload.role !== 'GESTOR') return c.json({ error: 'Apenas gestores podem excluir' }, 403)
  await db.prepare('DELETE FROM promotion_stores WHERE promotion_id = ?').bind(id).run()
  await db.prepare('DELETE FROM promotions WHERE id = ?').bind(id).run()
  return c.json({ message: 'Promoção excluída' })
})

app.post('/promotions/:id/launch', jwtMiddleware({ secret: c => c.env.JWT_SECRET }), async (c) => {
  const db = c.env.DB
  const payload = c.get('jwtPayload')
  const id = parseInt(c.req.param('id'))
  if (payload.role !== 'GESTOR') return c.json({ error: 'Apenas gestores podem lançar' }, 403)
  const existing = await db.prepare('SELECT * FROM promotions WHERE id = ?').bind(id).first()
  if (!existing) return c.json({ error: 'Promoção não encontrada' }, 404)
  if (existing.status !== 'PENDENTE') return c.json({ error: 'Apenas PENDENTE podem ser lançadas' }, 400)
  await db.prepare("UPDATE promotions SET status = 'ATIVA' WHERE id = ?").bind(id).run()
  return c.json(await getPromotionWithStores(db, id))
})

app.post('/promotions/:id/duplicate', jwtMiddleware({ secret: c => c.env.JWT_SECRET }), async (c) => {
  const db = c.env.DB
  const payload = c.get('jwtPayload')
  const id = parseInt(c.req.param('id'))
  const { start_date, end_date, store_ids } = await c.req.json()
  const existing = await getPromotionWithStores(db, id)
  if (!existing) return c.json({ error: 'Promoção não encontrada' }, 404)
  if (!start_date || !end_date) return c.json({ error: 'Datas obrigatórias' }, 400)
  const result = await db.prepare(`INSERT INTO promotions (code, description, retail_price, wholesale_price, start_date, end_date, notes, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDENTE', ?)`).bind(existing.code, existing.description, existing.retail_price, existing.wholesale_price, start_date, end_date, existing.notes, payload.sub).run()
  const newId = result.meta.last_row_id as number
  const storesToUse = store_ids || (existing.stores as { id: number }[]).map(s => s.id)
  for (const storeId of storesToUse) await db.prepare('INSERT INTO promotion_stores (promotion_id, store_id) VALUES (?, ?)').bind(newId, storeId).run()
  return c.json(await getPromotionWithStores(db, newId), 201)
})

app.get('/stores', jwtMiddleware({ secret: c => c.env.JWT_SECRET }), async (c) => {
  const db = c.env.DB
  const { active } = c.req.query()
  if (active !== undefined) {
    const result = await db.prepare('SELECT * FROM stores WHERE active = ?').bind(active === 'true' ? 1 : 0).all()
    return c.json(result.results)
  }
  const result = await db.prepare('SELECT * FROM stores ORDER BY name ASC').all()
  return c.json(result.results)
})

app.get('/stores/:id', jwtMiddleware({ secret: c => c.env.JWT_SECRET }), async (c) => {
  const db = c.env.DB
  const result = await db.prepare('SELECT * FROM stores WHERE id = ?').bind(c.req.param('id')).first()
  if (!result) return c.json({ error: 'Loja não encontrada' }, 404)
  return c.json(result)
})

app.post('/stores', jwtMiddleware({ secret: c => c.env.JWT_SECRET }), async (c) => {
  const db = c.env.DB
  const { name, city, active = true } = await c.req.json()
  if (!name) return c.json({ error: 'Nome é obrigatório' }, 400)
  const result = await db.prepare('INSERT INTO stores (name, city, active) VALUES (?, ?, ?)').bind(name, city || null, active ? 1 : 0).run()
  const newStore = await db.prepare('SELECT * FROM stores WHERE id = ?').bind(result.meta.last_row_id).first()
  return c.json(newStore, 201)
})

app.put('/stores/:id', jwtMiddleware({ secret: c => c.env.JWT_SECRET }), async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const { name, city, active } = await c.req.json()
  const existing = await db.prepare('SELECT * FROM stores WHERE id = ?').bind(id).first()
  if (!existing) return c.json({ error: 'Loja não encontrada' }, 404)
  const updates: string[] = []
  const bindings: (string | number | null)[] = []
  if (name !== undefined) { updates.push('name = ?'); bindings.push(name) }
  if (city !== undefined) { updates.push('city = ?'); bindings.push(city) }
  if (active !== undefined) { updates.push('active = ?'); bindings.push(active ? 1 : 0) }
  if (updates.length === 0) return c.json({ error: 'Nenhum campo para atualizar' }, 400)
  bindings.push(parseInt(id))
  await db.prepare(`UPDATE stores SET ${updates.join(', ')} WHERE id = ?`).bind(...bindings).run()
  return c.json(await db.prepare('SELECT * FROM stores WHERE id = ?').bind(id).first())
})

app.delete('/stores/:id', jwtMiddleware({ secret: c => c.env.JWT_SECRET }), async (c) => {
  const db = c.env.DB
  const payload = c.get('jwtPayload')
  if (payload.role !== 'GESTOR') return c.json({ error: 'Apenas gestores podem excluir' }, 403)
  const existing = await db.prepare('SELECT * FROM stores WHERE id = ?').bind(c.req.param('id')).first()
  if (!existing) return c.json({ error: 'Loja não encontrada' }, 404)
  await db.prepare('DELETE FROM stores WHERE id = ?').bind(c.req.param('id')).run()
  return c.json({ message: 'Loja excluída' })
})

app.get('/dashboard', jwtMiddleware({ secret: c => c.env.JWT_SECRET }), async (c) => {
  const db = c.env.DB
  await expireOldPromotions(db)
  const [active, pending, expired] = await Promise.all([
    db.prepare(`SELECT COUNT(*) as count FROM promotions WHERE status = 'ATIVA'`).first(),
    db.prepare(`SELECT COUNT(*) as count FROM promotions WHERE status = 'PENDENTE'`).first(),
    db.prepare(`SELECT COUNT(*) as count FROM promotions WHERE status = 'ENCERRADA'`).first(),
  ])
  const expiringToday = await db.prepare(`SELECT COUNT(*) as count FROM promotions WHERE status = 'ATIVA' AND date(end_date) = date('now')`).first()
  const expiringTomorrow = await db.prepare(`SELECT COUNT(*) as count FROM promotions WHERE status = 'ATIVA' AND date(end_date) = date('now', '+1 day')`).first()
  return c.json({ active: active?.count || 0, pending: pending?.count || 0, expired: expired?.count || 0, expiring_today: expiringToday?.count || 0, expiring_tomorrow: expiringTomorrow?.count || 0 })
})

app.post('/pdf/generate', jwtMiddleware({ secret: c => c.env.JWT_SECRET }), async (c) => {
  const db = c.env.DB
  const { promotionIds } = await c.req.json()
  if (!promotionIds?.length) return c.json({ error: 'promotionIds é obrigatório' }, 400)
  const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib')
  const promotions: Record<string, unknown>[] = []
  for (const id of promotionIds) {
    const promo = await db.prepare('SELECT * FROM promotions WHERE id = ?').bind(id).first()
    if (promo) {
      const stores = await db.prepare(`SELECT s.name, s.city FROM stores s INNER JOIN promotion_stores ps ON s.id = ps.store_id WHERE ps.promotion_id = ?`).bind(id).all()
      promotions.push({ ...promo, stores: stores.results })
    }
  }
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595.28, 841.89])
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  let y = 800
  page.drawText('CATÁLOGO DE PROMOÇÕES', { x: 180, y, size: 18, font: helveticaBold, color: rgb(0.2, 0.4, 0.6) })
  y -= 40
  page.drawText(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, { x: 50, y, size: 10, font: helvetica, color: rgb(0.5, 0.5, 0.5) })
  y -= 30
  for (const promo of promotions) {
    if (y < 150) { const np = pdfDoc.addPage([595.28, 841.89]); y = 800 }
    page.drawText(promo.description as string || '', { x: 50, y, size: 14, font: helveticaBold, color: rgb(0, 0, 0) })
    y -= 20
    page.drawText(`Código: ${promo.code || 'N/A'}`, { x: 50, y, size: 10, font: helvetica, color: rgb(0.3, 0.3, 0.3) })
    y -= 15
    page.drawText(`Varejo: ${(promo.retail_price as number).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, { x: 50, y, size: 12, font: helveticaBold, color: rgb(0.2, 0.6, 0.2) })
    if (promo.wholesale_price) page.drawText(`Atacado: ${(promo.wholesale_price as number).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, { x: 200, y, size: 12, font: helveticaBold, color: rgb(0.2, 0.6, 0.2) })
    y -= 15
    page.drawText(`Validade: ${new Date(promo.start_date as string).toLocaleDateString('pt-BR')} a ${new Date(promo.end_date as string).toLocaleDateString('pt-BR')}`, { x: 50, y, size: 10, font: helvetica, color: rgb(0.4, 0.4, 0.4) })
    y -= 15
    const stores = promo.stores as { name: string; city: string }[]
    if (stores?.length) { page.drawText('Lojas:', { x: 50, y, size: 10, font: helvetica, color: rgb(0.4, 0.4, 0.4) }); y -= 12; for (const store of stores) { page.drawText(`• ${store.name}${store.city ? ` - ${store.city}` : ''}`, { x: 60, y, size: 9, font: helvetica, color: rgb(0.4, 0.4, 0.4) }); y -= 12 } }
    if (promo.notes) { y -= 5; page.drawText(`Obs: ${promo.notes as string}`, { x: 50, y, size: 9, font: helvetica, color: rgb(0.5, 0.5, 0.5) }) }
    y -= 25
    page.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) })
    y -= 15
  }
  const pdfBytes = await pdfDoc.save()
  return c.json({ url: `data:application/pdf;base64,${Buffer.from(pdfBytes).toString('base64')}`, filename: `promocoes_${Date.now()}.pdf` })
})

export const onRequest = app.fetch