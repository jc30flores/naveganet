import { useEffect, useState } from 'react';
import AppModal from '@/components/ui/AppModal';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import type { Cliente } from '@/types/db';

interface Props {
  open: boolean;
  onClose: () => void;
  clientes: Cliente[];
}

type FormatType = 'pdf' | 'xlsx' | 'docx';

export default function ExportClientesModal({ open, onClose, clientes }: Props) {
  const [format, setFormat] = useState<FormatType>('pdf');
  const [count, setCount] = useState(0);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (open) {
      const storedFmt = localStorage.getItem('exportCliFormat');
      const savedFmt = storedFmt === 'pdf' || storedFmt === 'xlsx' || storedFmt === 'docx' ? storedFmt : 'pdf';
      setFormat(savedFmt);
      setCount(clientes.length);
    }
  }, [open, clientes]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      localStorage.setItem('exportCliFormat', format);
      await api.exportClientes(format);
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
      title="Exportar Clientes"
      description="Seleccione el formato"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" className="rounded-full" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleDownload} disabled={downloading} className="rounded-full">
            {downloading ? 'Descargando…' : 'Descargar'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 pt-2">
          {(['pdf', 'xlsx', 'docx'] as FormatType[]).map((f) => (
            <Button
              key={f}
              variant={format === f ? 'default' : 'outline'}
              className="rounded-full h-7 px-4 text-sm md:text-base"
              onClick={() => setFormat(f)}
              aria-pressed={format === f}
            >
              {f === 'xlsx' ? 'Excel (.xlsx)' : f === 'docx' ? 'Word (.docx)' : f.toUpperCase()}
            </Button>
          ))}
        </div>
        <p className="text-sm md:text-base text-muted-foreground">Se exportarán {count} clientes</p>
      </div>
    </AppModal>
  );
}

