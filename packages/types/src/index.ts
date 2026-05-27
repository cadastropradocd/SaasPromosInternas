export type PromotionStatus = 'PENDENTE' | 'ATIVA' | 'ENCERRADA'

export interface Store {
  id: number
  name: string
  city: string | null
  active: number
  created_at: string
}

export interface Promotion {
  id: number
  code: string | null
  description: string
  retail_price: number
  wholesale_price: number | null
  start_date: string
  end_date: string
  notes: string | null
  status: PromotionStatus
  created_by: string | null
  created_at: string
  stores?: Store[]
}

export interface CreatePromotionInput {
  code?: string
  description: string
  retail_price: number
  wholesale_price?: number
  start_date: string
  end_date: string
  notes?: string
  store_ids?: number[]
}

export interface UpdatePromotionInput extends Partial<CreatePromotionInput> {}

export interface User {
  id: string
  email: string
  role: 'COMPRADOR' | 'GESTOR'
}

export interface AuthPayload {
  sub: string
  email: string
  role: 'COMPRADOR' | 'GESTOR'
  exp: number
}

export interface DashboardStats {
  active: number
  pending: number
  expired: number
  expiring_today: number
  expiring_tomorrow: number
}

export interface CreateStoreInput {
  name: string
  city?: string
  active?: boolean
}

export interface UpdateStoreInput extends Partial<CreateStoreInput> {}
