from datetime import timedelta
import datetime
from django.db.models import Sum, Count, Q
from django.db.models.functions import TruncHour
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from apps.pos.models import Table, Order, OrderItem
from apps.billing.models import Payment, ECFDocument, NCFSequence
from apps.core.views import IsAdminUser

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def dashboard(request):
    start_date_str = request.query_params.get('start_date')
    end_date_str = request.query_params.get('end_date')

    now = timezone.now()
    if start_date_str and end_date_str:
        s_date = parse_date(start_date_str)
        e_date = parse_date(end_date_str)
        if s_date and e_date:
            today_start = timezone.make_aware(datetime.datetime.combine(s_date, datetime.time.min))
            today_end = timezone.make_aware(datetime.datetime.combine(e_date, datetime.time.max))
        else:
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            today_end = today_start + timedelta(days=1)
    else:
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)

    payments_today = Payment.objects.filter(created_at__gte=today_start, created_at__lt=today_end)
    orders_today = Order.objects.filter(created_at__gte=today_start, created_at__lt=today_end)

    totals = payments_today.aggregate(
        total_ventas=Sum('total'),
        total_itbis=Sum('itbis'),
        total_propina=Sum('propina'),
        total_pagos=Count('id'),
    )

    mesas_ocupadas = Table.objects.filter(status='occupied').count()
    mesas_con_cuenta = Table.objects.filter(status='bill').count()
    ordenes_en_cocina = Order.objects.filter(status='in_kitchen').count()
    ticket_promedio = round((totals['total_ventas'] or 0) / totals['total_pagos'], 2) if totals['total_pagos'] else 0

    ecf_pendientes = ECFDocument.objects.filter(status='pending').count()
    ecf_fallidos = ECFDocument.objects.filter(status__in=('failed', 'rejected')).count()

    ncf_sequences = NCFSequence.objects.filter(is_active=True).values('ncf_type', 'current_sequence', 'valid_to')

    hourly_qs = (
        orders_today
        .annotate(hour=TruncHour('created_at'))
        .values('hour')
        .annotate(total=Count('id'))
        .order_by('hour')
    )
    hourly = []
    for entry in hourly_qs:
        h = entry['hour']
        if h:
            hourly.append({'hour': h.hour, 'orders': entry['total']})
    if not hourly:
        hourly = [{'hour': h, 'orders': 0} for h in range(8, 23)]

    recent_orders = (
        Order.objects.select_related('table', 'waiter')
        .filter(created_at__gte=today_start)
        .order_by('-created_at')[:10]
    )
    recent_payments = (
        Payment.objects.select_related('order__table', 'processed_by')
        .filter(created_at__gte=today_start)
        .order_by('-created_at')[:10]
    )

    activity = []
    for o in recent_orders:
        activity.append({
            'type': 'order',
            'description': f'Mesa {o.table.number} — {o.get_status_display()}',
            'table': o.table.number,
            'amount': None,
            'user': o.waiter.get_full_name() or o.waiter.username,
            'time': o.created_at.isoformat(),
        })
    for p in recent_payments:
        activity.append({
            'type': 'payment',
            'description': f'Mesa {p.order.table.number} — {p.get_method_display()} ${float(p.total):.2f}',
            'table': p.order.table.number,
            'amount': float(p.total),
            'user': p.processed_by.get_full_name() or p.processed_by.username if p.processed_by else '—',
            'time': p.created_at.isoformat(),
        })
    activity.sort(key=lambda x: x['time'], reverse=True)

    payment_methods_qs = payments_today.aggregate(
        efectivo=Sum('total', filter=Q(method='cash')),
        tarjeta=Sum('total', filter=Q(method='cardnet')),
        transferencia=Sum('total', filter=Q(method='tpago')),
        yape=Sum('total', filter=Q(method='mixed')),
    )
    payment_methods = {
        'efectivo': float(payment_methods_qs['efectivo'] or 0),
        'tarjeta': float(payment_methods_qs['tarjeta'] or 0),
        'transferencia': float(payment_methods_qs['transferencia'] or 0),
        'yape': float(payment_methods_qs['yape'] or 0),
    }

    # Top Items
    top_items_qs = (
        OrderItem.objects.filter(order__created_at__gte=today_start, order__created_at__lte=today_end)
        .values('name')
        .annotate(total_quantity=Sum('quantity'))
        .order_by('-total_quantity')[:5]
    )
    top_items = [{'name': item['name'], 'quantity': item['total_quantity']} for item in top_items_qs]

    # Top Waiters
    top_waiters_qs = (
        orders_today.filter(waiter__isnull=False)
        .values('waiter__first_name', 'waiter__username')
        .annotate(total_orders=Count('id'))
        .order_by('-total_orders')[:5]
    )
    top_waiters = [{'name': item['waiter__first_name'] or item['waiter__username'], 'orders': item['total_orders']} for item in top_waiters_qs]

    return Response({
        'ventas_hoy': float(totals['total_ventas'] or 0),
        'itbis_hoy': float(totals['total_itbis'] or 0),
        'propina_hoy': float(totals['total_propina'] or 0),
        'total_transacciones': totals['total_pagos'],
        'ticket_promedio': ticket_promedio,
        'mesas_ocupadas': mesas_ocupadas,
        'mesas_con_cuenta': mesas_con_cuenta,
        'total_mesas': Table.objects.count(),
        'ordenes_en_cocina': ordenes_en_cocina,
        'ecf_pendientes': ecf_pendientes,
        'ecf_fallidos': ecf_fallidos,
        'ncf_sequences': list(ncf_sequences),
        'hourly_orders': hourly,
        'activity': activity[:20],
        'payment_methods': payment_methods,
        'top_items': top_items,
        'top_waiters': top_waiters,
    })
