import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import type { Promotion } from '@promos/types'
import { PromotionTable } from '@/components/PromotionTable'
import { DuplicateModal } from '@/components/DuplicateModal'

export function AtivasPage() {
  const { token } = useAuth()
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false)
  const [duplicatingPromo, setDuplicatingPromo] = useState<Promotion | null>(null)

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

  const handleDuplicate = (promo: Promotion) => {
    setDuplicatingPromo(promo)
    setDuplicateModalOpen(true)
  }

  const handleDuplicateModalClose = () => {
    setDuplicateModalOpen(false)
    setDuplicatingPromo(null)
  }

  const handleDuplicated = () => {
    handleDuplicateModalClose()
    fetchPromotions()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Promoções Ativas</h1>
        <p className="text-gray-500">Promoções em andamento</p>
      </div>

      <div className="rounded-lg bg-white shadow">
        <PromotionTable
          data={promotions}
          loading={loading}
          onDuplicate={handleDuplicate}
        />
      </div>

      <DuplicateModal
        open={duplicateModalOpen}
        onClose={handleDuplicateModalClose}
        onDuplicated={handleDuplicated}
        promotion={duplicatingPromo}
      />
    </div>
  )
}
