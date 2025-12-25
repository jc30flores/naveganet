#!/usr/bin/env python
"""
Script para corregir migraciones cuando las tablas ya existen.
Ejecuta: python backend/scripts/fix_migrations.py
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

from django.core.management import call_command
from django.db import connection

def fix_last_login():
    """Corregir la columna last_login para que sea nullable"""
    print("[fix-migrations] Corrigiendo last_login...")
    with connection.cursor() as cursor:
        try:
            cursor.execute("ALTER TABLE auth_user ALTER COLUMN last_login DROP NOT NULL;")
            print("[fix-migrations] OK: last_login corregido")
        except Exception as e:
            if "does not exist" in str(e) or "column" in str(e).lower():
                print(f"[fix-migrations] WARNING: last_login ya está correcto o no existe: {e}")
            else:
                print(f"[fix-migrations] ERROR: {e}")
                raise

def fake_initial_migrations():
    """Marcar migraciones iniciales como aplicadas"""
    print("[fix-migrations] Marcando migraciones iniciales como aplicadas...")
    try:
        call_command('migrate', '--fake-initial', verbosity=1)
        print("[fix-migrations] OK: Migraciones marcadas como aplicadas")
    except Exception as e:
        print(f"[fix-migrations] WARNING: Error en --fake-initial: {e}")
        print("[fix-migrations] Intentando marcar migraciones manualmente...")
        
        # Marcar migraciones de Django core primero
        for app in ['contenttypes', 'auth', 'admin', 'sessions']:
            try:
                call_command('migrate', app, '--fake', verbosity=0)
                print(f"[fix-migrations] OK: {app} marcado")
            except Exception as e:
                print(f"[fix-migrations] WARNING: {app}: {e}")
        
        # Luego marcar api
        try:
            call_command('migrate', 'api', '--fake-initial', verbosity=0)
            print("[fix-migrations] OK: api marcado")
        except Exception as e:
            print(f"[fix-migrations] WARNING: api: {e}")

if __name__ == '__main__':
    print("=" * 60)
    print("Corrigiendo migraciones de Django")
    print("=" * 60)
    
    fix_last_login()
    print()
    fake_initial_migrations()
    print()
    print("=" * 60)
    print("OK: Proceso completado")
    print("=" * 60)
    print("\nAhora puedes ejecutar: python manage.py migrate")
    print("Y luego: python manage.py createsuperuser")

