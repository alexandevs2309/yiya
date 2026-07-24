import logging
from datetime import datetime
from rest_framework import serializers
from .models import Payment, ECFDocument, NCFSequence
from .utils.rnc import validar_rnc

logger = logging.getLogger(__name__)


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ['id', 'order', 'method', 'subtotal', 'itbis', 'propina',
                  'total', 'cash_received', 'change_given', 'processed_by', 'items_json',
                  'employee', 'deduct_from_payroll', 'discount_amount', 'discount_reason',
                  'manual_tip', 'created_at']
        read_only_fields = ['processed_by']

    def validate(self, data):
        subtotal = data.get('subtotal')
        itbis = data.get('itbis')
        propina = data.get('propina')
        total = data.get('total')
        discount_amount = data.get('discount_amount', 0) or 0
        manual_tip = data.get('manual_tip', 0) or 0
        if subtotal is not None and itbis is not None and propina is not None and total is not None:
            from decimal import Decimal, ROUND_HALF_UP
            from .utils.tax_config import get_tax_rates
            rates = get_tax_rates()
            expected_itbis = (subtotal * rates['itbis_rate']).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            expected_propina = (subtotal * rates['tip_rate']).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            expected_total = subtotal + expected_itbis + expected_propina - discount_amount + manual_tip
            tolerance = Decimal('0.05')
            if abs(itbis - expected_itbis) > tolerance or abs(propina - expected_propina) > tolerance or abs(total - expected_total) > tolerance:
                logger.warning('Recalculando ITBIS/propina/total — frontend envió valores inconsistentes')
            data['itbis'] = expected_itbis
            data['propina'] = expected_propina
            data['total'] = expected_total
        return data

    def create(self, validated_data):
        from django.db import transaction
        from decimal import Decimal
        from apps.pos.models import Order
        from apps.core.models import AuditLog

        request = self.context.get('request')
        order = validated_data['order']

        if order.status in ('paid', 'cancelled'):
            raise serializers.ValidationError({'order': 'La orden ya está cerrada o cancelada.'})

        if request and request.user.is_authenticated:
            validated_data['processed_by'] = request.user

        with transaction.atomic():
            payment = Payment.objects.create(**validated_data)

            # Sumar todos los pagos asociados a esta orden
            existing_payments_total = sum(p.total for p in order.payments.all())

            # Calcular el total de la orden basándonos en los ítems activos (no cancelados)
            active_items = order.items.exclude(status='cancelled')
            order_subtotal = sum(item.price * item.quantity for item in active_items)
            from .utils.tax_config import get_tax_rates
            rates = get_tax_rates()
            itbis_part = order_subtotal * rates['itbis_rate']
            tip_part = order_subtotal * rates['tip_rate'] if rates['enable_tip'] else Decimal('0')
            order_total = order_subtotal + itbis_part + tip_part

            # Si el total acumulado cubre el costo de la orden, la cerramos
            if existing_payments_total >= (order_total - Decimal('0.05')):
                order.status = 'paid'
                order.save(update_fields=['status'])
                if order.table:
                    order.table.status = 'available'
                    order.table.save(update_fields=['status'])

                try:
                    from apps.inventory.utils.stock_helper import deduct_order_stock
                    deduct_order_stock(order)
                except Exception as e:
                    logger.warning(f'No se pudo descontar stock de inventario para orden {order.id}: {e}')

            if request and request.user.is_authenticated:
                AuditLog.objects.create(
                    user=request.user,
                    action='payment',
                    model_name='Payment',
                    object_id=str(payment.id),
                    description=f'Pago registrado: Mesa {order.table.number if order.table else "Para llevar"} — {payment.get_method_display()} ${float(payment.total):.2f}',
                )

            try:
                from django.conf import settings
                if getattr(settings, 'USE_REAL_ECF', False):
                    from .utils.ecf_engine_client import send_ecf, consultar_estado, ECFEngineError
                    from .utils.ecf_engine_config import NCF_TYPE_TO_TIPO
                    from .utils.ecf import construir_datos_ecf
                    from .models import ECFDocument as ECFDoc

                    datos = construir_datos_ecf(payment)
                    doc = ECFDoc.objects.create(
                        payment=payment,
                        ncf='',
                        ncf_type=datos['ncf_type'],
                        rnc_cliente=datos['rnc_cliente'],
                        razon_social_cliente=datos['razon_social'],
                        json_payload=datos['payload'],
                        status='pending',
                    )
                    motor_doc_id = None
                    try:
                        result = send_ecf(doc)
                        doc.status = 'sent'
                        doc.ncf = result.get('encf', doc.ncf)
                        doc.xml_content = result.get('raw', {}).get('xml', '')
                        doc.alanube_id = result.get('track_id', '')
                        doc.sent_at = datetime.now()
                        motor_doc_id = result.get('raw', {}).get('id')
                        doc.save(update_fields=['status', 'ncf', 'xml_content', 'alanube_id', 'sent_at'])
                    except ECFEngineError as e:
                        doc.status = 'failed'
                        doc.last_error = str(e)
                        doc.attempts += 1
                        doc.save(update_fields=['status', 'last_error', 'attempts'])
                        logger.warning('Motor e-CF falló para pago %s: %s', payment.id.hex[:8], e)

                    if motor_doc_id and doc.status == 'sent':
                        try:
                            consulta = consultar_estado(motor_doc_id, result.get('motor_token', ''))
                            dgii_estado = consulta.get('estado', '').lower()
                            if 'aceptado' in dgii_estado:
                                doc.status = 'accepted'
                                doc.ncf = consulta.get('encf', doc.ncf)
                                doc.save(update_fields=['status', 'ncf'])
                            elif 'rechazado' in dgii_estado:
                                doc.status = 'rejected'
                                doc.last_error = f'DGII rechazó: {dgii_estado}'
                                doc.save(update_fields=['status', 'last_error'])
                            else:
                                doc.needs_pending_ticket = True
                                doc.save(update_fields=['needs_pending_ticket'])
                        except ECFEngineError:
                            doc.needs_pending_ticket = True
                            doc.save(update_fields=['needs_pending_ticket'])
                else:
                    from .utils.ecf import generar_ecf
                    generar_ecf(payment)
            except Exception as e:
                logger.warning(f'No se pudo generar e-CF automático para pago {payment.id.hex[:8]}: {e}')

            try:
                from apps.printing.utils import create_payment_print_job
                create_payment_print_job(payment)
            except Exception as e:
                logger.warning(f'No se pudo crear trabajo de impresión para pago {payment.id.hex[:8]}: {e}')

        return payment


class NCFSequenceSerializer(serializers.ModelSerializer):
    next_ncf = serializers.SerializerMethodField()

    class Meta:
        model = NCFSequence
        fields = ['id', 'ncf_type', 'prefix', 'current_sequence', 'next_ncf',
                  'valid_from', 'valid_to', 'is_active']
        read_only_fields = ['current_sequence', 'next_ncf']

    def get_next_ncf(self, obj):
        return str(obj)


class ECFDocumentSerializer(serializers.ModelSerializer):
    order_id = serializers.SerializerMethodField()
    table_number = serializers.SerializerMethodField()
    total = serializers.SerializerMethodField()

    class Meta:
        model = ECFDocument
        fields = ['id', 'payment', 'order_id', 'table_number', 'ncf', 'ncf_type',
                  'rnc_cliente', 'razon_social_cliente', 'status', 'attempts',
                  'last_error', 'total', 'created_at', 'sent_at', 'needs_pending_ticket']
        read_only_fields = ['status', 'attempts', 'last_error', 'created_at', 'sent_at', 'needs_pending_ticket']

    def get_order_id(self, obj):
        return str(obj.payment.order_id)

    def get_table_number(self, obj):
        t = obj.payment.order.table
        return t.number if t else None

    def get_total(self, obj):
        return float(obj.payment.total)


class ECFDocumentCreateSerializer(serializers.Serializer):
    rnc_cliente = serializers.CharField(max_length=11, required=False, default='')
    razon_social_cliente = serializers.CharField(max_length=150, required=False, default='')
    ncf_type = serializers.ChoiceField(choices=NCFSequence.NCF_TYPES, default='B01')

    def validate_rnc_cliente(self, value):
        if value and not validar_rnc(value):
            raise serializers.ValidationError('RNC inválido')
        return value
