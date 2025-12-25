import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Categoria, Producto } from '@/types/db';
import AppModal from '@/components/ui/AppModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/components/ui/use-toast';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/store/auth';

type FormValues = {
  codigo: string;
  nombre: string;
  categoria_id: string;
  precio: string;
  costo: string;
  stock: string;
  stock_minimo: string;
  condicion: 'new' | 'used';
  estado_usado: 'bueno' | 'con_detalle';
};

interface Props {
  open: boolean;
  onClose: () => void;
  categorias: Categoria[];
  onSuccess: () => void | Promise<void>;
  product?: Producto | null;
}

const FIELD_LABELS: Record<string, string> = {
  codigo: 'Código',
  nombre: 'Nombre',
  categoria_id: 'Categoría',
  precio: 'Precio',
  costo: 'Costo',
  stock: 'Stock',
  stock_minimo: 'Stock mínimo',
  condicion: 'Condición',
  estado_usado: 'Estado del usado',
  status: 'Estado',
};

function hasCodigoError(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const maybeCodigo = (data as Record<string, unknown>).codigo;
  if (!maybeCodigo) return false;
  if (Array.isArray(maybeCodigo)) {
    return maybeCodigo.length > 0;
  }
  return true;
}

function normalizeNumericInput(raw: string): string {
  return raw.replace(/\s+/g, '').replace(/,/g, '.');
}

function parseDecimalField(value: string, field: 'precio' | 'costo'): number {
  const normalized = normalizeNumericInput(value);
  if (!normalized) {
    const label = FIELD_LABELS[field] ?? field;
    throw new Error(`Ingresa ${label.toLowerCase()}`);
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) {
    const label = FIELD_LABELS[field] ?? field;
    throw new Error(`${label} inválido`);
  }
  if (parsed < 0) {
    const label = FIELD_LABELS[field] ?? field;
    throw new Error(`${label} no puede ser negativo`);
  }
  return Math.round(parsed * 100) / 100;
}

function parseIntegerField(
  value: string,
  field: 'stock' | 'stock_minimo',
  options: { required?: boolean; defaultValue?: number } = {},
): number {
  const { required = true, defaultValue = 0 } = options;
  const normalized = normalizeNumericInput(value);
  if (!normalized) {
    if (!required) {
      return defaultValue;
    }
    const label = FIELD_LABELS[field] ?? field;
    throw new Error(`Ingresa ${label.toLowerCase()}`);
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed) || !Number.isInteger(parsed)) {
    const label = FIELD_LABELS[field] ?? field;
    throw new Error(`${label} inválido`);
  }
  if (parsed < 0) {
    const label = FIELD_LABELS[field] ?? field;
    throw new Error(`${label} no puede ser negativo`);
  }
  return parsed;
}

function extractErrorMessages(payload: unknown, parentKey?: string): string[] {
  if (payload == null) {
    return [];
  }
  if (typeof payload === 'string' || typeof payload === 'number' || typeof payload === 'boolean') {
    const message = String(payload).trim();
    if (!message) return [];
    if (parentKey) {
      const label = FIELD_LABELS[parentKey] ?? parentKey;
      return [`${label}: ${message}`];
    }
    return [message];
  }
  if (Array.isArray(payload)) {
    return payload.flatMap((item) => extractErrorMessages(item, parentKey));
  }
  if (typeof payload === 'object') {
    const entries = Object.entries(payload as Record<string, unknown>);
    return entries.flatMap(([key, value]) => extractErrorMessages(value, key));
  }
  return [];
}

function getDefaultValues(): FormValues {
  return {
    codigo: '',
    nombre: '',
    categoria_id: '',
    precio: '',
    costo: '',
    stock: '',
    stock_minimo: '',
    condicion: 'new',
    estado_usado: 'bueno',
  };
}

export default function ModalProductForm({ open, onClose, categorias, onSuccess, product }: Props) {
  const form = useForm<FormValues>({ defaultValues: getDefaultValues() });
  const condicion = form.watch('condicion');
  const estadoUsado = form.watch('estado_usado');
  const nombreValue = form.watch('nombre');
  const queryClient = useQueryClient();
  const [catOpen, setCatOpen] = useState(false);
  const [catQuery, setCatQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [selectedCat, setSelectedCat] = useState<Categoria | null>(null);
  const [saving, setSaving] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const authUser = useAuth((s) => s.user);
  const isVendedor = authUser?.is_vendedor ?? false;
  const lockInventoryFields = Boolean(product) && isVendedor;
  const nombreRegister = form.register('nombre');

  const handleCancel = useCallback(() => {
    form.reset(getDefaultValues());
    setSelectedCat(null);
    setCatOpen(false);
    onClose();
  }, [form, onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleCancel();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, handleCancel]);

  useEffect(() => {
    if (catOpen) {
      setTimeout(() => searchRef.current?.focus(), 0);
    } else {
      setCatQuery('');
      setActiveIndex(-1);
    }
  }, [catOpen]);

  useEffect(() => {
    if (!open || !product) return;
    const catId = product.category_id ?? product.categoria_id;
    let cat = categorias.find((c) => c.id === catId) || null;
    if (!cat) {
      const catName =
        product.categoria_nombre || product.category_name || product.categoria;
      if (catName) {
        cat = categorias.find((c) => (c.nombre ?? c.name) === catName) || null;
      }
    }

    const condicionValue = (product.condicion || 'new')
      .toString()
      .toLowerCase() as 'new' | 'used';
    const estadoUsadoValue = product.estado_usado
      ? (String(product.estado_usado).toLowerCase() as 'bueno' | 'con_detalle')
      : 'bueno';

    const valores: FormValues = {
      codigo: product.codigo || '',
      nombre: product.nombre || '',
      categoria_id: cat ? String(cat.id) : '',
      precio: product.precio !== undefined && product.precio !== null ? String(product.precio) : '',
      costo: product.costo !== undefined && product.costo !== null ? String(product.costo) : '',
      stock: product.stock !== undefined && product.stock !== null ? String(product.stock) : '',
      stock_minimo:
        product.condicion === 'new' && product.stock_minimo !== undefined && product.stock_minimo !== null
          ? String(product.stock_minimo)
          : '',
      condicion: condicionValue,
      estado_usado: estadoUsadoValue,
    };

    form.reset(valores);
    setSelectedCat(cat);
    setTimeout(() => form.setFocus('codigo'), 0);
  }, [product, open, categorias, form]);

  useEffect(() => {
    if (!open || product) return;
    form.reset(getDefaultValues());
    setSelectedCat(null);
    setCatOpen(false);
    setTimeout(() => form.setFocus('codigo'), 0);
  }, [open, product, form]);

  useEffect(() => {
    if (condicion === 'used') {
      const currentStock = form.getValues('stock');
      if (!currentStock) {
        form.setValue('stock', '1');
      }
      if (!estadoUsado) {
        form.setValue('estado_usado', 'bueno');
      }
    } else {
      form.setValue('estado_usado', 'bueno');
      form.setValue('stock_minimo', form.getValues('stock_minimo') || '');
    }
  }, [condicion, estadoUsado, form]);

  const filteredCats = categorias
    .filter((c) => (c.nombre ?? c.name ?? '').toUpperCase().includes(catQuery))
    .slice(0, 5);

  const handleCatKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filteredCats.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? -1 : i - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      const cat = filteredCats[activeIndex];
      if (cat) {
        setSelectedCat(cat);
        form.setValue('categoria_id', String(cat.id));
        setCatOpen(false);
      }
    }
  };

  const handleCatClick = (cat: Categoria) => {
    setSelectedCat(cat);
    form.setValue('categoria_id', String(cat.id));
    setCatOpen(false);
  };

  const focusCodigoField = () => {
    requestAnimationFrame(() => form.setFocus('codigo'));
  };

  const focusNombreField = () => {
    requestAnimationFrame(() => form.setFocus('nombre'));
  };

  const showBackendErrors = (data: unknown) => {
    const messages = extractErrorMessages(data);
    if (messages.length === 0) {
      return false;
    }
    toast({
      title: 'Corrige los campos',
      description: messages.join('\n'),
      variant: 'destructive',
    });
    return true;
  };

  const createMutation = useMutation({
    mutationFn: (payload: unknown) => api.createProducto(payload),
    onMutate: () => {
      setSaving(true);
    },
    onSuccess: async () => {
      toast({ title: 'Guardado' });
      await queryClient.invalidateQueries({ queryKey: ['productos'] });
      form.reset(getDefaultValues());
      setSelectedCat(null);
      setCatOpen(false);
      focusCodigoField();
      await onSuccess?.();
    },
    onError: (error: any) => {
      if (error instanceof ApiError) {
        const data = error.response?.data;
        if (data !== undefined) {
          console.error('createProducto error', data);
        }
        if (error.status === 400 && hasCodigoError(data)) {
          return;
        }
        if (error.status === 400 && showBackendErrors(data)) {
          return;
        }
      } else if (error && typeof error === 'object') {
        const data = (error as { response?: { data?: unknown } }).response?.data;
        if (data !== undefined) {
          console.error('createProducto error', data);
          if (showBackendErrors(data)) {
            return;
          }
        }
      }
      const description = error?.message || 'No se pudo guardar';
      toast({ title: 'Error', description, variant: 'destructive' });
    },
    onSettled: () => {
      setSaving(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: unknown }) => api.updateProducto(id, payload),
    onMutate: () => {
      setSaving(true);
    },
    onSuccess: async () => {
      toast({ title: 'Guardado' });
      await queryClient.invalidateQueries({ queryKey: ['productos'] });
      await onSuccess?.();
      handleCancel();
    },
    onError: (error: any) => {
      if (error instanceof ApiError) {
        const data = error.response?.data;
        if (data !== undefined) {
          console.error('updateProducto error', data);
        }
        if (error.status === 400 && hasCodigoError(data)) {
          return;
        }
        if (error.status === 400 && showBackendErrors(data)) {
          return;
        }
      } else if (error && typeof error === 'object') {
        const data = (error as { response?: { data?: unknown } }).response?.data;
        if (data !== undefined) {
          console.error('updateProducto error', data);
          if (showBackendErrors(data)) {
            return;
          }
        }
      }
      const description = error?.message || 'No se pudo guardar';
      toast({ title: 'Error', description, variant: 'destructive' });
    },
    onSettled: () => {
      setSaving(false);
    },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    let payload: Record<string, unknown> | null = null;
    try {
      const trimmedNombre = values.nombre.trim();
      if (!trimmedNombre) {
        focusNombreField();
        throw new Error('Campos requeridos faltantes');
      }
      if (!values.categoria_id) {
        throw new Error('Selecciona una categoría');
      }

      const categoriaId = Number(values.categoria_id);
      if (Number.isNaN(categoriaId)) {
        throw new Error('Selecciona una categoría');
      }

      const precio = parseDecimalField(values.precio, 'precio');
      const costo = parseDecimalField(values.costo, 'costo');
      const stock = parseIntegerField(values.stock, 'stock');
      const stockMinimo = parseIntegerField(values.stock_minimo, 'stock_minimo', {
        required: false,
        defaultValue: 0,
      });

      const basePayload: {
        codigo: string | null;
        nombre: string;
        categoria_id: number;
        condicion: 'NEW' | 'USED';
        precio: number;
        costo: number;
        stock: number;
        stock_minimo: number;
      } = {
        codigo: values.codigo?.trim() || null,
        nombre: trimmedNombre,
        categoria_id: categoriaId,
        condicion: values.condicion === 'new' ? 'NEW' : 'USED',
        precio,
        costo,
        stock,
        stock_minimo: stockMinimo,
      };

      const extraValues = values as unknown as Record<string, unknown>;
      const requiredVehicleFields: { key: 'marca_id' | 'modelo_id' | 'anio' | 'sucursal_id'; message: string }[] = [
        { key: 'marca_id', message: 'Selecciona una marca' },
        { key: 'modelo_id', message: 'Selecciona un modelo' },
        { key: 'anio', message: 'Ingresa el año' },
        { key: 'sucursal_id', message: 'Selecciona una sucursal' },
      ];

      for (const { key, message } of requiredVehicleFields) {
        if (!(key in extraValues)) continue;
        const raw = extraValues[key];
        if (raw === null || raw === undefined || raw === '') {
          throw new Error(`Campos requeridos faltantes: ${message}`);
        }
        if (typeof raw === 'number' && Number.isNaN(raw)) {
          throw new Error(`Campos requeridos faltantes: ${message}`);
        }
      }

      const finalPayload: Record<string, unknown> = {
        ...basePayload,
        status: 'active',
      };

      if (values.condicion === 'used') {
        if (!values.estado_usado) {
          throw new Error('Seleccione estado del usado');
        }
        finalPayload.estado_usado = values.estado_usado;
      }

      const numericKeys: Array<'marca_id' | 'modelo_id' | 'sucursal_id'> = ['marca_id', 'modelo_id', 'sucursal_id'];
      for (const key of numericKeys) {
        if (!(key in extraValues)) continue;
        const raw = extraValues[key];
        if (raw === null || raw === undefined || raw === '') continue;
        const numericValue = typeof raw === 'number' ? raw : Number(raw);
        if (!Number.isNaN(numericValue)) {
          finalPayload[key] = numericValue;
        }
      }

      if ('anio' in extraValues) {
        const raw = extraValues.anio;
        if (raw !== null && raw !== undefined && raw !== '') {
          const yearValue = typeof raw === 'number' ? raw : Number(raw);
          if (!Number.isNaN(yearValue)) {
            finalPayload.anio = yearValue;
          }
        }
      }

      payload = finalPayload;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Valores inválidos';
      toast({ title: 'Error', description: message, variant: 'destructive' });
      return;
    }

    try {
      if (product) {
        await updateMutation.mutateAsync({ id: product.id, payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
    } catch (error) {
      // Errors handled in mutation onError
    }
  });

  return (
    <AppModal
      open={open}
      onClose={handleCancel}
      title={product ? 'Editar Producto' : 'Nuevo Producto'}
      footer={
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving || (condicion === 'used' && !estadoUsado)}>
            Guardar
          </Button>
        </div>
      }
      dismissible={false}
    >
      <form
        className="space-y-3 py-2"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <Input
          placeholder="Código (opcional)"
          autoFocus
          {...form.register('codigo')}
        />
        <Input
          placeholder="Nombre"
          {...nombreRegister}
          value={nombreValue}
          onChange={(event) => {
            const formatted = event.target.value.toUpperCase();
            form.setValue('nombre', formatted, { shouldDirty: true, shouldTouch: true });
          }}
          autoCapitalize="characters"
        />
        <Popover open={catOpen} onOpenChange={setCatOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              {selectedCat ? (selectedCat.nombre ?? selectedCat.name) : 'Categoría'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-1">
            <Input
              ref={searchRef}
              placeholder="BUSCAR CATEGORIA"
              className="mb-1 h-8 uppercase w-full text-base"
              value={catQuery}
              onChange={(e) => {
                setCatQuery(e.target.value.toUpperCase());
                setActiveIndex(-1);
              }}
              onKeyDown={handleCatKeyDown}
            />
            <div className="overflow-y-auto" style={{ maxHeight: '200px', scrollbarGutter: 'stable both-edges' }}>
              {filteredCats.map((c, idx) => (
                <div
                  key={c.id}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => handleCatClick(c)}
                  className={`px-2 h-10 flex items-center cursor-pointer ${idx === activeIndex ? 'bg-accent text-accent-foreground' : ''}`}
                >
                  {c.nombre ?? c.name}
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <Select value={condicion} onValueChange={(value) => form.setValue('condicion', value as 'new' | 'used')}>
          <SelectTrigger className="text-base"><SelectValue placeholder="Condición" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="new">Nuevo</SelectItem>
            <SelectItem value="used">Usado</SelectItem>
          </SelectContent>
        </Select>
        {condicion === 'used' && (
          <Select
            value={estadoUsado}
            onValueChange={(value: 'bueno' | 'con_detalle') => form.setValue('estado_usado', value)}
          >
            <SelectTrigger className="text-base"><SelectValue placeholder="Estado (usado)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="bueno">Bueno</SelectItem>
              <SelectItem value="con_detalle">Con detalle</SelectItem>
            </SelectContent>
          </Select>
        )}
        {lockInventoryFields ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Input
                type="number"
                placeholder="Precio"
                {...form.register('precio')}
                disabled
                readOnly
              />
            </TooltipTrigger>
            <TooltipContent>Permiso requerido</TooltipContent>
          </Tooltip>
        ) : (
          <Input
            type="number"
            placeholder="Precio"
            {...form.register('precio')}
          />
        )}
        {lockInventoryFields ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Input
                type="number"
                placeholder="Costo"
                {...form.register('costo')}
                disabled
                readOnly
              />
            </TooltipTrigger>
            <TooltipContent>Permiso requerido</TooltipContent>
          </Tooltip>
        ) : (
          <Input
            type="number"
            placeholder="Costo"
            {...form.register('costo')}
          />
        )}
        {lockInventoryFields ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Input
                inputMode="numeric"
                placeholder="0"
                value={form.watch('stock')}
                onChange={() => {}}
                disabled
                readOnly
              />
            </TooltipTrigger>
            <TooltipContent>Permiso requerido</TooltipContent>
          </Tooltip>
        ) : (
          <Input
            inputMode="numeric"
            placeholder="0"
            value={form.watch('stock')}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '');
              form.setValue('stock', digits);
            }}
            className={condicion === 'new' ? 'placeholder:opacity-50' : ''}
          />
        )}
        {condicion === 'new' && (
          lockInventoryFields ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Input
                  type="number"
                  placeholder="Stock mínimo (opcional)"
                  {...form.register('stock_minimo')}
                  disabled
                  readOnly
                />
              </TooltipTrigger>
              <TooltipContent>Permiso requerido</TooltipContent>
            </Tooltip>
          ) : (
            <Input
              type="number"
              placeholder="Stock mínimo (opcional)"
              {...form.register('stock_minimo')}
            />
          )
        )}
      </form>
    </AppModal>
  );
}

