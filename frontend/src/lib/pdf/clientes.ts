import jsPDF from 'jspdf';
import { format } from 'date-fns';

export interface ClientePdfRow {
  index: number | string;
  nombre: string;
  telefono: string;
  email: string;
  direccion: string;
  bold?: boolean;
}

export function exportClientesPdf(rows: ClientePdfRow[]) {
  const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = { top: 18, left: 14, right: 14, bottom: 18 };
  // Widths: #15 | Nombre70 | Tel40 | Email60 | Direccion87 => 272 -> adjust to 272? We'll make 15,70,40,60,84
  const colWidths = [15, 70, 40, 60, 84];

  let cursorY = margin.top;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Reporte de Clientes', pageWidth / 2, cursorY, { align: 'center' });
  cursorY += 10;

  const drawHeader = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    const headers = ['#', 'Nombre', 'Teléfono', 'Email', 'Dirección'];
    let x = margin.left;
    headers.forEach((h, i) => {
      doc.text(h, x + 1, cursorY + 4);
      x += colWidths[i];
    });
    cursorY += 6;
  };

  drawHeader();

  rows.forEach((row) => {
    const nomWrapped = doc.splitTextToSize(row.nombre || '—', colWidths[1] - 2);
    const dirWrapped = doc.splitTextToSize(row.direccion || '—', colWidths[4] - 2);
    const emailTxt = row.email || '—';
    const telTxt = row.telefono || '—';
    const maxLines = Math.max(nomWrapped.length, dirWrapped.length, 1);
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
    doc.text(nomWrapped, x + 1, cursorY + 5);
    x += colWidths[1];
    doc.text(telTxt, x + 1, cursorY + 5);
    x += colWidths[2];
    doc.text(emailTxt, x + 1, cursorY + 5);
    x += colWidths[3];
    doc.text(dirWrapped, x + 1, cursorY + 5);
    cursorY += rowHeight;
  });

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin.right, pageHeight - 10, { align: 'right' });
  }

  const filename = `clientes_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
  doc.save(filename);
}

