import { useEffect, useState } from 'react';
import AppModal from '@/components/ui/AppModal';
import { Button } from '@/components/ui/button';
import { computeRange, QuickRange, DateRange } from '@/lib/dateRange';
import { format, parseISO } from 'date-fns';
import { api } from '@/lib/api';
import type { Devolucion } from '@/types/db';

interface Props {
  open: boolean;
  onClose: () => void;
  currentType: QuickRange | 'rango';
  currentRange: DateRange;
  devoluciones: Devolucion[];
}

type FormatType = 'pdf' | 'xlsx' | 'docx';
type RangeType = QuickRange | 'rango';

export default function ExportDevolucionesModal({ open, onClose, currentType, currentRange, devoluciones }: Props) {
  const [rangeType, setRangeType] = useState<RangeType>('diario');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [formatType, setFormatType] = useState<FormatType>('pdf');
  const [count, setCount] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (open) {
      const storedFmt = localStorage.getItem('exportDevFormat');
      const savedFmt = storedFmt === 'pdf' || storedFmt === 'xlsx' || storedFmt === 'docx' ? storedFmt : 'pdf';
      const savedRange = (localStorage.getItem('exportDevRangeType') as RangeType) || currentType;
      setFormatType(savedFmt);
      setRangeType(savedRange);
      if (savedRange === 'rango') {
        setStartDate(localStorage.getItem('exportDevRangeStart') || '');
        setEndDate(localStorage.getItem('exportDevRangeEnd') || '');
      } else if (savedRange !== 'todos') {
        const r = computeRange(savedRange, new Date());
        setStartDate(r.start ? format(r.start, 'yyyy-MM-dd') : '');
        setEndDate(r.end ? format(r.end, 'yyyy-MM-dd') : '');
      } else {
        setStartDate('');
        setEndDate('');
      }
      if (!localStorage.getItem('exportDevRangeType')) {
        if (currentType === 'rango') {
          setStartDate(currentRange.start ? format(currentRange.start, 'yyyy-MM-dd') : '');
          setEndDate(currentRange.end ? format(currentRange.end, 'yyyy-MM-dd') : '');
        } else if (currentType !== 'todos') {
          const r = computeRange(currentType as QuickRange, new Date());
          setStartDate(r.start ? format(r.start, 'yyyy-MM-dd') : '');
          setEndDate(r.end ? format(r.end, 'yyyy-MM-dd') : '');
        }
      }
    }
  }, [open, currentType, currentRange]);

  useEffect(() => {
    if (!open) return;
    const s = rangeType === 'todos' ? null : startDate ? parseISO(startDate) : null;
    const e = rangeType === 'todos' ? null : endDate ? parseISO(endDate) : null;
    const cnt = devoluciones.filter((d) => {
      const dt = parseISO(d.fecha);
      if (s && dt < s) return false;
      if (e && dt > e) return false;
      return true;
    }).length;
    setCount(cnt);
  }, [open, rangeType, startDate, endDate, devoluciones]);

  const handleQuick = (q: QuickRange) => {
    setRangeType(q);
    const r = computeRange(q, new Date());
    setStartDate(r.start ? format(r.start, 'yyyy-MM-dd') : '');
    setEndDate(r.end ? format(r.end, 'yyyy-MM-dd') : '');
  };

  const invalid = rangeType !== 'todos' && (!startDate || !endDate || parseISO(startDate) > parseISO(endDate));

  const handleDownload = async () => {
    setDownloading(true);
    try {
      localStorage.setItem('exportDevFormat', formatType);
      localStorage.setItem('exportDevRangeType', rangeType);
      if (rangeType === 'rango') {
        localStorage.setItem('exportDevRangeStart', startDate);
        localStorage.setItem('exportDevRangeEnd', endDate);
      }
      const s = rangeType === 'todos' ? undefined : startDate;
      const e = rangeType === 'todos' ? undefined : endDate;
      const modeMap: Record<RangeType, 'daily' | 'quincenal' | 'monthly' | 'all' | 'range'> = {
        diario: 'daily',
        quincenal: 'quincenal',
        mensual: 'monthly',
        todos: 'all',
        rango: 'range',
      };
      await api.exportDevoluciones(formatType, modeMap[rangeType], s, e);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Exportar Devoluciones"
      description="Seleccione el rango y formato"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" className="rounded-full" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleDownload} disabled={invalid || downloading} className="rounded-full">
            {downloading ? 'Descargando…' : 'Descargar'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {(['diario', 'quincenal', 'mensual', 'todos'] as QuickRange[]).map((opt) => (
            <Button
              key={opt}
              variant={rangeType === opt ? 'default' : 'outline'}
              className="rounded-full h-7 px-4 text-sm md:text-base"
              onClick={() => handleQuick(opt)}
              aria-pressed={rangeType === opt}
            >
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </Button>
          ))}
          <Button
            variant={rangeType === 'rango' ? 'default' : 'outline'}
            className="rounded-full h-7 px-4 text-sm md:text-base"
            onClick={() => setRangeType('rango')}
            aria-pressed={rangeType === 'rango'}
          >
            Rango
          </Button>
        </div>
        {rangeType === 'rango' && (
          <div className="grid gap-2 sm:grid-cols-2 text-sm md:text-base">
            <label className="flex flex-col font-medium text-foreground">
              Inicio
              <input
                type="date"
                className="mt-1 rounded-md border border-input bg-background p-1"
                value={startDate}
                max={format(new Date(), 'yyyy-MM-dd')}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>
            <label className="flex flex-col font-medium text-foreground">
              Fin
              <input
                type="date"
                className="mt-1 rounded-md border border-input bg-background p-1"
                value={endDate}
                max={format(new Date(), 'yyyy-MM-dd')}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
          </div>
        )}
        <div className="flex flex-wrap gap-2 pt-2">
          {(['pdf', 'xlsx', 'docx'] as FormatType[]).map((f) => (
            <Button
              key={f}
              variant={formatType === f ? 'default' : 'outline'}
              className="rounded-full h-7 px-4 text-sm md:text-base"
              onClick={() => setFormatType(f)}
              aria-pressed={formatType === f}
            >
              {f === 'xlsx' ? 'Excel (.xlsx)' : f === 'docx' ? 'Word (.docx)' : f.toUpperCase()}
            </Button>
          ))}
        </div>
        {count !== null && (
          <p className="text-sm md:text-base text-muted-foreground">
            Se exportarán {count} devoluciones en el rango seleccionado
          </p>
        )}
      </div>
    </AppModal>
  );
}

