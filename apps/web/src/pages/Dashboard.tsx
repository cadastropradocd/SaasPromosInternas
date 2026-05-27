import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import type { Promotion } from '@promos/types'
import { Clock, CheckCircle, History, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function DashboardPage() {
  const { token } = useAuth()
  const [stats, setStats] = useState({
    pendentes: 0,
    ativas: 0,
    encerradas: 0,
  })
  const [recent, setRecent] = useState<Promotion[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch('/api/promotions', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data: Promotion[] = await res.json()

      setStats({
        pendentes: data.filter((p) => p.status === 'PENDENTE').length,
        ativas: data.filter((p) => p.status === 'ATIVA').length,
        encerradas: data.filter((p) => p.status === 'ENCERRADA').length,
      })

      setRecent(data.slice(0, 5))
    }

    fetchData()
  }, [token])

  const statCards = [
    {
      label: 'Pendentes',
      value: stats.pendentes,
      icon: Clock,
      color: 'text-gray-600',
      bg: 'bg-gray-100',
    },
    {
      label: 'Ativas',
      value: stats.ativas,
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-100',
    },
    {
      label: 'Encerradas',
      value: stats.encerradas,
      icon: History,
      color: 'text-red-600',
      bg: 'bg-red-100',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-500">Visão geral das promoções</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className="flex items-center gap-4 rounded-lg bg-white p-6 shadow"
            >
              <div className={`rounded-full p-3 ${card.bg}`}>
                <Icon className={`h-6 w-6 ${card.color}`} />
              </div>
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-2xl font-bold">{card.value}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Promoções Recentes</h2>
        </div>

        {recent.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma promoção cadastrada</p>
        ) : (
          <div className="space-y-3">
            {recent.map((promo) => (
              <div
                key={promo.id}
                className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
              >
                <div>
                  <p className="font-medium">{promo.description}</p>
                  <p className="text-sm text-gray-500">
                    {promo.retail_price.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </p>
                </div>
                <Badge variant={promo.status.toLowerCase() as 'pendente' | 'ativa' | 'encerrada'}>
                  {promo.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
