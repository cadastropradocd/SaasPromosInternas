import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import type { DashboardStats } from '@promos/types'
import { Clock, CheckCircle, History, AlertTriangle, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function DashboardPage() {
  const { token } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      const res = await fetch('/api/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data: DashboardStats = await res.json()
      setStats(data)
    }

    fetchStats()
  }, [token])

  const statCards = [
    {
      label: 'Pendentes',
      value: stats?.pending || 0,
      icon: Clock,
      color: 'text-gray-600 bg-gray-100',
      href: '/pendentes',
    },
    {
      label: 'Ativas',
      value: stats?.active || 0,
      icon: CheckCircle,
      color: 'text-green-600 bg-green-100',
      href: '/ativas',
    },
    {
      label: 'Encerradas',
      value: stats?.expired || 0,
      icon: History,
      color: 'text-red-600 bg-red-100',
      href: '/historico',
    },
    {
      label: 'Vencendo Hoje',
      value: stats?.expiring_today || 0,
      icon: AlertTriangle,
      color: 'text-yellow-600 bg-yellow-100',
      href: '/ativas',
    },
    {
      label: 'Vencendo Amanhã',
      value: stats?.expiring_tomorrow || 0,
      icon: Calendar,
      color: 'text-orange-600 bg-orange-100',
      href: '/ativas',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-500">Visão geral das promoções</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <a key={card.label} href={card.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">
                    {card.label}
                  </CardTitle>
                  <div className={`rounded-full p-2 ${card.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{card.value}</div>
                </CardContent>
              </Card>
            </a>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Resumo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Total de promoções ativas</span>
                <span className="font-medium">{stats?.active || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Aguardando aprovação</span>
                <span className="font-medium">{stats?.pending || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Ja encerradas</span>
                <span className="font-medium">{stats?.expired || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alertas</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.expiring_today === 0 && stats?.expiring_tomorrow === 0 ? (
              <p className="text-sm text-gray-500">Nenhuma promoção vencendo em breve</p>
            ) : (
              <div className="space-y-3">
                {stats?.expiring_today ? (
                  <div className="flex items-center gap-2 text-yellow-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">{stats.expiring_today} promoções vencendo hoje</span>
                  </div>
                ) : null}
                {stats?.expiring_tomorrow ? (
                  <div className="flex items-center gap-2 text-orange-600">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">{stats.expiring_tomorrow} promoções vencendo amanhã</span>
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
