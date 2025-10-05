from django.db import migrations, models
from decimal import Decimal


class Migration(migrations.Migration):

    dependencies = [
        ("store", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="supplier",
            name="markup_type",
            field=models.CharField(
                choices=[("fixed", "Fixed"), ("percent", "Percent")],
                default="percent",
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name="supplier",
            name="markup_value",
            field=models.DecimalField(default=Decimal("10.00"), max_digits=8, decimal_places=2),
        ),
    ]

