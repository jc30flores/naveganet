#!/usr/bin/env python
"""
Script para crear la tabla django_session y verificar el login
"""
import os
import sys
import django
from pathlib import Path

backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'colosso_backend.settings')
django.setup()

from django.db import connection

print("=" * 60)
print("Creando tabla django_session...")
print("=" * 60)

with connection.cursor() as cursor:
    try:
        # Crear tabla django_session
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS django_session (
                session_key VARCHAR(40) NOT NULL PRIMARY KEY,
                session_data TEXT NOT NULL,
                expire_date TIMESTAMPTZ NOT NULL
            );
        """)
        print("OK: Tabla django_session creada")
        
        # Crear índice
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS django_session_expire_date_a5c62663 
            ON django_session (expire_date);
        """)
        print("OK: Indice creado")
        
    except Exception as e:
        print(f"WARNING: {e}")

print("\n" + "=" * 60)
print("Verificando tabla...")
print("=" * 60)

with connection.cursor() as cursor:
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'django_session';
    """)
    result = cursor.fetchone()
    if result:
        print("OK: Tabla django_session existe")
    else:
        print("ERROR: Tabla django_session no existe")

print("\n" + "=" * 60)
print("Proceso completado!")
print("=" * 60)
print("\nAhora puedes intentar hacer login de nuevo.")

