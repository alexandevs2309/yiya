from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from .models import Category, MenuItem
from .serializers import CategorySerializer, MenuItemSerializer, MenuItemListSerializer
from apps.accounts.permissions import IsAdminOrReadOnly


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.filter(active=True)
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["active"]
    ordering = ["sort_order", "name"]


class MenuItemViewSet(viewsets.ModelViewSet):
    queryset = MenuItem.objects.filter(active=True)
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["category", "available_today", "is_platillo_dia", "active"]
    ordering = ["sort_order", "name"]

    def get_serializer_class(self):
        if self.action == "list":
            return MenuItemListSerializer
        return MenuItemSerializer
