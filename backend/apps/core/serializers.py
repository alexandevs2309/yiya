from rest_framework import serializers
from .models import User, Customer, AuditLog, EmployeeShift, PayrollPayment, BusinessConfig, TaxConfig


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'phone', 'hourly_rate', 'commission_pct', 'is_active', 'avatar']
        read_only_fields = ['id']


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'phone', 'hourly_rate', 'commission_pct', 'password', 'is_active', 'avatar']

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=6)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'phone', 'hourly_rate', 'commission_pct', 'password', 'is_active', 'avatar']

    def update(self, instance, validated_data):
        print("VALIDATED DATA:", validated_data)
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = ['id', 'user', 'user_name', 'action', 'model_name', 'object_id', 'description', 'created_at']
        read_only_fields = fields

    def get_user_name(self, obj):
        return str(obj.user) if obj.user else '—'


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ['id', 'rnc', 'business_name', 'commercial_name', 'phone', 'email', 'address', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class EmployeeShiftSerializer(serializers.ModelSerializer):
    user_name = serializers.ReadOnlyField(source='user.username')
    class Meta:
        model = EmployeeShift
        fields = ['id', 'user', 'user_name', 'clock_in', 'clock_out', 'active']


class PayrollPaymentSerializer(serializers.ModelSerializer):
    user_name = serializers.ReadOnlyField(source='user.username')
    class Meta:
        model = PayrollPayment
        fields = ['id', 'user', 'user_name', 'period_start', 'period_end', 'wages_earned',
                  'commissions_earned', 'tips_earned', 'deductions', 'net_pay', 'status', 'created_at']


class BusinessConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessConfig
        fields = ['business_name', 'rnc', 'address', 'phone', 'email', 'logo', 'updated_at']


class TaxConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaxConfig
        fields = ['itbis_rate', 'tip_rate', 'enable_tip', 'updated_at']
