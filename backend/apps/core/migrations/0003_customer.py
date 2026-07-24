# Generated manually for Customer model

import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_auditlog'),
    ]

    operations = [
        migrations.CreateModel(
            name='Customer',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('rnc', models.CharField(max_length=11, unique=True, verbose_name='RNC/Cédula')),
                ('business_name', models.CharField(max_length=200, verbose_name='Razón social')),
                ('commercial_name', models.CharField(blank=True, max_length=200, verbose_name='Nombre comercial')),
                ('phone', models.CharField(blank=True, max_length=15)),
                ('email', models.EmailField(blank=True, max_length=254)),
                ('address', models.TextField(blank=True)),
            ],
            options={
                'verbose_name': 'Cliente',
                'verbose_name_plural': 'Clientes',
                'ordering': ['business_name'],
            },
        ),
    ]
