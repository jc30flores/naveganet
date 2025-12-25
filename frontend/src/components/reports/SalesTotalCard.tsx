import { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import { DollarSign, Filter } from 'lucide-react';
import { api } from '@/lib/api';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/store/auth';
import { computeRange, DateRange, QuickRange } from '@/utils/reports';

export default function SalesTotalCard() {
  const role = useAuth((s) => s.user?.role);
  const hasLimitedAccess = role === 'vendedor' || role === 'gerente';
  const [active, setActive] = useState<'diario' | 'quincenal' | 'mensual' | 'todas' | 'rango'>('mensual');
  const [range, setRange] = useState<DateRange>(() => computeRange('mensual', new Date()));
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const quickOptions = useMemo<QuickRange[]>(
    () => (hasLimitedAccess ? ['diario', 'quincenal', 'mensual'] : ['diario', 'quincenal', 'mensual', 'todas']),
    [hasLimitedAccess]
  );

  const load = async (start: Date | null, end: Date | null) => {
    setLoading(true);
    try {
      const data = await api.getVentasTotal(
        start ? format(start, 'yyyy-MM-dd') : undefined,
        end ? format(end, 'yyyy-MM-dd') : undefined
      );
      setTotal(Number(data.total || 0));
      setRange({
        start: data.start ? parseISO(data.start) : null,
        end: data.end ? parseISO(data.end) : null,
      });
    } catch (err) {
      console.error(err);
      toast({ description: 'Error al cargar ventas' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const now = new Date();
    const r = computeRange('mensual', now);
    setRange(r);
    setCustomStart(format(r.start!, 'yyyy-MM-dd'));
    setCustomEnd(format(r.end!, 'yyyy-MM-dd'));
    load(r.start, r.end);
  }, []);

  const handleQuick = (q: QuickRange) => {
    setActive(q);
    const r = computeRange(q, new Date());
    setCustomStart(r.start ? format(r.start, 'yyyy-MM-dd') : '');
    setCustomEnd(r.end ? format(r.end, 'yyyy-MM-dd') : '');
    load(r.start, r.end);
  };

  const resetMes = () => {
    const now = new Date();
    const r = computeRange('mensual', now);
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
    load(startDate, endDate);
    setOpen(false);
  };

  const isInvalid =
    !customStart ||
    !customEnd ||
    parseISO(customStart) > parseISO(customEnd);

  const formattedTotal = new Intl.NumberFormat('es-SV', {
    style: 'currency',
    currency: 'USD',
  }).format(total);

  const rangeLabel = range.start && range.end
    ? `${format(range.start, 'dd MMM yyyy', { locale: es })} → ${format(range.end, 'dd MMM yyyy', { locale: es })}`
    : 'Todo el tiempo';

  return (
    <Card className="border-border bg-background/60 dark:bg-background/50 backdrop-blur-sm shadow-2xl">
      <CardHeader className="space-y-2 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
            Ventas
          </CardTitle>
          <div className="flex items-center gap-1">
            <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-primary" />
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 md:h-6 md:w-6"
                  aria-label="Abrir filtros"
                >
                  <Filter className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-4 space-y-3 bg-background/80 dark:bg-background/60 backdrop-blur-sm" align="end">
                <div className="flex flex-wrap gap-1">
                  {quickOptions.map(opt => (
                    <Button
                      key={opt}
                      variant={active === opt ? 'default' : 'outline'}
                      className="rounded-full h-6 px-3 text-xs"
                      onClick={() => {
                        handleQuick(opt);
                        setOpen(false);
                      }}
                      aria-pressed={active === opt}
                    >
                      {opt.charAt(0).toUpperCase() + opt.slice(1)}
                    </Button>
                  ))}
                  {!hasLimitedAccess && (
                    <Button
                      variant={active === 'rango' ? 'default' : 'outline'}
                      className="rounded-full h-6 px-3 text-xs"
                      onClick={() => setActive('rango')}
                    >
                      Rango
                    </Button>
                  )}
                </div>
                {active === 'rango' && (
                  <div className="space-y-2 pt-2 border-t">
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
                        onClick={resetMes}
                      >
                        Reset mes
                      </Button>
                      <Button
                        className="rounded-full h-6 px-3 text-xs"
                        onClick={() => {
                          applyRange();
                          setOpen(false);
                        }}
                        disabled={isInvalid}
                      >
                        Aplicar
                      </Button>
                    </div>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-lg md:text-2xl font-bold text-foreground">
          {loading ? <Skeleton className="h-6 w-20" /> : formattedTotal}
        </div>
        <div className="mt-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted/50 dark:bg-muted/20">
            {rangeLabel}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

