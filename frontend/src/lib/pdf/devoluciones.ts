import jsPDF from 'jspdf';
import { format } from 'date-fns';

export interface DevolucionPdfRow {
  fecha: string;
  producto: string;
  cantidad: number | string;
  total: number;
  bold?: boolean;
}

export function exportDevolucionesPdf(rows: DevolucionPdfRow[], rangeLabel: string) {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = { top: 18, left: 14, right: 14, bottom: 18 };
  // Widths: Fecha 40 | Producto 80 | Cantidad 25 | Total 25 => 170mm
  const colWidths = [40, 80, 25, 25];

  let cursorY = margin.top;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Devoluciones', pageWidth / 2, cursorY, { align: 'center' });
  cursorY += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(rangeLabel, pageWidth / 2, cursorY, { align: 'center' });
  cursorY += 10;

  const drawHeader = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    const headers = ['Fecha', 'Producto', 'Cantidad', 'Total'];
    let x = margin.left;
    headers.forEach((h, i) => {
      doc.text(h, x + 1, cursorY + 4);
      x += colWidths[i];
    });
    cursorY += 6;
  };

  drawHeader();

  rows.forEach((row) => {
    const fechaWrapped = doc.splitTextToSize(row.fecha, colWidths[0] - 2);
    const prodWrapped = doc.splitTextToSize(row.producto || '—', colWidths[1] - 2);
    const qtyTxt = String(row.cantidad);
    const totalTxt = `$ ${row.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const maxLines = Math.max(fechaWrapped.length, prodWrapped.length, 1);
    const rowHeight = 3 + 5 * maxLines;

    if (cursorY + rowHeight > pageHeight - margin.bottom) {
      doc.addPage();
      cursorY = margin.top;
      drawHeader();
    }

    let x = margin.left;
    doc.setFont('helvetica', row.bold ? 'bold' : 'normal');
    doc.setFontSize(10);
    doc.text(fechaWrapped, x + 1, cursorY + 5);
    x += colWidths[0];
    doc.text(prodWrapped, x + 1, cursorY + 5);
    x += colWidths[1];
    doc.text(qtyTxt, x + colWidths[2] - 1, cursorY + 5, { align: 'right' });
    x += colWidths[2];
    doc.text(totalTxt, x + colWidths[3] - 1, cursorY + 5, { align: 'right' });
    cursorY += rowHeight;
  });

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin.right, pageHeight - 10, { align: 'right' });
  }

  const filename = `devoluciones_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
  doc.save(filename);
}

