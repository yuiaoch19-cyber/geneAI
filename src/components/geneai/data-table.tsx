import { useState, type ComponentType, type ReactNode } from 'react'
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Search, Table2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataTablePagination } from '@/components/data-table/pagination'
import { EmptyState } from '@/components/geneai/empty-state'

type DataTableProps<TData> = {
  columns: ColumnDef<TData>[]
  data: TData[]
  searchable?: boolean
  searchPlaceholder?: string
  emptyIcon?: ComponentType<{ className?: string; strokeWidth?: number }>
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode
  toolbar?: ReactNode
  pageSize?: number
  className?: string
}

export function DataTable<TData>({
  columns,
  data,
  searchable = true,
  searchPlaceholder = '搜索记录…',
  emptyIcon = Table2,
  emptyTitle = '暂无数据',
  emptyDescription = '完成一次分析后，记录会自动出现在这里。',
  emptyAction,
  toolbar,
  pageSize = 10,
  className,
}: DataTableProps<TData>) {
  const [globalFilter, setGlobalFilter] = useState('')

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  })

  const rows = table.getRowModel().rows
  const filteredCount = table.getFilteredRowModel().rows.length
  const isFiltered = globalFilter.trim().length > 0

  return (
    <div className={cn('space-y-3', className)}>
      {(searchable || toolbar) && (
        <div className='flex flex-wrap items-center gap-2'>
          {searchable ? (
            <div className='relative w-full sm:w-64'>
              <Search className='pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                value={globalFilter}
                onChange={(event) => {
                  setGlobalFilter(event.target.value)
                  table.setPageIndex(0)
                }}
                placeholder={searchPlaceholder}
                className='h-9 ps-9'
                aria-label={searchPlaceholder}
              />
            </div>
          ) : null}
          {toolbar}
          <span className='ms-auto text-xs text-muted-foreground tabular-nums'>
            {isFiltered
              ? `${filteredCount} / ${data.length} 条`
              : `${data.length} 条记录`}
          </span>
        </div>
      )}

      <div className='overflow-hidden rounded-lg border border-border/80 bg-card'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className='bg-muted/40 hover:bg-muted/40'
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className='h-10 text-xs font-semibold text-muted-foreground'
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length > 0 ? (
              rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className='py-3'>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className='hover:bg-transparent'>
                <TableCell
                  colSpan={columns.length}
                  className='h-48 p-4 whitespace-normal'
                >
                  <EmptyState
                    compact
                    icon={emptyIcon}
                    title={isFiltered ? '没有匹配的记录' : emptyTitle}
                    description={
                      isFiltered
                        ? '试试更短的关键词，或清除搜索条件。'
                        : emptyDescription
                    }
                    action={isFiltered ? undefined : emptyAction}
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {data.length > 0 ? <DataTablePagination table={table} /> : null}
    </div>
  )
}
