export const fmtHM = (d: string | number | Date) =>
  new Intl.DateTimeFormat('es-SV', { hour: 'numeric', minute: '2-digit' }).format(
    new Date(d)
  );
