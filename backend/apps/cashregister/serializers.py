from decimal import Decimal
from rest_framework import serializers
from .models import CashRegister, CashMovement


class CashMovementSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = CashMovement
        fields = ['id', 'register', 'type', 'amount', 'reference', 'description', 'created_by', 'created_by_name', 'created_at']
        read_only_fields = ['id', 'created_at', 'created_by_name']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return ''


class CashRegisterListSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    movement_count = serializers.SerializerMethodField()

    class Meta:
        model = CashRegister
        fields = [
            'id', 'user', 'user_name', 'opened_at', 'closed_at',
            'opening_balance', 'closing_balance', 'expected_cash',
            'actual_cash', 'difference', 'status', 'notes',
            'movement_count', 'created_at',
        ]
        read_only_fields = [
            'id', 'user', 'opened_at', 'closed_at',
            'closing_balance', 'expected_cash', 'actual_cash',
            'difference', 'status', 'movement_count',
        ]

    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.username

    def get_movement_count(self, obj):
        return obj.movements.count()


class CashRegisterDetailSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    movements = CashMovementSerializer(many=True, read_only=True)

    class Meta:
        model = CashRegister
        fields = '__all__'
        read_only_fields = [
            'id', 'user', 'opened_at', 'closed_at',
            'closing_balance', 'expected_cash', 'actual_cash',
            'difference', 'status',
        ]

    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.username


class OpenRegisterSerializer(serializers.Serializer):
    opening_balance = serializers.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))


class CloseRegisterSerializer(serializers.Serializer):
    actual_cash = serializers.DecimalField(max_digits=10, decimal_places=2)
    notes = serializers.CharField(required=False, allow_blank=True, default='')


class CashMovementCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CashMovement
        fields = ['type', 'amount', 'reference', 'description']

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('El monto debe ser positivo.')
        return value
