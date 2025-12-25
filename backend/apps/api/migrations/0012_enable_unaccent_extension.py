from django.db import migrations


def create_unaccent_extension(apps, schema_editor):
    connection = schema_editor.connection
    try:
        with connection.cursor() as cursor:
            cursor.execute("CREATE EXTENSION IF NOT EXISTS unaccent;")
    except Exception:
        # If the database role lacks permission, ignore the error so the
        # application can fall back to accent-sensitive search.
        pass


class Migration(migrations.Migration):

    atomic = False

    dependencies = [
        ("api", "0011_search_indexes"),
    ]

    operations = [
        migrations.RunPython(create_unaccent_extension, migrations.RunPython.noop),
    ]
