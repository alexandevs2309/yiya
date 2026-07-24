from rest_framework import serializers
from .models import InventoryItem, PurchaseOrder, MenuItemRecipe


class InventoryItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryItem
        fields = ['id', 'name', 'category', 'unit', 'stock', 'min_stock', 'cost_per_unit', 'is_low', 'total_value']


class PurchaseOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseOrder
        fields = ['id', 'supplier', 'status', 'notes', 'created_at', 'updated_at']


class MenuItemRecipeSerializer(serializers.ModelSerializer):
    inventory_item_name = serializers.ReadOnlyField(source='inventory_item.name')
    inventory_item_unit = serializers.ReadOnlyField(source='inventory_item.unit')

    class Meta:
        model = MenuItemRecipe
        fields = ['id', 'menu_item', 'inventory_item', 'inventory_item_name', 'inventory_item_unit', 'quantity']
