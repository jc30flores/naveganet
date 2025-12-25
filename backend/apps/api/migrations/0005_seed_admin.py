from django.db import migrations
from django.contrib.auth.hashers import make_password


def seed_admin(apps, schema_editor):
    User = apps.get_model("auth", "User")
    Usuario = apps.get_model("api", "Usuario")
    user, _ = User.objects.update_or_create(
        username="admin",
        defaults={
            "email": "admin@colosso.local",
            "password": make_password("ColossoAdmin#2025"),
            "is_staff": True,
            "is_superuser": True,
            "is_active": True,
        },
    )
    Usuario.objects.update_or_create(user=user, defaults={"role": "admin"})


def unseed_admin(apps, schema_editor):
    User = apps.get_model("auth", "User")
    Usuario = apps.get_model("api", "Usuario")
    try:
        user = User.objects.get(username="admin")
        Usuario.objects.filter(user=user).delete()
        user.delete()
    except User.DoesNotExist:
        pass


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0004_usuario"),
    ]

    operations = [
        migrations.RunPython(seed_admin, unseed_admin),
    ]
