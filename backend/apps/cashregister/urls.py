from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CashRegisterViewSet

router = DefaultRouter()
router.register(r'registers', CashRegisterViewSet, basename='cashregister')

urlpatterns = [
    path('cashregister/', include(router.urls)),
]
