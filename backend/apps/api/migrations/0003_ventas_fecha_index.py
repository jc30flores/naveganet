from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('api', '0002_detalleventa_override'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='ventas',
            index=models.Index(fields=['fecha'], name='ventas_fecha_idx'),
        ),
    ]
