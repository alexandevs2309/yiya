from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Purchase
from .serializers import PurchaseSerializer
from apps.accounts.permissions import IsAdmin


class PurchaseViewSet(viewsets.ModelViewSet):
    queryset = Purchase.objects.all()
    serializer_class = PurchaseSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    filterset_fields = ["supplier_rnc", "date"]
    ordering = ["-date"]

    def get_queryset(self):
        queryset = super().get_queryset()
        year = self.request.query_params.get("year")
        month = self.request.query_params.get("month")
        if year:
            queryset = queryset.filter(date__year=year)
        if month:
            queryset = queryset.filter(date__month=month)
        return queryset

