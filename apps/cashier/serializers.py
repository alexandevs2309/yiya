from rest_framework import serializers
from .models import CashRegister


class CashRegisterSerializer(serializers.ModelSerializer):
    opened_by_name = serializers.SerializerMethodField()
    closed_by_name = serializers.SerializerMethodField()
    current_cash = serializers.SerializerMethodField()

    class Meta:
        model = CashRegister
        fields = "__all__"
        read_only_fields = [
            "id", "created_at", "updated_at",
            "opened_at", "closed_at", "opened_by", "closed_by",
            "expected_cash", "actual_cash", "difference", "status"
        ]

    def get_opened_by_name(self, obj):
        if obj.opened_by:
            return obj.opened_by.get_full_name() or obj.opened_by.username
        return None

    def get_closed_by_name(self, obj):
        if obj.closed_by:
            return obj.closed_by.get_full_name() or obj.closed_by.username
        return None

    def get_current_cash(self, obj):
        from apps.orders.models import Order
        from django.db.models import Sum
        
        if obj.status == "closed":
            return obj.actual_cash or obj.expected_cash or obj.initial_amount
            
        cash_sales = Order.objects.filter(
            closed_at__gte=obj.opened_at,
            status="paid",
            payment_method="cash",
        ).aggregate(total=Sum("total"))["total"] or 0

        mixed_cash_sales = Order.objects.filter(
            closed_at__gte=obj.opened_at,
            status="paid",
            payment_method="mixed",
        ).aggregate(total=Sum("amount_received"))["total"] or 0
        
        # Ensure we return a float or decimal
        return float(obj.initial_amount) + float(cash_sales) + float(mixed_cash_sales)


class CashCloseSerializer(serializers.Serializer):
    actual_cash = serializers.DecimalField(max_digits=10, decimal_places=2)
    notes = serializers.CharField(required=False, allow_blank=True)

