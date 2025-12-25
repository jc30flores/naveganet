-- Fix trigger para detalle_venta que ya no tiene costo y condicion
CREATE OR REPLACE FUNCTION detalle_venta_snapshot_biu()
RETURNS trigger AS $$
DECLARE
  v_codigo TEXT; v_nombre TEXT;
  v_cat_id BIGINT; v_cat_nombre TEXT; v_fecha TIMESTAMPTZ;
BEGIN
  IF TG_OP='INSERT' OR NEW.producto_id IS DISTINCT FROM OLD.producto_id THEN
    SELECT p.codigo, p.nombre, p.categoria_id, c.nombre
      INTO v_codigo, v_nombre, v_cat_id, v_cat_nombre
    FROM productos p LEFT JOIN categorias c ON c.id=p.categoria_id
    WHERE p.id = NEW.producto_id;
    IF v_codigo IS NULL AND v_nombre IS NULL THEN 
      RAISE EXCEPTION 'Producto % no existe', NEW.producto_id; 
    END IF;

    IF NEW.fecha_venta IS NULL THEN
      SELECT fecha INTO v_fecha FROM ventas WHERE id=NEW.venta_id;
      NEW.fecha_venta := COALESCE(v_fecha, now());
    END IF;

    NEW.producto_codigo_snapshot := v_codigo;
    NEW.producto_nombre_snapshot := v_nombre;
    NEW.producto_costo_snapshot  := NULL;  -- Ya no existe costo
    NEW.producto_condicion_snapshot := NULL;  -- Ya no existe condicion
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

