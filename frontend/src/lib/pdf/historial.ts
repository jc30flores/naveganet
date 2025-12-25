import jsPDF from 'jspdf';
import { format } from 'date-fns';

export interface HistorialPdfRow {
  cliente: string;
  fecha: string;
  productos: string;
  total: number;
  bold?: boolean;
}

export function exportHistorialPdf(rows: HistorialPdfRow[], rangeLabel: string) {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = { top: 18, left: 14, right: 14, bottom: 18 };
  // Widths (mm): Cliente 52 | Fecha 40 | Productos 70 | Total 20 => 182mm total
  const colWidths = [52, 40, 70, 20];

  let cursorY = margin.top;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Historial de Ventas', pageWidth / 2, cursorY, { align: 'center' });
  cursorY += 8;

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(rangeLabel, pageWidth / 2, cursorY, { align: 'center' });
  cursorY += 10;

  const drawTableHeader = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    const headers = ['Cliente', 'Fecha', 'Productos', 'Total'];
    let x = margin.left;
    headers.forEach((h, i) => {
      doc.text(h, x + 1, cursorY + 4);
      x += colWidths[i];
    });
    cursorY += 6;
  };

  drawTableHeader();

  rows.forEach((row) => {
    const clienteWrapped = doc.splitTextToSize(row.cliente || '—', colWidths[0] - 2);
    const fechaWrapped = doc.splitTextToSize(row.fecha, colWidths[1] - 2);
    const prodWrapped = doc.splitTextToSize(row.productos || '—', colWidths[2] - 2);
    const totalTxt = `$ ${row.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const maxLines = Math.max(
      clienteWrapped.length,
      fechaWrapped.length,
      prodWrapped.length,
      1
    );
    const rowHeight = 3 + 5 * maxLines;

    if (cursorY + rowHeight > pageHeight - margin.bottom) {
      doc.addPage();
      cursorY = margin.top;
      drawTableHeader();
    }

    let x = margin.left;
    doc.setFont('helvetica', row.bold ? 'bold' : 'normal');
    doc.setFontSize(10);
    doc.text(clienteWrapped, x + 1, cursorY + 5);
    x += colWidths[0];
    doc.text(fechaWrapped, x + 1, cursorY + 5);
    x += colWidths[1];
    doc.text(prodWrapped, x + 1, cursorY + 5);
    x += colWidths[2];
    doc.text(totalTxt, x + colWidths[3] - 1, cursorY + 5, { align: 'right' });
    cursorY += rowHeight;
  });

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.text(
      `Página ${i} de ${totalPages}`,
      pageWidth - margin.right,
      pageHeight - 10,
      { align: 'right' }
    );
  }

  const filename = `historial_de_ventas_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
  doc.save(filename);
}

