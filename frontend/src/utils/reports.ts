export type QuickRange = 'diario' | 'quincenal' | 'mensual' | 'todas';

export interface DateRange {
  start: Date | null;
  end: Date | null;
}

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
    case 'todas':
    default:
      return { start: null, end: null };
  }
}
