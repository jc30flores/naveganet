from django.db import migrations


def _has_unaccent(connection) -> bool:
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'unaccent')"
            )
            row = cursor.fetchone()
            return bool(row[0]) if row else False
    except Exception:
        return False


def create_wrapper(apps, schema_editor):
    connection = schema_editor.connection
    try:
        with connection.cursor() as cursor:
            cursor.execute("CREATE EXTENSION IF NOT EXISTS unaccent;")
    except Exception:
        # If we cannot create the extension we also cannot create the wrapper.
        return

    if not _has_unaccent(connection):
        return

    statement = """
    CREATE OR REPLACE FUNCTION public.unaccent_immutable(text)
    RETURNS text
    LANGUAGE sql
    IMMUTABLE
    PARALLEL SAFE
    AS $$ SELECT public.unaccent('public.unaccent', $1) $$;
    """
    with connection.cursor() as cursor:
        cursor.execute(statement)


def drop_wrapper(apps, schema_editor):
    statement = "DROP FUNCTION IF EXISTS public.unaccent_immutable(text);"
    with schema_editor.connection.cursor() as cursor:
        cursor.execute(statement)


class Migration(migrations.Migration):

    atomic = False

    dependencies = [
        ("api", "0012_enable_unaccent_extension"),
    ]

    operations = [
        migrations.RunPython(create_wrapper, drop_wrapper),
    ]
