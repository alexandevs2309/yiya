from rest_framework import serializers
from .models import ECFDocument


class ECFDocumentSerializer(serializers.ModelSerializer):
    order_id_short = serializers.CharField(source="order.id_short", read_only=True)
    table_number = serializers.IntegerField(source="order.table.number", read_only=True)
    order_total = serializers.DecimalField(source="order.total", max_digits=10, decimal_places=2, read_only=True)
    order_subtotal = serializers.DecimalField(source="order.subtotal", max_digits=10, decimal_places=2, read_only=True)
    order_itbis = serializers.DecimalField(source="order.itbis", max_digits=10, decimal_places=2, read_only=True)
    order_tip = serializers.DecimalField(source="order.tip", max_digits=10, decimal_places=2, read_only=True)
    order_payment_method = serializers.CharField(source="order.payment_method", read_only=True)
    order_amount_received = serializers.DecimalField(source="order.amount_received", max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = ECFDocument
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]

