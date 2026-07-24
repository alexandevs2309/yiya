from rest_framework import serializers
from .models import MenuCategory, MenuItem, ModifierGroup, ModifierOption, Table, Order, OrderItem


class ModifierOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ModifierOption
        fields = ['id', 'name', 'price_adjustment']


class ModifierGroupSerializer(serializers.ModelSerializer):
    options = ModifierOptionSerializer(many=True, read_only=True)

    class Meta:
        model = ModifierGroup
        fields = ['id', 'name', 'is_required', 'max_selections', 'options']


class MenuItemSerializer(serializers.ModelSerializer):
    modifier_groups = ModifierGroupSerializer(many=True, read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    effective_price = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True
    )
    image = serializers.SerializerMethodField()

    class Meta:
        model = MenuItem
        fields = ['id', 'name', 'category', 'category_name', 'price', 'price_today',
                  'effective_price', 'itbis_type', 'preparation_time', 'is_available',
                  'has_modifiers', 'modifier_groups', 'image']

    def get_image(self, obj):
        if obj.image:
            return obj.image.url
        return None


class MenuCategorySerializer(serializers.ModelSerializer):
    items = MenuItemSerializer(many=True, read_only=True)

    class Meta:
        model = MenuCategory
        fields = ['id', 'name', 'order', 'items']


class TableSerializer(serializers.ModelSerializer):
    class Meta:
        model = Table
        fields = ['id', 'number', 'section', 'capacity', 'status', 'token', 'x', 'y']


class OrderItemSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='menu_item.category.name', read_only=True)
    preparation_time = serializers.IntegerField(source='menu_item.preparation_time', read_only=True)

    class Meta:
        model = OrderItem
        fields = ['id', 'menu_item', 'name', 'quantity', 'price', 'seat', 'status', 'modifiers_json', 'category_name', 'preparation_time']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    table_number = serializers.SerializerMethodField()
    waiter_name = serializers.CharField(source='waiter.get_full_name', read_only=True)
    payments = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = ['id', 'table', 'table_number', 'waiter', 'waiter_name', 'status',
                  'order_type', 'delivery_address', 'delivery_fee', 'customer_phone',
                  'guests', 'notes', 'items', 'payments', 'created_at', 'updated_at']

    def get_table_number(self, obj):
        return obj.table.number if obj.table else None

    def get_payments(self, obj):
        return [
            {
                'id': str(p.id),
                'total': float(p.total),
                'subtotal': float(p.subtotal),
                'itbis': float(p.itbis),
                'propina': float(p.propina),
                'method': p.method,
                'items_json': p.items_json,
                'created_at': p.created_at.isoformat()
            }
            for p in obj.payments.all()
        ]
