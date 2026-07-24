from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from .models import Table, MenuItem, MenuCategory, Order, OrderItem


@api_view(['GET'])
@permission_classes([AllowAny])
def kiosk_table(request, token):
    try:
        table = Table.objects.get(token=token)
    except Table.DoesNotExist:
        return Response({'error': 'Mesa no encontrada'}, status=status.HTTP_404_NOT_FOUND)
    if table.status != 'available':
        return Response({'error': 'Mesa no disponible'}, status=status.HTTP_400_BAD_REQUEST)
    return Response({
        'id': table.id,
        'number': table.number,
        'section': table.section,
        'capacity': table.capacity,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def kiosk_menu(request):
    categories = MenuCategory.objects.filter(items__is_available=True).distinct().order_by('order')
    data = []
    for cat in categories:
        items = cat.items.filter(is_available=True).values(
            'id', 'name', 'price', 'itbis_type', 'preparation_time', 'has_modifiers'
        )
        data.append({
            'id': cat.id,
            'name': cat.name,
            'items': list(items),
        })
    return Response(data)


@api_view(['POST'])
@permission_classes([AllowAny])
def kiosk_create_order(request):
    table_token = request.data.get('table_token')
    items_data = request.data.get('items', [])
    guests = request.data.get('guests', 1)
    notes = request.data.get('notes', '')

    if not table_token or not items_data:
        return Response({'error': 'table_token e items requeridos'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        table = Table.objects.get(token=table_token)
    except Table.DoesNotExist:
        return Response({'error': 'Mesa no encontrada'}, status=status.HTTP_404_NOT_FOUND)

    if table.status != 'available':
        return Response({'error': 'Mesa no disponible'}, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        table.status = 'occupied'
        table.save(update_fields=['status'])

        order = Order.objects.create(
            table=table,
            waiter=None,
            guests=guests,
            notes=notes,
            status='open',
        )

        for item_data in items_data:
            menu_item_id = item_data.get('menu_item')
            quantity = item_data.get('quantity', 1)
            try:
                menu_item = MenuItem.objects.get(id=menu_item_id, is_available=True)
            except MenuItem.DoesNotExist:
                continue
            OrderItem.objects.create(
                order=order,
                menu_item=menu_item,
                name=menu_item.name,
                quantity=quantity,
                price=float(menu_item.price),
                seat=1,
                status='pending',
                modifiers_json=item_data.get('modifiers', []),
            )

        order.status = 'in_kitchen'
        order.save(update_fields=['status'])

    return Response({
        'id': str(order.id),
        'table_number': table.number,
        'items_count': order.items.count(),
    }, status=status.HTTP_201_CREATED)
