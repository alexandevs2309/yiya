from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PaymentViewSet, ECFDocumentViewSet, NCFSequenceViewSet

router = DefaultRouter()
router.register(r'payments', PaymentViewSet, basename='payment')
router.register(r'ecf-documents', ECFDocumentViewSet, basename='ecfdocument')
router.register(r'ncf-sequences', NCFSequenceViewSet, basename='ncfsequence')

urlpatterns = [
    path('', include(router.urls)),
]
