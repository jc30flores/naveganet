import { RotateCcw } from 'lucide-react';
import AppModal from '@/components/ui/AppModal';
import type { Devolucion } from '@/types/db';
import { formatCurrency } from '@/lib/format';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  devolucion: Devolucion | null;
  onClose: () => void;
}

const formatFullDate = (date: string) =>
  format(new Date(date), 'EEE, dd MMM yyyy HH:mm', { locale: es });

export default function DetalleDevolucionModal({ devolucion, onClose }: Props) {
  return (
    <AppModal
      open={!!devolucion}
      onClose={onClose}
      className="sm:!max-w-md"
      title={
        <div className="flex items-center gap-2">
          <div className="bg-amber-500/15 text-amber-400 p-2 rounded-lg">
            <RotateCcw className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span>Detalle de Devolución</span>
            <span className="text-xs text-muted-foreground">Resumen del movimiento</span>
          </div>
        </div>
      }
      footer={
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="border rounded-lg px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            Cerrar
          </button>
        </div>
      }
    >
      {devolucion && (
        <>
          <div className="h-px bg-black/10 dark:bg-white/10" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-base">
            <div>
              <span className="text-muted-foreground">Fecha</span>
              <p>{formatFullDate(devolucion.fecha)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Producto</span>
              <p>{devolucion.producto_nombre_snapshot}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Código</span>
              <p>{devolucion.producto_codigo_snapshot ?? '—'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Cantidad</span>
              <p>{devolucion.cantidad}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Precio unitario</span>
              <p>{formatCurrency(devolucion.precio_unitario)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Total devuelto</span>
              <p className="text-amber-400 font-semibold">{formatCurrency(devolucion.total)}</p>
            </div>
            {devolucion.motivo && (
              <div className="sm:col-span-2">
                <span className="text-muted-foreground">Motivo</span>
                <p className="whitespace-pre-wrap">{devolucion.motivo}</p>
              </div>
            )}
          </div>
        </>
      )}
    </AppModal>
  );
}

