from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Sum
from .models import CashRegister
from .serializers import CashRegisterSerializer, CashCloseSerializer
from apps.orders.models import Order


class CashRegisterViewSet(viewsets.ModelViewSet):
    queryset = CashRegister.objects.all()
    serializer_class = CashRegisterSerializer
    filterset_fields = ["status"]

    def perform_create(self, serializer):
        serializer.save(
            opened_by=self.request.user,
            opened_at=timezone.now(),
            status="open",
        )

    @action(detail=True, methods=["post"])
    def close(self, request, pk=None):
        register = self.get_object()
        serializer = CashCloseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        today_orders = Order.objects.filter(
            closed_at__gte=register.opened_at,
            status="paid",
        )
        expected_cash_direct = today_orders.filter(
            payment_method="cash",
        ).aggregate(total=Sum("total"))["total"] or 0

        expected_cash_mixed = today_orders.filter(
            payment_method="mixed",
        ).aggregate(total=Sum("amount_received"))["total"] or 0

        expected_cash = expected_cash_direct + expected_cash_mixed

        register.expected_cash = expected_cash
        register.actual_cash = serializer.validated_data["actual_cash"]
        register.difference = register.actual_cash - expected_cash
        register.closed_by = request.user
        register.closed_at = timezone.now()
        register.status = "closed"
        register.notes = serializer.validated_data.get("notes", "")
        register.save()

        return Response(CashRegisterSerializer(register).data)
