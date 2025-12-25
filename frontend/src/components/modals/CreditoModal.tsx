import { useEffect, useState } from 'react'
import AppModal from '@/components/ui/AppModal'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { CreditCard } from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/format'
import { fmtHM } from '@/utils/datetime'
import type { CreditoDetalle, DeudorDetalle, CreditoItem, CreditoPago } from '@/types/db'
import { toast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'

interface Props {
  id?: number | null
  clienteId?: number | null
  open: boolean
  onClose: () => void
}

export default function CreditoModal({ id, clienteId, open, onClose }: Props) {
  const [data, setData] = useState<CreditoDetalle | DeudorDetalle | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isCliente = clienteId != null

  const load = () => {
    const targetId = isCliente ? clienteId : id
    if (!targetId) return
    setLoading(true)
    setError(null)
    const req = isCliente ? api.getDeudorDetalle(targetId) : api.getCreditoDetalle(targetId)
    req
      .then((c) => setData(c))
      .catch((e: any) => {
        setError(e.message)
        toast({ title: 'Error', description: e.message, variant: 'destructive' })
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (open) {
      load()
    }
  }, [open, id, clienteId])

  const renderPagos = (pagos: CreditoPago[]) => (
    <div
      className="max-h-[40svh] overflow-x-auto overflow-y-auto"
      style={{ scrollbarGutter: 'stable both-edges' }}
    >
      <Table className="min-w-full">
        <TableHeader className="sticky top-0 bg-background">
          <TableRow className="border-b border-border text-muted-foreground">
            <TableHead>Fecha</TableHead>
            <TableHead>Monto</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pagos.map(p => (
            <TableRow key={p.id} className="border-border hover:bg-muted/40">
              <TableCell>
                {formatDate(p.fecha)}{' '}
                <span className="whitespace-nowrap">{fmtHM(p.fecha)}</span>
              </TableCell>
              <TableCell>{formatCurrency(p.monto)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )

  const renderItems = (items: CreditoItem[]) => (
    <div
      className="max-h-[40svh] overflow-x-auto overflow-y-auto"
      style={{ scrollbarGutter: 'stable both-edges' }}
    >
      <Table className="min-w-full">
        <TableHeader className="sticky top-0 bg-background">
          <TableRow className="border-b border-border text-muted-foreground">
            <TableHead>Producto</TableHead>
            <TableHead>Cant.</TableHead>
            <TableHead>Precio</TableHead>
            <TableHead>Subtotal</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map(it => (
            <TableRow key={it.producto_id} className="border-border hover:bg-muted/40">
              <TableCell>{it.nombre}</TableCell>
              <TableCell>{it.cantidad}</TableCell>
              <TableCell>{formatCurrency(it.precio)}</TableCell>
              <TableCell>{formatCurrency(it.sub_total)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={
        <>
          <CreditCard className="h-5 w-5 text-primary" />
          {isCliente
            ? data && 'cliente' in data
              ? `Créditos de ${data.cliente.nombre}`
              : 'Créditos'
            : data && 'id' in data
              ? `Crédito #${data.id}`
              : 'Crédito'}
        </>
      }
      description={isCliente ? 'Resumen de créditos del cliente' : 'Detalles del crédito'}
    >
      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}
      {!loading && error && (
        <div className="flex flex-col gap-2">
          <p className="text-destructive">{error}</p>
          <Button
            onClick={load}
            variant="ghost"
            className="border border-border hover:ring-1 ring-primary/30"
          >
            Reintentar
          </Button>
        </div>
      )}
      {!loading && data && !isCliente && 'id' in data && (
        <Tabs defaultValue="resumen" className="space-y-4">
          <TabsList className="flex gap-2">
            <TabsTrigger
              value="resumen"
              className="px-3 py-1.5 rounded-xl border border-border text-muted-foreground hover:bg-muted data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:ring-1 data-[state=active]:ring-primary/30"
            >
              Resumen
            </TabsTrigger>
            <TabsTrigger
              value="pagos"
              className="px-3 py-1.5 rounded-xl border border-border text-muted-foreground hover:bg-muted data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:ring-1 data-[state=active]:ring-primary/30"
            >
              Pagos
            </TabsTrigger>
            <TabsTrigger
              value="items"
              className="px-3 py-1.5 rounded-xl border border-border text-muted-foreground hover:bg-muted data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:ring-1 data-[state=active]:ring-primary/30"
            >
              Productos
            </TabsTrigger>
          </TabsList>
          <TabsContent value="resumen" className="space-y-4 text-foreground">
            <div className="grid gap-2 sm:grid-cols-2">
              <p>
                <span className="text-muted-foreground">Cliente:</span> {data.cliente?.nombre}
              </p>
              <p>
                <span className="text-muted-foreground">Fecha:</span> {formatDate(data.fecha)}{' '}
                <span className="whitespace-nowrap">{fmtHM(data.fecha)}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Total:</span> {formatCurrency(data.total)}
              </p>
              <p>
                <span className="text-muted-foreground">Pagado:</span> {formatCurrency(data.pagado)}
              </p>
              <p>
                <span className="text-muted-foreground">Saldo:</span> {formatCurrency(data.saldo)}
              </p>
            </div>
            <Progress value={(data.pagado / data.total) * 100} className="bg-muted [&>div]:bg-primary" />
          </TabsContent>
          <TabsContent value="pagos" className="text-foreground">
            {renderPagos(data.pagos)}
          </TabsContent>
          <TabsContent value="items" className="text-foreground">
            {renderItems(data.items)}
          </TabsContent>
        </Tabs>
      )}
      {!loading && data && isCliente && 'creditos' in data && (
        <Tabs defaultValue="resumen" className="space-y-4">
          <TabsList className="flex gap-2">
            <TabsTrigger
              value="resumen"
              className="px-3 py-1.5 rounded-xl border border-border text-muted-foreground hover:bg-muted data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:ring-1 data-[state=active]:ring-primary/30"
            >
              Resumen
            </TabsTrigger>
            <TabsTrigger
              value="pagos"
              className="px-3 py-1.5 rounded-xl border border-border text-muted-foreground hover:bg-muted data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:ring-1 data-[state=active]:ring-primary/30"
            >
              Pagos
            </TabsTrigger>
            <TabsTrigger
              value="items"
              className="px-3 py-1.5 rounded-xl border border-border text-muted-foreground hover:bg-muted data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:ring-1 data-[state=active]:ring-primary/30"
            >
              Productos
            </TabsTrigger>
          </TabsList>
          <TabsContent value="resumen" className="space-y-4 text-foreground">
            <div className="grid gap-2 sm:grid-cols-2">
              <p>
                <span className="text-muted-foreground">Total:</span> {formatCurrency(data.total)}
              </p>
              <p>
                <span className="text-muted-foreground">Pagado:</span> {formatCurrency(data.pagado)}
              </p>
              <p>
                <span className="text-muted-foreground">Saldo:</span> {formatCurrency(data.saldo)}
              </p>
            </div>
            <Progress value={(data.pagado / data.total) * 100} className="bg-muted [&>div]:bg-primary" />
            <div
              className="max-h-[30svh] overflow-x-auto overflow-y-auto"
              style={{ scrollbarGutter: 'stable both-edges' }}
            >
              <Table className="min-w-full">
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow className="border-b border-border text-muted-foreground">
                    <TableHead>Fecha</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Pagado</TableHead>
                    <TableHead>Saldo</TableHead>
                    <TableHead>Observaciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.creditos.map(c => (
                    <TableRow key={c.id} className="border-border hover:bg-muted/40">
                      <TableCell>
                        {formatDate(c.fecha)}{' '}
                        <span className="whitespace-nowrap">{fmtHM(c.fecha)}</span>
                      </TableCell>
                      <TableCell>{formatCurrency(c.total)}</TableCell>
                      <TableCell>{formatCurrency(c.pagado)}</TableCell>
                      <TableCell>{formatCurrency(c.saldo)}</TableCell>
                      <TableCell>{c.observaciones || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          <TabsContent value="pagos" className="text-foreground">
            {renderPagos(data.pagos)}
          </TabsContent>
          <TabsContent value="items" className="text-foreground">
            {renderItems(data.items)}
          </TabsContent>
        </Tabs>
      )}
    </AppModal>
  )
}
