from rest_framework import serializers
from .models import Category, MenuItem


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = "__all__"


class MenuItemSerializer(serializers.ModelSerializer):
    effective_price = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True
    )

    class Meta:
        model = MenuItem
        fields = "__all__"


class MenuItemListSerializer(serializers.ModelSerializer):
    effective_price = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True
    )

    class Meta:
        model = MenuItem
        fields = [
            "id", "category", "name", "description",
            "price_base", "price_today", "effective_price",
            "image", "available_today", "is_platillo_dia",
            "modifiers_available", "sort_order",
        ]
