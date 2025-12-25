-- Solución permanente para django_content_type
-- Hacer la columna nullable y agregar valor por defecto

BEGIN;

-- 1. Hacer la columna nullable
ALTER TABLE django_content_type ALTER COLUMN name DROP NOT NULL;

-- 2. Agregar valor por defecto
ALTER TABLE django_content_type ALTER COLUMN name SET DEFAULT '';

-- 3. Corregir todos los registros existentes
UPDATE django_content_type 
SET name = app_label || '.' || model 
WHERE name IS NULL OR name = '';

-- 4. Crear trigger para asegurar que siempre tenga valor
CREATE OR REPLACE FUNCTION set_contenttype_name() 
RETURNS TRIGGER AS $$ 
BEGIN 
    IF NEW.name IS NULL OR NEW.name = '' THEN 
        NEW.name := NEW.app_label || '.' || NEW.model; 
    END IF; 
    RETURN NEW; 
END; 
$$ LANGUAGE plpgsql IMMUTABLE;

DROP TRIGGER IF EXISTS trg_set_contenttype_name ON django_content_type;
CREATE TRIGGER trg_set_contenttype_name 
    BEFORE INSERT OR UPDATE ON django_content_type 
    FOR EACH ROW 
    WHEN (NEW.name IS NULL OR NEW.name = '')
    EXECUTE FUNCTION set_contenttype_name();

COMMIT;

