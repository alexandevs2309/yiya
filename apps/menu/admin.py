from django.contrib import admin
from .models import Category, MenuItem


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "sort_order", "active"]
    list_editable = ["sort_order", "active"]


@admin.register(MenuItem)
class MenuItemAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "price_base", "available_today", "is_platillo_dia", "active"]
    list_filter = ["category", "available_today", "active"]
    list_editable = ["price_base", "available_today", "is_platillo_dia", "active"]
