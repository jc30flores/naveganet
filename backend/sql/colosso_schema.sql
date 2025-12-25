-- =============================================================
-- COLOSSO AUTOPARTS — ESQUEMA SQL SIN PARTICIONADO (PostgreSQL >= 12)
-- Idempotente: seguro de correr múltiples veces
-- =============================================================

BEGIN;

-- =========================
-- 1) ENUMS (crear si no existen)
-- =========================
DO $$ BEGIN
  CREATE TYPE product_condition AS ENUM ('new','used');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE product_status AS ENUM ('active','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE sale_status AS ENUM ('completada','pendiente','anulada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('efectivo','tarjeta','transferencia');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE credit_status AS ENUM ('pendiente','pagado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE customer_type AS ENUM ('natural','juridica');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE document_type AS ENUM ('ticket','consumidor_final','ccf');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- =========================
-- 2) TABLAS (NO particionadas)
-- =========================

-- 2.1 CLIENTES
CREATE TABLE IF NOT EXISTS clientes (
  id BIGSERIAL PRIMARY KEY,
  tipo_cliente customer_type NOT NULL DEFAULT 'natural',
  nombre TEXT,
  razon_social TEXT,
  nombre_comercial TEXT,
  giro TEXT,
  dui TEXT,
  nit TEXT UNIQUE,
  nrc TEXT UNIQUE,
  email TEXT, telefono TEXT,
  direccion TEXT,
  direccion_fiscal TEXT, departamento TEXT, municipio TEXT,
  telefono_facturacion TEXT, email_facturacion TEXT, contacto TEXT,
  fecha_ultima_compra TIMESTAMPTZ,
  observaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.2 CATEGORIAS
CREATE TABLE IF NOT EXISTS categorias (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE
);

-- 2.3 PRODUCTOS
CREATE TABLE IF NOT EXISTS productos (
  id BIGSERIAL PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  categoria_id BIGINT REFERENCES categorias(id) ON DELETE RESTRICT,
  precio NUMERIC(12,2) NOT NULL,
  costo  NUMERIC(12,2) NOT NULL,
  stock  INTEGER NOT NULL DEFAULT 0,
  stock_minimo INTEGER NOT NULL DEFAULT 0,
  condicion product_condition NOT NULL,               -- 'new' | 'used'
  status    product_status   NOT NULL DEFAULT 'active', -- 'active' | 'archived'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (condicion='new'  AND stock >= 0) OR
    (condicion='used' AND stock >= 0)
  )
);
-- Índices útiles (y parciales para activos)
CREATE INDEX IF NOT EXISTS idx_productos_codigo              ON productos (codigo);
CREATE INDEX IF NOT EXISTS idx_productos_categoria           ON productos (categoria_id);
CREATE INDEX IF NOT EXISTS idx_productos_condicion_stock     ON productos (condicion, stock);
CREATE INDEX IF NOT EXISTS idx_productos_codigo_active       ON productos (codigo)      WHERE status='active';
CREATE INDEX IF NOT EXISTS idx_productos_categoria_active    ON productos (categoria_id) WHERE status='active';

-- 2.4 VENTAS
CREATE TABLE IF NOT EXISTS ventas (
  id BIGSERIAL PRIMARY KEY,
  fecha TIMESTAMPTZ NOT NULL,
  cliente_id BIGINT REFERENCES clientes(id) ON DELETE SET NULL,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  estado sale_status NOT NULL DEFAULT 'pendiente',
  metodo_pago payment_method,
  documento_tipo document_type NOT NULL DEFAULT 'ticket',
  documento_serie TEXT,
  documento_numero TEXT,
  iva_monto NUMERIC(14,2) DEFAULT 0,
  iva_porcentaje NUMERIC(5,2) DEFAULT 13.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Índices (BRIN por fecha para historiales largos)
CREATE INDEX IF NOT EXISTS idx_ventas_cliente ON ventas (cliente_id);
CREATE INDEX IF NOT EXISTS idx_ventas_estado  ON ventas (estado);
CREATE INDEX IF NOT EXISTS brin_ventas_fecha  ON ventas USING BRIN (fecha);

-- 2.5 DETALLE_VENTA
CREATE TABLE IF NOT EXISTS detalle_venta (
  id BIGSERIAL PRIMARY KEY,
  venta_id BIGINT NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  producto_id BIGINT NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
  cantidad NUMERIC(12,3) NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(12,2) NOT NULL CHECK (precio_unitario >= 0),
  subtotal NUMERIC(14,2) NOT NULL CHECK (subtotal >= 0),
  fecha_venta TIMESTAMPTZ NOT NULL,      -- copia de ventas.fecha (para filtros rápidos)
  -- snapshots del producto (NOT NULL tras backfill por trigger)
  producto_codigo_snapshot TEXT,
  producto_nombre_snapshot TEXT,
  producto_costo_snapshot  NUMERIC(12,2),
  producto_condicion_snapshot TEXT,
  producto_categoria_id_snapshot BIGINT,
  producto_categoria_nombre_snapshot TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dv_venta          ON detalle_venta (venta_id);
CREATE INDEX IF NOT EXISTS idx_dv_producto       ON detalle_venta (producto_id);
CREATE INDEX IF NOT EXISTS brin_dv_fecha_venta   ON detalle_venta USING BRIN (fecha_venta);
CREATE INDEX IF NOT EXISTS idx_dv_cat_snapshot   ON detalle_venta (producto_categoria_id_snapshot);
CREATE INDEX IF NOT EXISTS idx_dv_cond_snapshot  ON detalle_venta (producto_condicion_snapshot);
CREATE INDEX IF NOT EXISTS idx_dv_nombre_s ON detalle_venta (lower(producto_nombre_snapshot));
CREATE INDEX IF NOT EXISTS idx_dv_codigo_s ON detalle_venta (lower(producto_codigo_snapshot));

-- 2.6 CREDITOS
CREATE TABLE IF NOT EXISTS creditos (
  id BIGSERIAL PRIMARY KEY,
  cliente_id BIGINT NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  total_deuda NUMERIC(14,2) NOT NULL DEFAULT 0,
  pagado      NUMERIC(14,2) NOT NULL DEFAULT 0,
  saldo       NUMERIC(14,2) NOT NULL DEFAULT 0,
  fecha_ultima_compra TIMESTAMPTZ,
  estado credit_status NOT NULL DEFAULT 'pendiente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.7 CREDITOS_HISTORIAL_COMPRAS
CREATE TABLE IF NOT EXISTS creditos_historial_compras (
  id BIGSERIAL PRIMARY KEY,
  credito_id BIGINT NOT NULL REFERENCES creditos(id) ON DELETE CASCADE,
  venta_id   BIGINT NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  fecha TIMESTAMPTZ NOT NULL,
  monto  NUMERIC(14,2) NOT NULL CHECK (monto >= 0),
  pagado NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (pagado >= 0),
  saldo  NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (saldo >= 0),
  estado credit_status NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.8 PAGOS_CREDITO
CREATE TABLE IF NOT EXISTS pagos_credito (
  id BIGSERIAL PRIMARY KEY,
  credito_id BIGINT NOT NULL REFERENCES creditos(id) ON DELETE CASCADE,
  fecha TIMESTAMPTZ NOT NULL,
  monto NUMERIC(14,2) NOT NULL CHECK (monto > 0),
  concepto TEXT,
  metodo_pago payment_method,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.9 DEVOLUCIONES
CREATE TABLE IF NOT EXISTS devoluciones (
  id BIGSERIAL PRIMARY KEY,
  fecha TIMESTAMPTZ NOT NULL,
  producto_id BIGINT NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
  venta_id BIGINT REFERENCES ventas(id) ON DELETE SET NULL,
  detalle_venta_id BIGINT REFERENCES detalle_venta(id) ON DELETE SET NULL,
  cantidad NUMERIC(12,3) NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(12,2) NOT NULL CHECK (precio_unitario >= 0),
  total NUMERIC(14,2) NOT NULL CHECK (total >= 0),
  motivo TEXT,
  -- snapshots del producto (NOT NULL tras backfill por trigger)
  producto_codigo_snapshot TEXT,
  producto_nombre_snapshot TEXT,
  producto_costo_snapshot  NUMERIC(12,2),
  producto_condicion_snapshot TEXT,
  producto_categoria_id_snapshot BIGINT,
  producto_categoria_nombre_snapshot TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =========================
-- 3) TRIGGERS / FUNCIONES
-- =========================

-- 3.1 updated_at automático
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_uat_clientes') THEN
    CREATE TRIGGER trg_uat_clientes BEFORE UPDATE ON clientes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_uat_productos') THEN
    CREATE TRIGGER trg_uat_productos BEFORE UPDATE ON productos
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_uat_ventas') THEN
    CREATE TRIGGER trg_uat_ventas BEFORE UPDATE ON ventas
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_uat_detalle_venta') THEN
    CREATE TRIGGER trg_uat_detalle_venta BEFORE UPDATE ON detalle_venta
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_uat_creditos') THEN
    CREATE TRIGGER trg_uat_creditos BEFORE UPDATE ON creditos
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_uat_creditos_hist') THEN
    CREATE TRIGGER trg_uat_creditos_hist BEFORE UPDATE ON creditos_historial_compras
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_uat_pagos_credito') THEN
    CREATE TRIGGER trg_uat_pagos_credito BEFORE UPDATE ON pagos_credito
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_uat_devoluciones') THEN
    CREATE TRIGGER trg_uat_devoluciones BEFORE UPDATE ON devoluciones
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- 3.2 Archivar usados cuando stock llega a 0
CREATE OR REPLACE FUNCTION archive_used_when_zero()
RETURNS trigger AS $$
BEGIN
  IF NEW.condicion='used' AND NEW.stock=0 AND NEW.status='active' THEN
    NEW.status := 'archived';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_archive_used_when_zero') THEN
    CREATE TRIGGER trg_archive_used_when_zero
    BEFORE UPDATE OF stock ON productos
    FOR EACH ROW WHEN (OLD.stock IS DISTINCT FROM NEW.stock)
    EXECUTE FUNCTION archive_used_when_zero();
  END IF;
END $$;

-- 3.3 Snapshots en detalle_venta (BIU)
CREATE OR REPLACE FUNCTION detalle_venta_snapshot_biu()
RETURNS trigger AS $$
DECLARE
  v_codigo TEXT; v_nombre TEXT; v_costo NUMERIC(12,2);
  v_cond TEXT; v_cat_id BIGINT; v_cat_nombre TEXT; v_fecha TIMESTAMPTZ;
BEGIN
  IF TG_OP='INSERT' OR NEW.producto_id IS DISTINCT FROM OLD.producto_id THEN
    SELECT p.codigo, p.nombre, p.costo, p.condicion::TEXT, p.categoria_id, c.nombre
      INTO v_codigo, v_nombre, v_costo, v_cond, v_cat_id, v_cat_nombre
    FROM productos p LEFT JOIN categorias c ON c.id=p.categoria_id
    WHERE p.id = NEW.producto_id;
    IF v_codigo IS NULL THEN RAISE EXCEPTION 'Producto % no existe', NEW.producto_id; END IF;

    IF NEW.fecha_venta IS NULL THEN
      SELECT fecha INTO v_fecha FROM ventas WHERE id=NEW.venta_id;
      NEW.fecha_venta := COALESCE(v_fecha, now());
    END IF;

    NEW.producto_codigo_snapshot := v_codigo;
    NEW.producto_nombre_snapshot := v_nombre;
    NEW.producto_costo_snapshot  := v_costo;
    NEW.producto_condicion_snapshot := v_cond;
    NEW.producto_categoria_id_snapshot := v_cat_id;
    NEW.producto_categoria_nombre_snapshot := v_cat_nombre;
  ELSE
    IF (NEW.producto_codigo_snapshot           IS DISTINCT FROM OLD.producto_codigo_snapshot) OR
       (NEW.producto_nombre_snapshot           IS DISTINCT FROM OLD.producto_nombre_snapshot) OR
       (NEW.producto_costo_snapshot            IS DISTINCT FROM OLD.producto_costo_snapshot) OR
       (NEW.producto_condicion_snapshot        IS DISTINCT FROM OLD.producto_condicion_snapshot) OR
       (NEW.producto_categoria_id_snapshot     IS DISTINCT FROM OLD.producto_categoria_id_snapshot) OR
       (NEW.producto_categoria_nombre_snapshot IS DISTINCT FROM OLD.producto_categoria_nombre_snapshot)
    THEN
      RAISE EXCEPTION 'Snapshots son de solo lectura; cambie producto_id para resincronizar.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_detalle_venta_snapshot_biu') THEN
    CREATE TRIGGER trg_detalle_venta_snapshot_biu
    BEFORE INSERT OR UPDATE ON detalle_venta
    FOR EACH ROW EXECUTE FUNCTION detalle_venta_snapshot_biu();
  END IF;
END $$;

-- 3.4 Snapshots en devoluciones (BIU)
CREATE OR REPLACE FUNCTION devoluciones_snapshot_biu()
RETURNS trigger AS $$
DECLARE
  v_codigo TEXT; v_nombre TEXT; v_costo NUMERIC(12,2);
  v_cond TEXT; v_cat_id BIGINT; v_cat_nombre TEXT;
BEGIN
  IF TG_OP='INSERT' OR NEW.producto_id IS DISTINCT FROM OLD.producto_id THEN
    SELECT p.codigo, p.nombre, p.costo, p.condicion::TEXT, p.categoria_id, c.nombre
      INTO v_codigo, v_nombre, v_costo, v_cond, v_cat_id, v_cat_nombre
    FROM productos p LEFT JOIN categorias c ON c.id=p.categoria_id
    WHERE p.id = NEW.producto_id;
    IF v_codigo IS NULL THEN RAISE EXCEPTION 'Producto % no existe', NEW.producto_id; END IF;

    NEW.producto_codigo_snapshot := v_codigo;
    NEW.producto_nombre_snapshot := v_nombre;
    NEW.producto_costo_snapshot  := v_costo;
    NEW.producto_condicion_snapshot := v_cond;
    NEW.producto_categoria_id_snapshot := v_cat_id;
    NEW.producto_categoria_nombre_snapshot := v_cat_nombre;
  ELSE
    IF (NEW.producto_codigo_snapshot           IS DISTINCT FROM OLD.producto_codigo_snapshot) OR
       (NEW.producto_nombre_snapshot           IS DISTINCT FROM OLD.producto_nombre_snapshot) OR
       (NEW.producto_costo_snapshot            IS DISTINCT FROM OLD.producto_costo_snapshot) OR
       (NEW.producto_condicion_snapshot        IS DISTINCT FROM OLD.producto_condicion_snapshot) OR
       (NEW.producto_categoria_id_snapshot     IS DISTINCT FROM OLD.producto_categoria_id_snapshot) OR
       (NEW.producto_categoria_nombre_snapshot IS DISTINCT FROM OLD.producto_categoria_nombre_snapshot)
    THEN
      RAISE EXCEPTION 'Snapshots son de solo lectura; cambie producto_id para resincronizar.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_devoluciones_snapshot_biu') THEN
    CREATE TRIGGER trg_devoluciones_snapshot_biu
    BEFORE INSERT OR UPDATE ON devoluciones
    FOR EACH ROW EXECUTE FUNCTION devoluciones_snapshot_biu();
  END IF;
END $$;

-- =========================
-- 4) VISTAS
-- =========================
CREATE OR REPLACE VIEW productos_activos    AS SELECT * FROM productos WHERE status='active';
CREATE OR REPLACE VIEW productos_archivados AS SELECT * FROM productos WHERE status='archived';

COMMIT;

-- =========================
-- FIN
-- =========================
