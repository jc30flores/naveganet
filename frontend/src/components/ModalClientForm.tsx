import { useState, useEffect } from 'react'
import AppModal from '@/components/ui/AppModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { API_BASE } from '@/lib/api'
import { getCookie } from '@/utils/csrf'
import { toast } from '@/components/ui/use-toast'
import type { Cliente } from '@/types/db'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  client?: Cliente | null
}

const emailRe = /.+@.+\..+/

export default function ModalClientForm({ open, onClose, onSuccess, client }: Props) {
  const [tipo, setTipo] = useState<'natural' | 'juridica'>('natural')
  const [ccf, setCcf] = useState(false)
  const [form, setForm] = useState({
    nombre: '',
    telefono: '',
    email: '',
    direccion: '',
    departamento: '',
    municipio: '',
    observaciones: '',
    nit: '',
    nrc: '',
    giro: '',
    direccion_fiscal: '',
    email_facturacion: '',
    telefono_facturacion: '',
    contacto: '',
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }))

  const resetForm = () => {
    setForm({
      nombre: '',
      telefono: '',
      email: '',
      direccion: '',
      departamento: '',
      municipio: '',
      observaciones: '',
      nit: '',
      nrc: '',
      giro: '',
      direccion_fiscal: '',
      email_facturacion: '',
      telefono_facturacion: '',
      contacto: '',
    })
    setTipo('natural')
    setCcf(false)
  }

  useEffect(() => {
    if (open) {
      if (client) {
        setTipo((client.tipo_cliente || 'natural') as 'natural' | 'juridica')
        setCcf(!!client.contribuyente_iva)
        setForm({
          nombre: client.nombre || client.razon_social || '',
          telefono: client.telefono || '',
          email: client.email || '',
          direccion: client.direccion || '',
          departamento: client.departamento || '',
          municipio: client.municipio || '',
          observaciones: client.observaciones || '',
          nit: client.nit || '',
          nrc: client.nrc || '',
          giro: client.giro || '',
          direccion_fiscal: client.direccion_fiscal || '',
          email_facturacion: client.email_facturacion || '',
          telefono_facturacion: client.telefono_facturacion || '',
          contacto: client.contacto || '',
        })
      } else {
        resetForm()
      }
    }
  }, [client, open])

  const handleSubmit = async () => {
    if (!form.nombre) {
      toast({ title: 'Nombre requerido', variant: 'destructive' })
      return
    }
    if (form.email && !emailRe.test(form.email)) {
      toast({ title: 'Email inválido', variant: 'destructive' })
      return
    }
    if (ccf) {
      const required = ['nit', 'nrc', 'giro', 'direccion_fiscal'] as const
      for (const f of required) {
        if (!(form as any)[f]) {
          toast({ title: `${f.toUpperCase()} requerido`, variant: 'destructive' })
          return
        }
      }
      if (!form.email_facturacion && !form.telefono_facturacion) {
        toast({
          title: 'Contacto de facturación requerido',
          variant: 'destructive',
        })
        return
      }
    }
    const body: any = {
      tipo_cliente: tipo.toLowerCase(),
      nombre: form.nombre,
      razon_social: tipo === 'juridica' ? form.nombre : undefined,
      telefono: form.telefono || undefined,
      email: form.email || undefined,
      direccion: form.direccion || undefined,
      departamento: form.departamento || undefined,
      municipio: form.municipio || undefined,
      observaciones: form.observaciones || undefined,
      contribuyente_iva: ccf,
      ...(ccf
        ? {
            nit: form.nit,
            nrc: form.nrc,
            giro: form.giro,
            direccion_fiscal: form.direccion_fiscal,
            email_facturacion: form.email_facturacion || undefined,
            telefono_facturacion: form.telefono_facturacion || undefined,
            contacto: form.contacto || undefined,
          }
        : {}),
    }
    setLoading(true)
    try {
      await fetch(`${API_BASE}/csrf/`, { credentials: 'include' })
      const csrftoken = getCookie('csrftoken')
      const url = client ? `${API_BASE}/clientes/${client.id}/` : `${API_BASE}/clientes/`
      const r = await fetch(url, {
        method: client ? 'PUT' : 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrftoken,
        },
        body: JSON.stringify(body),
      })
      if (!r.ok) {
        const e = await r
          .json()
          .catch(() => ({ detail: `HTTP ${r.status}` }))
        const msg = Object.entries(e)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join(' • ')
        toast({ title: 'Error', description: msg, variant: 'destructive' })
        return
      }
      toast({ title: 'Guardado' })
      onSuccess()
      onClose()
      resetForm()
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
      title={client ? 'Editar Cliente' : 'Nuevo Cliente'}
      description="Formulario para registrar cliente"
      footer={(
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" form="client-form" disabled={loading || !form.nombre}>
            Guardar
          </Button>
        </div>
      )}
    >
          <form
            id="client-form"
            onSubmit={(e) => {
              e.preventDefault()
              handleSubmit()
            }}
            className="flex-1 min-h-0 overflow-y-auto overflow-x-visible"
            style={{ scrollbarGutter: 'stable both-edges' }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-w-0">
              <div className="lg:col-span-3">
                <Select value={tipo} onValueChange={(v) => setTipo(v as any)}>
                  <SelectTrigger className="w-full text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="natural">Natural</SelectItem>
                    <SelectItem value="juridica">Jurídica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="lg:col-span-3">
                <Input
                  placeholder="Nombre"
                  value={form.nombre}
                  onChange={(e) =>
                    handleChange('nombre', e.target.value.toUpperCase())
                  }
                  autoFocus
                  autoCapitalize="characters"
                />
              </div>
              <Input
                placeholder="Teléfono"
                value={form.telefono}
                onChange={(e) => handleChange('telefono', e.target.value)}
                inputMode="tel"
              />
              <Input
                placeholder="Email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                inputMode="email"
              />
              <div className="lg:col-span-3">
                <Input
                  placeholder="Dirección"
                  value={form.direccion}
                  onChange={(e) => handleChange('direccion', e.target.value)}
                />
              </div>
              <Input
                placeholder="Departamento"
                value={form.departamento}
                onChange={(e) => handleChange('departamento', e.target.value)}
              />
              <Input
                placeholder="Municipio"
                value={form.municipio}
                onChange={(e) => handleChange('municipio', e.target.value)}
              />
              <div className="lg:col-span-3 flex items-center gap-2">
                <Switch id="ccf" checked={ccf} onCheckedChange={setCcf} />
                <label htmlFor="ccf" className="text-sm">
                  Contribuyente IVA
                </label>
              </div>
              {ccf && (
                <>
                  <Input
                    placeholder="NIT"
                    value={form.nit}
                    onChange={(e) => handleChange('nit', e.target.value)}
                    inputMode="numeric"
                  />
                  <Input
                    placeholder="NRC"
                    value={form.nrc}
                    onChange={(e) => handleChange('nrc', e.target.value)}
                    inputMode="numeric"
                  />
                  <div className="lg:col-span-3">
                    <Input
                      placeholder="Giro"
                      value={form.giro}
                      onChange={(e) => handleChange('giro', e.target.value)}
                    />
                  </div>
                  <div className="lg:col-span-3">
                    <Input
                      placeholder="Dirección fiscal"
                      value={form.direccion_fiscal}
                      onChange={(e) =>
                        handleChange('direccion_fiscal', e.target.value)
                      }
                    />
                  </div>
                  <Input
                    placeholder="Email facturación"
                    value={form.email_facturacion}
                    onChange={(e) =>
                      handleChange('email_facturacion', e.target.value)
                    }
                    inputMode="email"
                  />
                  <Input
                    placeholder="Teléfono facturación"
                    value={form.telefono_facturacion}
                    onChange={(e) =>
                      handleChange('telefono_facturacion', e.target.value)
                    }
                    inputMode="tel"
                  />
                  <Input
                    placeholder="Contacto"
                    value={form.contacto}
                    onChange={(e) => handleChange('contacto', e.target.value)}
                  />
                </>
              )}
              <div className="lg:col-span-3">
                <Textarea
                  placeholder="Observaciones"
                  value={form.observaciones}
                  onChange={(e) => handleChange('observaciones', e.target.value)}
                  className="min-h-24 w-full text-base"
                />
              </div>
            </div>
          </form>
    </AppModal>
  )
}
