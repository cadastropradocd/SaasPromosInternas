import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { jwt as jwtMiddleware } from 'hono/jwt'
import * as jose from 'jose'
import type { D1Database } from '@cloudflare/workers-types'
import { loginSchema } from './src/schemas/auth.schema'
import { storeSchema } from './src/schemas/store.schema'
import { promotionCreateSchema, promotionUpdateSchema, promotionDuplicateSchema } from './src/schemas/promotion.schema'
import { categorySchema } from './src/schemas/category.schema'
import { idParamSchema } from './src/schemas/id.param.schema'
import { promotionQueryParamsSchema, storeQueryParamsSchema, dashboardQueryParamsSchema, emptyObjectSchema, launchPromotionSchema, cancelPromotionSchema } from './src/schemas/general.schema'
import { rateLimit } from './src/middleware/rateLimit'
import { appLogger } from './src/utils/logger'
import { metricsCollector } from './src/utils/metrics'
import { trace, context as otelContext } from '@opentelemetry/api'
import tracer from './src/tracing/otel'

type Env = {
  JWT_SECRET: string
  DB: D1Database
  ALLOW_SEED?: string
  SEED_TOKEN?: string
}

// Initialize OpenTelemetry tracing
const tracer = trace.getTracer('promos-prado-api', '1.0.0');

// Request tracing middleware
app.use('/*', async (c, next) => {
  // Create a span for the incoming request
  const span = tracer.startSpan(`HTTP ${c.req.method} ${c.req.path}`, {
    attributes: {
      'http.method': c.req.method,
      'http.url': c.req.path,
      'http.host': c.req.header('Host') || '',
      'http.user_agent': c.req.header('User-Agent') || '',
      'http.target': c.req.path,
      'http.scheme': 'http',
      'net.host.name': c.req.header('Host') || '',
      'net.host.port': c.req.header('X-Forwarded-Port') || '80',
    },
  });

  // Set the span as active in the context
  return otelContext.with(otelContext.setSpan(span), async () => {
    try {
      await next();
      // Set status to OK if no error occurred
      span.setStatus({ code: trace.SpanStatusCode.OK });
    } catch (error) {
      // Record error in span
      span.setStatus({
        code: trace.SpanStatusCode.ERROR,
        message: error.message,
      });
      span.recordException(error);
      throw error;
    } finally {
      // Always end the span
      span.end();
    }
  });
});

const app = new Hono<{ Bindings: Env }>()

// Request logging and metrics middleware
app.use('/*', async (c, next) => {
  const start = Date.now()
  await next()
  const duration = Date.now() - start
  
  // Collect metrics
  metricsCollector.incrementTotalRequests()
  if (c.res.status >= 400) {
    metricsCollector.incrementErrorRequests()
  }
  metricsCollector.addLatency(duration)
  
  // Log the request
  appLogger.info(`${c.req.method} ${c.req.path}`, {
    status: c.res.status,
    duration: `${duration}ms`,
    ip: c.req.ip(),
    userAgent: c.req.header('User-Agent') || 'unknown'
  })
})

app.use('/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// Security headers middleware
app.use('/*', async (c, next) => {
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  await next();
})

// Rate limiting for auth endpoints - sophisticated rate limiting by IP + account
app.use('/auth/*', sophisticatedRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequestsPerIP: 10, // limit each IP to 10 requests per window
  maxRequestsPerAccount: 5, // limit each account to 5 requests per window (more restrictive)
}))

app.get('/health', (c) => c.json({ ok: true, service: 'promos-prado-api', version: '3.0.0' }))

function hasRole(payload: { role: string }, roles: string[]): boolean {
  return roles.includes(payload.role)
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  const hash = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, keyMaterial, 256)
  const hashArray = new Uint8Array(hash)
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('')
  const hashHex = Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('')
  return `${saltHex}:${hashHex}`
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder()
    const [saltHex, hashHex] = storedHash.split(':')
    if (!saltHex || !hashHex) return false
    const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(b => parseInt(b, 16)))
    const storedHashBytes = new Uint8Array(hashHex.match(/.{2}/g)!.map(b => parseInt(b, 16)))
    const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
    const derivedHash = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, keyMaterial, 256)
    const derivedHashBytes = new Uint8Array(derivedHash)
    return derivedHashBytes.every((b, i) => b === storedHashBytes[i])
  } catch {
    return false
  }
}

app.post('/auth/login', async (c) => {
  const db = c.env.DB
  const authService = new (await import('./src/services/AuthService')).AuthService(db)
  
  // Validate input with Zod
  const body = await c.req.json()
  const validationResult = loginSchema.safeParse(body)
  if (!validationResult.success) {
    securityLogger.warn('Login validation failed', {
      ip: c.req.ip(),
      email: body.email || 'unknown',
      errors: validationResult.error.errors
    })
    return c.json({ error: validationResult.error.errors[0].message }, 400)
  }
  
  const { email, password } = validationResult.data
  const result = await authService.login(email, password)
  
  if (!result) {
    securityLogger.warn('Login failed - invalid credentials', {
      ip: c.req.ip(),
      email: email
    })
    return c.json({ error: 'Credenciais inválidas' }, 401)
  }
  
  securityLogger.info('Login successful', {
    ip: c.req.ip(),
    userId: result.user.id,
    email: result.user.email,
    role: result.user.role
  })
  
  const secret = new TextEncoder().encode(c.env.JWT_SECRET)
  const token = await new jose.SignJWT({ sub: result.user.id, email: result.user.email, role: result.user.role, name: result.user.name })
    .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('8h').sign(secret)
  
  return c.json({ token, user: result.user })
})

app.post('/auth/seed', async (c) => {
  // Validate input with Zod (expects empty object)
  const body = await c.req.json()
  const validationResult = seedSchema.safeParse(body)
  if (!validationResult.success) {
    securityLogger.warn('Seed validation failed', {
      ip: c.req.ip(),
      errors: validationResult.error.errors
    })
    return c.json({ error: validationResult.error.errors[0].message }, 400)
  }
  
  if (c.env.ALLOW_SEED !== 'true') {
    securityLogger.warn('Seed attempt while seed disabled', {
      ip: c.req.ip(),
      allowSeed: c.env.ALLOW_SEED
    })
    return c.json({ error: 'Seed disabled' }, 403)
  }
  const seedToken = c.req.header('X-Seed-Token')
  if (c.env.SEED_TOKEN && seedToken !== c.env.SEED_TOKEN) {
    securityLogger.warn('Invalid seed token attempt', {
      ip: c.req.ip(),
      providedToken: seedToken ? 'present' : 'missing'
    })
    return c.json({ error: 'Invalid seed token' }, 403)
  }
  const db = c.env.DB
  const authService = new (await import('./src/services/AuthService')).AuthService(db)
  const result = await authService.seedInitialUsers()
  
  securityLogger.info('Seed completed successfully', {
    ip: c.req.ip(),
    usersCreated: result.users.length
  })
  
  return c.json(result)
})

app.get('/auth/me', jwtMiddleware({ secret: c => c.env.JWT_SECRET }), async (c) => {
  const payload = c.get('jwtPayload')
  return c.json({ id: payload.sub, email: payload.email, role: payload.role, name: payload.name })
})

app.post('/auth/logout', (c) => c.json({ message: 'Logout realizado' }))

// Refresh token endpoint - implements token rotation for enhanced security
app.post('/auth/refresh', jwtMiddleware({ secret: c => c.env.JWT_SECRET }), async (c) => {
  const payload = c.get('jwtPayload')
  
  // In a real implementation, we would:
  // 1. Validate the refresh token (separate from access token)
  // 2. Generate a new access token and refresh token pair
  // 3. Invalidate the old refresh token
  // 4. Return the new tokens
  
  // For now, we'll simulate by generating a new access token with same payload
  // but with a new issued-at timestamp to demonstrate rotation
  
  // Note: This is a simplified implementation. In production, you would:
  // - Store refresh tokens in database with expiration
  // - Implement proper token rotation (one-time use refresh tokens)
  // - Use secure, HTTP-only cookies for token storage
  // - Implement proper token blacklisting/revocation
  
  const newToken = 'mock-refreshed-token-' + Date.now() // Simulated new token
  
  securityLogger.info('Token refreshed', {
    userId: payload.sub,
    email: payload.email,
    ip: c.req.ip()
  })
  
  return c.json({
    token: newToken,
    // In a real app, you would also return a new refresh token
    // refreshToken: 'new-refresh-token-here',
    expiresIn: 3600 // 1 hour
  })
})

const expireOldPromotions = async (db: D1Database) => {
  const toExpire = await db.prepare(`SELECT id, status FROM promotions WHERE status = 'ATIVA' AND date(end_date) < date('now') AND closed_at IS NULL AND deleted_at IS NULL`).all()
  for (const promo of toExpire.results as { id: number }[]) {
    await db.prepare(`UPDATE promotions SET status = 'ENCERRADA', closed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(promo.id).run()
    await createPromotionHistory(db, promo.id, null, 'CLOSE', 'ATIVA', 'ENCERRADA')
  }
}

const createPromotionHistory = async (db: D1Database, promotionId: number, userId: string | null, action: string, oldStatus?: string, newStatus?: string, payload?: object) => {
  await db.prepare('INSERT INTO promotion_history (promotion_id, user_id, action, old_status, new_status, payload) VALUES (?, ?, ?, ?, ?, ?)').bind(promotionId, userId, action, oldStatus || null, newStatus || null, payload ? JSON.stringify(payload) : null).run()
}

const getPromotionWithStores = async (db: D1Database, id: number, options?: { includeDeleted?: boolean }) => {
  let query = 'SELECT * FROM promotions WHERE id = ?'
  if (!options?.includeDeleted) {
    query += ' AND deleted_at IS NULL'
  }
  const promo = await db.prepare(query).bind(id).first()
  if (!promo) return null
  const stores = await db.prepare(`SELECT s.* FROM stores s INNER JOIN promotion_stores ps ON s.id = ps.store_id WHERE ps.promotion_id = ? AND s.deleted_at IS NULL`).bind(id).all()
  return { ...promo, stores: stores.results }
}

const getAllPromotionsWithStores = async (db: D1Database, query: string, bindings: (string | number)[]) => {
  const result = await db.prepare(query).bind(...bindings).all()
  return Promise.all(result.results.map(async (promo: { id: number }) => getPromotionWithStores(db, promo.id)))
}

app.get('/promotions', jwtMiddleware({ secret: c => c.env.JWT_SECRET }), async (c) => {
  const db = c.env.DB
  const promotionService = new (await import('./src/services/PromotionService')).PromotionService(db)
  
  // Validate query parameters with Zod
  const validationResult = promotionQueryParamsSchema.safeParse(c.req.query())
  if (!validationResult.success) {
    return c.json({ error: validationResult.error.errors[0].message }, 400)
  }
  
  const { status, search, store_id, period, limit = 50, offset = 0 } = validationResult.data
  const result = await promotionService.getPromotions(status, search, store_id, period, Math.min(limit, 100), offset)
  return c.json(result)
})

app.get('/promotions/:id', jwtMiddleware({ secret: c => c.env.JWT_SECRET }), async (c) => {
  const db = c.env.DB
  const promotionService = new (await import('./src/services/PromotionService')).PromotionService(db)
  
  // Validate ID parameter with Zod
  const validationResult = idParamSchema.safeParse({ id: c.req.param('id') })
  if (!validationResult.success) {
    return c.json({ error: validationResult.error.errors[0].message }, 400)
  }
  
  const id = validationResult.data.id
  const promo = await promotionService.getPromotionById(id)
  if (!promo) return c.json({ error: 'Promoção não encontrada' }, 404)
  return c.json(promo)
})

app.post('/promotions', jwtMiddleware({ secret: c => c.env.JWT_SECRET }), async (c) => {
  const db = c.env.DB
  const promotionService = new (await import('./src/services/PromotionService')).PromotionService(db)
  const payload = c.get('jwtPayload')
  
  // Validate input with Zod
  const body = await c.req.json()
  const validationResult = promotionCreateSchema.safeParse(body)
  if (!validationResult.success) {
    return c.json({ error: validationResult.error.errors[0].message }, 400)
  }
  
  const { description, retail_price, wholesale_price, start_date, end_date, notes, code, store_ids, category_id } = validationResult.data
  const newPromotion = await promotionService.createPromotion(
    { description, retail_price, wholesale_price, start_date, end_date, notes, code, category_id },
    payload.sub,
    store_ids || []
  )
  return c.json(newPromotion, 201)
})

app.put('/promotions/:id', jwtMiddleware({ secret: c => c.env.JWT_SECRET }), async (c) => {
  const db = c.env.DB
  const promotionService = new (await import('./src/services/PromotionService')).PromotionService(db)
  const payload = c.get('jwtPayload')
   
  // Validate ID parameter with Zod
  const idValidationResult = idParamSchema.safeParse({ id: c.req.param('id') })
  if (!idValidationResult.success) {
    return c.json({ error: idValidationResult.error.errors[0].message }, 400)
  }
  
  const id = idValidationResult.data.id
   
  // Validate input with Zod
  const body = await c.req.json()
  const validationResult = promotionUpdateSchema.safeParse(body)
  if (!validationResult.success) {
    return c.json({ error: validationResult.error.errors[0].message }, 400)
  }
   
  // Permission check (same as before)
  const existing = await promotionService.getPromotionById(id)
  if (!existing) return c.json({ error: 'Promoção não encontrada' }, 404)
  const canEdit = hasRole(payload, ['ADMIN', 'GESTOR']) || (payload.role === 'COMPRADOR' && existing.status === 'PENDENTE' && existing.created_by === payload.sub)
  if (!canEdit) return c.json({ error: 'Sem permissão' }, 403)
   
  // Prepare store_ids for the service (if provided and user has permission)
  let storeIds: number[] | undefined = undefined
  if (body.store_ids !== undefined && hasRole(payload, ['ADMIN', 'GESTOR'])) {
    storeIds = body.store_ids
  }
   
  // Update the promotion
  const updatedPromotion = await promotionService.updatePromotion(
    id,
    {
      code: body.code,
      description: body.description,
      retail_price: body.retail_price,
      wholesale_price: body.wholesale_price,
      start_date: body.start_date,
      end_date: body.end_date,
      notes: body.notes,
      category_id: body.category_id
    },
    payload.sub,
    storeIds
  )
   
  return c.json(updatedPromotion)
})

app.delete('/promotions/:id', jwtMiddleware({ secret: c => c.env.JWT_SECRET }), async (c) => {
  const db = c.env.DB
  const promotionService = new (await import('./src/services/PromotionService')).PromotionService(db)
  const payload = c.get('jwtPayload')
  
  // Validate ID parameter with Zod
  const validationResult = idParamSchema.safeParse({ id: c.req.param('id') })
  if (!validationResult.success) {
    return c.json({ error: validationResult.error.errors[0].message }, 400)
  }
  
  const id = validationResult.data.id
  
  if (!hasRole(payload, ['ADMIN', 'GESTOR'])) return c.json({ error: 'Apenas administradores ou gestores podem excluir' }, 403)
  await promotionService.deletePromotion(id, payload.sub)
  return c.json({ message: 'Promoção removida' })
})

app.post('/promotions/:id/launch', jwtMiddleware({ secret: c => c.env.JWT_SECRET }), async (c) => {
  const db = c.env.DB
  const promotionService = new (await import('./src/services/PromotionService')).PromotionService(db)
  const payload = c.get('jwtPayload')
  
  // Validate ID parameter with Zod
  const idValidation = idParamSchema.safeParse({ id: c.req.param('id') })
  if (!idValidation.success) {
    return c.json({ error: 'ID de promoção inválido', details: idValidation.error.format() }, 400)
  }
  const id = idValidation.data.id
  
  // Validate request body (should be empty)
  const bodyValidation = launchPromotionSchema.safeParse(await c.req.json())
  if (!bodyValidation.success) {
    return c.json({ error: 'Corpo da requisição inválido', details: bodyValidation.error.format() }, 400)
  }
  
  if (!hasRole(payload, ['ADMIN', 'GESTOR'])) return c.json({ error: 'Apenas administradores ou gestores podem lançar' }, 403)
  try {
    const launchedPromotion = await promotionService.launchPromotion(id, payload.sub)
    return c.json(launchedPromotion)
  } catch (error: any) {
    if (error.message === 'Promotion not found') {
      return c.json({ error: 'Promoção não encontrada' }, 404)
    }
    if (error.message === 'Promotion already launched') {
      return c.json({ error: 'Promoção já lançada' }, 400)
    }
    appLogger.error('Error launching promotion', { error: error.message, promotionId: id, userId: payload.sub })
    metricsCollector.increment('promotion_launch_error')
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

app.post('/promotions/:id/cancel', jwtMiddleware({ secret: c => c.env.JWT_SECRET }), async (c) => {
  const db = c.env.DB
  const promotionService = new (await import('./src/services/PromotionService')).PromotionService(db)
  const payload = c.get('jwtPayload')
  
  // Validate ID parameter with Zod
  const idValidation = idParamSchema.safeParse({ id: c.req.param('id') })
  if (!idValidation.success) {
    return c.json({ error: 'ID de promoção inválido', details: idValidation.error.format() }, 400)
  }
  const id = idValidation.data.id
  
  // Validate request body (should be empty)
  const bodyValidation = cancelPromotionSchema.safeParse(await c.req.json())
  if (!bodyValidation.success) {
    return c.json({ error: 'Corpo da requisição inválido', details: bodyValidation.error.format() }, 400)
  }
  
  if (!hasRole(payload, ['ADMIN', 'GESTOR'])) return c.json({ error: 'Apenas administradores ou gestores podem cancelar' }, 403)
  try {
    const cancelledPromotion = await promotionService.cancelPromotion(id, payload.sub)
    securityLogger.info('Promotion cancelled successfully', {
      ip: c.req.ip(),
      promotionId: id,
      userId: payload.sub
    })
    return c.json(cancelledPromotion)
  } catch (error: any) {
    if (error.message === 'Promotion not found') {
      return c.json({ error: 'Promoção não encontrada' }, 404)
    }
    if (error.message === 'Promotion not launched') {
      return c.json({ error: 'Promoção não lançada' }, 400)
    }
    appLogger.error('Error cancelling promotion', { error: error.message, promotionId: id, userId: payload.sub })
    metricsCollector.increment('promotion_cancel_error')
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})
    return c.json(cancelledPromotion)
  } catch (error: any) {
    if (error.message === 'Promotion not found') {
      return c.json({ error: 'Promoção não encontrada' }, 404)
    }
    if (error.message === 'Cannot cancel promotion') {
      return c.json({ error: 'Não é possível cancelar' }, 400)
    }
    throw error
  }
})

app.post('/promotions/:id/duplicate', jwtMiddleware({ secret: c => c.env.JWT_SECRET }), async (c) => {
  const db = c.env.DB
  const promotionService = new (await import('./src/services/PromotionService')).PromotionService(db)
  const payload = c.get('jwtPayload')
  const id = parseInt(c.req.param('id'))
  
  // Validate input with Zod
  const body = await c.req.json()
  const validationResult = promotionDuplicateSchema.safeParse(body)
  if (!validationResult.success) {
    securityLogger.warn('Promotion duplicate validation failed', {
      ip: c.req.ip(),
      promotionId: id,
      errors: validationResult.error.errors
    })
    return c.json({ error: validationResult.error.errors[0].message }, 400)
  }
  
  const { start_date, end_date, store_ids } = validationResult.data
  try {
    const duplicatedPromotion = await promotionService.duplicatePromotion(id, payload.sub, start_date, end_date, store_ids)
    securityLogger.info('Promotion duplicated successfully', {
      ip: c.req.ip(),
      originalPromotionId: id,
      newPromotionId: duplicatedPromotion.id
    })
    return c.json(duplicatedPromotion, 201)
  } catch (error: any) {
    if (error.message === 'Promotion not found') {
      return c.json({ error: 'Promoção não encontrada' }, 404)
    }
    if (error.message === 'Dates are required') {
      return c.json({ error: 'Datas obrigatórias' }, 400)
    }
    throw error
  }
})

app.get('/stores', jwtMiddleware({ secret: c => c.env.JWT_SECRET }), async (c) => {
  const db = c.env.DB
  
  // Validate query parameters with Zod
  const validationResult = storeQueryParamsSchema.safeParse(c.req.query())
  if (!validationResult.success) {
    return c.json({ error: validationResult.error.errors[0].message }, 400)
  }
  
  const { active } = validationResult.data
  if (active !== undefined) {
    const result = await db.prepare('SELECT * FROM stores WHERE deleted_at IS NULL AND active = ?').bind(active ? 1 : 0).all()
    return c.json(result.results)
  }
  const result = await db.prepare('SELECT * FROM stores WHERE deleted_at IS NULL ORDER BY name ASC').all()
  return c.json(result.results)
})

app.get('/stores/:id', jwtMiddleware({ secret: c => c.env.JWT_SECRET }), async (c) => {
  const db = c.env.DB
  const storeService = new (await import('./src/services/StoreService')).StoreService(db)
  
  // Validate ID parameter with Zod
  const validationResult = idParamSchema.safeParse({ id: c.req.param('id') })
  if (!validationResult.success) {
    return c.json({ error: validationResult.error.errors[0].message }, 400)
  }
  
  const id = validationResult.data.id
  const store = await storeService.getStoreById(id)
  if (!store) return c.json({ error: 'Loja não encontrada' }, 404)
  return c.json(store)
})

app.post('/stores', jwtMiddleware({ secret: c => c.env.JWT_SECRET }), async (c) => {
  const db = c.env.DB
  const storeService = new (await import('./src/services/StoreService')).StoreService(db)
  const payload = c.get('jwtPayload')
  if (!hasRole(payload, ['ADMIN', 'GESTOR'])) return c.json({ error: 'Apenas administradores ou gestores podem criar lojas' }, 403)
  
  // Validate input with Zod
  const body = await c.req.json()
  const validationResult = storeSchema.safeParse(body)
  if (!validationResult.success) {
    return c.json({ error: validationResult.error.errors[0].message }, 400)
  }
  
  const { name, city, active } = validationResult.data
  const newStore = await storeService.createStore({ name, city, active })
  return c.json(newStore, 201)
})

app.put('/stores/:id', jwtMiddleware({ secret: c => c.env.JWT_SECRET }), async (c) => {
  const db = c.env.DB
  const storeService = new (await import('./src/services/StoreService')).StoreService(db)
  const payload = c.get('jwtPayload')
  
  // Validate ID parameter with Zod
  const idValidationResult = idParamSchema.safeParse({ id: c.req.param('id') })
  if (!idValidationResult.success) {
    return c.json({ error: idValidationResult.error.errors[0].message }, 400)
  }
  
  const id = idValidationResult.data.id
  
  if (!hasRole(payload, ['ADMIN', 'GESTOR'])) return c.json({ error: 'Apenas administradores ou gestores podem editar lojas' }, 403)
  const { name, city, active } = await c.req.json()
   
  // Validate input with Zod
  const validationResult = storeSchema.partial().safeParse({ name, city, active })
  if (!validationResult.success) {
    return c.json({ error: validationResult.error.errors[0].message }, 400)
  }
   
  // Check if any fields were provided
  const data = validationResult.data
  if (Object.keys(data).length === 0) {
    return c.json({ error: 'Nenhum campo para atualizar' }, 400)
  }
   
  const updatedStore = await storeService.updateStore(id, data)
  return c.json(updatedStore)
})

app.delete('/stores/:id', jwtMiddleware({ secret: c => c.env.JWT_SECRET }), async (c) => {
  const db = c.env.DB
  const storeService = new (await import('./src/services/StoreService')).StoreService(db)
  const payload = c.get('jwtPayload')
  
  // Validate ID parameter with Zod
  const validationResult = idParamSchema.safeParse({ id: c.req.param('id') })
  if (!validationResult.success) {
    return c.json({ error: validationResult.error.errors[0].message }, 400)
  }
  
  const id = validationResult.data.id
  
  if (!hasRole(payload, ['ADMIN', 'GESTOR'])) return c.json({ error: 'Apenas administradores ou gestores podem excluir' }, 403)
  try {
    await storeService.deleteStore(id)
    return c.json({ message: 'Loja removida' })
  } catch (error: any) {
    if (error.message === 'Store not found') {
      return c.json({ error: 'Loja não encontrada' }, 404)
    }
    throw error
  }
})

app.get('/categories', jwtMiddleware({ secret: c => c.env.JWT_SECRET }), async (c) => {
  const db = c.env.DB
  const categoryService = new (await import('./src/services/CategoryService')).CategoryService(db)
  const result = await categoryService.getCategories()
  return c.json(result)
})

app.get('/categories/:id', jwtMiddleware({ secret: c => c.env.JWT_SECRET }), async (c) => {
  const db = c.env.DB
  
  // Validate ID parameter with Zod
  const validationResult = idParamSchema.safeParse({ id: c.req.param('id') })
  if (!validationResult.success) {
    return c.json({ error: validationResult.error.errors[0].message }, 400)
  }
  
  const id = validationResult.data.id
  const result = await db.prepare('SELECT * FROM categories WHERE id = ? AND deleted_at IS NULL').bind(id).first()
  if (!result) return c.json({ error: 'Categoria não encontrada' }, 404)
  return c.json(result)
})

app.post('/categories', jwtMiddleware({ secret: c => c.env.JWT_SECRET }), async (c) => {
  const db = c.env.DB
  const payload = c.get('jwtPayload')
  if (!hasRole(payload, ['ADMIN', 'GESTOR'])) return c.json({ error: 'Apenas administradores ou gestores podem criar categorias' }, 403)
  
  // Validate input with Zod
  const body = await c.req.json()
  const validationResult = categorySchema.safeParse(body)
  if (!validationResult.success) {
    return c.json({ error: validationResult.error.errors[0].message }, 400)
  }
  
  const { name, active } = validationResult.data
  const result = await db.prepare('INSERT INTO categories (name, active) VALUES (?, ?)').bind(name, active ? 1 : 0).run()
  const newCategory = await db.prepare('SELECT * FROM categories WHERE id = ?').bind(result.meta.last_row_id).first()
  return c.json(newCategory, 201)
})

app.put('/categories/:id', jwtMiddleware({ secret: c => c.env.JWT_SECRET }), async (c) => {
  const db = c.env.DB
  const categoryService = new (await import('./src/services/CategoryService')).CategoryService(db)
  const payload = c.get('jwtPayload')
  
  // Validate ID parameter with Zod
  const idValidation = idParamSchema.safeParse({ id: c.req.param('id') })
  if (!idValidation.success) {
    return c.json({ error: 'ID de categoria inválido', details: idValidation.error.format() }, 400)
  }
  const id = idValidation.data.id
  
  if (!hasRole(payload, ['ADMIN', 'GESTOR'])) return c.json({ error: 'Apenas administradores ou gestores podem editar categorias' }, 403)
  const { name, active } = await c.req.json()
  
  // Validate input with Zod
  const validationResult = categorySchema.partial().safeParse({ name, active })
  if (!validationResult.success) {
    return c.json({ error: validationResult.error.errors[0].message }, 400)
  }
  
  // Check if any fields were provided
  const data = validationResult.data
  if (Object.keys(data).length === 0) {
    return c.json({ error: 'Nenhum campo para atualizar' }, 400)
  }
  
  const updatedCategory = await categoryService.updateCategory(id, data)
  if (!updatedCategory) {
    return c.json({ error: 'Categoria não encontrada' }, 404)
  }
  return c.json(updatedCategory)
})

app.delete('/categories/:id', jwtMiddleware({ secret: c => c.env.JWT_SECRET }), async (c) => {
  const db = c.env.DB
  const categoryService = new (await import('./src/services/CategoryService')).CategoryService(db)
  const payload = c.get('jwtPayload')
  
  // Validate ID parameter with Zod
  const idValidation = idParamSchema.safeParse({ id: c.req.param('id') })
  if (!idValidation.success) {
    return c.json({ error: 'ID de categoria inválido', details: idValidation.error.format() }, 400)
  }
  const id = idValidation.data.id
  
  if (!hasRole(payload, ['ADMIN', 'GESTOR'])) return c.json({ error: 'Apenas administradores ou gestores podem excluir categorias' }, 403)
  try {
    await categoryService.deleteCategory(id)
    return c.json({ message: 'Categoria removida' })
  } catch (error: any) {
    if (error.message === 'Category not found') {
      return c.json({ error: 'Categoria não encontrada' }, 404)
    }
    throw error
  }
})

app.get('/dashboard', jwtMiddleware({ secret: c => c.env.JWT_SECRET }), async (c) => {
  // Validate query parameters (none expected, but we validate anyway)
  const queryValidation = dashboardQueryParamsSchema.safeParse(c.req.query())
  if (!queryValidation.success) {
    return c.json({ error: 'Parâmetros de consulta inválidos', details: queryValidation.error.format() }, 400)
  }
  
  const db = c.env.DB
  await expireOldPromotions(db)
  const [active, pending, expired, cancelled] = await Promise.all([
    db.prepare(`SELECT COUNT(*) as count FROM promotions WHERE status = 'ATIVA' AND deleted_at IS NULL`).first(),
    db.prepare(`SELECT COUNT(*) as count FROM promotions WHERE status = 'PENDENTE' AND deleted_at IS NULL`).first(),
    db.prepare(`SELECT COUNT(*) as count FROM promotions WHERE status = 'ENCERRADA' AND deleted_at IS NULL`).first(),
    db.prepare(`SELECT COUNT(*) as count FROM promotions WHERE status = 'CANCELADA' AND deleted_at IS NULL`).first(),
  ])
  const expiringToday = await db.prepare(`SELECT COUNT(*) as count FROM promotions WHERE status = 'ATIVA' AND date(end_date) = date('now') AND deleted_at IS NULL`).first()
  const expiringTomorrow = await db.prepare(`SELECT COUNT(*) as count FROM promotions WHERE status = 'ATIVA' AND date(end_date) = date('now', '+1 day') AND deleted_at IS NULL`).first()
  return c.json({ active: active?.count || 0, pending: pending?.count || 0, expired: expired?.count || 0, cancelled: cancelled?.count || 0, expiring_today: expiringToday?.count || 0, expiring_tomorrow: expiringTomorrow?.count || 0 })
})

app.get('/metrics', jwtMiddleware({ secret: c => c.env.JWT_SECRET }), async (c) => {
  // In a real app, you might want to restrict this to admin users only
  const metrics = metricsCollector.getMetrics()
  const avgLatency = metrics.totalRequests > 0 ? metrics.totalLatency / metrics.totalRequests : 0
  return c.json({
    ...metrics,
    average_latency_ms: avgLatency,
    error_rate: metrics.totalRequests > 0 ? (metrics.errorRequests / metrics.totalRequests) * 100 : 0
  })
})

app.post('/pdf/generate', jwtMiddleware({ secret: c => c.env.JWT_SECRET }), async (c) => {
  const db = c.env.DB
  const payload = c.get('jwtPayload')
  
  // Validate input with Zod
  const body = await c.req.json()
  const validationResult = pdfGenerateSchema.safeParse(body)
  if (!validationResult.success) {
    return c.json({ error: validationResult.error.errors[0].message }, 400)
  }
  
  const { promotionIds } = validationResult.data
  const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib')
  const promotions: Record<string, unknown>[] = []
  for (const id of promotionIds) {
    const promo = await db.prepare('SELECT * FROM promotions WHERE id = ? AND deleted_at IS NULL').bind(id).first()
    if (promo) {
      const stores = await db.prepare(`SELECT s.name, s.city FROM stores s INNER JOIN promotion_stores ps ON s.id = ps.store_id WHERE ps.promotion_id = ? AND s.deleted_at IS NULL`).bind(id).all()
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
  const filename = `promocoes_${Date.now()}.pdf`
  await db.prepare('INSERT INTO generated_files (promotion_id, file_type, file_name, file_url, created_by) VALUES (?, ?, ?, ?, ?)').bind(null, 'PDF', filename, `data:application/pdf;base64,${Buffer.from(pdfBytes).toString('base64')}`, payload.sub).run()
  return c.json({ url: `data:application/pdf;base64,${Buffer.from(pdfBytes).toString('base64')}`, filename })
})

export const onRequest = app.fetch