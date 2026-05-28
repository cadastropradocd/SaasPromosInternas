export type PromotionStatus = 'PENDENTE' | 'ATIVA' | 'ENCERRADA' | 'CANCELADA'

export type UserRole = 'ADMIN' | 'GESTOR' | 'COMPRADOR'

export interface Store {
  id: number
  name: string
  city: string | null
  active: number
  created_at: string
  updated_at?: string
  deleted_at?: string
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
  updated_at?: string
  deleted_at?: string
  category_id?: number
  launched_by?: string
  launched_at?: string
  closed_at?: string
  cancelled_by?: string
  cancelled_at?: string
  stores?: Store[]
}

export interface Category {
  id: number
  name: string
  active: number
  created_at: string
  updated_at?: string
  deleted_at?: string
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
  category_id?: number
}

export interface UpdatePromotionInput extends Partial<CreatePromotionInput> {}

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
}

export interface AuthPayload {
  sub: string
  email: string
  role: UserRole
  exp: number
}

export interface DashboardStats {
  active: number
  pending: number
  expired: number
  cancelled: number
  expiring_today: number
  expiring_tomorrow: number
}

export interface CreateStoreInput {
  name: string
  city?: string
  active?: boolean
}

export interface UpdateStoreInput extends Partial<CreateStoreInput> {}

export interface CreateCategoryInput {
  name: string
  active?: boolean
}

export interface PromotionHistory {
  id: number
  promotion_id: number
  user_id: string
  action: 'CREATE' | 'UPDATE' | 'LAUNCH' | 'CANCEL' | 'CLOSE' | 'DUPLICATE' | 'SOFT_DELETE'
  old_status?: PromotionStatus
  new_status?: PromotionStatus
  payload?: string
  created_at: string
}