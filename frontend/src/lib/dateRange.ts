import { es } from 'date-fns/locale';
import { format } from 'date-fns';

export type QuickRange = 'diario' | 'quincenal' | 'mensual' | 'todos';
export interface DateRange { start: Date | null; end: Date | null }

export function computeRange(quick: QuickRange, now: Date): DateRange {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  switch (quick) {
    case 'diario':
      return { start: new Date(y, m, d), end: new Date(y, m, d) };
    case 'quincenal':
      return { start: new Date(y, m, d <= 15 ? 1 : 16), end: new Date(y, m, d) };
    case 'mensual':
      return { start: new Date(y, m, 1), end: new Date(y, m, d) };
    case 'todos':
    default:
      return { start: null, end: null };
  }
}

export function formatRange(start: Date | null, end: Date | null): string {
  if (!start || !end) return '';
  return `${format(start, 'dd MMM yyyy', { locale: es })} → ${format(end, 'dd MMM yyyy', { locale: es })}`;
}
