from rest_framework import serializers
from .models import PrinterConfig, PrintJob


class PrinterConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrinterConfig
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']


class PrintJobSerializer(serializers.ModelSerializer):
    printer_name = serializers.SerializerMethodField()
    order_number = serializers.SerializerMethodField()
    table_number = serializers.SerializerMethodField()

    class Meta:
        model = PrintJob
        fields = '__all__'
        read_only_fields = ['status', 'retry_count', 'error_message', 'created_at', 'printed_at']

    def get_printer_name(self, obj):
        return obj.printer.name if obj.printer else 'Impresora por defecto'

    def get_order_number(self, obj):
        return str(obj.order.id.hex[:8]) if obj.order else '—'

    def get_table_number(self, obj):
        return obj.order.table.number if obj.order and obj.order.table else '—'


class PrintJobCreateSerializer(serializers.Serializer):
    type = serializers.ChoiceField(choices=['receipt', 'kitchen'])
    payment_id = serializers.UUIDField(required=False)
    order_id = serializers.UUIDField(required=False)
    printer_id = serializers.UUIDField(required=False)
    copies = serializers.IntegerField(default=1, min_value=1, max_value=10)

    def validate(self, data):
        if not data.get('payment_id') and not data.get('order_id'):
            raise serializers.ValidationError('Debe proporcionar payment_id o order_id')
        return data


class PendingJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrintJob
        fields = ['id', 'type', 'data', 'copies', 'printer_id', 'created_at']
