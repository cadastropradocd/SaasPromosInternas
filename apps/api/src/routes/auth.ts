import { Hono } from 'hono'
import { jwt } from 'hono/jwt'
import * as jose from 'jose'

type Env = {
  JWT_SECRET: string
}

const auth = new Hono<{ Bindings: Env }>()

const users = [
  { id: '1', email: 'comprador@prado.com', password: 'comprador123', role: 'COMPRADOR' as const },
  { id: '2', email: 'gestor@prado.com', password: 'gestor123', role: 'GESTOR' as const },
]

auth.post('/login', async (c) => {
  const { email, password } = await c.req.json()

  const user = users.find((u) => u.email === email && u.password === password)

  if (!user) {
    return c.json({ error: 'Credenciais inválidas' }, 401)
  }

  const secret = new TextEncoder().encode(c.env.JWT_SECRET)
  const token = await new jose.SignJWT({ sub: user.id, email: user.email, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secret)

  return c.json({ token, user: { id: user.id, email: user.email, role: user.role } })
})

auth.get('/me', jwt({ secret: c => c.env.JWT_SECRET, alg: 'HS256' }), async (c) => {
  const payload = c.get('jwtPayload')
  return c.json({ id: payload.sub, email: payload.email, role: payload.role })
})

auth.post('/logout', (c) => {
  return c.json({ message: 'Logout realizado' })
})

export { auth }
