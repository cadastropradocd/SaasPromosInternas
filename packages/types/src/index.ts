export type PromotionStatus = 'PENDENTE' | 'ATIVA' | 'ENCERRADA'

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
  created_at: string
}

export interface CreatePromotionInput {
  code?: string
  description: string
  retail_price: number
  wholesale_price?: number
  start_date: string
  end_date: string
  notes?: string
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
