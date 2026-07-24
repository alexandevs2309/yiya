from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from core.permissions import IsAdmin
from core.export_mixin import CSVExportMixin
from .models import InventoryItem, PurchaseOrder, MenuItemRecipe
from .serializers import InventoryItemSerializer, PurchaseOrderSerializer, MenuItemRecipeSerializer


class InventoryItemViewSet(CSVExportMixin, viewsets.ModelViewSet):
    serializer_class = InventoryItemSerializer
    permission_classes = [IsAdmin]
    filterset_fields = ['category']
    search_fields = ['name']
    csv_filename = 'inventario.csv'
    csv_fields = [
        ('name', 'Nombre'),
        ('category', 'Categoría'),
        ('unit', 'Unidad'),
        ('stock', 'Stock'),
        ('min_stock', 'Stock Mínimo'),
        ('cost_per_unit', 'Costo/Unidad'),
        ('barcode', 'Código de Barras'),
    ]

    def get_queryset(self):
        qs = InventoryItem.objects.all()
        if self.request.query_params.get('include_deleted') == 'true':
            qs = InventoryItem.objects.all_with_deleted()
        return qs

    @action(detail=False, methods=['get'])
    def exportar(self, request):
        return self.export_csv(request)


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrder.objects.all()
    serializer_class = PurchaseOrderSerializer
    permission_classes = [IsAdmin]
    filterset_fields = ['status']


class MenuItemRecipeViewSet(viewsets.ModelViewSet):
    queryset = MenuItemRecipe.objects.all()
    serializer_class = MenuItemRecipeSerializer
    permission_classes = [IsAdmin]
    filterset_fields = ['menu_item']
