import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import type { Deudor } from '@/types/db'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, Trash2 } from 'lucide-react'
import CreditoModal from '@/components/modals/CreditoModal'
import { formatCurrency } from '@/lib/format'
import Pagination from '@/components/ui/Pagination'
import { Button } from '@/components/ui/button'
import AbonoModal from '@/components/modals/AbonoModal'

export default function Deudores() {
  const [rows, setRows] = useState<Deudor[]>([])
  const [hidden, setHidden] = useState<number[]>(() => {
    const stored = localStorage.getItem('hiddenZeroDebtors')
    return stored ? JSON.parse(stored) : []
  })
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCliente, setSelectedCliente] = useState<number | null>(null)
  const [paying, setPaying] = useState<Deudor | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 30

  useEffect(() => {
    localStorage.setItem('hiddenZeroDebtors', JSON.stringify(hidden))
  }, [hidden])

  const removeZeroSaldo = () => {
    const toHide = rows.filter(r => r.saldo === 0).map(r => r.cliente_id)
    setHidden(prev => [...prev, ...toHide])
    setRows(prev => prev.filter(r => r.saldo !== 0))
  }

  useEffect(() => {
    setLoading(true)
    ;(async () => {
      try {
        const data = await api.getDeudores()
        setRows(data.filter(r => !hidden.includes(r.cliente_id)))
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [hidden])

  const filtered = rows.filter(r =>
    r.cliente_nombre.toLowerCase().includes(search.toLowerCase())
  )
  const pageCount = Math.ceil(filtered.length / pageSize) || 1
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">Deudores</h1>
        <Button
          className="bg-primary hover:bg-primary/90 text-primary-foreground text-base"
          onClick={removeZeroSaldo}
        >
          <Trash2 className="h-5 w-5 mr-2" />
          Saldo 0
        </Button>
      </div>

      <div className="surface surface-pad">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
          <Input
            placeholder="Buscar por cliente..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-12 bg-background border-border text-base"
          />
        </div>
      </div>

      <div className="surface surface-pad">
        <h2 className="text-lg md:text-xl text-foreground">Clientes ({filtered.length})</h2>
        {loading && <p>Cargando...</p>}
        {error && <p className="text-destructive">{error}</p>}
        <div className="mt-4 overflow-x-auto">
          <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">Cliente</TableHead>
                  <TableHead className="text-muted-foreground">Total</TableHead>
                  <TableHead className="text-muted-foreground">Pagado</TableHead>
                  <TableHead className="text-muted-foreground">Saldo</TableHead>
                  <TableHead className="text-muted-foreground">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map(r => (
                  <TableRow
                    key={r.cliente_id}
                    onClick={() => setSelectedCliente(r.cliente_id)}
                    className="border-border cursor-pointer"
                  >
                    <TableCell className="text-foreground">{r.cliente_nombre}</TableCell>
                    <TableCell className="text-foreground">{formatCurrency(r.total)}</TableCell>
                    <TableCell className="text-foreground">{formatCurrency(r.pagado)}</TableCell>
                    <TableCell className="text-foreground">{formatCurrency(r.saldo)}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          setPaying(r)
                        }}
                      >
                        Abonar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        {pageCount > 1 && (
          <div className="mt-4 flex justify-center">
            <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
          </div>
        )}
      </div>
      <CreditoModal
        clienteId={selectedCliente}
        open={selectedCliente !== null}
        onClose={() => setSelectedCliente(null)}
      />
      <AbonoModal
        deudor={paying}
        open={paying !== null}
        onClose={() => setPaying(null)}
        onSuccess={(monto) => {
          if (!paying) return
          setRows(prev =>
            prev.map(r =>
              r.cliente_id === paying.cliente_id
                ? { ...r, pagado: r.pagado + monto, saldo: r.saldo - monto }
                : r
            )
          )
        }}
      />
    </div>
  )
}
