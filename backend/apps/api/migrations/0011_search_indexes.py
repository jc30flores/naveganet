from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0010_detalleventa_devuelto_devoluciones_ingreso_afectado_and_more"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="ventas",
            index=models.Index(fields=["documento_numero"], name="ventas_numero_idx"),
        ),
        migrations.AddIndex(
            model_name="ventas",
            index=models.Index(fields=["cliente"], name="ventas_cliente_idx"),
        ),
        migrations.AddIndex(
            model_name="detalleventa",
            index=models.Index(fields=["venta"], name="detalleventa_venta_idx"),
        ),
        migrations.AddIndex(
            model_name="detalleventa",
            index=models.Index(fields=["producto"], name="detalleventa_producto_idx"),
        ),
        migrations.AddIndex(
            model_name="clientes",
            index=models.Index(fields=["nit"], name="clientes_nit_idx"),
        ),
        migrations.AddIndex(
            model_name="clientes",
            index=models.Index(fields=["telefono"], name="clientes_telefono_idx"),
        ),
    ]
