import { Badge } from '@/components/ui/badge';
import '@/styles/chips.css';

type UsedState = 'bueno' | 'con_detalle';
type StatusKey = 'AGOTADO' | 'BAJO' | 'NORMAL';

interface StatusBadgeProps {
  condicion?: 'new' | 'used' | null;
  estado?: string | null;
  estado_usado?: UsedState | null;
}

const USED_COLORS: Record<UsedState, { cls: string; label: string }> = {
  bueno: { label: 'Bueno', cls: 'chip chip-green' },
  con_detalle: { label: 'Con detalle', cls: 'chip chip-amber' },
};

const STATUS: Record<StatusKey, { cls: string; label: string }> = {
  AGOTADO: {
    cls: 'bg-destructive/20 text-destructive border-destructive/20 dark:bg-destructive/10',
    label: 'Agotado',
  },
  BAJO: {
    cls: 'bg-warning/20 text-warning border-warning/20 dark:bg-warning/10',
    label: 'Bajo',
  },
  NORMAL: {
    cls: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/30',
    label: 'Normal',
  },
};

const FALLBACK = (
  <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded text-sm font-medium">N/D</span>
);

export function StatusBadge({ condicion, estado, estado_usado }: StatusBadgeProps) {
  if (condicion === 'used') {
    const rawUsed =
      typeof estado_usado === 'string' && estado_usado.trim() !== ''
        ? estado_usado.trim()
        : 'bueno';
    const key = rawUsed.toLowerCase() as UsedState;
    const info = USED_COLORS[key];

    if (!info) {
      return FALLBACK;
    }

    return (
      <span className={info.cls} aria-label={`Estado: ${info.label}`}>
        {info.label}
      </span>
    );
  }

  const normalizedStatus =
    typeof estado === 'string' && estado.trim() !== ''
      ? estado.trim().toUpperCase()
      : undefined;
  const info = normalizedStatus ? STATUS[normalizedStatus as StatusKey] : undefined;

  if (!info) {
    return FALLBACK;
  }

  return <Badge className={info.cls}>{info.label}</Badge>;
}

export default StatusBadge;
