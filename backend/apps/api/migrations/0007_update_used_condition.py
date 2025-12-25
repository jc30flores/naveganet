from django.db import migrations, models


def forwards(apps, schema_editor):
    Productos = apps.get_model('api', 'Productos')
    mapping = {
        'muy_bueno': 'bueno',
        'bueno': 'bueno',
        'como_nuevo': 'con_detalle',
    }
    for old, new in mapping.items():
        Productos.objects.filter(estado_usado=old).update(estado_usado=new)


def backwards(apps, schema_editor):
    Productos = apps.get_model('api', 'Productos')
    mapping = {
        'bueno': 'muy_bueno',
        'con_detalle': 'como_nuevo',
    }
    for new, old in mapping.items():
        Productos.objects.filter(estado_usado=new).update(estado_usado=old)


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0006_alter_detalleventa_producto_and_more'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
        migrations.AlterField(
            model_name='productos',
            name='estado_usado',
            field=models.CharField(
                max_length=20,
                choices=[('bueno', 'Bueno'), ('con_detalle', 'Con detalle')],
                null=True,
                blank=True,
                db_index=True,
            ),
        ),
    ]
