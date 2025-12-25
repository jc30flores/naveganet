import { useEffect, useState, type ReactNode } from 'react'
import AppModal from '@/components/ui/AppModal'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { User } from 'lucide-react'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { fmtHM } from '@/utils/datetime'
import type { ClienteDetalle } from '@/types/db'
import { toast } from '@/components/ui/use-toast'
import { FieldValue } from '@/components/ui/FieldValue'

interface Props {
  id: number | null
  open: boolean
  onClose: () => void
}

export default function ClienteModal({ id, open, onClose }: Props) {
  const [data, setData] = useState<ClienteDetalle | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    if (!id) return
    setLoading(true)
    setError(null)
    api
      .getClienteDetalle(id)
      .then(setData)
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

  const card = (label: string, value?: ReactNode) => (
    <div className="min-w-0 rounded-2xl border border-border bg-card p-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="mt-1 break-words font-medium text-foreground">{value ?? '-'}</div>
    </div>
  )

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={
        <>
          <User className="h-5 w-5 text-primary" />
          {data?.nombre || 'Cliente'}
        </>
      }
      description="Información del cliente"
    >
      {loading && (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
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
        {!loading && data && (
          <Tabs defaultValue="resumen" className="space-y-4">
            <TabsList className="flex gap-2">
              <TabsTrigger
                value="resumen"
                className="px-3 py-1.5 rounded-xl border border-border text-muted-foreground hover:bg-muted data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:ring-1 data-[state=active]:ring-primary/30"
              >
                Resumen
              </TabsTrigger>
              <TabsTrigger
                value="fiscales"
                className="px-3 py-1.5 rounded-xl border border-border text-muted-foreground hover:bg-muted data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:ring-1 data-[state=active]:ring-primary/30"
              >
                Datos fiscales
              </TabsTrigger>
              <TabsTrigger
                value="actividad"
                className="px-3 py-1.5 rounded-xl border border-border text-muted-foreground hover:bg-muted data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:ring-1 data-[state=active]:ring-primary/30"
              >
                Actividad
              </TabsTrigger>
            </TabsList>
            <TabsContent value="resumen" className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FieldValue label="Email" value={data.email || undefined} copy />
                {card('Teléfono', data.telefono)}
                {data.contacto && <FieldValue label="Contacto" value={data.contacto} copy />}
                {data.telefono_facturacion && card('Tel. facturación', data.telefono_facturacion)}
                {data.email_facturacion && (
                  <FieldValue label="Email facturación" value={data.email_facturacion} copy />
                )}
                <FieldValue label="Dirección" value={data.direccion || undefined} copy />
                {card('Departamento', data.departamento)}
                {card('Municipio', data.municipio)}
                {card(
                  'Última compra',
                  data.fecha_ultima_compra
                    ? `${formatDate(data.fecha_ultima_compra)} ${fmtHM(data.fecha_ultima_compra)}`
                    : undefined,
                )}
                {data.observaciones?.trim() && (
                  <FieldValue
                    label="Observaciones"
                    value={data.observaciones}
                    className="md:col-span-2"
                  />
                )}
              </div>
            </TabsContent>
            <TabsContent value="fiscales" className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {card('NIT', data.nit)}
              {card('NRC', data.nrc)}
              <FieldValue label="Giro" value={data.giro || undefined} copy />
              <FieldValue label="Dirección fiscal" value={data.direccion_fiscal || undefined} copy />
              {data.razon_social && <FieldValue label="Razón social" value={data.razon_social} copy />}
              {data.nombre_comercial && <FieldValue label="Nombre comercial" value={data.nombre_comercial} copy />}
            </TabsContent>
            <TabsContent value="actividad" className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2">
              {card(
                'Creado',
                data.created_at ? `${formatDate(data.created_at)} ${fmtHM(data.created_at)}` : undefined,
              )}
              {card(
                'Actualizado',
                data.updated_at ? `${formatDate(data.updated_at)} ${fmtHM(data.updated_at)}` : undefined,
              )}
            </TabsContent>
        </Tabs>
      )}
    </AppModal>
  )
}
