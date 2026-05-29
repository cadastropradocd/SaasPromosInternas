import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { auth } from './routes/auth'
import { promotions } from './routes/promotions'
import { stores } from './routes/stores'
import { dashboard } from './routes/dashboard'
import { pdf } from './routes/pdf'
import { metrics } from './routes/metrics'
import { metricsMiddleware } from './utils/metrics'
import { backupWorker } from './backupWorker'

type Env = {
  JWT_SECRET: string
  DB: D1Database
  BACKUP_BUCKET: R2Bucket
}

const app = new Hono<{ Bindings: Env }>()

// Export fetch handler from Hono app and scheduled backup worker
export default {
  fetch: app.fetch,
  scheduled: backupWorker
}

export type AppType = typeof app

app.use('/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

app.use('/*', metricsMiddleware)

app.get('/', (c) => {
  return c.json({ message: 'Promos API', version: '2.0.0' })
})

app.route('/api/auth', auth)
app.route('/api/promotions', promotions)
app.route('/api/stores', stores)
app.route('/api/dashboard', dashboard)
app.route('/api/pdf', pdf)
app.route('/api/metrics', metrics)

export default app
export type AppType = typeof app