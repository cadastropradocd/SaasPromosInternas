import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import type { Promotion } from '@promos/types'
import { Plus, Rocket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PromotionTable } from '@/components/PromotionTable'
import { PromotionModal } from '@/components/PromotionModal'
import { DuplicateModal } from '@/components/DuplicateModal'

export function PendentesPage() {
  const { token, user } = useAuth()
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false)
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null)
  const [duplicatingPromo, setDuplicatingPromo] = useState<Promotion | null>(null)

  const fetchPromotions = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/promotions?status=PENDENTE', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data: Promotion[] = await res.json()
    setPromotions(data)
    setLoading(false)
  }, [token])

  useEffect(() => {
    fetchPromotions()
  }, [fetchPromotions])

  const handleEdit = (promo: Promotion) => {
    setEditingPromo(promo)
    setModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir?')) return

    await fetch(`/api/promotions/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    fetchPromotions()
  }

  const handleDuplicate = (promo: Promotion) => {
    setDuplicatingPromo(promo)
    setDuplicateModalOpen(true)
  }

  const handleLaunch = async (id: number) => {
    if (!confirm('Deseja lançar esta promoção?')) return

    await fetch(`/api/promotions/${id}/launch`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    fetchPromotions()
  }

  const handleModalClose = () => {
    setModalOpen(false)
    setEditingPromo(null)
  }

  const handleDuplicateModalClose = () => {
    setDuplicateModalOpen(false)
    setDuplicatingPromo(null)
  }

  const handleSaved = () => {
    handleModalClose()
    fetchPromotions()
  }

  const handleDuplicated = () => {
    handleDuplicateModalClose()
    fetchPromotions()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Promoções Pendentes</h1>
          <p className="text-gray-500">Aguardando aprovação</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Promoção
        </Button>
      </div>

      <div className="rounded-lg bg-white shadow">
        <PromotionTable
          data={promotions}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
          extraActions={
            user?.role === 'GESTOR'
              ? [
                  {
                    label: 'Lançar',
                    icon: Rocket,
                    onClick: handleLaunch,
                    variant: 'default' as const,
                  },
                ]
              : []
          }
        />
      </div>

      <PromotionModal
        open={modalOpen}
        onClose={handleModalClose}
        onSaved={handleSaved}
        editing={editingPromo}
      />

      <DuplicateModal
        open={duplicateModalOpen}
        onClose={handleDuplicateModalClose}
        onDuplicated={handleDuplicated}
        promotion={duplicatingPromo}
      />
    </div>
  )
}
