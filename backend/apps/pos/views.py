import logging
from rest_framework import viewsets, permissions, status, parsers
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import MenuCategory, MenuItem, Table, Order, OrderItem
from .serializers import (
    MenuCategorySerializer, MenuItemSerializer, TableSerializer,
    OrderSerializer, OrderItemSerializer,
)

logger = logging.getLogger(__name__)

from core.permissions import IsAdmin, IsWaiterCashierOrAdmin, IsCookOrAdmin


class MenuCategoryViewSet(viewsets.ModelViewSet):
    queryset = MenuCategory.objects.prefetch_related('items__modifier_groups__options').all()
    serializer_class = MenuCategorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdmin()]
        return [permissions.IsAuthenticated()]


class MenuItemViewSet(viewsets.ModelViewSet):
    serializer_class = MenuItemSerializer
    filterset_fields = ['category', 'is_available']
    search_fields = ['name']
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = MenuItem.objects.select_related('category').prefetch_related('modifier_groups__options')
        if self.request.query_params.get('include_deleted') == 'true':
            return qs.all_with_deleted()
        return qs.all()

    def perform_destroy(self, instance):
        instance.soft_delete()

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy', 'upload_image', 'soft_delete', 'restore'):
            return [IsAdmin()]
        return [permissions.IsAuthenticated()]

    @action(detail=True, methods=['post'], parser_classes=[parsers.MultiPartParser, parsers.FormParser])
    def upload_image(self, request, pk=None):
        item = self.get_object()
        if 'image' not in request.FILES:
            return Response({'error': 'No se envió ninguna imagen'}, status=status.HTTP_400_BAD_REQUEST)
        item.image = request.FILES['image']
        item.save(update_fields=['image'])
        serializer = self.get_serializer(item)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def lookup_barcode(self, request):
        barcode = request.query_params.get('barcode', '').strip()
        if not barcode:
            return Response({'error': 'Se requiere un código de barras'}, status=status.HTTP_400_BAD_REQUEST)
        item = MenuItem.objects.filter(barcode=barcode, is_available=True).first()
        if not item:
            return Response({'error': 'Producto no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        serializer = self.get_serializer(item)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def soft_delete(self, request, pk=None):
        item = self.get_object()
        item.soft_delete()
        return Response({'status': 'ok', 'message': 'Elemento eliminado'})

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        item = MenuItem.objects.all_with_deleted().filter(pk=pk).first()
        if not item:
            return Response({'error': 'Elemento no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        item.restore()
        return Response({'status': 'ok', 'message': 'Elemento restaurado'})


class TableViewSet(viewsets.ModelViewSet):
    queryset = Table.objects.all()
    serializer_class = TableSerializer
    permission_classes = [IsWaiterCashierOrAdmin]

    @action(detail=False, methods=['post'])
    def takeaway(self, request):
        table, _ = Table.objects.get_or_create(
            number='0',
            defaults={
                'section': 'Para llevar',
                'capacity': 99,
                'status': 'available',
                'x': 0,
                'y': 0,
            },
        )
        guests = request.data.get('guests', 1)
        order_id = request.data.get('id')
        create_kwargs = {'table': table, 'waiter': request.user, 'guests': guests}
        if order_id:
            create_kwargs['id'] = order_id
        order = Order.objects.create(**create_kwargs)
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def open(self, request, pk=None):
        table = self.get_object()
        if table.status != 'available':
            return Response({'error': 'La mesa no está disponible'}, status=status.HTTP_400_BAD_REQUEST)
        guests = request.data.get('guests', 1)
        table.status = 'occupied'
        table.save()
        
        # Permitir id de cliente para sincronización offline
        order_id = request.data.get('id')
        create_kwargs = {'table': table, 'waiter': request.user, 'guests': guests}
        if order_id:
            create_kwargs['id'] = order_id
            
        order = Order.objects.create(**create_kwargs)
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        table = self.get_object()
        table.status = 'available'
        table.save()
        return Response({'status': 'ok'})

    @action(detail=True, methods=['post'])
    def request_bill(self, request, pk=None):
        table = self.get_object()
        if table.status != 'occupied':
            return Response({'error': 'La mesa no está ocupada'}, status=status.HTTP_400_BAD_REQUEST)
        table.status = 'bill'
        table.save()
        return Response({'status': 'ok', 'table_status': 'bill'})

    @action(detail=True, methods=['patch'])
    def move(self, request, pk=None):
        table = self.get_object()
        table.x = float(request.data.get('x', table.x))
        table.y = float(request.data.get('y', table.y))
        table.save(update_fields=['x', 'y'])
        return Response(TableSerializer(table).data)


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.prefetch_related('items').select_related('table', 'waiter').all()
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['status', 'table']

    def get_permissions(self):
        if self.action in ('complete_item', 'recall_item', 'mark_86'):
            return [IsCookOrAdmin()]
        elif self.action in ('add_item', 'update_item', 'void_item', 'send_to_kitchen', 'cancel'):
            return [IsWaiterCashierOrAdmin()]
        return [permissions.IsAuthenticated()]

    @action(detail=True, methods=['post'])
    def add_item(self, request, pk=None):
        order = self.get_object()
        if order.status != 'open':
            return Response({'error': 'La orden no está abierta'}, status=status.HTTP_400_BAD_REQUEST)
        serializer = OrderItemSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Permitir id de cliente para sincronización offline
        item_id = request.data.get('id')
        if item_id:
            serializer.save(order=order, id=item_id)
        else:
            serializer.save(order=order)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def _broadcast_kds(self, order, event_type: str):
        try:
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                'kds',
                {'type': 'kds_message', 'data': {'type': event_type, 'order': OrderSerializer(order).data}},
            )
        except Exception:
            pass

    @action(detail=False, methods=['get'])
    def pending_kds(self, request):
        orders = Order.objects.filter(
            status__in=('in_kitchen',),
        ).prefetch_related('items').select_related('table', 'waiter')[:50]
        return Response(OrderSerializer(orders, many=True).data)

    @action(detail=True, methods=['post'])
    def send_to_kitchen(self, request, pk=None):
        order = self.get_object()
        with transaction.atomic():
            from django.core.exceptions import ValidationError
            from apps.inventory.utils.stock_helper import deduct_order_stock
            try:
                deduct_order_stock(order)
            except ValidationError as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
            pending_items = list(order.items.filter(status='pending'))
            order.items.filter(status='pending').update(status='in_kitchen')
            order.status = 'in_kitchen'
            order.save()
        order.refresh_from_db()
        self._broadcast_kds(order, 'new_order')
        self._broadcast_waiter(order, 'new_order')

        return Response({'status': 'ok', 'sent': order.items.filter(status='in_kitchen').count()})

    @action(detail=True, methods=['post'])
    def complete_item(self, request, pk=None):
        order = self.get_object()
        item_pk = request.data.get('item_pk')
        if not item_pk:
            return Response({'error': 'item_pk requerido'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            item = order.items.get(pk=item_pk)
        except OrderItem.DoesNotExist:
            return Response({'error': 'Item no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        item.status = 'ready'
        item.save(update_fields=['status'])

        # Check if all items in the order are ready or cancelled
        order.refresh_from_db()
        pending_items = order.items.exclude(status__in=['ready', 'served', 'cancelled'])
        if not pending_items.exists() and order.status == 'in_kitchen':
            order.status = 'ready'
            order.save(update_fields=['status'])
            self._broadcast_waiter(order, 'order_ready')
        else:
            self._broadcast_waiter(order, 'item_ready', item_name=item.name, item_quantity=item.quantity)

        self._broadcast_kds(order, 'order_update')
        return Response({'status': 'ok', 'item_status': 'ready', 'order_status': order.status})

    @action(detail=True, methods=['post'])
    def recall_item(self, request, pk=None):
        order = self.get_object()
        item_pk = request.data.get('item_pk')
        if not item_pk:
            return Response({'error': 'item_pk requerido'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            item = order.items.get(pk=item_pk)
        except OrderItem.DoesNotExist:
            return Response({'error': 'Item no encontrado'}, status=status.HTTP_404_NOT_FOUND)
            
        if item.status == 'ready':
            item.status = 'in_kitchen'
            item.save(update_fields=['status'])
            
            if order.status == 'ready':
                order.status = 'in_kitchen'
                order.save(update_fields=['status'])
                
            self._broadcast_kds(order, 'order_update')
        
        return Response({'status': 'ok', 'item_status': item.status, 'order_status': order.status})

    @action(detail=True, methods=['post'])
    def mark_86(self, request, pk=None):
        order = self.get_object()
        item_pk = request.data.get('item_pk')
        if not item_pk:
            return Response({'error': 'item_pk requerido'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            item = order.items.get(pk=item_pk)
        except OrderItem.DoesNotExist:
            return Response({'error': 'Item no encontrado'}, status=status.HTTP_404_NOT_FOUND)
            
        item.status = 'cancelled'
        item.save(update_fields=['status'])
        
        if item.menu_item:
            item.menu_item.is_available = False
            item.menu_item.save(update_fields=['is_available'])
            
        self._broadcast_kds(order, 'order_update')
        return Response({'status': 'ok'})

    @action(detail=True, methods=['patch'])
    def update_item(self, request, pk=None):
        order = self.get_object()
        item_pk = request.data.get('item_pk')
        if not item_pk:
            return Response({'error': 'item_pk requerido'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            item = order.items.get(pk=item_pk)
        except OrderItem.DoesNotExist:
            return Response({'error': 'Item no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        quantity = request.data.get('quantity')
        if quantity is not None:
            if quantity < 1:
                return Response({'error': 'Cantidad debe ser al menos 1'}, status=status.HTTP_400_BAD_REQUEST)
            item.quantity = quantity
        modifiers = request.data.get('modifiers_json')
        if modifiers is not None:
            item.modifiers_json = modifiers
        item.save(update_fields=['quantity', 'modifiers_json'])
        serializer = OrderItemSerializer(item)
        order.refresh_from_db()
        self._broadcast_kds(order, 'order_update')
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def print_receipt(self, request, pk=None):
        order = self.get_object()
        payment = getattr(order, 'payment', None)
        if not payment:
            return Response({'error': 'La orden no tiene pago registrado'}, status=status.HTTP_400_BAD_REQUEST)

        from django.conf import settings
        return Response({
            'restaurant': settings.RESTAURANT_NAME,
            'rnc': settings.DGII_RNC,
            'direccion': 'Samaná, República Dominicana',
            'ncf': payment.ecf_documents.first().ncf if payment.ecf_documents.exists() else '',
            'metodo_pago': payment.get_method_display(),
            'mesa': order.table.number if order.table else '',
            'mesero': order.waiter.get_full_name() or order.waiter.username,
            'fecha': order.updated_at.isoformat(),
            'items': [
                {
                    'cantidad': i.quantity,
                    'nombre': i.name,
                    'precio': float(i.price),
                    'total': float(i.price * i.quantity),
                    'modificadores': [m['name'] for m in (i.modifiers_json or [])],
                }
                for i in order.items.all()
            ],
            'subtotal': float(payment.subtotal),
            'itbis': float(payment.itbis),
            'propina': float(payment.propina),
            'total': float(payment.total),
            'efectivo': float(payment.cash_received) if payment.cash_received else None,
            'cambio': float(payment.change_given) if payment.change_given else None,
        })

    @action(detail=True, methods=['post'])
    def print_hardware(self, request, pk=None):
        order = self.get_object()
        payment = getattr(order, 'payment', None)
        if not payment:
            return Response({'error': 'La orden no tiene pago registrado'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from .utils.print_service import imprimir_ticket_pago
            imprimir_ticket_pago(payment, order)
        except Exception as e:
            return Response({'error': f'Falló la impresión física: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({'status': 'ok'})

    @action(detail=True, methods=['delete'], url_path='remove_item/(?P<item_pk>[^/.]+)')
    def remove_item(self, request, pk=None, item_pk=None):
        order = self.get_object()
        try:
            item = order.items.get(pk=item_pk)
        except OrderItem.DoesNotExist:
            return Response({'error': 'Item no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        if order.status in ('paid', 'cancelled'):
            return Response({'error': 'La orden ya está cerrada'}, status=status.HTTP_400_BAD_REQUEST)
        item.delete()
        order.refresh_from_db()
        if order.items.count() == 0:
            order.status = 'open'
            order.save(update_fields=['status'])
        self._broadcast_kds(order, 'order_update')
        return Response({'status': 'ok'}, status=status.HTTP_200_OK)

    def _broadcast_waiter(self, order, event_type: str, **extra):
        try:
            channel_layer = get_channel_layer()
            table_number = order.table.number if order.table else None
            waiter_name = order.waiter.get_full_name() if order.waiter else (order.waiter.username if order.waiter else 'Sin mesero')
            async_to_sync(channel_layer.group_send)(
                'waiter_notifications',
                {
                    'type': 'waiter_message',
                    'data': {
                        'type': event_type,
                        'order_id': str(order.id),
                        'table_number': table_number,
                        'waiter_name': waiter_name,
                        **extra,
                    },
                },
            )
        except Exception:
            pass

    @action(detail=True, methods=['post'])
    def call_waiter(self, request, pk=None):
        order = self.get_object()
        reason = request.data.get('reason', '')
        self._broadcast_waiter(order, 'call_waiter', reason=reason)
        return Response({'status': 'ok', 'message': f'Mesero llamado para Mesa {order.table.number}'})

    @action(detail=True, methods=['post'])
    def transfer(self, request, pk=None):
        order = self.get_object()
        new_table_id = request.data.get('table_id')
        if not new_table_id:
            return Response({'error': 'table_id es requerido'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            new_table = Table.objects.get(id=new_table_id)
        except Table.DoesNotExist:
            return Response({'error': 'Mesa no encontrada'}, status=status.HTTP_404_NOT_FOUND)
            
        if new_table.status != 'available':
            return Response({'error': 'La nueva mesa no está disponible'}, status=status.HTTP_400_BAD_REQUEST)
            
        old_table = order.table
        order.table = new_table
        order.save(update_fields=['table', 'updated_at'])
        
        new_table.status = old_table.status
        new_table.save(update_fields=['status'])
        
        # Check if old table has other open orders (rare but possible), if not, make it available
        if not old_table.orders.exclude(status__in=['paid', 'cancelled']).exists():
            old_table.status = 'available'
            old_table.save(update_fields=['status'])
            
        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        order = self.get_object()

        if order.status in ('paid', 'cancelled'):
            return Response({'error': 'La orden ya está cerrada o cancelada.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            old_status = order.status
            order.items.all().update(status='cancelled')
            order.status = 'cancelled'
            order.save(update_fields=['status'])

            table = order.table
            if not table.orders.exclude(status__in=['paid', 'cancelled']).exists():
                table.status = 'available'
                table.save(update_fields=['status'])

            try:
                from apps.inventory.utils.stock_helper import restore_order_stock
                restore_order_stock(order)
            except Exception as e:
                logger.warning(f'No se pudo restaurar stock al cancelar orden {order.id}: {e}')

            from apps.core.models import AuditLog
            AuditLog.objects.create(
                user=request.user,
                action='update',
                model_name='Order',
                object_id=str(order.id),
                description=f'Orden cancelada: Mesa {table.number} — {old_status} → cancelled',
            )

        self._broadcast_kds(order, 'order_update')
        return Response({'status': 'ok', 'message': f'Orden {order.id.hex[:8]} cancelada.'})
