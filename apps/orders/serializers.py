from django.utils import timezone
from rest_framework import serializers
from .models import Order, OrderItem, PaymentMethod


class OrderItemSerializer(serializers.ModelSerializer):
    total_price = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True
    )

    class Meta:
        model = OrderItem
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class OrderItemCreateSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            "id", "menu_item", "name", "unit_price",
            "quantity", "modifiers", "notes",
        ]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    table_number = serializers.IntegerField(source="table.number", read_only=True)
    waitress_name = serializers.SerializerMethodField()
    id_short = serializers.CharField(read_only=True)
    ecf_document = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at", "synced_at", "closed_at"]

    def get_ecf_document(self, obj):
        from apps.billing.serializers import ECFDocumentSerializer
        try:
            if hasattr(obj, "ecf_document") and obj.ecf_document:
                return ECFDocumentSerializer(obj.ecf_document).data
        except Exception:
            pass
        return None

    def get_waitress_name(self, obj):
        if obj.waitress:
            return obj.waitress.get_full_name() or obj.waitress.username
        return None


class OrderCreateSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(read_only=True)
    status = serializers.CharField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    items = OrderItemCreateSerializer(many=True)

    class Meta:
        model = Order
        fields = [
            "id", "table", "waitress", "diners",
            "offline_id", "status", "created_at", "items",
        ]

    def create(self, validated_data):
        items_data = validated_data.pop("items")
        order = Order.objects.create(**validated_data)
        table = order.table
        table.status = "occupied"
        table.opened_at = timezone.now()
        table.save(update_fields=["status", "opened_at"])
        for item_data in items_data:
            OrderItem.objects.create(order=order, **item_data)
        return order


class CloseOrderSerializer(serializers.Serializer):
    payment_method = serializers.ChoiceField(choices=PaymentMethod.choices)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2)
    itbis = serializers.DecimalField(max_digits=10, decimal_places=2)
    total = serializers.DecimalField(max_digits=10, decimal_places=2)
    tip = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)
    amount_received = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, default=None
    )
    rnc = serializers.CharField(max_length=11, required=False, allow_blank=True)
    whatsapp = serializers.CharField(max_length=20, required=False, allow_blank=True)


class SubmitToKitchenSerializer(serializers.Serializer):
    item_ids = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=False,
    )


class MarkItemReadySerializer(serializers.Serializer):
    item_id = serializers.UUIDField()
