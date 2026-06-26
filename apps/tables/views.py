from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Zone, Table
from .serializers import ZoneSerializer, TableSerializer, TableStatusSerializer


class ZoneViewSet(viewsets.ModelViewSet):
    queryset = Zone.objects.filter(active=True)
    serializer_class = ZoneSerializer
    ordering = ["sort_order", "name"]


class TableViewSet(viewsets.ModelViewSet):
    queryset = Table.objects.filter(active=True)
    serializer_class = TableSerializer
    filterset_fields = ["status", "zone", "active"]
    ordering = ["number"]

    @action(detail=True, methods=["patch"])
    def status(self, request, pk=None):
        table = self.get_object()
        serializer = TableStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        table.status = serializer.validated_data["status"]
        if table.status == "occupied":
            table.opened_at = timezone.now()
        elif table.status == "free":
            table.opened_at = None
            table.assigned_to = None
        table.save(update_fields=["status", "opened_at", "assigned_to"])
        return Response(TableSerializer(table).data)
