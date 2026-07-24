from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MenuCategoryViewSet, MenuItemViewSet, TableViewSet, OrderViewSet
from .dashboard import dashboard
from .kiosk import kiosk_table, kiosk_menu, kiosk_create_order

router = DefaultRouter()
router.register(r'menu-categories', MenuCategoryViewSet, basename='menucategory')
router.register(r'menu-items', MenuItemViewSet, basename='menuitem')
router.register(r'tables', TableViewSet, basename='table')
router.register(r'orders', OrderViewSet, basename='order')

urlpatterns = [
    path('dashboard/', dashboard, name='dashboard'),
    path('kiosk/table/<uuid:token>/', kiosk_table, name='kiosk-table'),
    path('kiosk/menu/', kiosk_menu, name='kiosk-menu'),
    path('kiosk/orders/', kiosk_create_order, name='kiosk-create-order'),
    path('', include(router.urls)),
]
