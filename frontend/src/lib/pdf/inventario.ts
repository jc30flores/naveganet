import jsPDF from 'jspdf';
import { format } from 'date-fns';

export interface InventarioPdfRow {
  index: number | string;
  codigo: string;
  nombre: string;
  costo: number;
  stock: number;
  precio: number;
  bold?: boolean;
}

export function exportInventarioPdf(rows: InventarioPdfRow[], tipoLabel: string) {
  const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = { top: 18, left: 14, right: 14, bottom: 18 };
  // Widths: #15 | Código40 | Producto120 | Costo30 | Stock30 | Precio40 => 275mm-??. adjust to fit ~269
  const colWidths = [15, 40, 120, 30, 30, 40];

  let cursorY = margin.top;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Reporte de Inventario', pageWidth / 2, cursorY, { align: 'center' });
  cursorY += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Tipo: ${tipoLabel}`, pageWidth / 2, cursorY, { align: 'center' });
  cursorY += 10;

  const drawHeader = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    const headers = ['#', 'Código', 'Producto', 'Costo', 'Stock', 'Precio Venta'];
    let x = margin.left;
    headers.forEach((h, i) => {
      doc.text(h, x + 1, cursorY + 4);
      x += colWidths[i];
    });
    cursorY += 6;
  };

  drawHeader();

  rows.forEach((row) => {
    const prodWrapped = doc.splitTextToSize(row.nombre || '—', colWidths[2] - 2);
    const costoTxt = `$ ${row.costo.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
    const precioTxt = `$ ${row.precio.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
    const maxLines = Math.max(prodWrapped.length, 1);
    const rowHeight = 3 + 5 * maxLines;

    if (cursorY + rowHeight > pageHeight - margin.bottom) {
      doc.addPage();
      cursorY = margin.top;
      drawHeader();
    }

    let x = margin.left;
    doc.setFont('helvetica', row.bold ? 'bold' : 'normal');
    doc.setFontSize(10);
    doc.text(String(row.index), x + 1, cursorY + 5);
    x += colWidths[0];
    doc.text(row.codigo, x + 1, cursorY + 5);
    x += colWidths[1];
    doc.text(prodWrapped, x + 1, cursorY + 5);
    x += colWidths[2];
    doc.text(costoTxt, x + colWidths[3] - 1, cursorY + 5, { align: 'right' });
    x += colWidths[3];
    doc.text(String(row.stock), x + colWidths[4] - 1, cursorY + 5, { align: 'right' });
    x += colWidths[4];
    doc.text(precioTxt, x + colWidths[5] - 1, cursorY + 5, { align: 'right' });
    cursorY += rowHeight;
  });

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin.right, pageHeight - 10, { align: 'right' });
  }

  const filename = `inventario_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
  doc.save(filename);
}

