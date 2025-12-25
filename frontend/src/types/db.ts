export interface Cliente {
  id: number;
  tipo_cliente?: 'natural' | 'juridica';
  nombre?: string | null;
  razon_social?: string | null;
  nombre_comercial?: string | null;
  nit?: string | null;
  nrc?: string | null;
  giro?: string | null;
  dui?: string | null;
  email?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  direccion_fiscal?: string | null;
  municipio?: string | null;
  departamento?: string | null;
  telefono_facturacion?: string | null;
  email_facturacion?: string | null;
  contacto?: string | null;
  contribuyente_iva?: boolean;
  observaciones?: string | null;
  fecha_ultima_compra?: string | null;
}

export interface Categoria {
  id: number;
  name?: string;
  nombre?: string;
  product_count?: number;
}

export interface Producto {
  id: number;
  codigo: string | null;
  nombre: string;
  categoria?: string;
  categoria_nombre?: string;
  categoria_id?: number;
  category_id?: number;
  category_name?: string;
  tipo: 'producto' | 'servicio';
  precio: number;
  status?: 'active' | 'archived';
  created_at?: string;
  updated_at?: string;
}

export interface Venta {
  id: number;
  fecha: string;
  total: number;
  cliente?: string;
}

export interface DetalleVenta {
  id: number;
  venta: number;
  producto: string;
  cantidad: number;
  precio: number;
  total: number;
}

export interface Credito {
  id: number;
  cliente: number;
  cliente_nombre: string;
  email?: string;
  telefono?: string;
  total_deuda: number;
  pagado: number;
  saldo: number;
  fecha_ultima_compra?: string;
  estado?: string;
  observaciones?: string | null;
}

export interface PagoCredito {
  id: number;
  fecha: string;
  monto: number;
  concepto?: string;
  metodoPago?: string;
}

export interface Devolucion {
  id: number;
  fecha: string;
  producto: number | null;
  producto_nombre_snapshot?: string | null;
  producto_codigo_snapshot?: string | null;
  cantidad: number;
  precio_unitario: number;
  total: number;
  motivo?: string | null;
}

export interface ClienteDetalle {
  id: number;
  tipo_cliente?: 'natural' | 'juridica';
  nombre: string;
  razon_social?: string | null;
  nombre_comercial?: string | null;
  giro?: string | null;
  dui?: string | null;
  nit?: string | null;
  nrc?: string | null;
  email?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  direccion_fiscal?: string | null;
  departamento?: string | null;
  municipio?: string | null;
  telefono_facturacion?: string | null;
  email_facturacion?: string | null;
  contacto?: string | null;
  contribuyente_iva?: boolean;
  observaciones?: string | null;
  fecha_ultima_compra?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface VentaDetalle {
  id: number;
  fecha: string;
  cliente: { id: number; nombre: string };
  total: number;
  metodo: string;
  estado: string;
  tipo: string;
  notas?: string | null;
}

export interface VentaItem {
  producto_id: number;
  codigo: string;
  nombre: string;
  cantidad: number;
  precio: number;
  sub_total: number;
}

export interface CreditoDetalle {
  id: number;
  cliente: { id: number; nombre: string };
  total: number;
  pagado: number;
  saldo: number;
  fecha: string;
  estado?: string;
  observaciones?: string | null;
  items: CreditoItem[];
  pagos: CreditoPago[];
}

export interface CreditoPago {
  id: number;
  fecha: string;
  monto: number;
}

export interface CreditoItem {
  producto_id: number;
  codigo: string;
  nombre: string;
  cantidad: number;
  precio: number;
  sub_total: number;
}

export interface Deudor {
  cliente_id: number;
  cliente_nombre: string;
  total: number;
  pagado: number;
  saldo: number;
}

export interface DeudorDetalle {
  cliente: { id: number; nombre: string };
  total: number;
  pagado: number;
  saldo: number;
  creditos: { id: number; fecha: string; total: number; pagado: number; saldo: number; observaciones?: string | null }[];
  pagos: CreditoPago[];
  items: CreditoItem[];
}
