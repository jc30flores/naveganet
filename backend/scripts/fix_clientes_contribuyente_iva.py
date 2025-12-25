import os
import sys
import django

# Configurar Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'colosso_backend.settings')
django.setup()

from django.db import connection

def fix_contribuyente_iva():
    """Agregar columna contribuyente_iva si no existe"""
    sql_file = os.path.join(os.path.dirname(__file__), '..', 'sql', 'fix_clientes_contribuyente_iva.sql')
    
    with open(sql_file, 'r', encoding='utf-8') as f:
        sql = f.read()
    
    with connection.cursor() as cursor:
        cursor.execute(sql)
        print("Columna contribuyente_iva verificada/agregada correctamente")

if __name__ == '__main__':
    fix_contribuyente_iva()


