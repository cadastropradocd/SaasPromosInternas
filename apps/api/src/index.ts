import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { auth } from './routes/auth'
import { promotions } from './routes/promotions'
import { stores } from './routes/stores'
import { dashboard } from './routes/dashboard'
import { pdf } from './routes/pdf'

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

app.get('/', (c) => {
  return c.json({ message: 'Promos API', version: '2.0.0' })
})

app.route('/api/auth', auth)
app.route('/api/promotions', promotions)
app.route('/api/stores', stores)
app.route('/api/dashboard', dashboard)
app.route('/api/pdf', pdf)

export default app
export type AppType = typeof app