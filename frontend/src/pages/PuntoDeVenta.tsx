import { useState, useEffect } from 'react';
import { api, type HistorialMovimiento } from '@/lib/api';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import NuevaFacturaModal from '@/components/modals/NuevaFacturaModal';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Search,
  Plus,
  Filter,
  Download,
  Eye,
  Calendar,
  ChevronDown,
  CheckCircle2,
  X
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { computeRange, QuickRange, DateRange, formatRange } from '@/lib/dateRange';
import Pagination from '@/components/ui/Pagination';
import { Skeleton } from '@/components/ui/skeleton';
import VentaModal from '@/components/modals/VentaModal';
import ExportSalesModal from '@/components/modals/ExportSalesModal';
import { formatCurrency, formatDate } from '@/lib/format';
import { fmtHM } from '@/utils/datetime';

type HistorialRow = HistorialMovimiento;

export default function PuntoDeVenta() {
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
  const [totalFacturado, setTotalFacturado] = useState(0);
  const [showNuevaFactura, setShowNuevaFactura] = useState(false);
  const [saleSuccess, setSaleSuccess] = useState<{ id: number; total: number; saleType: string } | null>(null);

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
        page,
        page_size: pageSize,
      };
      
      // Aplicar filtros de fecha según el modo
      if (active === 'rango') {
        if (range.start) params.start = format(range.start, 'yyyy-MM-dd');
        if (range.end) params.end = format(range.end, 'yyyy-MM-dd');
      } else if (active !== 'todos') {
        const r = computeRange(active, new Date());
        if (r.start) params.start = format(r.start, 'yyyy-MM-dd');
        if (r.end) params.end = format(r.end, 'yyyy-MM-dd');
      }
      
      if (searchTerm.trim()) params.q = searchTerm.trim();
      
      // Usar historial_ventas que ya filtra correctamente
      const data = await api.getHistorialVentas({
        mode: modeMap[active],
        page,
        page_size: pageSize,
        start: params.start,
        end: params.end,
        q: params.q,
      });
      
      // Filtrar solo ventas (excluir abonos y devoluciones)
      const ventasOnly = data.results.filter((v: HistorialRow) => v.tipo === 'VENTA_CONTADO');
      setVentas(ventasOnly);
      
      const totalPagesCalc = data.total_pages ?? Math.max(1, Math.ceil(data.count / data.page_size));
      setTotalPages(totalPagesCalc);
      setTotalCount(ventasOnly.length);
      
      // Calcular total facturado
      const total = ventasOnly.reduce((sum: number, v: HistorialRow) => sum + (v.monto || 0), 0);
      setTotalFacturado(total);
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

  const getMetodoPagoLabel = (metodo: string | null | undefined) => {
    if (!metodo) return '-';
    const map: Record<string, string> = {
      'efectivo': 'Efectivo',
      'tarjeta': 'Tarjeta',
      'transferencia': 'Transferencia',
    };
    return map[metodo.toLowerCase()] || metodo;
  };

  const getTipoLabel = (tipo: string) => {
    return tipo === 'VENTA_CONTADO' ? 'Directa' : tipo;
  };

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Header con botón Nueva Factura */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-4xl font-bold text-foreground">NAVEGANET</h1>
          <Button onClick={() => setShowNuevaFactura(true)} size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Nueva Factura
          </Button>
        </div>

        {/* Búsqueda y Filtros */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input
                placeholder="Buscar por número, cliente..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pl-12 bg-background border-border text-base"
              />
            </div>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  {active === 'rango' && range.start && range.end
                    ? formatRange(range.start, range.end)
                    : active.charAt(0).toUpperCase() + active.slice(1)}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4 space-y-3" align="start">
                <div className="space-y-2">
                  {(['diario', 'quincenal', 'mensual', 'todos'] as QuickRange[]).map(opt => (
                    <Button
                      key={opt}
                      variant={active === opt ? 'default' : 'outline'}
                      className="w-full justify-start"
                      onClick={() => {
                        handleQuick(opt);
                        setOpen(false);
                      }}
                    >
                      {opt.charAt(0).toUpperCase() + opt.slice(1)}
                    </Button>
                  ))}
                  <div className="pt-2 border-t space-y-2">
                    <label className="flex flex-col text-sm font-medium">
                      Inicio
                      <input
                        type="date"
                        className="mt-1 rounded-md border border-input bg-background p-2 text-foreground"
                        value={customStart}
                        onChange={e => setCustomStart(e.target.value)}
                      />
                    </label>
                    <label className="flex flex-col text-sm font-medium">
                      Fin
                      <input
                        type="date"
                        className="mt-1 rounded-md border border-input bg-background p-2 text-foreground"
                        value={customEnd}
                        onChange={e => setCustomEnd(e.target.value)}
                        max={format(new Date(), 'yyyy-MM-dd')}
                      />
                    </label>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={resetRange}
                      >
                        Reset
                      </Button>
                      <Button
                        size="sm"
                        onClick={applyRange}
                        disabled={!customStart || !customEnd || parseISO(customStart) > parseISO(customEnd)}
                      >
                        Aplicar
                      </Button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Button
              onClick={() => setExportOpen(true)}
              variant="outline"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>

          {/* Total Facturado */}
          <div className="text-sm text-muted-foreground">
            Total facturado (según filtros): <span className="font-bold text-foreground">${totalFacturado.toFixed(2)}</span>
          </div>
        </div>

        {/* Tabla de Facturas */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Factura</TableHead>
                <TableHead>Fecha y Hora</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Método Pago</TableHead>
                <TableHead>Estado DTE</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  </TableRow>
                ))}
              {!loading && ventas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No hay facturas registradas.
                  </TableCell>
                </TableRow>
              )}
              {!loading && ventas.map((row) => {
                return (
                  <TableRow key={row.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => openVenta(row.venta_id)}>
                    <TableCell className="font-medium">
                      #{row.venta_id || row.id}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{formatDate(row.fecha)}</span>
                        <span className="text-xs text-muted-foreground">{fmtHM(row.fecha)}</span>
                      </div>
                    </TableCell>
                    <TableCell>{row.cliente || 'Cliente General'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{getTipoLabel(row.tipo)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">Efectivo</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">Pendiente</Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(row.monto)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openVenta(row.venta_id);
                        }}
                        className="gap-1"
                      >
                        <Eye className="h-4 w-4" />
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Paginación */}
        {!loading && totalPages > 1 && (
          <div className="flex justify-center">
            <Pagination page={page} pageCount={totalPages} onPageChange={setPage} />
          </div>
        )}

        {/* Modales */}
        <NuevaFacturaModal
          open={showNuevaFactura}
          onClose={() => setShowNuevaFactura(false)}
          onSuccess={(saleData) => {
            // Mostrar confirmación de venta
            if (saleData) {
              setSaleSuccess(saleData);
            }
            // Recargar el historial automáticamente
            load();
          }}
        />
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

        {/* Modal de confirmación de venta exitosa */}
        {saleSuccess && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999]">
            <div className="bg-card p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-green-100 dark:bg-green-900 p-2">
                    <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">¡Venta Registrada!</h2>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSaleSuccess(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Número de Factura:</span>
                  <span className="font-bold text-lg">#{saleSuccess.id}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-bold text-lg text-primary">${saleSuccess.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Tipo:</span>
                  <span className="font-medium">
                    {saleSuccess.saleType === 'CREDIT' ? 'Venta a Crédito' : 'Venta Directa'}
                  </span>
                </div>
              </div>

              <Button onClick={() => setSaleSuccess(null)} className="w-full" size="lg">
                Continuar
              </Button>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
