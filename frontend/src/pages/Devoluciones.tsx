import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { format, endOfDay, startOfDay } from 'date-fns';
import { Download, RotateCcw, Search, Wallet } from 'lucide-react';

import { api } from '@/lib/api';
import type { Devolucion } from '@/types/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Pagination from '@/components/ui/Pagination';
import DetalleDevolucionModal from '@/components/devoluciones/DetalleDevolucionModal';
import ExportDevolucionesModal from '@/components/devoluciones/ExportDevolucionesModal';
import { RegistrarDevolucionModal } from '@/components/devoluciones/RegistrarDevolucionModal';
import { formatCurrency, formatDate } from '@/lib/format';
import { computeRange, DateRange, QuickRange } from '@/lib/dateRange';

type RangeType = QuickRange | 'rango';

const RANGE_OPTIONS: { key: RangeType; label: string }[] = [
  { key: 'diario', label: 'Diario' },
  { key: 'quincenal', label: 'Quincenal' },
  { key: 'mensual', label: 'Mensual' },
  { key: 'todos', label: 'Todos' },
  { key: 'rango', label: 'Rango' },
];

const PAGE_SIZE = 30;

export default function Devoluciones() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const registerButtonRef = useRef<HTMLButtonElement>(null);
  const isRegisterOpen = searchParams.get('registrar') === '1';
  const wasRegisterOpen = useRef(isRegisterOpen);

  const [historyTerm, setHistoryTerm] = useState('');
  const [rangeType, setRangeType] = useState<RangeType>('diario');
  const [quickRange, setQuickRange] = useState<DateRange>(() => computeRange('diario', new Date()));
  const [customRange, setCustomRange] = useState<DateRange>({ start: null, end: null });
  const [page, setPage] = useState(1);
  const [selectedDevolucion, setSelectedDevolucion] = useState<Devolucion | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const { data: devoluciones = [], isLoading, isError, error } = useQuery<Devolucion[]>({
    queryKey: ['devoluciones'],
    queryFn: () => api.getDevoluciones() as Promise<Devolucion[]>,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!isRegisterOpen && wasRegisterOpen.current) {
      registerButtonRef.current?.focus();
    }
    wasRegisterOpen.current = isRegisterOpen;
  }, [isRegisterOpen]);

  useEffect(() => {
    if (rangeType === 'rango') return;
    setQuickRange(computeRange(rangeType as QuickRange, new Date()));
  }, [rangeType]);

  const effectiveRange: DateRange = rangeType === 'rango' ? customRange : quickRange;

  const normalizedRange = useMemo(() => {
    const start = effectiveRange.start ? startOfDay(effectiveRange.start) : null;
    const end = effectiveRange.end ? endOfDay(effectiveRange.end) : null;
    return { start, end } as DateRange;
  }, [effectiveRange]);

  const filtered = useMemo(() => {
    const term = historyTerm.trim().toLowerCase();
    return devoluciones
      .filter((devolucion) => {
        const name = (devolucion.producto_nombre_snapshot || '').toLowerCase();
        const code = (devolucion.producto_codigo_snapshot || '').toLowerCase();
        const matchesTerm = !term || name.includes(term) || code.includes(term);
        if (!matchesTerm) return false;
        const date = new Date(devolucion.fecha);
        if (normalizedRange.start && date < normalizedRange.start) return false;
        if (normalizedRange.end && date > normalizedRange.end) return false;
        return true;
      })
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [devoluciones, historyTerm, normalizedRange]);

  const totalAmount = useMemo(
    () => filtered.reduce((sum, devolucion) => sum + Number(devolucion.total || 0), 0),
    [filtered],
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  );

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  const openRegistrar = () => {
    const next = new URLSearchParams(searchParams);
    next.set('registrar', '1');
    setSearchParams(next, { replace: false });
  };

  const closeRegistrar = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('registrar');
    setSearchParams(next, { replace: true });
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['devoluciones'] });
    closeRegistrar();
  };

  const currentRangeForExport = rangeType === 'rango' ? customRange : quickRange;

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold sm:text-3xl">Devoluciones</h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              Revise el historial de devoluciones y registre nuevas sin salir de esta página.
            </p>
          </div>
          <Button
            ref={registerButtonRef}
            onClick={openRegistrar}
            className="h-12 rounded-full px-6 text-base font-semibold"
          >
            Registrar Devolución
          </Button>
        </header>

        <section className="surface surface-pad space-y-4 sm:space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold sm:text-xl">Historial de devoluciones</h2>
              <p className="text-sm text-muted-foreground">
                Filtre por rango de fechas o busque por nombre o código de producto.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="relative flex-1 min-w-[220px] sm:min-w-[260px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  value={historyTerm}
                  onChange={(event) => {
                    setHistoryTerm(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Buscar en historial…"
                  className="h-11 rounded-full border-border bg-background pl-9"
                  aria-label="Buscar en historial de devoluciones"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setExportOpen(true)}
                className="h-11 rounded-full px-5"
              >
                <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                Descargar
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2" role="tablist">
            {RANGE_OPTIONS.map(({ key, label }) => (
              <Button
                key={key}
                role="tab"
                aria-selected={rangeType === key}
                variant={rangeType === key ? 'default' : 'outline'}
                className="h-10 rounded-full px-5 text-sm"
                onClick={() => {
                  setRangeType(key);
                  setPage(1);
                }}
              >
                {label}
              </Button>
            ))}
          </div>

          {rangeType === 'rango' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col text-sm font-medium">
                Inicio
                <Input
                  type="date"
                  value={customRange.start ? format(customRange.start, 'yyyy-MM-dd') : ''}
                  max={format(new Date(), 'yyyy-MM-dd')}
                  onChange={(event) => {
                    const value = event.target.value ? startOfDay(new Date(event.target.value)) : null;
                    setCustomRange((prev) => ({ ...prev, start: value }));
                    setPage(1);
                  }}
                  className="mt-1 rounded-lg"
                />
              </label>
              <label className="flex flex-col text-sm font-medium">
                Fin
                <Input
                  type="date"
                  value={customRange.end ? format(customRange.end, 'yyyy-MM-dd') : ''}
                  max={format(new Date(), 'yyyy-MM-dd')}
                  onChange={(event) => {
                    const value = event.target.value ? endOfDay(new Date(event.target.value)) : null;
                    setCustomRange((prev) => ({ ...prev, end: value }));
                    setPage(1);
                  }}
                  className="mt-1 rounded-lg"
                />
              </label>
            </div>
          )}
        </section>

        <div className="grid gap-6 lg:grid-cols-12">
          <div className="surface surface-pad space-y-4 lg:col-span-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">Resultados</h3>
              <span className="text-sm text-muted-foreground">{filtered.length} registros</span>
            </div>

            <div
              className="w-full max-w-full overflow-x-auto scroll-soft"
              style={{
                WebkitOverflowScrolling: 'touch',
                scrollbarGutter: 'stable both-edges',
              } as CSSProperties}
            >
              <div className="min-w-[640px] lg:min-w-[720px]">
                <Table className="w-full lg:mx-auto">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Fecha</TableHead>
                      <TableHead className="whitespace-nowrap">Producto</TableHead>
                      <TableHead className="whitespace-nowrap">Cantidad</TableHead>
                      <TableHead className="whitespace-nowrap text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && (
                      <TableRow>
                        <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                          Cargando historial…
                        </TableCell>
                      </TableRow>
                    )}
                    {isError && !isLoading && (
                      <TableRow>
                        <TableCell colSpan={4} className="py-6 text-center text-destructive">
                          {error instanceof Error ? error.message : 'No se pudo cargar el historial'}
                        </TableCell>
                      </TableRow>
                    )}
                    {!isLoading && !isError && paginated.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                          No se encontraron devoluciones.
                        </TableCell>
                      </TableRow>
                    )}
                    {!isLoading && !isError &&
                      paginated.map((devolucion) => (
                        <TableRow
                          key={devolucion.id}
                          className="cursor-pointer transition hover:bg-primary/5"
                          onClick={() => setSelectedDevolucion(devolucion)}
                        >
                          <TableCell className="whitespace-nowrap text-sm font-medium">
                            {formatDate(devolucion.fecha)}
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-sm">
                            {devolucion.producto_nombre_snapshot || 'Producto sin nombre'}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            {devolucion.cantidad}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right text-sm font-semibold">
                            {formatCurrency(devolucion.total)}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {pageCount > 1 && (
              <div className="flex justify-center pt-2">
                <Pagination
                  page={page}
                  pageCount={pageCount}
                  onPageChange={setPage}
                  siblingCount={1}
                  boundaryCount={1}
                />
              </div>
            )}
          </div>

          <aside className="lg:col-span-4">
            <div className="surface surface-pad space-y-4">
              <h3 className="text-lg font-semibold">Resumen</h3>
              <div
                className="w-full max-w-full overflow-x-auto scroll-soft"
                style={{
                  WebkitOverflowScrolling: 'touch',
                  scrollbarGutter: 'stable both-edges',
                } as CSSProperties}
              >
                <div className="min-w-[300px] space-y-3 text-sm sm:min-w-[340px]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      <span>Devoluciones</span>
                    </div>
                    <span className="font-medium">{filtered.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Wallet className="h-4 w-4" aria-hidden="true" />
                      <span>Monto devuelto</span>
                    </div>
                    <span className="font-semibold">{formatCurrency(totalAmount)}</span>
                  </div>
                  {normalizedRange.start && normalizedRange.end && (
                    <div className="rounded-2xl border border-dashed border-border/60 bg-background/60 px-3 py-2 text-xs text-muted-foreground">
                      Período: {format(normalizedRange.start, 'dd/MM/yyyy')} – {format(normalizedRange.end, 'dd/MM/yyyy')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>

        <DetalleDevolucionModal devolucion={selectedDevolucion} onClose={() => setSelectedDevolucion(null)} />
        <ExportDevolucionesModal
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          currentType={rangeType === 'rango' ? 'rango' : (rangeType as QuickRange)}
          currentRange={currentRangeForExport}
          devoluciones={devoluciones}
        />
        <RegistrarDevolucionModal open={isRegisterOpen} onClose={closeRegistrar} onSuccess={handleSuccess} />
      </div>
    </div>
  );
}

