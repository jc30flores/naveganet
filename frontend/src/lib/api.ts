import { getCookie } from '@/utils/csrf';
import { formatDate } from '@/lib/format';
import { toast } from '@/components/ui/use-toast';
import { exportDevolucionesPdf, DevolucionPdfRow } from './pdf/devoluciones';
import { exportClientesPdf, ClientePdfRow } from './pdf/clientes';
import { format as formatDateFns } from 'date-fns';
import { es } from 'date-fns/locale';
import axios from 'axios';
import type { Devolucion, Producto, Cliente as ClienteDb } from '@/types/db';

export class ApiError extends Error {
  status: number;
  response: { status: number; data: unknown };

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.response = { status, data };
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

function hasCodigoError(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const maybeCodigo = (data as Record<string, unknown>).codigo;
  if (!maybeCodigo) return false;
  if (Array.isArray(maybeCodigo)) {
    return maybeCodigo.length > 0;
  }
  return true;
}

function createApiError(res: Response, data: unknown) {
  const detail =
    typeof data === 'object' && data !== null && 'detail' in data
      ? (data as { detail?: string }).detail
      : null;
  const message = detail ? String(detail) : `HTTP ${res.status} ${res.statusText || 'Error'}`;
  return new ApiError(message, res.status, data);
}

const INVENTARIO_FORMATS = {
  pdf: { ext: 'pdf', mime: 'application/pdf' },
  xlsx: {
    ext: 'xlsx',
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  },
} as const;

const INVENTARIO_SLUGS: Record<'todos' | 'nuevos' | 'usados', string> = {
  todos: 'todos',
  nuevos: 'nuevos',
  usados: 'usados',
};

function parseContentDispositionFilename(value: string | null): string | null {
  if (!value) return null;
  const match = value.match(/filename\*=UTF-8''([^;]+)|filename="([^"]+)"|filename=([^;]+)/i);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1] || match[2] || match[3]);
  } catch {
    return match[1] || match[2] || match[3] || null;
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}

export const API_BASE = import.meta.env.VITE_API_URL || "/api";
async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    credentials: "include",
    ...options,
  });
  const ct = res.headers.get("content-type") || "";
  if (!res.ok) {
    const data = ct.includes("application/json")
      ? await res.json().catch(() => null)
      : await res.text().catch(() => "");
    throw createApiError(res, data);
  }
  return ct.includes("application/json") ? res.json() : res.text();
}
async function csrfRequest(path: string, method: string, data?: unknown) {
  await fetch(`${API_BASE}/csrf/`, { credentials: "include" });
  const csrftoken = getCookie("csrftoken");
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrftoken,
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  const ct = res.headers.get("content-type") || "";
  if (!res.ok) {
    const errData = ct.includes("application/json")
      ? await res.json().catch(() => null)
      : await res.text().catch(() => "");
    throw createApiError(res, errData);
  }
  return ct.includes("application/json") ? res.json() : undefined;
}
interface ClienteSearch { id: number; nombre: string; telefono?: string; email?: string; doc?: string }
interface PaginatedResponse<T> {
  count: number;
  page: number;
  page_size: number;
  total_pages?: number;
  next?: string | null;
  previous?: string | null;
  results: T[];
}

export interface HistorialMovimiento {
  id: number;
  fecha: string;
  monto: number;
  venta_id: number;
  cliente: string;
  tipo: 'VENTA_CONTADO' | 'ABONO' | 'DEVOLUCION';
  nota?: string | null;
  ingreso_afectado?: number;
  venta_numero?: string | null;
}
interface CheckoutItem { productId: number; qty: number; unit_price: number; override?: boolean; isUsed: boolean }
interface CheckoutTotals { total: number }
interface CheckoutPayload {
  saleType: 'DIRECT' | 'CREDIT'
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER'
  customerId: number | null
  items: CheckoutItem[]
  totals: CheckoutTotals
  paidAmount: number
  changeDue: number
  reference?: string
  observaciones?: string
}
export async function searchClientes(q: string, signal?: AbortSignal) {
  const r = await fetch(`${API_BASE}/clientes/?q=${encodeURIComponent(q)}`, {
    credentials: 'include',
    signal,
  });
  if (!r.ok) throw new Error('Error clientes');
  return r.json() as Promise<ClienteSearch[]>;
}
export const api = {
  // Catálogos
  getCategories: (opts: { search?: string; limit?: number; offset?: number } = {}) => {
    const params = new URLSearchParams();
    if (opts.search) params.set('search', opts.search);
    if (typeof opts.limit === 'number') params.set('limit', String(opts.limit));
    if (typeof opts.offset === 'number') params.set('offset', String(opts.offset));
    const q = params.toString();
    return request(`/categorias/${q ? `?${q}` : ''}`);
  },
  createCategory: (data: { nombre: string }) => csrfRequest('/categorias/', 'POST', data),
  updateCategory: (id: number, data: { nombre: string }) => csrfRequest(`/categorias/${id}/`, 'PATCH', data),
  deleteCategory: (id: number) => csrfRequest(`/categorias/${id}/`, 'DELETE'),
  getProductos: (opts: {
    page?: number;
    page_size?: number;
    tipo?: 'producto' | 'servicio';
    status?: 'active' | 'archived';
    q?: string;
    categoria_id?: string | number;
    ordering?: string;
  } = {}): Promise<PaginatedResponse<Producto>> => {
    const params = new URLSearchParams();
    if (opts.page) params.set('page', String(opts.page));
    if (opts.page_size) params.set('page_size', String(Math.min(opts.page_size, 100)));
    if (opts.tipo) params.set('tipo', opts.tipo);
    if (opts.status) params.set('status', opts.status);
    if (opts.q) params.set('q', opts.q);
    if (opts.categoria_id !== undefined) params.set('categoria_id', String(opts.categoria_id));
    if (opts.ordering) params.set('ordering', opts.ordering);
    const q = params.toString();
    return request(`/productos/${q ? `?${q}` : ''}`);
  },
  // Clientes
  getClientes: () => request("/clientes/"),
  searchClientes: (q: string): Promise<ClienteSearch[]> => searchClientes(q),
  createCliente: (data: unknown) => csrfRequest("/clientes/", "POST", data),
  createProducto: async (data: unknown) => {
    try {
      return await csrfRequest("/productos/", "POST", data);
    } catch (error) {
      const err = error as unknown;
      if (err instanceof ApiError) {
        const responseData = err.response?.data;
        console.error('VALIDATION', responseData);
        if (err.status === 400 && hasCodigoError(responseData)) {
          toast({ title: 'Código inválido/duplicado', variant: 'destructive' });
        }
      } else if (typeof err === 'object' && err !== null) {
        console.error('VALIDATION', (err as { response?: { data?: unknown } }).response?.data);
      }
      throw error;
    }
  },
  updateProducto: (id: number, data: unknown) => csrfRequest(`/productos/${id}/`, "PUT", data),
  deleteCliente: (id: number) => csrfRequest(`/clientes/${id}/`, "DELETE"),
  deleteProducto: (id: number) => csrfRequest(`/productos/${id}/`, "DELETE"),
  getClienteDetalle: (id: number) => request(`/clientes/${id}/`),
  // Ventas
  getHistorialVentas: (opts: {
    mode?: 'daily' | 'quincenal' | 'monthly' | 'all' | 'range';
    start?: string;
    end?: string;
    page?: number;
    page_size?: number;
    q?: string;
  } = {}): Promise<PaginatedResponse<HistorialMovimiento>> => {
    const params = new URLSearchParams();
    const mode =
      opts.mode || (opts.start || opts.end ? 'range' : 'daily');
    params.set('mode', mode);
    if (opts.start) params.set('start', opts.start);
    if (opts.end) params.set('end', opts.end);
    if (opts.page) params.set('page', String(opts.page));
    if (opts.page_size) params.set('page_size', String(opts.page_size));
    if (opts.q) params.set('q', opts.q);
    const q = params.toString();
    return request(`/historial-ventas/${q ? `?${q}` : ''}`);
  },
  exportVentas: async (
    format: 'pdf' | 'xlsx' | 'docx',
    mode: 'daily' | 'monthly' | 'quincenal' | 'all' | 'range',
    start?: string,
    end?: string,
  ) => {
    const params = new URLSearchParams({ format, mode });
    if (start) params.set('start', start);
    if (end) params.set('end', end);
    const url = `${API_BASE}/historial-ventas/export/?${params.toString()}`;
    const resp = await axios.get(url, {
      responseType: 'blob',
      withCredentials: true,
    });

    const tryParseCD = (cd: string | null) => {
      if (!cd) return null;
      const m = cd.match(/filename\*=UTF-8''([^;]+)|filename="([^"]+)"|filename=([^;]+)/i);
      return m ? decodeURIComponent(m[1] || m[2] || m[3]) : null;
    };

    const filename =
      resp.headers['x-filename'] ||
      tryParseCD((resp.headers['content-disposition'] as string | undefined) ?? null) ||
      `historial_de_venta_${new Date()
        .toISOString()
        .replace(/[-:]/g, '')
        .replace('T', '_')
        .slice(0, 15)}.${format}`;

    downloadBlob(resp.data, filename);
  },
  createVenta: (data: unknown) => request("/ventas/", { method: "POST", body: JSON.stringify(data) }),
  getVentaById: (id: number) => request(`/ventas/${id}/`),
  getVentaItems: (id: number) => request(`/ventas/${id}/items/`),
  getVentas: async (params: {
    page?: number;
    page_size?: number;
    start?: string;
    end?: string;
    q?: string;
  } = {}): Promise<PaginatedResponse<any>> => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', String(params.page));
    if (params.page_size) queryParams.set('page_size', String(params.page_size));
    if (params.start) queryParams.set('start', params.start);
    if (params.end) queryParams.set('end', params.end);
    if (params.q) queryParams.set('q', params.q);
    const q = queryParams.toString();
    return request(`/ventas/${q ? `?${q}` : ''}`);
  },
  // Reportes
  getReportesDashboard: (section: 'new' | 'used' | 'all' = 'all') =>
    request(`/reportes/dashboard/?section=${section}`),
  getVentasTotal: (start?: string, end?: string) => {
    const params = new URLSearchParams();
    if (start) params.set('start', start);
    if (end) params.set('end', end);
    const q = params.toString();
    return request(`/ventas-total/${q ? `?${q}` : ''}`);
  },
  // Detalle de venta
  getDetalleVenta: (ventaId: number) => request(`/detalle-venta/?venta=${ventaId}`),
  // Créditos
  getCreditos: () => request("/creditos/"),
  getCreditoDetalle: (id: number) => request(`/creditos/${id}/`),
  getDeudores: () => request('/deudores/'),
  getDeudorDetalle: (id: number) => request(`/deudores/${id}/`),
  // Historial de créditos
  getCreditosHistorial: (creditoId: number) => request(`/creditos-historial/?credito=${creditoId}`),
  // Pagos de crédito
  createPagoCredito: (data: unknown) => csrfRequest('/pagos-credito/', 'POST', data),
  // Devoluciones
  getDevoluciones: () => request("/devoluciones/"),
  searchVentas: (
    term: string,
    opts: { limit?: number; page?: number; branch?: string } = {},
  ) => {
    const params = new URLSearchParams();
    if (term) params.set('q', term);
    if (typeof opts.limit === 'number') params.set('limit', String(opts.limit));
    if (typeof opts.page === 'number') params.set('page', String(opts.page));
    if (opts.branch) params.set('branch', opts.branch);
    return request(`/ventas/search/?${params.toString()}`);
  },
  createDevolucion: (data: unknown) => csrfRequest('/devoluciones/', 'POST', data),
  exportDevoluciones: async (
    format: 'pdf' | 'xlsx' | 'docx',
    mode: 'daily' | 'monthly' | 'quincenal' | 'all' | 'range',
    start?: string,
    end?: string,
  ) => {
    const devs = (await api.getDevoluciones()) as Devolucion[];
    const s = start ? new Date(start) : null;
    const e = end ? new Date(end) : null;
    const filtered = devs.filter((d) => {
      const dt = new Date(d.fecha);
      if (s && dt < s) return false;
      if (e && dt > e) return false;
      return true;
    });
    let grand = 0;
    const rows: DevolucionPdfRow[] = filtered.map((d) => {
      grand += d.total;
      return {
        fecha: formatDate(d.fecha),
        producto: d.producto_nombre_snapshot || '',
        cantidad: d.cantidad,
        total: d.total,
      };
    });
    const rangeLabel = (() => {
      const today = new Date();
      if (mode === 'daily') return `Rango: Diario ${formatDateFns(today, 'dd/MM/yyyy')}`;
      if (mode === 'monthly') return `Rango: ${formatDateFns(today, 'MMMM', { locale: es })}`;
      if (mode === 'quincenal') {
        const monthName = formatDateFns(today, 'MMMM', { locale: es });
        const day = today.getDate();
        return day <= 15
          ? `Rango: 1 - ${day} / ${monthName}`
          : `Rango: 16 - ${day} / ${monthName}`;
      }
      if (mode === 'all') return 'Rango: Todas Las Devoluciones';
      if (start && end) return `Rango: ${start} - ${end}`;
      return 'Rango:';
    })();
    if (format === 'pdf') {
      rows.push({ fecha: '', producto: 'TOTAL', cantidad: '', total: grand, bold: true });
      exportDevolucionesPdf(rows, rangeLabel);
      return;
    }
    if (format === 'xlsx') {
      const XLSX = await import('xlsx');
      const data = [
        ['Fecha', 'Producto', 'Cantidad', 'Total'],
        ...rows.map((r) => [r.fecha, r.producto, r.cantidad, r.total]),
        ['', 'TOTAL', '', grand],
      ];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Devoluciones');
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `devoluciones_${formatDateFns(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
      link.click();
      return;
    }
    if (format === 'docx') {
      const {
        Document,
        Packer,
        Paragraph,
        Table,
        TableRow,
        TableCell,
        WidthType,
        TableLayoutType,
        PageOrientation,
      } = await import('docx');
      const headerRow = new TableRow({
        children: ['Fecha', 'Producto', 'Cantidad', 'Total'].map(
          (h) => new TableCell({ children: [new Paragraph(h)] }),
        ),
      });
      const bodyRows = rows.map(
        (r) =>
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph(r.fecha)] }),
              new TableCell({ children: [new Paragraph(r.producto)] }),
              new TableCell({ children: [new Paragraph(String(r.cantidad))] }),
              new TableCell({
                children: [
                  new Paragraph(
                    `$ ${r.total.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`,
                  ),
                ],
              }),
            ],
          }),
      );
      const totalRow = new TableRow({
        children: [
          new TableCell({ children: [new Paragraph('')] }),
          new TableCell({ children: [new Paragraph('TOTAL')] }),
          new TableCell({ children: [new Paragraph('')] }),
          new TableCell({
            children: [
              new Paragraph(
                `$ ${grand.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`,
              ),
            ],
          }),
        ],
      });
      const table = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        layout: TableLayoutType.FIXED,
        columnWidths: [1800, 5200, 1200, 1800],
        rows: [headerRow, ...bodyRows, totalRow],
      });
      const doc = new Document({
        sections: [
          {
            properties: { page: { size: { orientation: PageOrientation.LANDSCAPE } } },
            children: [new Paragraph('Reporte de Devoluciones'), table],
          },
        ],
      });
      const blob = await Packer.toBlob(doc);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `devoluciones_${formatDateFns(new Date(), 'yyyyMMdd_HHmmss')}.docx`;
      link.click();
    }
  },
  exportInventario: async (params: {
    format: 'pdf' | 'xlsx' | 'docx';
    condicion: 'todos' | 'nuevos' | 'usados';
    [key: string]: string | number | boolean | undefined;
  }) => {
    const { format, condicion, ...rest } = params;
    if (format === 'docx') {
      throw new ApiError('Formato DOCX no disponible para inventario.', 400, {
        detail: 'Formato DOCX no disponible para inventario.',
      });
    }
    const meta = INVENTARIO_FORMATS[format];
    const condicionKey: 'todos' | 'nuevos' | 'usados' = (() => {
      const normalized = String(condicion || 'todos').toLowerCase();
      if (normalized === 'nuevos' || normalized === 'new') return 'nuevos';
      if (normalized === 'usados' || normalized === 'used') return 'usados';
      return 'todos';
    })();
    const queryParams: Record<string, string | number | boolean> = {
      format,
      condicion: condicionKey,
    };
    Object.entries(rest).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return;
      }
      queryParams[key] = value as string | number | boolean;
    });

    try {
      const res = await axios.get(`${API_BASE}/reportes/export-inventario/`, {
        params: queryParams,
        responseType: 'blob',
        withCredentials: true,
      });
      let blob = res.data as Blob;
      if (blob && meta?.mime && !blob.type) {
        blob = new Blob([blob], { type: meta.mime });
      }
      const contentDisposition = (res.headers['content-disposition'] as string | undefined) || null;
      const providedFilename = parseContentDispositionFilename(contentDisposition);
      const slug = INVENTARIO_SLUGS[condicionKey] || condicionKey;
      const ext = meta?.ext ?? format;
      const fallbackName = `inventario_${slug}_${formatDateFns(new Date(), 'yyyyMMdd_HHmmss')}.${ext}`;
      downloadBlob(blob, providedFilename || fallbackName);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        let responseData: unknown = error.response.data;
        const contentType = error.response.headers?.['content-type'] || '';
        if (responseData instanceof Blob) {
          try {
            const text = await responseData.text();
            responseData = contentType.includes('application/json') ? JSON.parse(text) : text;
          } catch {
            responseData = contentType.includes('application/json') ? null : '';
          }
        }
        const detail =
          typeof responseData === 'object' &&
          responseData !== null &&
          'detail' in responseData
            ? (responseData as { detail?: string }).detail
            : null;
        const message =
          detail && detail !== ''
            ? String(detail)
            : `HTTP ${error.response.status} ${error.response.statusText || 'Error'}`;
        throw new ApiError(message, error.response.status, responseData);
      }
      throw error;
    }
  },
  exportClientes: async (format: 'pdf' | 'xlsx' | 'docx') => {
    const clients = (await api.getClientes()) as ClienteDb[];
    const rows: ClientePdfRow[] = clients.map((c, idx) => ({
      index: idx + 1,
      nombre: c.tipo_cliente === 'juridica' ? c.razon_social || c.nombre || '' : c.nombre || c.razon_social || '',
      telefono: c.telefono || '',
      email: c.email || '',
      direccion: c.direccion || '',
    }));
    const count = rows.length;
    if (format === 'pdf') {
      rows.push({ index: '', nombre: 'TOTAL CLIENTES', telefono: String(count), email: '', direccion: '', bold: true });
      exportClientesPdf(rows);
      return;
    }
    if (format === 'xlsx') {
      const XLSX = await import('xlsx');
      const data = [
        ['#', 'Nombre', 'Teléfono', 'Email', 'Dirección'],
        ...rows.map((r) => [r.index, r.nombre, r.telefono, r.email, r.direccion]),
        ['', 'TOTAL CLIENTES', count, '', ''],
      ];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `clientes_${formatDateFns(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
      link.click();
      return;
    }
    if (format === 'docx') {
      const { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, TableLayoutType, PageOrientation } = await import('docx');
      const headerRow = new TableRow({
        children: ['#', 'Nombre', 'Teléfono', 'Email', 'Dirección'].map((h) => new TableCell({ children: [new Paragraph(h)] })),
      });
      const bodyRows = rows.map(
        (r) =>
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph(String(r.index))] }),
              new TableCell({ children: [new Paragraph(r.nombre)] }),
              new TableCell({ children: [new Paragraph(r.telefono)] }),
              new TableCell({ children: [new Paragraph(r.email)] }),
              new TableCell({ children: [new Paragraph(r.direccion)] }),
            ],
          }),
      );
      const totalRow = new TableRow({
        children: [
          new TableCell({ children: [new Paragraph('')] }),
          new TableCell({ children: [new Paragraph('TOTAL CLIENTES')] }),
          new TableCell({ children: [new Paragraph(String(count))] }),
          new TableCell({ children: [new Paragraph('')] }),
          new TableCell({ children: [new Paragraph('')] }),
        ],
      });
      const table = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        layout: TableLayoutType.FIXED,
        columnWidths: [600, 2600, 2000, 2600, 2600],
        rows: [headerRow, ...bodyRows, totalRow],
      });
      const doc = new Document({
        sections: [
          {
            properties: { page: { size: { orientation: PageOrientation.LANDSCAPE } } },
            children: [new Paragraph('Reporte de Clientes'), table],
          },
        ],
      });
      const blob = await Packer.toBlob(doc);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `clientes_${formatDateFns(new Date(), 'yyyyMMdd_HHmmss')}.docx`;
      link.click();
    }
  },
  // Health
  health: () => request("/health/"),
  // POS Checkout
  posCheckout: async (data: CheckoutPayload) => {
    const csrftoken = getCookie("csrftoken");
    const res = await fetch(`${API_BASE}/pos/checkout`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrftoken,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || "Request failed");
    }
    return res.json();
  },
  validateOverrideCode: async (code: string) => {
    await fetch(`${API_BASE}/csrf/`, { credentials: 'include' });
    const csrftoken = getCookie('csrftoken');
    const res = await fetch(`${API_BASE}/pos/validate-code`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrftoken,
      },
      body: JSON.stringify({ code }),
    });
    return res.json();
  },
  getOverrideStatus: async () => {
    const res = await fetch(`${API_BASE}/pos/validate-code`, {
      credentials: 'include',
    });
    return res.json();
  },
  // Usuarios
  getUsuarios: () => request("/usuarios/"),
  createUsuario: (data: unknown) => csrfRequest("/usuarios/", "POST", data),
  updateUsuario: (id: number, data: unknown) => csrfRequest(`/usuarios/${id}/`, "PUT", data),
  deleteUsuario: (id: number) => csrfRequest(`/usuarios/${id}/`, "DELETE"),
};
