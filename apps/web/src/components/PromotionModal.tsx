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

const promotionSchema = z.object({
  code: z.string().optional(),
  description: z.string().min(1, 'Descrição obrigatória'),
  retail_price: z.coerce.number().min(0.01, 'Preço obrigatório'),
  wholesale_price: z.coerce.number().optional(),
  start_date: z.string().min(1, 'Data de início obrigatória'),
  end_date: z.string().min(1, 'Data de fim obrigatória'),
  notes: z.string().optional(),
}).refine((data) => new Date(data.end_date) >= new Date(data.start_date), {
  message: 'Data de fim deve ser maior ou igual à data de início',
  path: ['end_date'],
})

type PromotionFormData = z.infer<typeof promotionSchema>

interface PromotionModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editing?: Promotion | null
}

export function PromotionModal({ open, onClose, onSaved, editing }: PromotionModalProps) {
  const { token } = useAuth()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PromotionFormData>({
    resolver: zodResolver(promotionSchema),
    defaultValues: editing
      ? {
          code: editing.code || '',
          description: editing.description,
          retail_price: editing.retail_price,
          wholesale_price: editing.wholesale_price || undefined,
          start_date: editing.start_date,
          end_date: editing.end_date,
          notes: editing.notes || '',
        }
      : {
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        },
  })

  const onSubmit = async (data: PromotionFormData) => {
    const url = editing
      ? `/api/promotions/${editing.id}`
      : '/api/promotions'
    const method = editing ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    })

    if (res.ok) {
      reset()
      onSaved()
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {editing ? 'Editar Promoção' : 'Nova Promoção'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="code">Código</Label>
            <Input id="code" {...register('code')} placeholder="Opcional" />
          </div>

          <div>
            <Label htmlFor="description">Descrição *</Label>
            <Input
              id="description"
              {...register('description')}
              placeholder="Descrição da promoção"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="retail_price">Preço Varejo *</Label>
              <Input
                id="retail_price"
                type="number"
                step="0.01"
                {...register('retail_price')}
                placeholder="0.00"
              />
              {errors.retail_price && (
                <p className="mt-1 text-sm text-red-600">{errors.retail_price.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="wholesale_price">Preço Atacado</Label>
              <Input
                id="wholesale_price"
                type="number"
                step="0.01"
                {...register('wholesale_price')}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_date">Data Início *</Label>
              <Input id="start_date" type="date" {...register('start_date')} />
              {errors.start_date && (
                <p className="mt-1 text-sm text-red-600">{errors.start_date.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="end_date">Data Fim *</Label>
              <Input id="end_date" type="date" {...register('end_date')} />
              {errors.end_date && (
                <p className="mt-1 text-sm text-red-600">{errors.end_date.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Observações</Label>
            <Input id="notes" {...register('notes')} placeholder="Opcional" />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : editing ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
