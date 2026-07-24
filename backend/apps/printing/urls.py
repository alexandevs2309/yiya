from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PrinterConfigViewSet, PrintJobViewSet, BridgeJobUpdate, BridgeStatus

router = DefaultRouter()
router.register(r'printers', PrinterConfigViewSet, basename='printerconfig')
router.register(r'jobs', PrintJobViewSet, basename='printjob')

urlpatterns = [
    path('', include(router.urls)),
    path('jobs/<uuid:pk>/update/', BridgeJobUpdate.as_view(), name='bridge-job-update'),
    path('status/', BridgeStatus.as_view(), name='bridge-status'),
]
