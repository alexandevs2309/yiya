from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('billing', '0011_payment_discount_amount_payment_discount_reason_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='ecfdocument',
            name='needs_pending_ticket',
            field=models.BooleanField(default=False, help_text='DGII no confirmó a tiempo — ticket debe mostrar "Comprobante en proceso"'),
        ),
    ]
