from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InventoryItemViewSet, PurchaseOrderViewSet, MenuItemRecipeViewSet

router = DefaultRouter()
router.register(r'items', InventoryItemViewSet, basename='inventoryitem')
router.register(r'purchase-orders', PurchaseOrderViewSet, basename='purchaseorder')
router.register(r'recipes', MenuItemRecipeViewSet, basename='menuitemrecipe')

urlpatterns = [
    path('', include(router.urls)),
]
