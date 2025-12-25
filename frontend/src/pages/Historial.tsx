import { useState, useEffect } from 'react';
import { api, type HistorialMovimiento } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search } from 'lucide-react';
import VentaModal from '@/components/modals/VentaModal';
import { formatCurrency, formatDate } from '@/lib/format';
import { fmtHM } from '@/utils/datetime';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { format, parseISO } from 'date-fns';
import { Download } from 'lucide-react';
import ExportSalesModal from '@/components/modals/ExportSalesModal';
import { computeRange, QuickRange, DateRange, formatRange } from '@/lib/dateRange';
import { Skeleton } from '@/components/ui/skeleton';
import Pagination from '@/components/ui/Pagination';
import { Badge } from '@/components/ui/badge';

type HistorialRow = HistorialMovimiento;

export default function Historial() {
  const [ventas, setVentas] = useState<HistorialRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVentaId, setSelectedVentaId] = useState<number | null>(null);
  const [active, setActive] = useState<QuickRange | 'rango'>('diario');
  const [range, setRange] = useState<DateRange>(() => computeRange('diario', new Date()));
  const [open, setOpen] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 30;
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const modeMap: Record<QuickRange | 'rango', 'daily' | 'quincenal' | 'monthly' | 'all' | 'range'> = {
    diario: 'daily',
    quincenal: 'quincenal',
    mensual: 'monthly',
    todos: 'all',
    rango: 'range',
  };

  const load = async () => {
    setLoading(true);
    try {
      const params: any = {
        mode: modeMap[active],
        page,
        page_size: pageSize,
      };
      if (params.mode === 'range') {
        if (range.start) params.start = format(range.start, 'yyyy-MM-dd');
        if (range.end) params.end = format(range.end, 'yyyy-MM-dd');
      }
      if (searchTerm.trim()) params.q = searchTerm.trim();
      const data = await api.getHistorialVentas(params);
      setVentas(data.results);
      const totalPagesCalc = data.total_pages ?? Math.max(1, Math.ceil(data.count / data.page_size));
      setTotalPages(totalPagesCalc);
      setTotalCount(data.count);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const now = new Date();
    const r = computeRange('diario', now);
    setRange(r);
    setCustomStart(format(r.start!, 'yyyy-MM-dd'));
    setCustomEnd(format(r.end!, 'yyyy-MM-dd'));
  }, []);

  useEffect(() => {
    load();
  }, [active, range, page, searchTerm]);

  const handleQuick = (q: QuickRange) => {
    setActive(q);
    const r = computeRange(q, new Date());
    setRange(r);
    setCustomStart(r.start ? format(r.start, 'yyyy-MM-dd') : '');
    setCustomEnd(r.end ? format(r.end, 'yyyy-MM-dd') : '');
    setPage(1);
  };

  const resetRange = () => {
    const r = computeRange('diario', new Date());
    setCustomStart(format(r.start!, 'yyyy-MM-dd'));
    setCustomEnd(format(r.end!, 'yyyy-MM-dd'));
  };

  const applyRange = () => {
    if (!customStart || !customEnd) return;
    const startDate = parseISO(customStart);
    let endDate = parseISO(customEnd);
    const today = new Date();
    if (endDate > today) endDate = today;
    if (startDate > endDate) return;
    setActive('rango');
    const r = { start: startDate, end: endDate };
    setRange(r);
    setPage(1);
    setOpen(false);
  };
  
  const openVenta = (id: number) => setSelectedVentaId(id);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl md:text-4xl font-bold text-foreground">Historial de Ventas</h1>

      <div className="surface surface-pad space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input
                placeholder="Buscar por cliente o ID..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pl-12 bg-background border-border text-base"
              />
            </div>
            <Button
              onClick={() => setExportOpen(true)}
              variant="outline"
              className="rounded-full h-9 px-4 shadow-2xl bg-background/60 dark:bg-background/50 hover:bg-yellow-300 dark:hover:bg-yellow-500 active:bg-yellow-400 dark:active:bg-yellow-600 backdrop-blur-sm text-foreground hover:text-foreground dark:hover:text-foreground active:text-foreground dark:active:text-foreground border border-border transition-colors"
              aria-label="Descargar historial"
            >
              <Download className="h-4 w-4" />
              <span className="ml-2 hidden sm:inline">Descargar</span>
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {(['diario','quincenal','mensual','todos'] as QuickRange[]).map(opt => (
              <Button
                key={opt}
                variant={active === opt ? 'default' : 'outline'}
                className="rounded-full h-7 px-4 text-xs md:text-sm"
                onClick={() => handleQuick(opt)}
                aria-pressed={active === opt}
              >
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </Button>
            ))}
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={active === 'rango' ? 'default' : 'outline'}
                  className="rounded-full h-7 px-4 text-xs md:text-sm"
                  aria-pressed={active === 'rango'}
                >
                  Rango
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-4 space-y-3 bg-background/80 dark:bg-background/60 backdrop-blur-sm" align="start">
                <label className="flex flex-col text-xs font-medium text-foreground">
                  Inicio
                  <input
                    type="date"
                    className="mt-1 rounded-md border border-input bg-background p-1 text-foreground"
                    value={customStart}
                    onChange={e => setCustomStart(e.target.value)}
                  />
                </label>
                <label className="flex flex-col text-xs font-medium text-foreground">
                  Fin
                  <input
                    type="date"
                    className="mt-1 rounded-md border border-input bg-background p-1 text-foreground"
                    value={customEnd}
                    onChange={e => setCustomEnd(e.target.value)}
                    max={format(new Date(), 'yyyy-MM-dd')}
                  />
                </label>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="rounded-full h-6 px-3 text-xs"
                    onClick={resetRange}
                  >
                    Reset
                  </Button>
                  <Button
                    className="rounded-full h-6 px-3 text-xs"
                    onClick={applyRange}
                    disabled={!customStart || !customEnd || parseISO(customStart) > parseISO(customEnd)}
                  >
                    Aplicar
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            {range.start && range.end && (
              <span
                className="rounded-full bg-secondary/60 px-3 py-1 text-xs text-secondary-foreground"
                aria-label="Rango activo"
              >
                {formatRange(range.start, range.end)}
              </span>
            )}
          </div>
      </div>

      <div className="surface surface-pad">
        <h2 className="text-lg md:text-xl text-foreground">Ventas ({totalCount})</h2>
        {error && <p className="text-destructive">{error}</p>}
        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-muted-foreground">Cliente</TableHead>
                <TableHead className="text-muted-foreground">Fecha</TableHead>
                <TableHead className="text-muted-foreground">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-border">
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  </TableRow>
                ))}
              {!loading && ventas.map(row => {
                  const isDevolucion = row.tipo === 'DEVOLUCION';
                  const isAbono = row.tipo === 'ABONO';
                  const amount = isDevolucion
                    ? `−${formatCurrency(Math.abs(row.monto))}`
                    : formatCurrency(row.monto);
                  return (
                    <TableRow
                      key={`${row.tipo}-${row.id}`}
                      onClick={() => openVenta(row.venta_id)}
                      className="border-border cursor-pointer"
                    >
                      <TableCell className="text-foreground">
                        <div className="flex flex-col gap-1">
                          <span>{row.cliente || 'Cliente General'}</span>
                          {row.nota && isDevolucion && (
                            <span className="text-xs text-muted-foreground max-w-xs truncate">
                              Nota: {row.nota}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground">
                        {formatDate(row.fecha)}{' '}
                        <span className="whitespace-nowrap">{fmtHM(row.fecha)}</span>
                      </TableCell>
                      <TableCell className={isDevolucion ? 'text-destructive' : 'text-foreground'}>
                        <div className="flex flex-wrap items-center gap-2">
                          {isAbono && <Badge variant="secondary">Abono crédito</Badge>}
                          {isDevolucion && <Badge variant="destructive">Devolución</Badge>}
                          <span>{amount}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              {!loading && ventas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No hay ventas en este rango
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {!loading && totalPages > 1 && (
          <div className="mt-4 flex justify-center">
            <Pagination page={page} pageCount={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>
      <VentaModal
        id={selectedVentaId}
        open={selectedVentaId !== null}
        onClose={() => setSelectedVentaId(null)}
      />
      <ExportSalesModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        currentType={active}
        currentRange={range}
      />
    </div>
  );
}
