import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../contexts/AuthContext'
import type { Promotion } from '@promos/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const duplicateSchema = z.object({
  start_date: z.string().min(1, 'Data de início obrigatória'),
  end_date: z.string().min(1, 'Data de fim obrigatória'),
}).refine((data) => new Date(data.end_date) >= new Date(data.start_date), {
  message: 'Data de fim deve ser maior ou igual à data de início',
  path: ['end_date'],
})

type DuplicateFormData = z.infer<typeof duplicateSchema>

interface DuplicateModalProps {
  open: boolean
  onClose: () => void
  onDuplicated: () => void
  promotion: Promotion | null
}

export function DuplicateModal({ open, onClose, onDuplicated, promotion }: DuplicateModalProps) {
  const { token } = useAuth()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DuplicateFormData>({
    resolver: zodResolver(duplicateSchema),
    defaultValues: {
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
  })

  const onSubmit = async (data: DuplicateFormData) => {
    if (!promotion) return

    const res = await fetch(`/api/promotions/${promotion.id}/duplicate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    })

    if (res.ok) {
      reset()
      onDuplicated()
      onClose()
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  if (!promotion) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duplicar Promoção</DialogTitle>
        </DialogHeader>

        <div className="mb-4 rounded-lg bg-gray-50 p-3">
          <p className="font-medium">{promotion.description}</p>
          <p className="text-sm text-gray-500">
            Preço: {promotion.retail_price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          {promotion.stores && promotion.stores.length > 0 && (
            <p className="text-sm text-gray-500">
              Lojas: {promotion.stores.map(s => s.name).join(', ')}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="start_date">Nova Data de Início *</Label>
            <Input id="start_date" type="date" {...register('start_date')} />
            {errors.start_date && (
              <p className="mt-1 text-sm text-red-600">{errors.start_date.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="end_date">Nova Data de Fim *</Label>
            <Input id="end_date" type="date" {...register('end_date')} />
            {errors.end_date && (
              <p className="mt-1 text-sm text-red-600">{errors.end_date.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Duplicando...' : 'Duplicar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
