import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  getFilteredRowModel,
  ColumnFiltersState,
} from '@tanstack/react-table'
import { ArrowUpDown, ChevronLeft, ChevronRight, Edit, Trash2, Copy } from 'lucide-react'
import { useState } from 'react'
import type { Promotion } from '@promos/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface ExtraAction {
  label: string
  icon: React.ElementType
  onClick: (id: number) => void
  variant: 'default' | 'destructive'
}

interface PromotionTableProps {
  data: Promotion[]
  loading: boolean
  onEdit?: (promo: Promotion) => void
  onDelete?: (id: number) => void
  onDuplicate?: (promo: Promotion) => void
  extraActions?: ExtraAction[]
}

function getExpirationBadge(endDate: string, status: string) {
  if (status !== 'ATIVA') return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date(endDate)
  end.setHours(0, 0, 0, 0)

  const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return <Badge variant="encerrada">Vencida</Badge>
  } else if (diffDays === 0) {
    return <Badge variant="encerrada" className="bg-red-500">Vence hoje</Badge>
  } else if (diffDays === 1) {
    return <Badge variant="vencendo" className="bg-orange-500">Vence amanhã</Badge>
  } else if (diffDays <= 2) {
    return <Badge variant="vencendo" className="bg-yellow-500">Vence em {diffDays} dias</Badge>
  } else if (diffDays <= 5) {
    return <Badge variant="ativa" className="bg-green-500/20 text-green-600 border-green-500/30">Vence em {diffDays} dias</Badge>
  }
  return null
}

function StoresCell({ stores }: { stores?: { id: number; name: string; city?: string | null }[] }) {
  if (!stores || stores.length === 0) {
    return <span className="text-gray-400">-</span>
  }
  return (
    <div className="flex flex-wrap gap-1">
      {stores.slice(0, 2).map(store => (
        <Badge key={store.id} variant="secondary" className="text-xs">
          {store.name}
        </Badge>
      ))}
      {stores.length > 2 && (
        <Badge variant="secondary" className="text-xs">
          +{stores.length - 2}
        </Badge>
      )}
    </div>
  )
}

export function PromotionTable({
  data,
  loading,
  onEdit,
  onDelete,
  onDuplicate,
  extraActions = [],
}: PromotionTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const columns: ColumnDef<Promotion>[] = [
    {
      accessorKey: 'code',
      header: 'Código',
      size: 80,
    },
    {
      accessorKey: 'description',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-3"
        >
          Descrição
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      size: 200,
    },
    {
      accessorKey: 'stores',
      header: 'Lojas',
      cell: ({ row }) => <StoresCell stores={row.original.stores} />,
      size: 120,
    },
    {
      accessorKey: 'retail_price',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-3"
        >
          Varejo
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) =>
        row.getValue('retail_price')?.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }) || '-',
      size: 100,
    },
    {
      accessorKey: 'wholesale_price',
      header: 'Atacado',
      cell: ({ row }) =>
        row.getValue('wholesale_price')?.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }) || '-',
      size: 100,
    },
    {
      accessorKey: 'start_date',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-3"
        >
          Início
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => new Date(row.getValue('start_date')).toLocaleDateString('pt-BR'),
      size: 90,
    },
    {
      accessorKey: 'end_date',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-3"
        >
          Fim
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const endDate = row.getValue('end_date') as string
        const status = row.original.status
        return (
          <div className="flex flex-col gap-1">
            <span>{new Date(endDate).toLocaleDateString('pt-BR')}</span>
            {getExpirationBadge(endDate, status)}
          </div>
        )
      },
      size: 130,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string
        return (
          <Badge variant={status.toLowerCase() as 'pendente' | 'ativa' | 'encerrada'}>
            {status}
          </Badge>
        )
      },
      size: 100,
    },
    ...(onEdit || onDelete || onDuplicate || extraActions.length > 0
      ? [
          {
            id: 'actions',
            cell: ({ row }: { row: { original: Promotion } }) => (
              <div className="flex items-center gap-1">
                {onDuplicate && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDuplicate(row.original)}
                    title="Duplicar"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(row.original)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(row.original.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                )}
                {extraActions.map((action) => (
                  <Button
                    key={action.label}
                    variant="ghost"
                    size="icon"
                    onClick={() => action.onClick(row.original.id)}
                    title={action.label}
                  >
                    <action.icon className="h-4 w-4" />
                  </Button>
                ))}
              </div>
            ),
            size: 120,
          },
        ]
      : []),
  ]

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-4">
        <Input
          placeholder="Buscar promoções..."
          value={globalFilter ?? ''}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        <span className="text-sm text-gray-500">
          {table.getFilteredRowModel().rows.length} promoções
        </span>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[800px]">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b bg-gray-50">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-3 py-3 text-left text-sm font-medium text-gray-500"
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                  Nenhuma promoção encontrada
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b hover:bg-gray-50">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-3 text-sm">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Linhas por página:</span>
          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
            className="rounded border px-2 py-1 text-sm"
          >
            {[10, 20, 30, 50].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                {pageSize}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Página {table.getState().pagination.pageIndex + 1} de{' '}
            {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
