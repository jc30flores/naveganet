#!/usr/bin/env python
"""
Script para corregir problemas de base de datos y ejecutar migraciones
Ejecuta: python backend/scripts/fix_and_migrate.py
"""
import os
import sys
import django
from pathlib import Path

# Agregar el directorio backend al path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'colosso_backend.settings')
django.setup()

from django.db import connection
from django.core.management import call_command

def fix_database():
    """Corregir problemas en la base de datos"""
    print("=" * 60)
    print("Corrigiendo problemas de base de datos...")
    print("=" * 60)
    
    with connection.cursor() as cursor:
        try:
            # 1. Corregir last_login
            print("[1/3] Corrigiendo last_login...")
            cursor.execute("ALTER TABLE auth_user ALTER COLUMN last_login DROP NOT NULL;")
            print("      OK: last_login ahora es nullable")
        except Exception as e:
            print(f"      WARNING: {e}")
        
        try:
            # 2. Hacer django_content_type.name nullable
            print("[2/3] Haciendo django_content_type.name nullable...")
            cursor.execute("ALTER TABLE django_content_type ALTER COLUMN name DROP NOT NULL;")
            print("      OK: name ahora es nullable")
        except Exception as e:
            print(f"      WARNING: {e}")
        
        try:
            # 3. Corregir registros existentes
            print("[3/3] Corrigiendo registros existentes...")
            cursor.execute("""
                UPDATE django_content_type 
                SET name = app_label || '.' || model 
                WHERE name IS NULL OR name = '';
            """)
            updated = cursor.rowcount
            print(f"      OK: {updated} registros actualizados")
        except Exception as e:
            print(f"      WARNING: {e}")
        
        try:
            # 4. Crear trigger para prevenir NULLs futuros
            print("[4/4] Creando trigger para prevenir NULLs...")
            cursor.execute("""
                CREATE OR REPLACE FUNCTION set_contenttype_name() 
                RETURNS TRIGGER AS $$ 
                BEGIN 
                    IF NEW.name IS NULL OR NEW.name = '' THEN 
                        NEW.name := NEW.app_label || '.' || NEW.model; 
                    END IF; 
                    RETURN NEW; 
                END; 
                $$ LANGUAGE plpgsql;
            """)
            cursor.execute("DROP TRIGGER IF EXISTS trg_set_contenttype_name ON django_content_type;")
            cursor.execute("""
                CREATE TRIGGER trg_set_contenttype_name 
                    BEFORE INSERT OR UPDATE ON django_content_type 
                    FOR EACH ROW 
                    WHEN (NEW.name IS NULL OR NEW.name = '')
                    EXECUTE FUNCTION set_contenttype_name();
            """)
            print("      OK: Trigger creado")
        except Exception as e:
            print(f"      WARNING: {e}")

def run_migrations():
    """Ejecutar migraciones"""
    print("\n" + "=" * 60)
    print("Ejecutando migraciones...")
    print("=" * 60)
    try:
        call_command('migrate', verbosity=1)
        print("\nOK: Migraciones completadas")
    except Exception as e:
        print(f"\nERROR: {e}")
        raise

if __name__ == '__main__':
    fix_database()
    run_migrations()
    print("\n" + "=" * 60)
    print("Proceso completado!")
    print("=" * 60)
    print("\nAhora puedes ejecutar: python manage.py createsuperuser")

