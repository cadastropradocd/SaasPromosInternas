import { Hono } from 'hono'
import { jwt } from 'hono/jwt'

type Env = {
  DB: D1Database
  JWT_SECRET: string
}

const dashboard = new Hono<{ Bindings: Env }>()

dashboard.use('/*', jwt({ secret: c => c.env.JWT_SECRET }))

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

dashboard.get('/', async (c) => {
  const db = c.env.DB
  await expireOldPromotions(db)

  const today = new Date().toISOString().split('T')[0]

  const [active, pending, expired] = await Promise.all([
    db.prepare(`SELECT COUNT(*) as count FROM promotions WHERE status = 'ATIVA'`).first(),
    db.prepare(`SELECT COUNT(*) as count FROM promotions WHERE status = 'PENDENTE'`).first(),
    db.prepare(`SELECT COUNT(*) as count FROM promotions WHERE status = 'ENCERRADA'`).first(),
  ])

  const expiringToday = await db
    .prepare(`SELECT COUNT(*) as count FROM promotions WHERE status = 'ATIVA' AND date(end_date) = date('now')`)
    .first()

  const expiringTomorrow = await db
    .prepare(`SELECT COUNT(*) as count FROM promotions WHERE status = 'ATIVA' AND date(end_date) = date('now', '+1 day')`)
    .first()

  return c.json({
    active: active?.count || 0,
    pending: pending?.count || 0,
    expired: expired?.count || 0,
    expiring_today: expiringToday?.count || 0,
    expiring_tomorrow: expiringTomorrow?.count || 0,
  })
})

export { dashboard }
