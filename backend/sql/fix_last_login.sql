-- Fix para hacer last_login nullable en auth_user
-- Ejecutar: psql -U postgres -d coloso -f fix_last_login.sql

ALTER TABLE auth_user ALTER COLUMN last_login DROP NOT NULL;

