import { useEffect, useState } from 'react'
import AppModal from '@/components/ui/AppModal'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Receipt } from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/format'
import { fmtHM } from '@/utils/datetime'
import type { VentaDetalle, VentaItem } from '@/types/db'
import { toast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'

interface Props {
  id: number | null
  open: boolean
  onClose: () => void
}

export default function VentaModal({ id, open, onClose }: Props) {
  const [venta, setVenta] = useState<VentaDetalle | null>(null)
  const [items, setItems] = useState<VentaItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    if (!id) return
    setLoading(true)
    setError(null)
    Promise.all([api.getVentaById(id), api.getVentaItems(id)])
      .then(([v, i]) => {
        setVenta(v)
        setItems(i)
      })
      .catch((e: any) => {
        setError(e.message)
        toast({ title: 'Error', description: e.message, variant: 'destructive' })
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (open && id) {
      load()
    }
  }, [open, id])

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={<><Receipt className="h-5 w-5 text-primary" />{venta ? `Venta #${venta.id}` : 'Venta'}</>}
      description="Detalles de la venta"
      footer={
        !loading && venta ? (
          <div className="text-right text-[16px] md:text-[18px] font-semibold text-foreground">
            Total: <span className="text-primary">{formatCurrency(venta.total)}</span>
          </div>
        ) : null
      }
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
          <Button onClick={load} variant="ghost" className="border border-border hover:ring-1 ring-primary/30">Reintentar</Button>
        </div>
      )}
      {!loading && venta && (
        <div className="space-y-4 text-[16px] md:text-[17px] text-foreground">
          <div className="grid gap-2 sm:grid-cols-2">
            <p><span className="text-[15px] md:text-[16px] font-medium text-muted-foreground">Cliente:</span> {venta.cliente?.nombre || 'Cliente General'}</p>
            <p>
              <span className="text-[15px] md:text-[16px] font-medium text-muted-foreground">Fecha:</span> {formatDate(venta.fecha)}{' '}
              <span className="whitespace-nowrap">{fmtHM(venta.fecha)}</span>
            </p>
            <p><span className="text-[15px] md:text-[16px] font-medium text-muted-foreground">Método:</span> {venta.metodo}</p>
            <p><span className="text-[15px] md:text-[16px] font-medium text-muted-foreground">Venta:</span> {venta.tipo === 'credito' ? 'Crédito' : 'Directa'}</p>
            {venta.notas && (
              <p className="sm:col-span-2">
                <span className="text-[15px] md:text-[16px] font-medium text-muted-foreground">Notas:</span> {venta.notas}
              </p>
            )}
          </div>
          <div className="max-h-[40svh] overflow-y-auto">
            <Table>
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
        </div>
      )}
    </AppModal>
  )
}
