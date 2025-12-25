import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Minus, Plus, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface VentaSearchItem {
  detalle_id: number;
  producto_id: number | null;
  codigo: string;
  nombre: string;
  cantidad: number;
  devuelto: number;
  disponible: number;
  precio: number;
  subtotal: number;
  nuevo_usado?: string | null;
  condicion?: string | null;
}

interface VentaSearchResult {
  id: number;
  numero: string;
  fecha: string;
  cliente: {
    id: number;
    nombre: string;
    nit?: string | null;
    telefono?: string | null;
  } | null;
  tipo: 'contado' | 'credito';
  subtotal: number;
  impuestos: number;
  total: number;
  items: VentaSearchItem[];
  returnable_total: number;
}

interface ItemSelectionState {
  qty: number;
  motivo: string;
  motivoOpen: boolean;
}

interface RegistrarDevolucionModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function RegistrarDevolucionModal({ open, onClose, onSuccess }: RegistrarDevolucionModalProps) {
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<VentaSearchResult | null>(null);
  const [itemState, setItemState] = useState<Record<number, ItemSelectionState>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setSearchTerm('');
      setDebouncedTerm('');
      setSelectedSale(null);
      setItemState({});
      setIsSubmitting(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handle = setTimeout(() => {
      const cleaned = searchTerm.replace(/^#/, '').trim().toLowerCase();
      setDebouncedTerm(cleaned.replace(/\s+/g, ' '));
    }, 300);
    return () => clearTimeout(handle);
  }, [searchTerm, open]);

  useEffect(() => {
    if (!selectedSale) {
      setItemState({});
    }
  }, [selectedSale]);

  const selectSale = (venta: VentaSearchResult) => {
    setSelectedSale(venta);
    setItemState({});
  };

  const {
    data: searchData,
    isFetching: loadingSearch,
    isError: searchError,
  } = useQuery<{ results: VentaSearchResult[] }>({
    queryKey: ['ventas-search', debouncedTerm],
    queryFn: () => api.searchVentas(debouncedTerm, { limit: 25 }) as Promise<{ results: VentaSearchResult[] }>,
    enabled: open && debouncedTerm.length > 0,
    staleTime: 30_000,
  });

  const searchResults = searchData?.results ?? [];

  const ensureState = (detalleId: number): ItemSelectionState => {
    const current = itemState[detalleId];
    if (current) return current;
    return { qty: 0, motivo: '', motivoOpen: false };
  };

  const updateQty = (detalleId: number, qty: number, max: number) => {
    setItemState((prev) => {
      const next = { ...prev };
      const base = ensureState(detalleId);
      const clamped = Math.max(0, Math.min(qty, max));
      next[detalleId] = { ...base, qty: clamped };
      return next;
    });
  };

  const adjustQty = (detalleId: number, delta: number, max: number) => {
    const base = ensureState(detalleId);
    updateQty(detalleId, base.qty + delta, max);
  };

  const toggleMotivo = (detalleId: number, openMotivo: boolean) => {
    setItemState((prev) => {
      const next = { ...prev };
      const base = ensureState(detalleId);
      next[detalleId] = { ...base, motivoOpen: openMotivo };
      return next;
    });
  };

  const updateMotivo = (detalleId: number, value: string) => {
    setItemState((prev) => {
      const next = { ...prev };
      const base = ensureState(detalleId);
      next[detalleId] = { ...base, motivo: value };
      return next;
    });
  };

  const selectedItems = useMemo(() => {
    if (!selectedSale) return [] as { item: VentaSearchItem; qty: number; motivo: string }[];
    return selectedSale.items
      .map((item) => {
        const state = itemState[item.detalle_id] ?? { qty: 0, motivo: '', motivoOpen: false };
        return {
          item,
          qty: state.qty,
          motivo: state.motivo.trim(),
        };
      })
      .filter(({ qty }) => qty > 0);
  }, [selectedSale, itemState]);

  const selectedCount = selectedItems.length;
  const refundAmount = selectedItems.reduce((sum, { item, qty }) => sum + qty * item.precio, 0);

  const resetSelection = () => {
    setSelectedSale(null);
    setItemState({});
  };

  const handleSubmit = async () => {
    if (!selectedSale) return;
    if (!selectedItems.length) {
      toast({ title: 'Seleccione al menos un producto', variant: 'destructive' });
      return;
    }

    const payload = [] as { detalle_id: number; qty: number; motivo?: string }[];
    for (const { item, qty, motivo } of selectedItems) {
      if (qty > item.disponible) {
        toast({
          title: 'Cantidad inválida',
          description: `La cantidad para ${item.nombre || item.codigo} supera lo disponible`,
          variant: 'destructive',
        });
        return;
      }
      payload.push({
        detalle_id: item.detalle_id,
        qty,
        motivo: motivo || undefined,
      });
    }

    setIsSubmitting(true);
    try {
      await api.createDevolucion({ venta_id: selectedSale.id, items: payload });
      toast({ title: 'Devolución registrada' });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['devoluciones'] }),
        queryClient.invalidateQueries({ queryKey: ['ventas-search'] }),
        queryClient.invalidateQueries({ queryKey: ['reportes-dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['ventas-total'] }),
        queryClient.invalidateQueries({ queryKey: ['inventario'] }),
        queryClient.invalidateQueries({ queryKey: ['creditos'] }),
        queryClient.invalidateQueries({ queryKey: ['creditos-historial'] }),
      ]);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Error al registrar la devolución',
        description: error?.message || 'Intente de nuevo más tarde',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderResults = () => {
    if (!debouncedTerm) {
      return <p className="text-sm text-muted-foreground">Escriba para buscar ventas recientes.</p>;
    }
    if (loadingSearch) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Buscando ventas…
        </div>
      );
    }
    if (searchError) {
      return <p className="text-sm text-destructive">No se pudo buscar ventas. Intente nuevamente.</p>;
    }
    if (!searchResults.length) {
      return <p className="text-sm text-muted-foreground">No hay ventas que coincidan.</p>;
    }

    return (
      <div className="space-y-2">
        {searchResults.map((venta) => {
          const isActive = selectedSale?.id === venta.id;
          return (
            <button
              key={venta.id}
              type="button"
              onClick={() => selectSale(venta)}
              className={cn(
                'surface surface-pad w-full text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                isActive
                  ? 'border-primary/70 ring-2 ring-primary/40'
                  : 'hover:border-primary/40 hover:shadow-[0_18px_38px_-24px_rgba(0,0,0,0.45)]'
              )}
              aria-pressed={isActive}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-base">#{venta.numero}</span>
                    <Badge variant="secondary" className="capitalize">
                      {venta.tipo}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {venta.cliente?.nombre || 'Cliente general'} · {formatDate(venta.fecha)}
                  </p>
                </div>
                <span className="text-base font-semibold">{formatCurrency(venta.total)}</span>
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const summaryInfo = selectedSale?.tipo === 'contado'
    ? `Se restará de ingresos ${formatCurrency(refundAmount)}`
    : 'Se restará de ingresos hasta el monto abonado disponible. Saldo no pagado no afecta ingresos.';

  const summaryContent = (
    <div className="space-y-4">
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Productos seleccionados</span>
          <span className="font-semibold">{selectedCount}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Monto a devolver</span>
          <span className="text-lg font-semibold" aria-live="polite">
            {formatCurrency(refundAmount)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{summaryInfo}</p>
      </div>
      <Button
        type="button"
        className="h-12 rounded-full text-base font-semibold"
        onClick={handleSubmit}
        disabled={!selectedItems.length || isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            Procesando…
          </>
        ) : (
          'Confirmar devolución'
        )}
      </Button>
    </div>
  );

  useEffect(() => {
    if (open) {
      const previous = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = previous;
      };
    }
    return undefined;
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) onClose(); }}>
      <DialogContent
        overlayClassName="bg-black/50"
        containerClassName="fixed inset-0 z-50 flex items-stretch justify-center px-4 sm:px-6"
        containerStyle={{
          paddingTop: 'max(16px, env(safe-area-inset-top))',
          paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        }}
        className={cn(
          'surface flex h-full max-h-[calc(100dvh-2rem)] w-full max-w-5xl flex-col overflow-hidden p-0 text-left shadow-2xl focus-visible:outline-none [--modal-horizontal-padding:1rem] sm:h-auto sm:max-h-[90dvh] sm:rounded-3xl sm:[--modal-horizontal-padding:1.5rem]'
        )}
      >
        <header
          className="sticky top-0 z-20 flex flex-col gap-3 border-b border-border bg-background/95 px-4 py-4 shadow-sm backdrop-blur sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-6"
          style={{
            paddingTop: 'max(1rem, env(safe-area-inset-top))',
            paddingLeft: 'calc(var(--modal-horizontal-padding, 1rem) + env(safe-area-inset-left))',
            paddingRight: 'calc(var(--modal-horizontal-padding, 1rem) + env(safe-area-inset-right))',
          }}
        >
          <div>
            <DialogTitle className="text-xl font-semibold">Registrar Devolución</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted-foreground">
              Tres pasos: busque la venta, elija productos y confirme la devolución.
            </DialogDescription>
          </div>
          <Button
            variant="outline"
            onClick={onClose}
            className="h-11 self-start rounded-full px-5 sm:self-auto"
          >
            Cerrar
          </Button>
        </header>
        <div
          className="flex-1 overflow-y-auto px-4 py-5 sm:px-6"
          style={{
            WebkitOverflowScrolling: 'touch',
            paddingLeft: 'calc(var(--modal-horizontal-padding, 1rem) + env(safe-area-inset-left))',
            paddingRight: 'calc(var(--modal-horizontal-padding, 1rem) + env(safe-area-inset-right))',
            paddingBottom: selectedSale
              ? 'calc(env(safe-area-inset-bottom) + 7rem)'
              : 'calc(env(safe-area-inset-bottom) + 2.5rem)',
          }}
        >
          <section className="space-y-3">
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-primary/80">Paso 1</span>
              <h2 className="text-xl font-semibold">Buscar venta</h2>
              <p className="text-sm text-muted-foreground">
                Buscar por número, cliente o producto para localizar la venta que desea devolver.
              </p>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por #venta, cliente, código o producto…"
                className="h-12 rounded-2xl border-border bg-background pl-10 text-base"
                aria-label="Buscar venta"
              />
            </div>
            {!selectedSale && <div className="max-h-[45vh] overflow-y-auto pr-1">{renderResults()}</div>}
            {selectedSale && (
              <div className="flex flex-col gap-2 rounded-2xl border border-primary/40 bg-primary/5 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Venta seleccionada #{selectedSale.numero}</p>
                  <p className="text-muted-foreground">
                    {selectedSale.cliente?.nombre || 'Cliente general'} · {formatDate(selectedSale.fecha)}
                  </p>
                </div>
                <Button
                  variant="link"
                  onClick={resetSelection}
                  className="h-auto self-start px-0 text-primary underline sm:self-auto"
                  aria-label="Cambiar venta"
                >
                  Cambiar venta
                </Button>
              </div>
            )}
          </section>

          <section className="mt-6 space-y-4">
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-primary/80">Paso 2</span>
              <h2 className="text-xl font-semibold">Seleccionar productos</h2>
              <p className="text-sm text-muted-foreground">
                Ajuste la cantidad a devolver y agregue un motivo si es necesario.
              </p>
            </div>

            {!selectedSale && (
              <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                Busque y seleccione una venta para ver sus productos.
              </div>
            )}

            {selectedSale && (
              <div className="flex flex-col gap-6 lg:flex-row">
                <div className="flex-1 space-y-4">
                  <div className="surface surface-pad space-y-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm uppercase tracking-wide text-muted-foreground">Venta</p>
                        <p className="text-lg font-semibold">#{selectedSale.numero}</p>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <p>{formatDate(selectedSale.fecha)}</p>
                        <p className="capitalize">{selectedSale.tipo}</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Cliente: {selectedSale.cliente?.nombre || 'Cliente general'} · Total {formatCurrency(selectedSale.total)}
                    </p>
                  </div>

                  <div className="space-y-4">
                    {selectedSale.items.map((item) => {
                      const state = ensureState(item.detalle_id);
                      const disponible = Math.max(0, item.disponible);
                      const vendida = item.cantidad;
                      const devuelta = item.devuelto;
                      const disableControls = disponible <= 0;
                      return (
                        <div key={item.detalle_id} className="surface surface-pad space-y-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="space-y-1">
                              <p className="text-base font-semibold leading-snug">
                                {item.nombre || 'Producto sin nombre'}
                              </p>
                              <p className="text-sm text-muted-foreground">{item.codigo || 'Sin código'}</p>
                            </div>
                            {item.nuevo_usado && (
                              <Badge variant="outline" className="capitalize">
                                {item.nuevo_usado}
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                            <div>
                              <p className="text-muted-foreground">Vendida</p>
                              <p className="font-medium">{vendida}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Devuelta</p>
                              <p className="font-medium">{devuelta}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Disponible</p>
                              <p className="font-medium">{disponible}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Precio</p>
                              <p className="font-medium">{formatCurrency(item.precio)}</p>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <span className="text-sm font-medium">Cantidad</span>
                              <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-11 w-11 rounded-full"
                                  aria-label={`Disminuir cantidad para ${item.nombre}`}
                                  onClick={() => adjustQty(item.detalle_id, -1, disponible)}
                                  disabled={disableControls || state.qty <= 0}
                                >
                                  <Minus className="h-4 w-4" aria-hidden="true" />
                                </Button>
                                <Input
                                  type="number"
                                  inputMode="decimal"
                                  min={0}
                                  max={disponible}
                                  value={state.qty ?? 0}
                                  onChange={(event) => {
                                    const raw = event.target.value;
                                    const numeric = raw === '' ? 0 : Number(raw);
                                    if (Number.isNaN(numeric)) return;
                                    updateQty(item.detalle_id, numeric, disponible);
                                  }}
                                  className="h-11 w-24 rounded-2xl text-center text-lg"
                                  aria-label={`Cantidad a devolver para ${item.nombre}`}
                                  disabled={disableControls}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-11 w-11 rounded-full"
                                  aria-label={`Aumentar cantidad para ${item.nombre}`}
                                  onClick={() => adjustQty(item.detalle_id, 1, disponible)}
                                  disabled={disableControls || state.qty >= disponible}
                                >
                                  <Plus className="h-4 w-4" aria-hidden="true" />
                                </Button>
                              </div>
                            </div>

                            {disableControls && (
                              <p className="text-sm text-muted-foreground">
                                No quedan unidades disponibles para devolución.
                              </p>
                            )}

                            {state.motivoOpen ? (
                              <div className="w-full space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <label
                                    htmlFor={`motivo-${item.detalle_id}`}
                                    className="text-sm font-medium text-muted-foreground"
                                  >
                                    Motivo (opcional)
                                  </label>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-auto px-2 py-1 text-xs text-muted-foreground"
                                    onClick={() => toggleMotivo(item.detalle_id, false)}
                                  >
                                    Ocultar
                                  </Button>
                                </div>
                                <Textarea
                                  id={`motivo-${item.detalle_id}`}
                                  placeholder="Escriba el motivo de la devolución…"
                                  value={state.motivo}
                                  onChange={(event) => updateMotivo(item.detalle_id, event.target.value)}
                                  className="min-h-[96px] w-full resize-y rounded-2xl border border-border bg-background px-3 py-3 text-sm leading-relaxed shadow-sm"
                                />
                              </div>
                            ) : (
                              <Button
                                type="button"
                                variant="link"
                                className="h-auto px-0 text-sm"
                                onClick={() => toggleMotivo(item.detalle_id, true)}
                              >
                                Agregar motivo
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <aside className="hidden lg:flex lg:w-80 lg:flex-shrink-0">
                  <div className="sticky top-6 flex w-full flex-col gap-4 surface surface-pad">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wide text-primary/80">Paso 3</span>
                      <h2 className="mt-1 text-xl font-semibold">Confirmar devolución</h2>
                    </div>
                    {summaryContent}
                  </div>
                </aside>
              </div>
            )}
          </section>
        </div>

        {selectedSale && (
          <div
            className="sticky bottom-0 z-20 border-t border-border bg-background/95 px-4 py-4 shadow-lg backdrop-blur sm:px-6 lg:hidden"
            style={{
              paddingLeft: 'calc(var(--modal-horizontal-padding, 1rem) + env(safe-area-inset-left))',
              paddingRight: 'calc(var(--modal-horizontal-padding, 1rem) + env(safe-area-inset-right))',
              paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
            }}
          >
            {summaryContent}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

