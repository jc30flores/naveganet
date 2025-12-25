#!/usr/bin/env python
"""
Script para probar el login y ver el error completo
"""
import os
import sys
import django
from pathlib import Path

backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'colosso_backend.settings')
django.setup()

from django.contrib.auth import authenticate, get_user_model
from apps.api.models import Usuario

User = get_user_model()

print("=" * 60)
print("Probando login...")
print("=" * 60)

username = "admin"
password = "ColossoAdmin#2025"

# Verificar que el usuario existe
try:
    user = User.objects.get(username=username)
    print(f"OK: Usuario encontrado: {user.username}")
    print(f"  Email: {user.email}")
    print(f"  Is active: {user.is_active}")
    print(f"  Is staff: {user.is_staff}")
    print(f"  Is superuser: {user.is_superuser}")
except User.DoesNotExist:
    print(f"ERROR: Usuario '{username}' no existe")
    sys.exit(1)

# Verificar autenticación
user_auth = authenticate(username=username, password=password)
if user_auth:
    print(f"OK: Autenticacion exitosa")
else:
    print(f"ERROR: Autenticacion fallida")
    sys.exit(1)

# Verificar perfil
try:
    perfil = Usuario.objects.get(user=user)
    print(f"OK: Perfil encontrado: role={perfil.role}")
except Usuario.DoesNotExist:
    print(f"ERROR: Perfil no existe para usuario '{username}'")
    print("  Creando perfil...")
    perfil = Usuario.objects.create(user=user, role="admin")
    print(f"OK: Perfil creado: role={perfil.role}")

print("=" * 60)
print("Todo OK!")

