from django.db import migrations


class Migration(migrations.Migration):

    atomic = False

    dependencies = [
        ("api", "0008_creditos_observaciones"),
        ("api", "0001_initial"),
    ]

    operations = [
        migrations.RunSQL(
            sql="CREATE EXTENSION IF NOT EXISTS pg_trgm;",
            reverse_sql="",
        ),
        migrations.RunSQL(
            sql="CREATE EXTENSION IF NOT EXISTS unaccent;",
            reverse_sql="",
        ),
        migrations.RunSQL(
            sql="CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prod_nombre_trgm ON public.productos USING gin (nombre gin_trgm_ops);",
            reverse_sql="DROP INDEX CONCURRENTLY IF EXISTS idx_prod_nombre_trgm;",
        ),
        migrations.RunSQL(
            sql="CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prod_codigo ON public.productos(codigo);",
            reverse_sql="DROP INDEX CONCURRENTLY IF EXISTS idx_prod_codigo;",
        ),
        migrations.RunSQL(
            sql="CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prod_categoria ON public.productos(categoria_id);",
            reverse_sql="DROP INDEX CONCURRENTLY IF EXISTS idx_prod_categoria;",
        ),
        migrations.RunSQL(
            sql="CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prod_updated_at ON public.productos USING btree (updated_at DESC);",
            reverse_sql="DROP INDEX CONCURRENTLY IF EXISTS idx_prod_updated_at;",
        ),
        migrations.RunSQL(
            sql="CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prod_nombre_unaccent_trgm ON public.productos USING gin ((unaccent(lower(nombre))) gin_trgm_ops);",
            reverse_sql="DROP INDEX CONCURRENTLY IF EXISTS idx_prod_nombre_unaccent_trgm;",
        ),
        migrations.RunSQL(
            sql="CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pagos_credito_credito_fecha ON public.pagos_credito(credito_id, fecha);",
            reverse_sql="DROP INDEX CONCURRENTLY IF EXISTS idx_pagos_credito_credito_fecha;",
        ),
    ]
