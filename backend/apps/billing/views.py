import logging
from datetime import date, timezone
from rest_framework import viewsets, permissions, status, mixins
from core.permissions import IsCashierOrAdmin, IsAdmin
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from core.export_mixin import CSVExportMixin
from .models import Payment, ECFDocument, NCFSequence
from .serializers import (
    PaymentSerializer, ECFDocumentSerializer,
    ECFDocumentCreateSerializer, NCFSequenceSerializer,
)
from .utils.ecf import generar_ecf
from .utils.rnc import validar_rnc
from .utils.fiscal_reports import generate_607_report, generate_606_report

logger = logging.getLogger(__name__)


class PaymentViewSet(CSVExportMixin,
                     mixins.CreateModelMixin,
                     mixins.RetrieveModelMixin,
                     mixins.ListModelMixin,
                     viewsets.GenericViewSet):
    queryset = Payment.objects.select_related('order', 'processed_by').all()
    serializer_class = PaymentSerializer
    permission_classes = [IsCashierOrAdmin]
    filterset_fields = ['method', 'order']
    csv_filename = 'pagos.csv'
    csv_fields = [
        ('id', 'ID'),
        ('order__id', 'Orden'),
        ('method', 'Método'),
        ('subtotal', 'Subtotal'),
        ('itbis', 'ITBIS'),
        ('propina', 'Propina'),
        ('total', 'Total'),
        ('discount_amount', 'Descuento'),
        ('manual_tip', 'Propina Manual'),
        ('processed_by__username', 'Procesado por'),
        ('created_at', 'Fecha'),
    ]

    @action(detail=False, methods=['get'])
    def exportar(self, request):
        return self.export_csv(request)

    @action(detail=True, methods=['post'])
    def generate_ecf(self, request, pk=None):
        payment = self.get_object()
        serializer = ECFDocumentCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        try:
            with transaction.atomic():
                ncf_type = serializer.validated_data.get('ncf_type', 'B01')
                doc = generar_ecf(
                    payment,
                    rnc_cliente=serializer.validated_data.get('rnc_cliente', ''),
                    razon_social=serializer.validated_data.get('razon_social_cliente', ''),
                    ncf_type=ncf_type,
                )
                if ncf_type == 'B04':
                    order = payment.order
                    order.status = 'cancelled'
                    order.save(update_fields=['status'])
            return Response(ECFDocumentSerializer(doc).data, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def print_receipt(self, request, pk=None):
        payment = self.get_object()
        order = payment.order
        ecf = payment.ecf_documents.first()
        from django.conf import settings
        
        items = []
        if payment.items_json:
            for i in payment.items_json:
                items.append({
                    'cantidad': int(i['cantidad']),
                    'nombre': i['nombre'],
                    'precio': float(i['precio']),
                    'total': float(i['precio'] * i['cantidad']),
                    'modificadores': i.get('modificadores') or [],
                })
        else:
            for i in order.items.exclude(status='cancelled').all():
                items.append({
                    'cantidad': i.quantity,
                    'nombre': i.name,
                    'precio': float(i.price),
                    'total': float(i.price * i.quantity),
                    'modificadores': [m['name'] for m in (i.modifiers_json or [])],
                })
                
        return Response({
            'restaurant': settings.RESTAURANT_NAME,
            'rnc': settings.DGII_RNC,
            'direccion': 'Samaná, República Dominicana',
            'ncf': ecf.ncf if (ecf and ecf.ncf) else '',
            'metodo_pago': payment.get_method_display(),
            'mesa': order.table.number if order.table else '',
            'mesero': order.waiter.get_full_name() or order.waiter.username,
            'fecha': payment.created_at.isoformat(),
            'items': items,
            'subtotal': float(payment.subtotal),
            'itbis': float(payment.itbis),
            'propina': float(payment.propina),
            'total': float(payment.total),
            'efectivo': float(payment.cash_received) if payment.cash_received else None,
            'cambio': float(payment.change_given) if payment.change_given else None,
        })

    @action(detail=True, methods=['post'])
    def print_hardware(self, request, pk=None):
        payment = self.get_object()
        order = payment.order
        try:
            from apps.printing.utils import create_payment_print_job
            create_payment_print_job(payment)
        except Exception as e:
            return Response({'error': f'Falló al encolar impresión: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response({'status': 'ok', 'message': 'Trabajo de impresión encolado'})

    @action(detail=True, methods=['post'])
    def refund(self, request, pk=None):
        payment = self.get_object()
        if payment.voided:
            return Response({'error': 'Este pago ya fue reembolsado.'}, status=status.HTTP_400_BAD_REQUEST)

        reason = request.data.get('reason', 'Reembolso solicitado')
        order = payment.order

        with transaction.atomic():
            from django.utils import timezone
            payment.voided = True
            payment.voided_at = timezone.now()
            payment.void_reason = reason
            payment.voided_by = request.user
            payment.save(update_fields=['voided', 'voided_at', 'void_reason', 'voided_by'])

            try:
                ecf_doc = payment.ecf_documents.filter(ncf_type='B01').first()
                rnc = ecf_doc.rnc_cliente if ecf_doc else ''
                razon = ecf_doc.razon_social_cliente if ecf_doc else ''
                generar_ecf(payment, rnc_cliente=rnc, razon_social=razon, ncf_type='B04')
            except Exception as e:
                logger.warning(f'No se pudo generar e-CF Nota de Crédito: {e}')

            try:
                from apps.inventory.utils.stock_helper import restore_order_stock
                restore_order_stock(order)
            except Exception as e:
                logger.warning(f'No se pudo restaurar stock al reembolsar: {e}')

            from apps.core.models import AuditLog
            AuditLog.objects.create(
                user=request.user,
                action='update',
                model_name='Payment',
                object_id=str(payment.id),
                description=f'Reembolso: Pago {payment.id.hex[:8]} — Mesa {order.table.number if order.table else "Para llevar"} — Motivo: {reason}',
            )

        return Response({'status': 'ok', 'message': 'Reembolso procesado correctamente. Se generó Nota de Crédito.'})


class ECFDocumentViewSet(mixins.RetrieveModelMixin,
                         mixins.ListModelMixin,
                         viewsets.GenericViewSet):
    queryset = ECFDocument.objects.select_related('payment__order__table', 'payment__order__waiter').all()
    serializer_class = ECFDocumentSerializer
    permission_classes = [IsCashierOrAdmin]
    filterset_fields = ['status', 'ncf_type']

    @action(detail=True, methods=['post'])
    def retry(self, request, pk=None):
        doc = self.get_object()
        if doc.status not in ('rejected', 'failed'):
            return Response({'error': 'Solo se pueden reintentar documentos rechazados o fallidos'},
                            status=status.HTTP_400_BAD_REQUEST)
        doc.status = 'pending'
        doc.attempts = 0
        doc.last_error = ''
        doc.sent_at = None
        doc.save(update_fields=['status', 'attempts', 'last_error', 'sent_at'])
        return Response({'status': 'ok'})

    @action(detail=True, methods=['patch'])
    def update_rnc(self, request, pk=None):
        doc = self.get_object()
        rnc = request.data.get('rnc_cliente', '')
        if rnc and not validar_rnc(rnc):
            return Response({'error': 'RNC inválido'}, status=status.HTTP_400_BAD_REQUEST)
        doc.rnc_cliente = rnc
        doc.razon_social_cliente = request.data.get('razon_social_cliente', '')
        doc.save(update_fields=['rnc_cliente', 'razon_social_cliente'])
        return Response(ECFDocumentSerializer(doc).data)

    @action(detail=False, methods=['get'])
    def reporte_607(self, request):
        year = int(request.query_params.get('year', date.today().year))
        month = int(request.query_params.get('month', date.today().month))
        return generate_607_report(year, month)

    @action(detail=False, methods=['get'])
    def reporte_606(self, request):
        year = int(request.query_params.get('year', date.today().year))
        month = int(request.query_params.get('month', date.today().month))
        return generate_606_report(year, month)


class NCFSequenceViewSet(mixins.CreateModelMixin,
                         mixins.RetrieveModelMixin,
                         mixins.ListModelMixin,
                         mixins.UpdateModelMixin,
                         viewsets.GenericViewSet):
    queryset = NCFSequence.objects.all()
    serializer_class = NCFSequenceSerializer
    permission_classes = [IsAdmin]
