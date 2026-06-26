import uuid
from decimal import Decimal
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db import transaction
from django_filters import rest_framework as filters
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import Order, OrderItem
from .serializers import (
    OrderSerializer, OrderCreateSerializer,
    OrderItemSerializer, SubmitToKitchenSerializer,
    MarkItemReadySerializer, CloseOrderSerializer,
)


class CharInFilter(filters.BaseInFilter, filters.CharFilter):
    pass


class OrderFilter(filters.FilterSet):
    closed_at = filters.DateFilter(field_name="closed_at", lookup_expr="date")
    status__in = CharInFilter(field_name="status", lookup_expr="in")

    class Meta:
        model = Order
        fields = ["status", "table", "waitress", "closed_at", "status__in"]


def notify_kitchen(order):
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        "kitchen",
        {
            "type": "kitchen_update",
            "data": OrderSerializer(order).data,
        },
    )


def notify_waitress(item):
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"waitress_{item.order.waitress_id}",
        {
            "type": "item_ready",
            "data": OrderItemSerializer(item).data,
        },
    )


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.prefetch_related("items", "table", "waitress")
    filterset_class = OrderFilter
    ordering = ["-created_at"]

    def get_serializer_class(self):
        if self.action == "create":
            return OrderCreateSerializer
        return OrderSerializer

    def get_serializer(self, *args, **kwargs):
        if self.action == "close":
            return CloseOrderSerializer(*args, **kwargs)
        return super().get_serializer(*args, **kwargs)

    @action(detail=True, methods=["post"])
    def submit_to_kitchen(self, request, pk=None):
        order = self.get_object()
        serializer = SubmitToKitchenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        items = OrderItem.objects.filter(
            id__in=serializer.validated_data["item_ids"],
            order=order,
        )
        items.update(status="preparing")
        notify_kitchen(order)
        return Response({"detail": "Enviado a cocina"})

    @action(detail=True, methods=["post"])
    def mark_ready(self, request, pk=None):
        item = OrderItem.objects.get(
            id=request.data.get("item_id"),
            order_id=pk,
        )
        item.status = "ready"
        item.prepared_at = timezone.now()
        item.save(update_fields=["status", "prepared_at"])
        notify_waitress(item)
        return Response(OrderItemSerializer(item).data)

    @action(detail=True, methods=["post"])
    def request_bill(self, request, pk=None):
        order = self.get_object()
        order.status = "billing"
        order.billing_at = timezone.now()
        order.save(update_fields=["status", "billing_at"])
        order.table.status = "billing"
        order.table.save(update_fields=["status"])
        notify_kitchen(order)
        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=["post"])
    def close(self, request, pk=None):
        order = self.get_object()

        if order.status == "paid":
            return Response(
                {"detail": "Esta orden ya fue cobrada."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = CloseOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            order.status = "paid"
            order.subtotal = serializer.validated_data["subtotal"]
            order.itbis = serializer.validated_data["itbis"]
            order.total = serializer.validated_data["total"]
            order.tip = serializer.validated_data.get("tip", Decimal("0"))
            order.payment_method = serializer.validated_data["payment_method"]
            order.amount_received = serializer.validated_data.get("amount_received")
            order.rnc = serializer.validated_data.get("rnc", "")
            order.whatsapp = serializer.validated_data.get("whatsapp", "")
            if order.amount_received:
                order.change = order.amount_received - order.total
            order.receipt_number = f"R-{timezone.now():%Y%m%d}-{str(uuid.uuid4())[:6].upper()}"
            order.closed_at = timezone.now()
            order.save()

            order.table.status = "free"
            order.table.opened_at = None
            order.table.assigned_to = None
            order.table.save(update_fields=["status", "opened_at", "assigned_to"])

            from apps.billing.models import ECFDocument
            ECFDocument.objects.get_or_create(
                order=order,
                defaults={
                    "ecf_type": "01" if order.rnc else "02",
                    "rnc": order.rnc or "",
                    "status": "pending",
                    "provisional_number": order.receipt_number,
                },
            )

        return Response(OrderSerializer(order).data)
