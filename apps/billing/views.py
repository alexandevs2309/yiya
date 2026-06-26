from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import ECFDocument
from .serializers import ECFDocumentSerializer


class ECFDocumentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ECFDocument.objects.select_related("order__table")
    serializer_class = ECFDocumentSerializer
    filterset_fields = ["status", "ecf_type", "order"]
    ordering = ["-created_at"]

    def get_queryset(self):
        queryset = super().get_queryset()
        year = self.request.query_params.get("year")
        month = self.request.query_params.get("month")
        if year:
            queryset = queryset.filter(created_at__year=year)
        if month:
            queryset = queryset.filter(created_at__month=month)
        return queryset

    @action(detail=True, methods=["post"])
    def resend_whatsapp(self, request, pk=None):
        ecf = self.get_object()
        if not ecf.order.whatsapp:
            return Response({"error": "La orden no tiene número de WhatsApp asociado."}, status=status.HTTP_400_BAD_REQUEST)
        
        from .tasks import send_whatsapp_ecf
        send_whatsapp_ecf.delay(ecf.id)
        return Response({"message": "Enviado a la cola de WhatsApp."})

