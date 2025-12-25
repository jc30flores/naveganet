#!/usr/bin/env python
"""
Script para crear superusuario de forma no interactiva
Ejecuta: python backend/scripts/create_superuser.py
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

from django.contrib.auth import get_user_model
from apps.api.models import Usuario

User = get_user_model()

def create_superuser():
    """Crear superusuario si no existe"""
    username = os.getenv('SUPERUSER_USERNAME', 'admin')
    email = os.getenv('SUPERUSER_EMAIL', 'admin@colosso.local')
    password = os.getenv('SUPERUSER_PASSWORD', 'ColossoAdmin#2025')
    
    if User.objects.filter(username=username).exists():
        print(f"El usuario '{username}' ya existe.")
        user = User.objects.get(username=username)
        user.set_password(password)
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.save()
        print(f"Contraseña actualizada para '{username}'")
    else:
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            is_staff=True,
            is_superuser=True,
            is_active=True
        )
        print(f"Superusuario '{username}' creado exitosamente")
    
    # Crear o actualizar perfil de Usuario
    usuario, created = Usuario.objects.get_or_create(
        user=user,
        defaults={'role': 'admin'}
    )
    if not created:
        usuario.role = 'admin'
        usuario.save()
        print(f"Perfil de usuario actualizado para '{username}'")
    else:
        print(f"Perfil de usuario creado para '{username}'")
    
    print(f"\nCredenciales:")
    print(f"  Usuario: {username}")
    print(f"  Email: {email}")
    print(f"  Contraseña: {password}")

if __name__ == '__main__':
    print("=" * 60)
    print("Creando superusuario...")
    print("=" * 60)
    create_superuser()
    print("=" * 60)

