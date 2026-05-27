import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import type { Promotion } from '@promos/types'
import { PromotionTable } from '@/components/PromotionTable'

export function HistoricoPage() {
  const { token } = useAuth()
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPromotions = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/promotions?status=ENCERRADA', {
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
        <h1 className="text-2xl font-bold">Histórico</h1>
        <p className="text-gray-500">Promoções encerradas</p>
      </div>

      <div className="rounded-lg bg-white shadow">
        <PromotionTable data={promotions} loading={loading} />
      </div>
    </div>
  )
}
