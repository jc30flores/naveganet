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
import { Switch } from '@/components/ui/switch'
import { API_BASE } from '@/lib/api'
import { getCookie } from '@/utils/csrf'
import { toast } from '@/components/ui/use-toast'

interface Usuario {
  id: number
  username: string
  email: string
  role: 'admin' | 'gerente' | 'vendedor'
  is_active: boolean
}

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  usuario?: Usuario | null
}

const emailRe = /.+@.+\..+/

export default function ModalUsuarioForm({ open, onClose, onSuccess, usuario }: Props) {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    password_confirm: '',
    role: 'vendedor' as 'admin' | 'gerente' | 'vendedor',
    is_active: true,
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (field: string, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }))

  const resetForm = () => {
    setForm({
      username: '',
      email: '',
      password: '',
      password_confirm: '',
      role: 'vendedor',
      is_active: true,
    })
  }

  useEffect(() => {
    if (open) {
      if (usuario) {
        setForm({
          username: usuario.username || '',
          email: usuario.email || '',
          password: '',
          password_confirm: '',
          role: usuario.role || 'vendedor',
          is_active: usuario.is_active ?? true,
        })
      } else {
        resetForm()
      }
    }
  }, [usuario, open])

  const handleSubmit = async () => {
    if (!form.username) {
      toast({ title: 'Nombre de usuario requerido', variant: 'destructive' })
      return
    }
    if (!form.email) {
      toast({ title: 'Email requerido', variant: 'destructive' })
      return
    }
    if (!emailRe.test(form.email)) {
      toast({ title: 'Email inválido', variant: 'destructive' })
      return
    }
    if (!usuario && !form.password) {
      toast({ title: 'Contraseña requerida', variant: 'destructive' })
      return
    }
    if (form.password && form.password.length < 8) {
      toast({ title: 'La contraseña debe tener al menos 8 caracteres', variant: 'destructive' })
      return
    }
    if (form.password && form.password !== form.password_confirm) {
      toast({ title: 'Las contraseñas no coinciden', variant: 'destructive' })
      return
    }

    const body: any = {
      username: form.username,
      email: form.email,
      role: form.role,
      is_active: form.is_active,
    }

    if (form.password) {
      body.password = form.password
    }

    setLoading(true)
    try {
      await fetch(`${API_BASE}/csrf/`, { credentials: 'include' })
      const csrftoken = getCookie('csrftoken')
      const url = usuario ? `${API_BASE}/usuarios/${usuario.id}/` : `${API_BASE}/usuarios/`
      const r = await fetch(url, {
        method: usuario ? 'PUT' : 'POST',
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
      toast({ title: usuario ? 'Usuario actualizado' : 'Usuario creado' })
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
      title={usuario ? 'Editar Usuario' : 'Nuevo Usuario'}
      description="Formulario para registrar o editar usuario"
      footer={(
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" form="usuario-form" disabled={loading || !form.username || !form.email}>
            Guardar
          </Button>
        </div>
      )}
    >
      <form
        id="usuario-form"
        onSubmit={(e) => {
          e.preventDefault()
          handleSubmit()
        }}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-visible"
        style={{ scrollbarGutter: 'stable both-edges' }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
          <div className="sm:col-span-2">
            <Input
              placeholder="Nombre de usuario"
              value={form.username}
              onChange={(e) => handleChange('username', e.target.value)}
              autoFocus
              disabled={!!usuario}
            />
          </div>
          <div className="sm:col-span-2">
            <Input
              placeholder="Email"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              inputMode="email"
            />
          </div>
          {!usuario && (
            <>
              <div className="sm:col-span-2">
                <Input
                  placeholder="Contraseña"
                  type="password"
                  value={form.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Input
                  placeholder="Confirmar contraseña"
                  type="password"
                  value={form.password_confirm}
                  onChange={(e) => handleChange('password_confirm', e.target.value)}
                />
              </div>
            </>
          )}
          {usuario && (
            <>
              <div className="sm:col-span-2">
                <Input
                  placeholder="Nueva contraseña (opcional)"
                  type="password"
                  value={form.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Input
                  placeholder="Confirmar nueva contraseña"
                  type="password"
                  value={form.password_confirm}
                  onChange={(e) => handleChange('password_confirm', e.target.value)}
                />
              </div>
            </>
          )}
          <div className="sm:col-span-2">
            <Select value={form.role} onValueChange={(v) => handleChange('role', v)}>
              <SelectTrigger className="w-full text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="gerente">Gerente</SelectItem>
                <SelectItem value="vendedor">Vendedor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 flex items-center gap-2">
            <Switch 
              id="is_active" 
              checked={form.is_active} 
              onCheckedChange={(checked) => handleChange('is_active', checked)} 
            />
            <label htmlFor="is_active" className="text-sm">
              Usuario activo
            </label>
          </div>
        </div>
      </form>
    </AppModal>
  )
}

