import { useEffect, useState } from 'react'
import AppModal from '@/components/ui/AppModal'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { PiggyBank } from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from '@/components/ui/use-toast'
import type { Deudor } from '@/types/db'
import { formatCurrency } from '@/lib/format'

interface Props {
  deudor: Deudor | null
  open: boolean
  onClose: () => void
  onSuccess: (monto: number) => void
}

export default function AbonoModal({ deudor, open, onClose, onSuccess }: Props) {
  const [monto, setMonto] = useState('')
  const [metodo, setMetodo] = useState<'CASH' | 'CARD' | 'TRANSFER'>('CASH')
  const [concepto, setConcepto] = useState('')
  const [loading, setLoading] = useState(false)
  const [creditoId, setCreditoId] = useState<number | null>(null)

  useEffect(() => {
    if (open && deudor) {
      setMonto('')
      setConcepto('')
      setMetodo('CASH')
      api.getDeudorDetalle(deudor.cliente_id)
        .then(det => {
          const c = det.creditos.find(c => c.saldo > 0)
          setCreditoId(c ? c.id : null)
        })
        .catch((e: any) => {
          toast({ title: 'Error', description: e.message, variant: 'destructive' })
          onClose()
        })
    }
  }, [open, deudor])

  const registrar = async () => {
    if (!deudor || !creditoId) return
    const amt = parseFloat(monto)
    if (isNaN(amt) || amt <= 0) {
      toast({ title: 'Monto inválido', variant: 'destructive' })
      return
    }
    if (amt > deudor.saldo) {
      toast({ title: 'El monto no puede exceder el saldo', variant: 'destructive' })
      return
    }
    setLoading(true)
    const now = new Date().toISOString()
    try {
      await api.createPagoCredito({
        credito: creditoId,
        fecha: now,
        monto: amt,
        concepto: concepto || undefined,
        metodo_pago: metodo,
        created_at: now,
        updated_at: now,
      })
      toast({ title: 'Abono registrado' })
      onSuccess(amt)
      onClose()
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={<><PiggyBank className="h-5 w-5 text-primary" />Registrar abono</>}
      description={deudor ? `Cliente: ${deudor.cliente_nombre}` : undefined}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={registrar} disabled={loading}>Registrar abono</Button>
        </div>
      }
    >
      {deudor && (
        <div className="space-y-4 text-foreground">
          <p>
            Saldo actual: <span className="font-medium">{formatCurrency(deudor.saldo)}</span>
          </p>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Monto</label>
            <Input
              type="number"
              inputMode="decimal"
              value={monto}
              onChange={e => setMonto(e.target.value)}
              max={deudor.saldo}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Método de pago</label>
            <Select value={metodo} onValueChange={v => setMetodo(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Efectivo</SelectItem>
                <SelectItem value="CARD">Tarjeta</SelectItem>
                <SelectItem value="TRANSFER">Transferencia</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Concepto (opcional)</label>
            <Input value={concepto} onChange={e => setConcepto(e.target.value)} />
          </div>
        </div>
      )}
    </AppModal>
  )
}

