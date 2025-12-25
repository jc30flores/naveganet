from django.db import migrations


def _has_unaccent_wrapper(connection) -> bool:
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT EXISTS("
                "SELECT 1 FROM pg_proc "
                "WHERE oid = 'public.unaccent_immutable(text)'::regprocedure)"
            )
            row = cursor.fetchone()
            return bool(row[0]) if row else False
    except Exception:
        return False


def create_indexes(apps, schema_editor):
    connection = schema_editor.connection
    has_unaccent_wrapper = _has_unaccent_wrapper(connection)

    statements = []
    if has_unaccent_wrapper:
        statements.extend(
            [
                "DROP INDEX CONCURRENTLY IF EXISTS ix_clientes_name_lower;",
                "DROP INDEX CONCURRENTLY IF EXISTS ix_productos_code_lower;",
                "DROP INDEX CONCURRENTLY IF EXISTS ix_productos_name_lower;",
                "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_clientes_name_unaccent "
                "ON clientes (lower(public.unaccent_immutable(nombre)));",
                "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_productos_code_unaccent "
                "ON productos (lower(public.unaccent_immutable(codigo)));",
                "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_productos_name_unaccent "
                "ON productos (lower(public.unaccent_immutable(nombre)));",
            ]
        )
    else:
        statements.extend(
            [
                "DROP INDEX CONCURRENTLY IF EXISTS ix_clientes_name_unaccent;",
                "DROP INDEX CONCURRENTLY IF EXISTS ix_productos_code_unaccent;",
                "DROP INDEX CONCURRENTLY IF EXISTS ix_productos_name_unaccent;",
                "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_clientes_name_lower "
                "ON clientes (lower(nombre));",
                "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_productos_code_lower "
                "ON productos (lower(codigo));",
                "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_productos_name_lower "
                "ON productos (lower(nombre));",
            ]
        )

    with connection.cursor() as cursor:
        for statement in statements:
            cursor.execute(statement)


class Migration(migrations.Migration):

    atomic = False

    dependencies = [
        ("api", "0013_unaccent_wrapper"),
    ]

    operations = [
        migrations.RunPython(create_indexes, migrations.RunPython.noop),
    ]
