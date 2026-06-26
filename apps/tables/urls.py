from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("zones", views.ZoneViewSet)
router.register("", views.TableViewSet)

urlpatterns = [
    path("", include(router.urls)),
]
