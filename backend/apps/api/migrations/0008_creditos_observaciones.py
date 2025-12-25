from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('api', '0007_update_used_condition'),
    ]

    operations = [
        migrations.AddField(
            model_name='creditos',
            name='observaciones',
            field=models.TextField(null=True, blank=True),
        ),
    ]
