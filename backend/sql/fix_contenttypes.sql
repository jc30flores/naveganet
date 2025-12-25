-- Fix para django_content_type: corregir valores NULL en name
-- Ejecutar: psql -U postgres -d coloso -f backend/sql/fix_contenttypes.sql

-- Corregir todos los registros existentes
UPDATE django_content_type 
SET name = COALESCE(name, app_label || '.' || model) 
WHERE name IS NULL;

-- Agregar valor por defecto si no existe
ALTER TABLE django_content_type 
ALTER COLUMN name SET DEFAULT '';

-- Asegurar que no haya más NULLs
UPDATE django_content_type 
SET name = app_label || '.' || model 
WHERE name IS NULL OR name = '';

