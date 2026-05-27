import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { env } from 'hono/adapter'
import { handle } from 'hono/cloudflare-workers'
import { auth } from './routes/auth'
import { promotions } from './routes/promotions'

type Env = {
  JWT_SECRET: string
  DB: D1Database
}

const app = new Hono<{ Bindings: Env }>()

app.use('/*', cors())

app.get('/', (c) => {
  return c.json({ message: 'Promos API', version: '1.0.0' })
})

app.route('/auth', auth)
app.route('/promotions', promotions)

export default app
export type AppType = typeof app
