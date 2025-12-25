import os
import sys
import django

# Configurar Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'colosso_backend.settings')
django.setup()

from django.db import connection

def check_column_exists(table_name, column_name):
    """Verificar si una columna existe en una tabla"""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = %s AND column_name = %s
            )
        """, [table_name, column_name])
        return cursor.fetchone()[0]

def add_column_if_missing(table_name, column_name, column_type, default_value=None):
    """Agregar columna si no existe"""
    if not check_column_exists(table_name, column_name):
        with connection.cursor() as cursor:
            sql = f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}"
            if default_value is not None:
                sql += f" DEFAULT {default_value}"
            cursor.execute(sql)
            print(f"  [OK] Agregada columna {table_name}.{column_name}")
        return True
    else:
        print(f"  [OK] Columna {table_name}.{column_name} ya existe")
        return False

def main():
    print("Verificando columnas faltantes...\n")
    
    # Columnas de clientes
    print("Tabla: clientes")
    add_column_if_missing('clientes', 'contribuyente_iva', 'BOOLEAN', 'FALSE')
    
    # Verificar otras columnas comunes que podrían faltar
    print("\nVerificando otras columnas importantes...")
    
    # Columnas de ventas que se usan en historial_ventas
    ventas_columns = [
        ('ventas', 'documento_numero', 'TEXT', None),
    ]
    
    for table, col, col_type, default in ventas_columns:
        if not check_column_exists(table, col):
            print(f"  [WARN] Columna {table}.{col} no existe (puede ser necesaria)")
    
    print("\nVerificación completada.")

if __name__ == '__main__':
    main()

