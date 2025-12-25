-- Script completo para corregir todos los problemas de migración
-- Ejecutar: psql -U postgres -d coloso -f backend/sql/fix_all_issues.sql

BEGIN;

-- 1. Corregir last_login
ALTER TABLE auth_user ALTER COLUMN last_login DROP NOT NULL;

-- 2. Corregir django_content_type: hacer name nullable y agregar trigger
UPDATE django_content_type 
SET name = COALESCE(name, app_label || '.' || model) 
WHERE name IS NULL OR name = '';

ALTER TABLE django_content_type ALTER COLUMN name DROP NOT NULL;

-- 3. Crear trigger para asignar name automáticamente si es NULL
CREATE OR REPLACE FUNCTION set_contenttype_name() 
RETURNS TRIGGER AS $$ 
BEGIN 
    IF NEW.name IS NULL OR NEW.name = '' THEN 
        NEW.name := NEW.app_label || '.' || NEW.model; 
    END IF; 
    RETURN NEW; 
END; 
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_contenttype_name ON django_content_type;
CREATE TRIGGER trg_set_contenttype_name 
    BEFORE INSERT OR UPDATE ON django_content_type 
    FOR EACH ROW 
    EXECUTE FUNCTION set_contenttype_name();

COMMIT;

-- Verificar
SELECT 'last_login nullable: ' || 
    (SELECT is_nullable FROM information_schema.columns 
     WHERE table_name = 'auth_user' AND column_name = 'last_login') as status;
     
SELECT 'django_content_type name nullable: ' || 
    (SELECT is_nullable FROM information_schema.columns 
     WHERE table_name = 'django_content_type' AND column_name = 'name') as status;

