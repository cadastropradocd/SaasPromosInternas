import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import type { Promotion } from '@promos/types'
import { PromotionTable } from '@/components/PromotionTable'
import { useNavigate } from 'react-router-dom'

export function AtivasPage() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPromotions = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/promotions?status=ATIVA', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data: Promotion[] = await res.json()
    setPromotions(data)
    setLoading(false)
  }, [token])

  useEffect(() => {
    fetchPromotions()
  }, [fetchPromotions])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Promoções Ativas</h1>
        <p className="text-gray-500">Promoções em andamento</p>
      </div>

      <div className="rounded-lg bg-white shadow">
        <PromotionTable data={promotions} loading={loading} />
      </div>
    </div>
  )
}
