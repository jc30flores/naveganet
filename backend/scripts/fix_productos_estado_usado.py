#!/usr/bin/env python
"""
Script para agregar la columna estado_usado a la tabla productos
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
print("Agregando columna estado_usado a productos...")
print("=" * 60)

with connection.cursor() as cursor:
    try:
        # Verificar si la columna existe
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'productos' AND column_name = 'estado_usado';
        """)
        exists = cursor.fetchone()
        
        if exists:
            print("OK: Columna estado_usado ya existe")
        else:
            # Agregar la columna
            cursor.execute("""
                ALTER TABLE productos 
                ADD COLUMN estado_usado VARCHAR(20);
            """)
            print("OK: Columna estado_usado agregada")
        
        # Crear índice si no existe
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_productos_estado_usado 
            ON productos(estado_usado) 
            WHERE estado_usado IS NOT NULL;
        """)
        print("OK: Indice creado/verificado")
        
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

print("=" * 60)
print("Proceso completado!")
print("=" * 60)
print("\nRecarga la pagina para ver los productos.")

