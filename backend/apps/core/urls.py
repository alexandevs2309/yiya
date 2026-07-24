from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import UserViewSet, CustomerViewSet, AuditLogViewSet, EmployeeShiftViewSet, PayrollPaymentViewSet, BusinessConfigViewSet, TaxConfigViewSet, trigger_backup, pin_login, tts
from .health import health

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'audit-logs', AuditLogViewSet, basename='auditlog')
router.register(r'shifts', EmployeeShiftViewSet, basename='employeeshift')
router.register(r'payroll', PayrollPaymentViewSet, basename='payrollpayment')

urlpatterns = [
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('pin-login/', pin_login, name='pin_login'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('health/', health, name='health'),
    path('backup/', trigger_backup, name='trigger_backup'),
    path('business-config/', BusinessConfigViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update'}), name='business-config'),
    path('tax-config/', TaxConfigViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update'}), name='tax-config'),
    path('tts/', tts, name='tts'),
    path('', include(router.urls)),
]
