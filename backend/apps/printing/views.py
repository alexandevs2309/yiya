from rest_framework import viewsets, permissions, status, mixins, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from django.db import transaction
from django.utils import timezone
from .models import PrinterConfig, PrintJob
from .serializers import (
    PrinterConfigSerializer, PrintJobSerializer,
    PrintJobCreateSerializer, PendingJobSerializer,
)


class BridgeTokenPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        token = request.headers.get('X-Bridge-Token', '')
        from django.conf import settings
        expected = getattr(settings, 'PRINT_BRIDGE_TOKEN', '')
        return token == expected


class PrinterConfigViewSet(mixins.CreateModelMixin,
                           mixins.RetrieveModelMixin,
                           mixins.UpdateModelMixin,
                           mixins.DestroyModelMixin,
                           mixins.ListModelMixin,
                           viewsets.GenericViewSet):
    queryset = PrinterConfig.objects.filter(is_active=True)
    serializer_class = PrinterConfigSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()

    @action(detail=True, methods=['post'])
    def test(self, request, pk=None):
        printer = self.get_object()
        job = PrintJob.objects.create(
            type='test',
            data={
                'printer_name': printer.name,
                'type': printer.type,
                'connection': printer.connection_type,
                'ip': printer.ip_address,
                'port': printer.port,
            },
            printer=printer,
        )
        return Response({
            'status': 'pending',
            'job_id': str(job.id),
            'message': 'Trabajo de prueba enviado a la cola de impresión',
        })

    @action(detail=True, methods=['post'])
    def drawer(self, request, pk=None):
        printer = self.get_object()
        is_open = request.data.get('open', True)
        job = PrintJob.objects.create(
            type='drawer',
            data={
                'printer_name': printer.name,
                'connection': printer.connection_type,
                'ip': printer.ip_address,
                'port': printer.port,
                'action': 'open' if is_open else 'close',
                'drawer_kick': True,
            },
            printer=printer,
        )
        from apps.core.models import AuditLog
        AuditLog.objects.create(
            user=request.user,
            action='update',
            model_name='PrinterConfig',
            object_id=str(printer.id),
            description=f'Apertura de gaveta: {printer.name}',
        )
        return Response({
            'status': 'pending',
            'job_id': str(job.id),
            'message': 'Gaveta abierta',
        })


class PrintJobViewSet(mixins.RetrieveModelMixin,
                      mixins.ListModelMixin,
                      viewsets.GenericViewSet):
    queryset = PrintJob.objects.select_related('printer', 'payment', 'order__table').all()
    serializer_class = PrintJobSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['type', 'status']

    @action(detail=False, methods=['get'], permission_classes=[BridgeTokenPermission])
    def pending(self, request):
        self.bridge_endpoint = True
        jobs = PrintJob.objects.filter(status='pending').select_related('printer')[:20]
        serializer = PendingJobSerializer(jobs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def reprint(self, request, pk=None):
        original = self.get_object()
        if not original.data:
            return Response({'error': 'El trabajo original no tiene datos'}, status=status.HTTP_400_BAD_REQUEST)
        new_job = PrintJob.objects.create(
            type=original.type,
            status='pending',
            data=original.data,
            printer=original.printer,
            payment=original.payment,
            order=original.order,
            copies=request.data.get('copies', 1),
        )
        return Response(PrintJobSerializer(new_job).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def open_drawer(self, request):
        printer = PrinterConfig.objects.filter(type='receipt', is_default=True, is_active=True).first()
        if not printer:
            return Response({'error': 'No hay impresora de recibos configurada'}, status=status.HTTP_400_BAD_REQUEST)
        job = PrintJob.objects.create(
            type='drawer',
            data={
                'printer_name': printer.name,
                'connection': printer.connection_type,
                'ip': printer.ip_address,
                'port': printer.port,
                'action': 'open',
                'drawer_kick': True,
            },
            printer=printer,
        )
        return Response({
            'status': 'pending',
            'job_id': str(job.id),
            'message': 'Orden de apertura de gaveta enviada',
        })

    @action(detail=False, methods=['post'], permission_classes=[BridgeTokenPermission])
    def create_from_bridge(self, request):
        serializer = PrintJobCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        from django.apps import apps
        payment = None
        order = None
        if data.get('payment_id'):
            Payment = apps.get_model('billing', 'Payment')
            payment = Payment.objects.filter(id=data['payment_id']).first()
        if data.get('order_id'):
            Order = apps.get_model('pos', 'Order')
            order = Order.objects.filter(id=data['order_id']).first()
        printer = None
        if data.get('printer_id'):
            printer = PrinterConfig.objects.filter(id=data['printer_id']).first()
        if not printer:
            printer = PrinterConfig.objects.filter(type=data['type'], is_default=True, is_active=True).first()
        job = PrintJob.objects.create(
            type=data['type'],
            data={},
            printer=printer,
            payment=payment,
            order=order,
            copies=data['copies'],
        )
        return Response({'id': str(job.id), 'status': 'pending'}, status=status.HTTP_201_CREATED)


class BridgeJobUpdate(generics.GenericAPIView):
    permission_classes = [BridgeTokenPermission]

    def post(self, request, pk=None):
        try:
            job = PrintJob.objects.get(id=pk)
        except PrintJob.DoesNotExist:
            return Response({'error': 'Trabajo no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        new_status = request.data.get('status')
        if new_status not in ('done', 'failed', 'printing'):
            return Response({'error': 'Estado inválido'}, status=status.HTTP_400_BAD_REQUEST)
        job.status = new_status
        if new_status == 'done':
            job.printed_at = timezone.now()
        elif new_status == 'failed':
            job.error_message = request.data.get('error_message', '')
            job.retry_count += 1
            if job.retry_count < job.max_retries:
                job.status = 'pending'
        job.save()
        return Response({'status': 'ok'})


class BridgeStatus(generics.GenericAPIView):
    permission_classes = [BridgeTokenPermission]

    def get(self, request):
        pending = PrintJob.objects.filter(status='pending').count()
        return Response({
            'bridge': 'AURON Print Bridge',
            'version': '1.0',
            'pending_jobs': pending,
            'timestamp': timezone.now().isoformat(),
        })
