from django.db.models import Count
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from .models import AuditLog
from .serializers import AuditLogSerializer


class HasViewReportsPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        try:
            return request.user.permissions.can_view_reports
        except Exception:
            return False


class AuditLogListView(generics.ListAPIView):
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated, HasViewReportsPermission]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["action", "actor_id"]

    def get_queryset(self):
        qs = AuditLog.objects.all()
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        if date_from:
            try:
                from datetime import datetime
                qs = qs.filter(timestamp__gte=datetime.fromisoformat(date_from))
            except ValueError:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({"date_from": "Formato de fecha inválido. Use ISO 8601."})
        if date_to:
            try:
                from datetime import datetime
                qs = qs.filter(timestamp__lte=datetime.fromisoformat(date_to))
            except ValueError:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({"date_to": "Formato de fecha inválido. Use ISO 8601."})
        return qs


class AuditSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasViewReportsPermission]

    def get(self, request):
        from datetime import datetime
        from rest_framework.exceptions import ValidationError

        qs = AuditLog.objects.all()
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")

        if date_from:
            try:
                qs = qs.filter(timestamp__gte=datetime.fromisoformat(date_from))
            except ValueError:
                raise ValidationError({"date_from": "Formato de fecha inválido. Use ISO 8601."})
        if date_to:
            try:
                qs = qs.filter(timestamp__lte=datetime.fromisoformat(date_to))
            except ValueError:
                raise ValidationError({"date_to": "Formato de fecha inválido. Use ISO 8601."})

        summary = qs.values("action").annotate(count=Count("id")).order_by("action")
        return Response({"summary": list(summary)})
