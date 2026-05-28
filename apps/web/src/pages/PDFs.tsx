import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import type { Promotion } from '@promos/types'
import { FileText, Image, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function PDFsPage() {
  const { token } = useAuth()
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [selected, setSelected] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

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

  const toggleSelect = (id: number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  const selectAll = () => {
    if (selected.length === promotions.length) {
      setSelected([])
    } else {
      setSelected(promotions.map((p) => p.id))
    }
  }

  const generatePDF = async () => {
    if (selected.length === 0) return

    setGenerating(true)
    try {
      const res = await fetch('/api/pdf/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ promotionIds: selected }),
      })

      const data = await res.json()

      const link = document.createElement('a')
      link.href = data.url
      link.download = data.filename
      link.click()
    } catch (error) {
      console.error('Error generating PDF:', error)
    } finally {
      setGenerating(false)
    }
  }

  const generateWhatsAppImage = async () => {
    if (selected.length === 0) return

    setGenerating(true)
    try {
      const res = await fetch('/api/pdf/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ promotionIds: selected }),
      })

      const data = await res.json()

      const link = document.createElement('a')
      link.href = data.url
      link.download = `whatsapp_${data.filename}`
      link.click()
    } catch (error) {
      console.error('Error generating image:', error)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gerar PDF</h1>
        <p className="text-gray-500">Selecione as promoções para exportar</p>
      </div>

      <div className="flex flex-wrap gap-4">
        <Button onClick={selectAll} variant="outline">
          {selected.length === promotions.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
        </Button>
        <Button
          onClick={generatePDF}
          disabled={selected.length === 0 || generating}
        >
          <FileText className="mr-2 h-4 w-4" />
          Gerar PDF
        </Button>
        <Button
          onClick={generateWhatsAppImage}
          disabled={selected.length === 0 || generating}
          variant="outline"
        >
          <Image className="mr-2 h-4 w-4" />
          Gerar Imagem WhatsApp
        </Button>
      </div>

      <div className="text-sm text-gray-500">
        {selected.length} promoções selecionadas
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : promotions.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-lg border bg-gray-50">
          <FileText className="h-12 w-12 text-gray-400" />
          <p className="mt-4 text-gray-500">Nenhuma promoção ativa para exportar</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {promotions.map((promo) => (
            <Card
              key={promo.id}
              className={`cursor-pointer transition-all ${
                selected.includes(promo.id)
                  ? 'ring-2 ring-primary'
                  : 'hover:shadow-md'
              }`}
              onClick={() => toggleSelect(promo.id)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {promo.description.length > 30
                    ? promo.description.substring(0, 30) + '...'
                    : promo.description}
                </CardTitle>
                {selected.includes(promo.id) && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-green-600">
                    {promo.retail_price.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </span>
                  <Badge variant="ativa">ATIVA</Badge>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Validade: {new Date(promo.end_date).toLocaleDateString('pt-BR')}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
