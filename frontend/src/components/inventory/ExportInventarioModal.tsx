import { useEffect, useMemo, useState } from 'react';
import AppModal from '@/components/ui/AppModal';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import type { Producto } from '@/types/db';

interface Props {
  open: boolean;
  onClose: () => void;
  currentType: 'all' | 'new' | 'used';
}

type FormatType = 'pdf' | 'xlsx';
type ProdType = 'todos' | 'nuevos' | 'usados';

type ProductsCollection =
  | Producto[]
  | {
      results?: Producto[];
      data?: Producto[];
      count?: number;
    }
  | null;

const TYPE_OPTIONS: ProdType[] = ['todos', 'nuevos', 'usados'];
const FORMAT_OPTIONS: FormatType[] = ['pdf', 'xlsx'];

const toProdType = (value: string | null, fallback: ProdType): ProdType => {
  if (value === 'nuevos' || value === 'usados' || value === 'todos') {
    return value;
  }
  return fallback;
};

const mapCurrentType = (value: Props['currentType']): ProdType => {
  if (value === 'new') return 'nuevos';
  if (value === 'used') return 'usados';
  return 'todos';
};

export default function ExportInventarioModal({ open, onClose, currentType }: Props) {
  const [type, setType] = useState<ProdType>('todos');
  const [format, setFormat] = useState<FormatType>('pdf');
  const [prods, setProds] = useState<ProductsCollection>(null);
  const [downloading, setDownloading] = useState(false);
  const [loadingCount, setLoadingCount] = useState(false);

  useEffect(() => {
    if (open) {
      const storedFmt = localStorage.getItem('exportInvFormat');
      const savedFmt = FORMAT_OPTIONS.includes(storedFmt as FormatType)
        ? (storedFmt as FormatType)
        : 'pdf';
      const fallbackType = mapCurrentType(currentType);
      const savedType = toProdType(localStorage.getItem('exportInvType'), fallbackType);
      setFormat(savedFmt);
      setType(savedType);
    }
  }, [open, currentType]);

  useEffect(() => {
    if (!open) {
      setProds(null);
      setLoadingCount(false);
      return;
    }
    let cancelled = false;
    setLoadingCount(true);
    const fetchCount = async () => {
      try {
        const condicionFilter = type === 'nuevos' ? 'new' : type === 'usados' ? 'used' : undefined;
        const res = await api.getProductos({
          page: 1,
          page_size: 1,
          condicion: condicionFilter,
          status: 'active',
        });
        if (!cancelled) {
          setProds(res);
        }
      } catch (err) {
        if (!cancelled) {
          setProds(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingCount(false);
        }
      }
    };
    fetchCount();
    return () => {
      cancelled = true;
      setLoadingCount(false);
    };
  }, [open, type]);

  const items = useMemo<Producto[]>(() => {
    const rawItems = Array.isArray(prods) ? prods : prods?.results || prods?.data || [];
    return Array.isArray(rawItems) ? rawItems : [];
  }, [prods]);

  const totalCount = useMemo(() => {
    if (prods && !Array.isArray(prods) && typeof prods.count === 'number') {
      return prods.count;
    }
    return items.length;
  }, [items.length, prods]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      localStorage.setItem('exportInvFormat', format);
      localStorage.setItem('exportInvType', type);
      await api.exportInventario({ format, condicion: type });
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
      title="Exportar Inventario"
      description="Seleccione el tipo y formato"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" className="rounded-full" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleDownload}
            disabled={downloading || loadingCount || totalCount === 0}
            className="rounded-full"
          >
            {downloading ? 'Descargando…' : 'Descargar'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {TYPE_OPTIONS.map((t) => (
            <Button
              key={t}
              variant={type === t ? 'default' : 'outline'}
              className="rounded-full h-7 px-4 text-sm md:text-base"
              onClick={() => setType(t)}
              aria-pressed={type === t}
            >
              {t === 'todos' ? 'Todos' : t === 'nuevos' ? 'Nuevos' : 'Usados'}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          {FORMAT_OPTIONS.map((f) => (
            <Button
              key={f}
              variant={format === f ? 'default' : 'outline'}
              className="rounded-full h-7 px-4 text-sm md:text-base"
              onClick={() => setFormat(f)}
              aria-pressed={format === f}
            >
              {f === 'xlsx' ? 'Excel (.xlsx)' : f.toUpperCase()}
            </Button>
          ))}
        </div>
        <p className="text-sm md:text-base text-muted-foreground">
          {loadingCount ? 'Calculando…' : `Se exportarán ${totalCount} productos`}
        </p>
      </div>
    </AppModal>
  );
}

